#!/bin/bash
#
# Bootah - Proxmox LXC Container Installation Script
# This script automates the setup of Bootah inside a Proxmox LXC container
#
# Usage: 
#   Inside LXC container: sudo ./install-proxmox.sh
#   From Proxmox host:    pct exec <CTID> -- bash -c "$(curl -sSL URL)"
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
INSTALL_DIR="/opt/bootah"
BOOTAH_PORT=5000
BOOTAH_USER="bootah"
NODE_VERSION="20"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ██████╗  ██████╗  ██████╗ ████████╗ █████╗ ██╗  ██╗     ║"
echo "║   ██╔══██╗██╔═══██╗██╔═══██╗╚══██╔══╝██╔══██╗██║  ██║     ║"
echo "║   ██████╔╝██║   ██║██║   ██║   ██║   ███████║███████║     ║"
echo "║   ██╔══██╗██║   ██║██║   ██║   ██║   ██╔══██║██╔══██║     ║"
echo "║   ██████╔╝╚██████╔╝╚██████╔╝   ██║   ██║  ██║██║  ██║     ║"
echo "║   ╚═════╝  ╚═════╝  ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝     ║"
echo "║                                                           ║"
echo "║          PXE Boot and OS Imaging Platform                 ║"
echo "║         Proxmox LXC Container Installation                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print status messages
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Detect if running inside Proxmox LXC container
detect_proxmox() {
    if [ -f /proc/1/environ ] && grep -q "container=lxc" /proc/1/environ 2>/dev/null; then
        print_status "Detected: Proxmox LXC container"
        IS_LXC=true
    elif [ -f /.dockerenv ]; then
        print_error "Docker container detected. Use install-docker.sh instead."
        exit 1
    elif systemd-detect-virt -c 2>/dev/null | grep -q "lxc"; then
        print_status "Detected: LXC container (systemd)"
        IS_LXC=true
    else
        print_warning "Not running inside LXC container (bare metal or VM)"
        read -p "Continue anyway? [y/N]: " response
        if [[ ! "$response" =~ ^[Yy] ]]; then
            exit 0
        fi
        IS_LXC=false
    fi
}

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        print_error "Cannot detect OS. This script requires Ubuntu or Debian."
        exit 1
    fi
    
    case $OS in
        ubuntu|debian)
            print_status "Detected: $PRETTY_NAME"
            ;;
        *)
            print_error "Unsupported OS: $OS. This script requires Ubuntu or Debian."
            exit 1
            ;;
    esac
}

# Generate secure random string
generate_secret() {
    openssl rand -base64 32
}

# Get container's IP address
get_ip_address() {
    ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || \
    hostname -I 2>/dev/null | awk '{print $1}' || \
    ip addr show eth0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 || \
    echo "192.168.1.50"
}

# Interactive configuration
configure_installation() {
    echo ""
    print_info "Configuration"
    echo "─────────────────────────────────────────────────────────────"
    
    # Server IP for PXE
    DEFAULT_IP=$(get_ip_address)
    echo -e "${CYAN}TIP: This IP should be the static IP assigned to this LXC container${NC}"
    read -p "Server IP address (for PXE clients) [$DEFAULT_IP]: " input
    PXE_SERVER_IP="${input:-$DEFAULT_IP}"
    
    # Port
    read -p "Web interface port [$BOOTAH_PORT]: " input
    BOOTAH_PORT="${input:-$BOOTAH_PORT}"
    
    # Database choice
    echo ""
    print_info "Database Configuration"
    echo "  1) Local PostgreSQL (installed in this container)"
    echo "  2) External PostgreSQL (existing server)"
    read -p "Choose database option [1]: " db_choice
    
    if [ "$db_choice" = "2" ]; then
        read -p "External database URL (postgresql://user:pass@host:port/db): " DATABASE_URL
        USE_EXTERNAL_DB=true
    else
        DEFAULT_DB_PASS=$(generate_secret | tr -dc 'a-zA-Z0-9' | head -c 24)
        read -p "Local database password [auto-generated]: " input
        POSTGRES_PASSWORD="${input:-$DEFAULT_DB_PASS}"
        DATABASE_URL="postgresql://bootah:$POSTGRES_PASSWORD@localhost:5432/bootah"
        USE_EXTERNAL_DB=false
    fi
    
    # Session secret
    SESSION_SECRET=$(generate_secret)
    
    # Email configuration
    echo ""
    print_info "Email Configuration (for password reset)"
    echo "Options: console (logs to terminal), smtp, sendgrid"
    read -p "Email provider [console]: " input
    EMAIL_PROVIDER="${input:-console}"
    
    if [ "$EMAIL_PROVIDER" = "smtp" ]; then
        read -p "SMTP Host: " SMTP_HOST
        read -p "SMTP Port [587]: " input
        SMTP_PORT="${input:-587}"
        read -p "SMTP Username: " SMTP_USER
        read -sp "SMTP Password: " SMTP_PASS
        echo ""
        read -p "From email address: " EMAIL_FROM
    elif [ "$EMAIL_PROVIDER" = "sendgrid" ]; then
        read -sp "SendGrid API Key: " SENDGRID_API_KEY
        echo ""
        read -p "From email address: " EMAIL_FROM
    fi
    
    # PXE/TFTP configuration
    echo ""
    print_info "PXE Configuration"
    echo -e "${CYAN}TIP: Standard ports require root. Alt ports work without elevated privileges.${NC}"
    echo "  1) Standard ports (TFTP:69, DHCP:67) - requires CAP_NET_BIND_SERVICE"
    echo "  2) Alternative ports (TFTP:6969, DHCP:4067) - no special permissions"
    read -p "Choose port configuration [2]: " port_choice
    
    if [ "$port_choice" = "1" ]; then
        TFTP_PORT=69
        DHCP_PORT=67
        USE_PRIVILEGED_PORTS=true
    else
        TFTP_PORT=6969
        DHCP_PORT=4067
        USE_PRIVILEGED_PORTS=false
    fi
    
    echo ""
    print_status "Configuration complete"
}

# Install system dependencies
install_dependencies() {
    echo ""
    print_info "Installing system dependencies..."
    
    apt-get update
    apt-get install -y \
        curl wget git build-essential \
        ca-certificates gnupg \
        net-tools iputils-ping \
        sudo
    print_status "Base dependencies installed"
}

# Install Node.js
install_nodejs() {
    echo ""
    print_info "Installing Node.js $NODE_VERSION..."
    
    if command -v node >/dev/null 2>&1; then
        CURRENT_NODE=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$CURRENT_NODE" -ge "$NODE_VERSION" ]; then
            print_status "Node.js $(node -v) is already installed"
            return
        fi
    fi
    
    # Add NodeSource repository
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_VERSION}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
    
    apt-get update
    apt-get install -y nodejs
    print_status "Node.js $(node -v) installed"
}

# Install PostgreSQL (if using local database)
install_postgresql() {
    if [ "$USE_EXTERNAL_DB" = true ]; then
        print_info "Using external database, skipping PostgreSQL installation"
        return
    fi
    
    echo ""
    print_info "Installing PostgreSQL..."
    
    apt-get install -y postgresql postgresql-contrib
    
    # Start PostgreSQL (works differently in containers)
    if command -v systemctl >/dev/null 2>&1; then
        systemctl enable postgresql
        systemctl start postgresql
    else
        # For containers without systemd
        service postgresql start
        update-rc.d postgresql defaults
    fi
    
    print_status "PostgreSQL installed and started"
    
    # Wait for PostgreSQL to be ready
    sleep 2
    
    # Create database and user
    print_info "Configuring PostgreSQL..."
    sudo -u postgres psql -c "CREATE USER bootah WITH PASSWORD '$POSTGRES_PASSWORD';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE bootah OWNER bootah;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bootah TO bootah;" 2>/dev/null || true
    sudo -u postgres psql -d bootah -c "GRANT ALL ON SCHEMA public TO bootah;" 2>/dev/null || true
    print_status "Database 'bootah' created"
}

# Create bootah user
create_user() {
    echo ""
    print_info "Creating system user..."
    
    if id "$BOOTAH_USER" &>/dev/null; then
        print_status "User '$BOOTAH_USER' already exists"
    else
        useradd -r -m -d "$INSTALL_DIR" -s /bin/bash "$BOOTAH_USER"
        print_status "User '$BOOTAH_USER' created"
    fi
}

# Install Bootah
install_bootah() {
    echo ""
    print_info "Installing Bootah..."
    
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Clone repository
    if [ -d ".git" ]; then
        print_info "Updating existing installation..."
        git fetch origin
        git reset --hard origin/main
    else
        git clone https://github.com/drifftr6x/bootah.git .
    fi
    print_status "Source code downloaded"
    
    # Install all dependencies (including dev for build)
    npm ci
    print_status "Dependencies installed"
    
    # Build application
    npm run build
    print_status "Application built"
    
    # Prune dev dependencies after build
    npm prune --production
    print_status "Dev dependencies pruned"
    
    # Create directories
    mkdir -p images logs pxe-files/efi
    
    # Set ownership
    chown -R "$BOOTAH_USER:$BOOTAH_USER" "$INSTALL_DIR"
    print_status "Permissions set"
}

# Create environment file
create_env_file() {
    echo ""
    print_info "Creating environment configuration..."
    
    cat > "$INSTALL_DIR/.env" << EOF
# Bootah Environment Configuration
# Generated on $(date)
# Proxmox LXC Container Installation

NODE_ENV=production
PORT=$BOOTAH_PORT
HOST=0.0.0.0

DATABASE_URL=$DATABASE_URL

AUTH_MODE=local
SESSION_SECRET=$SESSION_SECRET
ALLOW_REGISTRATION=true
DEFAULT_USER_ROLE=viewer

PXE_SERVER_IP=$PXE_SERVER_IP
TFTP_PORT=$TFTP_PORT
DHCP_PORT=$DHCP_PORT

IMAGE_STORAGE_PATH=$INSTALL_DIR/images

EMAIL_PROVIDER=$EMAIL_PROVIDER
APP_URL=http://$PXE_SERVER_IP:$BOOTAH_PORT
EOF

    if [ "$EMAIL_PROVIDER" = "smtp" ]; then
        cat >> "$INSTALL_DIR/.env" << EOF
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
EMAIL_FROM=$EMAIL_FROM
EOF
    elif [ "$EMAIL_PROVIDER" = "sendgrid" ]; then
        cat >> "$INSTALL_DIR/.env" << EOF
SENDGRID_API_KEY=$SENDGRID_API_KEY
EMAIL_FROM=$EMAIL_FROM
EOF
    fi
    
    chown "$BOOTAH_USER:$BOOTAH_USER" "$INSTALL_DIR/.env"
    chmod 600 "$INSTALL_DIR/.env"
    print_status "Environment file created"
}

# Create systemd service (or init script for containers without systemd)
create_service() {
    echo ""
    print_info "Creating service..."
    
    if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
        # Systemd service
        cat > /etc/systemd/system/bootah.service << EOF
[Unit]
Description=Bootah PXE Boot and OS Imaging Platform
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$BOOTAH_USER
Group=$BOOTAH_USER
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/node $INSTALL_DIR/dist/index.js
Restart=on-failure
RestartSec=10

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
EOF

        if [ "$USE_PRIVILEGED_PORTS" = true ]; then
            echo "AmbientCapabilities=CAP_NET_BIND_SERVICE" >> /etc/systemd/system/bootah.service
        fi
        
        cat >> /etc/systemd/system/bootah.service << EOF

[Install]
WantedBy=multi-user.target
EOF
        
        systemctl daemon-reload
        systemctl enable bootah
        print_status "Systemd service created"
    else
        # Init script for containers without systemd
        cat > /etc/init.d/bootah << 'EOF'
#!/bin/bash
### BEGIN INIT INFO
# Provides:          bootah
# Required-Start:    $network $local_fs postgresql
# Required-Stop:     $network $local_fs
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Description:       Bootah PXE Boot and OS Imaging Platform
### END INIT INFO

INSTALL_DIR="/opt/bootah"
BOOTAH_USER="bootah"
PIDFILE=/var/run/bootah.pid

case "$1" in
  start)
    echo "Starting Bootah..."
    cd $INSTALL_DIR
    sudo -u $BOOTAH_USER sh -c "source $INSTALL_DIR/.env && /usr/bin/node $INSTALL_DIR/dist/index.js > $INSTALL_DIR/logs/bootah.log 2>&1 &"
    echo $! > $PIDFILE
    ;;
  stop)
    echo "Stopping Bootah..."
    if [ -f $PIDFILE ]; then
      kill $(cat $PIDFILE)
      rm $PIDFILE
    fi
    pkill -f "node.*bootah"
    ;;
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
  status)
    if pgrep -f "node.*bootah" > /dev/null; then
      echo "Bootah is running"
    else
      echo "Bootah is stopped"
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
esac
EOF
        chmod +x /etc/init.d/bootah
        update-rc.d bootah defaults
        print_status "Init script created"
    fi
}

# Configure network for PXE (container-specific)
configure_network() {
    echo ""
    print_info "Network Configuration Notes"
    echo "─────────────────────────────────────────────────────────────"
    
    if [ "$IS_LXC" = true ]; then
        echo -e "${CYAN}Important for Proxmox LXC:${NC}"
        echo ""
        echo "1. Ensure this container has a STATIC IP address"
        echo "   Current IP: $PXE_SERVER_IP"
        echo ""
        echo "2. If using standard ports (69, 67), on the Proxmox HOST run:"
        echo "   pct set <CTID> -features nesting=1"
        echo ""
        echo "3. For DHCP/TFTP to work, the container needs network access."
        echo "   Verify your bridge configuration (usually vmbr0)."
        echo ""
        echo "4. If your network has an existing DHCP server, Bootah's"
        echo "   DHCP proxy mode will work alongside it automatically."
    fi
}

# Start service
start_service() {
    echo ""
    print_info "Starting Bootah service..."
    
    if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
        systemctl start bootah
        sleep 3
        if systemctl is-active --quiet bootah; then
            print_status "Bootah service is running"
        else
            print_error "Service failed to start. Check logs: journalctl -u bootah"
        fi
    else
        service bootah start
        sleep 3
        if pgrep -f "node.*bootah" > /dev/null; then
            print_status "Bootah service is running"
        else
            print_error "Service failed to start. Check logs: $INSTALL_DIR/logs/bootah.log"
        fi
    fi
}

# Print completion message
print_completion() {
    echo ""
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║          Proxmox Installation Complete!                   ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo ""
    echo -e "${CYAN}Access Bootah at:${NC}"
    echo "  http://localhost:$BOOTAH_PORT"
    echo "  http://$PXE_SERVER_IP:$BOOTAH_PORT"
    echo ""
    echo -e "${CYAN}First-time setup:${NC}"
    echo "  1. Open the web interface in your browser"
    echo "  2. Create your administrator account"
    echo "  3. Configure PXE/TFTP settings"
    echo "  4. Add OS images for deployment"
    echo ""
    echo -e "${CYAN}Service commands:${NC}"
    if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
        echo "  systemctl status bootah    # Check status"
        echo "  systemctl restart bootah   # Restart"
        echo "  systemctl stop bootah      # Stop"
        echo "  journalctl -u bootah -f    # View logs"
    else
        echo "  service bootah status      # Check status"
        echo "  service bootah restart     # Restart"
        echo "  service bootah stop        # Stop"
        echo "  tail -f $INSTALL_DIR/logs/bootah.log  # View logs"
    fi
    echo ""
    echo -e "${CYAN}Configuration:${NC}"
    echo "  Installation: $INSTALL_DIR"
    echo "  Environment:  $INSTALL_DIR/.env"
    echo "  Images:       $INSTALL_DIR/images"
    echo "  Logs:         $INSTALL_DIR/logs"
    echo ""
    echo -e "${CYAN}Reconfigure settings:${NC}"
    echo "  cd $INSTALL_DIR && ./scripts/configure.sh"
    echo ""
    
    if [ "$USE_EXTERNAL_DB" = false ]; then
        echo -e "${YELLOW}Database credentials (save these):${NC}"
        echo "  Database: bootah"
        echo "  Username: bootah"
        echo "  Password: $POSTGRES_PASSWORD"
        echo ""
    fi
    
    echo -e "${GREEN}Happy deploying! 🚀${NC}"
}

# Main installation flow
main() {
    check_root
    detect_proxmox
    detect_os
    configure_installation
    install_dependencies
    install_nodejs
    install_postgresql
    create_user
    install_bootah
    create_env_file
    create_service
    configure_network
    start_service
    print_completion
}

# Run main function
main
