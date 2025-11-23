#!/bin/bash
# Bootah Proxmox LXC Installation Script
# This script sets up Bootah in a Proxmox LXC container (Ubuntu 22.04)

set -e

echo "=========================================="
echo "Bootah Proxmox LXC Installation"
echo "=========================================="
echo ""
echo "This script should be run INSIDE a Proxmox LXC container"
echo "Container should be created with:"
echo "  - Template: Ubuntu 22.04"
echo "  - 2+ CPU cores"
echo "  - 4GB+ RAM"
echo "  - 30GB+ disk"
echo ""

# Check if inside LXC container
if [ ! -f /.dockerenv ] && grep -q lxc /proc/self/cgroup 2>/dev/null; then
    echo "✓ Running inside Proxmox LXC container"
else
    echo "⚠ Warning: This may not be running inside an LXC container"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Step 1: Update system packages..."
apt-get update
apt-get upgrade -y

echo "Step 2: Install dependencies..."
apt-get install -y \
    curl \
    git \
    nodejs \
    npm \
    postgresql \
    postgresql-contrib \
    net-tools \
    build-essential \
    python3-dev \
    openssh-server

echo "✓ Dependencies installed"
echo ""

# Enable SSH
systemctl enable ssh
systemctl start ssh

echo "Step 3: Setting up PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

# Create database
PGPASSWORD=bootah_password sudo -u postgres psql << SQL
CREATE USER IF NOT EXISTS bootah WITH PASSWORD 'bootah_password';
CREATE DATABASE IF NOT EXISTS bootah OWNER bootah;
ALTER ROLE bootah CREATEDB;
SQL

echo "✓ PostgreSQL configured"
echo ""

echo "Step 4: Creating Bootah user..."
useradd -m -s /bin/bash -G sudo bootah 2>/dev/null || echo "User bootah already exists"

echo "Step 5: Cloning Bootah repository..."
sudo -u bootah git clone https://github.com/yourusername/bootah.git /home/bootah/bootah
cd /home/bootah/bootah

echo "Step 6: Creating environment configuration..."
read -p "Enter container's IP address (use: ip addr show): " CONTAINER_IP
CONTAINER_IP=${CONTAINER_IP:-192.168.1.100}

SESSION_SECRET=$(openssl rand -base64 32)

sudo -u bootah cat > /home/bootah/bootah/.env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://bootah:bootah_password@localhost:5432/bootah
SESSION_SECRET=$SESSION_SECRET
DEFAULT_USER_ROLE=admin
PXE_SERVER_IP=$CONTAINER_IP
TFTP_PORT=6969
DHCP_PORT=4067
EOF

echo "✓ Environment created"
echo ""

echo "Step 7: Installing Node dependencies..."
sudo -u bootah npm install

echo "Step 8: Building application..."
sudo -u bootah npm run build

echo "Step 9: Creating systemd service..."
cat > /etc/systemd/system/bootah.service << EOF
[Unit]
Description=Bootah PXE Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=bootah
WorkingDirectory=/home/bootah/bootah
Environment="NODE_ENV=production"
Environment="PORT=5000"
Environment="DATABASE_URL=postgresql://bootah:bootah_password@localhost:5432/bootah"
ExecStart=/usr/bin/node /home/bootah/bootah/dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/bootah/bootah.log
StandardError=append:/var/log/bootah/bootah-error.log

[Install]
WantedBy=multi-user.target
EOF

mkdir -p /var/log/bootah
chown bootah:bootah /var/log/bootah

echo "✓ Service created"
echo ""

echo "Step 10: Starting Bootah service..."
systemctl daemon-reload
systemctl enable bootah
systemctl start bootah

echo ""
echo "Waiting for service to start (15 seconds)..."
sleep 15

echo ""
echo "Service Status:"
systemctl status bootah --no-pager

echo ""
echo "=========================================="
echo "✓ Bootah installation complete!"
echo "=========================================="
echo ""
echo "Container Information:"
echo "  SSH Access: ssh bootah@$CONTAINER_IP"
echo "  Web UI: http://$CONTAINER_IP:5000"
echo ""
echo "Proxmox Configuration Needed:"
echo "  1. Allow port forwarding (5000, 6969/udp, 4067/udp) if needed"
echo "  2. Configure DHCP Option 66 to point to this container IP"
echo "  3. Enable IP forwarding on host for TFTP/DHCP"
echo ""
echo "Useful commands:"
echo "  View logs:     sudo journalctl -u bootah -f"
echo "  Start service: sudo systemctl start bootah"
echo "  Stop service:  sudo systemctl stop bootah"
echo ""
echo "For more information, see PROXMOX_INSTALLATION_GUIDE.md"
echo ""
