#!/bin/bash
# Bootah Docker Installation Script
# This script automates the Docker installation of Bootah

set -e

echo "=========================================="
echo "Bootah Docker Installation Script"
echo "=========================================="
echo ""

# Check Docker and Docker Compose installation
echo "Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   Ubuntu/Debian: sudo apt-get install -y docker.io docker-compose"
    echo "   macOS: brew install docker docker-compose"
    echo "   Windows: Download Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install it first."
    exit 1
fi

echo "✓ Docker and Docker Compose found"
echo ""

# Clone repository if not already in bootah directory
if [ ! -f "docker-compose.yml" ]; then
    echo "No docker-compose.yml found. Cloning Bootah repository..."
    read -p "Enter GitHub repository URL (default: https://github.com/yourusername/bootah.git): " REPO_URL
    REPO_URL=${REPO_URL:-https://github.com/yourusername/bootah.git}
    
    git clone "$REPO_URL" bootah
    cd bootah
fi

echo "Setting up Bootah Docker environment..."
echo ""

# Create .env file
echo "Creating environment configuration..."
if [ -f ".env" ]; then
    echo "⚠ .env file already exists. Skipping..."
else
    read -p "Enter your server's IP address (e.g., 192.168.1.50): " SERVER_IP
    SERVER_IP=${SERVER_IP:-192.168.1.50}
    
    # Generate secure session secret
    SESSION_SECRET=$(openssl rand -base64 32)
    
    cat > .env << EOF
# Application Settings
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://bootah:bootah_secure_password@postgres:5432/bootah

# Security
SESSION_SECRET=$SESSION_SECRET

# Role Configuration (admin, operator, viewer)
DEFAULT_USER_ROLE=admin

# PXE Configuration
PXE_SERVER_IP=$SERVER_IP
TFTP_PORT=6969
DHCP_PORT=4067
HTTP_PORT=80
EOF
    
    echo "✓ Environment configuration created"
fi

echo ""
echo "Building Docker image..."
docker-compose build

echo ""
echo "Starting Bootah services..."
docker-compose up -d

echo ""
echo "=========================================="
echo "✓ Bootah installation complete!"
echo "=========================================="
echo ""
echo "Waiting for services to start (30 seconds)..."
sleep 30

# Check service status
echo ""
echo "Service Status:"
docker-compose ps

echo ""
echo "=========================================="
echo "✓ Installation successful!"
echo "=========================================="
echo ""
echo "Access your Bootah installation:"
echo "  Local: http://localhost:5000"
echo "  Network: http://$SERVER_IP:5000"
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:5000 in your browser"
echo "  2. Login with your default admin credentials"
echo "  3. Go to Images page to upload OS images"
echo "  4. Create Device Groups for organization"
echo "  5. Start deploying to devices"
echo ""
echo "For more information, see STANDALONE_INSTALL.md"
echo ""
