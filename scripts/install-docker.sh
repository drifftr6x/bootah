#!/bin/bash
#
# Bootah - Docker Installation Script
# This script automates the setup of Bootah using Docker Compose
#
# Usage: curl -sSL https://raw.githubusercontent.com/yourusername/bootah/main/scripts/install-docker.sh | bash
#        Or: ./install-docker.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
INSTALL_DIR="${BOOTAH_INSTALL_DIR:-$HOME/bootah}"
BOOTAH_PORT="${BOOTAH_PORT:-5000}"

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
echo "║              Docker Installation Script                   ║"
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    echo ""
    print_info "Checking prerequisites..."
    
    # Check Docker
    if ! command_exists docker; then
        print_error "Docker is not installed."
        echo "    Please install Docker first: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_status "Docker is installed"
    
    # Check Docker Compose
    if command_exists docker-compose; then
        COMPOSE_CMD="docker-compose"
        print_status "Docker Compose is installed (standalone)"
    elif docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
        print_status "Docker Compose is installed (plugin)"
    else
        print_error "Docker Compose is not installed."
        echo "    Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running."
        echo "    Please start Docker and try again."
        exit 1
    fi
    print_status "Docker daemon is running"
}

# Generate secure random string
generate_secret() {
    if command_exists openssl; then
        openssl rand -base64 32
    else
        head -c 32 /dev/urandom | base64
    fi
}

# Get user's IP address
get_ip_address() {
    # Try to get the primary IP
    if command_exists ip; then
        ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || echo "192.168.1.50"
    elif command_exists hostname; then
        hostname -I 2>/dev/null | awk '{print $1}' || echo "192.168.1.50"
    else
        echo "192.168.1.50"
    fi
}

# Interactive configuration
configure_installation() {
    echo ""
    print_info "Configuration"
    echo "─────────────────────────────────────────────────────────────"
    
    # Installation directory
    read -p "Installation directory [$INSTALL_DIR]: " input
    INSTALL_DIR="${input:-$INSTALL_DIR}"
    
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

# Create installation directory and files
create_installation() {
    echo ""
    print_info "Creating installation in $INSTALL_DIR..."
    
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Clone repository first if not already present
    if [ ! -f "package.json" ]; then
        print_info "Cloning Bootah repository..."
        git clone https://github.com/yourusername/bootah.git temp_clone
        # Move all files including hidden ones (excluding . and ..)
        shopt -s dotglob
        mv temp_clone/* . 2>/dev/null
        shopt -u dotglob
        rm -rf temp_clone
        print_status "Repository cloned"
    fi
    
    # Create .env file
    cat > .env << EOF
# Bootah Environment Configuration
# Generated on $(date)

# Core Settings
NODE_ENV=production
PORT=$BOOTAH_PORT
HOST=0.0.0.0

# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgresql://bootah:$POSTGRES_PASSWORD@postgres:5432/bootah

# Authentication
AUTH_MODE=local
SESSION_SECRET=$SESSION_SECRET
ALLOW_REGISTRATION=true
DEFAULT_USER_ROLE=viewer

# PXE Configuration
PXE_SERVER_IP=$PXE_SERVER_IP
TFTP_PORT=6969
DHCP_PORT=4067

# Email Configuration
EMAIL_PROVIDER=$EMAIL_PROVIDER
EOF

    if [ "$EMAIL_PROVIDER" = "smtp" ]; then
        cat >> .env << EOF
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
EMAIL_FROM=$EMAIL_FROM
EOF
    elif [ "$EMAIL_PROVIDER" = "sendgrid" ]; then
        cat >> .env << EOF
SENDGRID_API_KEY=$SENDGRID_API_KEY
EMAIL_FROM=$EMAIL_FROM
EOF
    fi
    
    print_status "Created .env file"
    
    # Create docker-compose.yml (builds from source)
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: bootah-postgres
    environment:
      POSTGRES_USER: bootah
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: bootah
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bootah -d bootah"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  bootah:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bootah-app
    env_file: .env
    environment:
      DATABASE_URL: postgresql://bootah:${POSTGRES_PASSWORD}@postgres:5432/bootah
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "${PORT:-5000}:5000"
      - "6969:6969/udp"
      - "4067:4067/udp"
    volumes:
      - bootah_images:/app/images
      - bootah_logs:/app/logs
    restart: unless-stopped

volumes:
  postgres_data:
  bootah_images:
  bootah_logs:
EOF
    
    print_status "Created docker-compose.yml"
    
    # Create data directories
    mkdir -p data/images data/logs
    print_status "Created data directories"
}

# Start services
start_services() {
    echo ""
    print_info "Starting Bootah services..."
    
    cd "$INSTALL_DIR"
    $COMPOSE_CMD pull 2>/dev/null || print_warning "Could not pull latest images, will build locally"
    $COMPOSE_CMD up -d
    
    print_status "Services started"
}

# Wait for services to be ready
wait_for_ready() {
    echo ""
    print_info "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$BOOTAH_PORT/api/server-status" >/dev/null 2>&1; then
            print_status "Bootah is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo ""
    print_warning "Service may still be starting. Check logs with: $COMPOSE_CMD logs -f"
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
    echo "Useful commands:"
    echo "  cd $INSTALL_DIR"
    echo "  $COMPOSE_CMD logs -f        # View logs"
    echo "  $COMPOSE_CMD restart        # Restart services"
    echo "  $COMPOSE_CMD down           # Stop services"
    echo "  $COMPOSE_CMD up -d          # Start services"
    echo ""
    print_info "Your configuration is saved in: $INSTALL_DIR/.env"
}

# Main installation flow
main() {
    check_prerequisites
    configure_installation
    create_installation
    start_services
    wait_for_ready
    print_completion
}

# Run main function
main
