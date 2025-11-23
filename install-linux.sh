#!/bin/bash
# Bootah Linux Bare Metal Installation Script
# This script automates installation on Ubuntu 22.04 / Debian 12

set -e

echo "=========================================="
echo "Bootah Linux Installation Script"
echo "=========================================="
echo ""

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo "⚠ This script must be run as root (use: sudo ./install-linux.sh)"
   exit 1
fi

# Detect OS
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
        echo "⚠ This script is designed for Ubuntu/Debian. Your OS: $ID"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

echo "Updating system packages..."
apt-get update
apt-get upgrade -y

echo "Installing dependencies..."
apt-get install -y \
    curl \
    git \
    nodejs \
    npm \
    postgresql \
    postgresql-contrib \
    net-tools \
    build-essential \
    python3-dev

echo "✓ Dependencies installed"
echo ""

# Verify Node.js version
NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"
echo ""

# Setup PostgreSQL
echo "Setting up PostgreSQL database..."
systemctl start postgresql
systemctl enable postgresql

# Create database user and database
PGPASSWORD=bootah_password sudo -u postgres psql << SQL
CREATE USER IF NOT EXISTS bootah WITH PASSWORD 'bootah_password';
CREATE DATABASE IF NOT EXISTS bootah OWNER bootah;
ALTER ROLE bootah CREATEDB;
SQL

echo "✓ PostgreSQL database created"
echo ""

# Clone or navigate to Bootah directory
if [ ! -f "package.json" ]; then
    echo "Cloning Bootah repository..."
    read -p "Enter GitHub repository URL (default: https://github.com/yourusername/bootah.git): " REPO_URL
    REPO_URL=${REPO_URL:-https://github.com/yourusername/bootah.git}
    
    cd /opt
    git clone "$REPO_URL" bootah
    cd bootah
else
    echo "Using existing Bootah installation"
    cd /opt/bootah
fi

# Create environment file
echo "Creating environment configuration..."
if [ -f ".env" ]; then
    echo "⚠ .env file already exists. Skipping..."
else
    read -p "Enter your server's IP address (e.g., 192.168.1.50): " SERVER_IP
    SERVER_IP=${SERVER_IP:-192.168.1.50}
    
    SESSION_SECRET=$(openssl rand -base64 32)
    
    cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://bootah:bootah_password@localhost:5432/bootah
SESSION_SECRET=$SESSION_SECRET
DEFAULT_USER_ROLE=admin
PXE_SERVER_IP=$SERVER_IP
TFTP_PORT=6969
DHCP_PORT=4067
EOF
    
    echo "✓ Environment configuration created"
fi

echo ""
echo "Installing Node dependencies..."
npm install

echo ""
echo "Building application..."
npm run build

echo ""
echo "Creating systemd service..."
cat > /etc/systemd/system/bootah.service << 'EOF'
[Unit]
Description=Bootah PXE Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bootah
Environment="NODE_ENV=production"
Environment="PORT=5000"
Environment="DATABASE_URL=postgresql://bootah:bootah_password@localhost:5432/bootah"
ExecStart=/usr/bin/node /opt/bootah/dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/bootah/bootah.log
StandardError=append:/var/log/bootah/bootah-error.log

[Install]
WantedBy=multi-user.target
EOF

mkdir -p /var/log/bootah
chmod 755 /var/log/bootah

echo "✓ Systemd service created"
echo ""

echo "Starting Bootah service..."
systemctl daemon-reload
systemctl enable bootah
systemctl start bootah

echo ""
echo "Waiting for service to start (10 seconds)..."
sleep 10

# Check service status
echo ""
echo "Service Status:"
systemctl status bootah --no-pager

echo ""
echo "=========================================="
echo "✓ Bootah installation complete!"
echo "=========================================="
echo ""
echo "Access your Bootah installation:"
echo "  Local: http://localhost:5000"
echo "  Network: http://$SERVER_IP:5000"
echo ""
echo "Useful commands:"
echo "  Start service:    sudo systemctl start bootah"
echo "  Stop service:     sudo systemctl stop bootah"
echo "  View logs:        sudo journalctl -u bootah -f"
echo "  Service status:   sudo systemctl status bootah"
echo ""
echo "For more information, see STANDALONE_INSTALL.md"
echo ""
