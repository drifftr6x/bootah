#!/bin/bash
#
# Bootah - Linux Bare Metal Installation Script
# This script automates the setup of Bootah on Ubuntu/Debian systems
#
# Usage: sudo ./install-linux.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
INSTALL_DIR="/opt/bootah"
BOOTAH_PORT=5000
BOOTAH_USER="bootah"
NODE_VERSION="20"

echo -e "${BLUE}"
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
echo "║           Linux Bare Metal Installation                   ║"
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

# Get user's IP address
get_ip_address() {
    ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || hostname -I | awk '{print $1}' || echo "192.168.1.50"
}

# Interactive configuration
configure_installation() {
    echo ""
    print_info "Configuration"
    echo "─────────────────────────────────────────────────────────────"
    
    # Server IP for PXE
    DEFAULT_IP=$(get_ip_address)
    read -p "Server IP address (for PXE clients) [$DEFAULT_IP]: " input
    PXE_SERVER_IP="${input:-$DEFAULT_IP}"
    
    # Port
    read -p "Web interface port [$BOOTAH_PORT]: " input
    BOOTAH_PORT="${input:-$BOOTAH_PORT}"
    
    # Database password
    DEFAULT_DB_PASS=$(generate_secret | tr -dc 'a-zA-Z0-9' | head -c 24)
    read -p "Database password [auto-generated]: " input
    POSTGRES_PASSWORD="${input:-$DEFAULT_DB_PASS}"
    
    # Session secret
    SESSION_SECRET=$(generate_secret)
    
    # Email configuration
    echo ""
    print_info "Email Configuration (for password reset)"
    echo "Options: console (default), smtp, sendgrid"
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
    
    echo ""
    print_status "Configuration complete"
}

# Install system dependencies
install_dependencies() {
    echo ""
    print_info "Installing system dependencies..."
    
    apt-get update
    apt-get install -y curl wget git build-essential
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
    
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    print_status "Node.js $(node -v) installed"
}

# Install PostgreSQL
install_postgresql() {
    echo ""
    print_info "Installing PostgreSQL..."
    
    apt-get install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
    print_status "PostgreSQL installed and started"
    
    # Create database and user
    print_info "Configuring PostgreSQL..."
    sudo -u postgres psql -c "CREATE USER bootah WITH PASSWORD '$POSTGRES_PASSWORD';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE bootah OWNER bootah;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bootah TO bootah;" 2>/dev/null || true
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
        git pull
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

NODE_ENV=production
PORT=$BOOTAH_PORT
HOST=0.0.0.0

DATABASE_URL=postgresql://bootah:$POSTGRES_PASSWORD@localhost:5432/bootah

AUTH_MODE=local
SESSION_SECRET=$SESSION_SECRET
ALLOW_REGISTRATION=true
DEFAULT_USER_ROLE=viewer

PXE_SERVER_IP=$PXE_SERVER_IP
TFTP_PORT=69
DHCP_PORT=67

IMAGE_STORAGE_PATH=$INSTALL_DIR/images

EMAIL_PROVIDER=$EMAIL_PROVIDER
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

# Create systemd service
create_service() {
    echo ""
    print_info "Creating systemd service..."
    
    cat > /etc/systemd/system/bootah.service << EOF
[Unit]
Description=Bootah PXE Boot and OS Imaging Platform
After=network.target postgresql.service
Requires=postgresql.service

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
ProtectSystem=strict
ReadWritePaths=$INSTALL_DIR/images $INSTALL_DIR/logs

# Capability for privileged ports (optional, for TFTP/DHCP)
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable bootah
    print_status "Systemd service created"
}

# Configure firewall
configure_firewall() {
    echo ""
    print_info "Configuring firewall..."
    
    if command -v ufw >/dev/null 2>&1; then
        ufw allow $BOOTAH_PORT/tcp comment "Bootah Web UI"
        ufw allow 69/udp comment "Bootah TFTP"
        ufw allow 67/udp comment "Bootah DHCP"
        ufw allow 4011/udp comment "Bootah PXE"
        print_status "UFW rules added"
    else
        print_warning "UFW not found. Please configure your firewall manually."
        echo "    Required ports: $BOOTAH_PORT/tcp, 69/udp, 67/udp, 4011/udp"
    fi
}

# Start service
start_service() {
    echo ""
    print_info "Starting Bootah service..."
    
    systemctl start bootah
    sleep 3
    
    if systemctl is-active --quiet bootah; then
        print_status "Bootah service is running"
    else
        print_error "Service failed to start. Check logs: journalctl -u bootah"
    fi
}

# Print completion message
print_completion() {
    echo ""
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                Installation Complete!                     ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo ""
    echo "Access Bootah at: http://localhost:$BOOTAH_PORT"
    echo "                  http://$PXE_SERVER_IP:$BOOTAH_PORT"
    echo ""
    echo "First-time setup:"
    echo "  1. Open the web interface"
    echo "  2. Create your admin account"
    echo "  3. Configure your PXE settings"
    echo ""
    echo "Service commands:"
    echo "  sudo systemctl status bootah    # Check status"
    echo "  sudo systemctl restart bootah   # Restart"
    echo "  sudo systemctl stop bootah      # Stop"
    echo "  sudo journalctl -u bootah -f    # View logs"
    echo ""
    echo "Installation directory: $INSTALL_DIR"
    echo "Configuration file: $INSTALL_DIR/.env"
}

# Main installation flow
main() {
    check_root
    detect_os
    configure_installation
    install_dependencies
    install_nodejs
    install_postgresql
    create_user
    install_bootah
    create_env_file
    create_service
    configure_firewall
    start_service
    print_completion
}

# Run main function
main
