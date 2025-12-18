# Bootah - Complete Standalone Installation Guide

This guide provides step-by-step instructions to install and run Bootah as a standalone PXE boot and OS imaging platform on your infrastructure.

## 📋 Table of Contents

1. [Choose Your Installation Method](#choose-your-installation-method)
2. [Docker Installation (Recommended)](#docker-installation-recommended)
3. [Linux Bare Metal Installation](#linux-bare-metal-installation)
4. [Database Setup](#database-setup)
5. [Configuration](#configuration)
6. [Verification & Testing](#verification--testing)
7. [Post-Installation](#post-installation)
8. [Troubleshooting](#troubleshooting)

---

## Choose Your Installation Method

| Method | Difficulty | Setup Time | Best For | Requirements |
|--------|-----------|-----------|---------|--------------|
| **Docker** ⭐ | Easy | 5 min | Most users, development | Docker, Docker Compose |
| **Linux** | Medium | 15 min | Production, single host | Ubuntu 22.04/Debian 12 |
| **Proxmox LXC** | Medium | 20 min | Proxmox environments | Proxmox VE 8.x |
| **Kubernetes** | Expert | 45 min | Enterprise, cloud | Kubernetes 1.20+ |

**For first-time users: Use Docker Installation** ✅

### Automated Installers

**Step 1: Get the files first:**

**Option A: Download from Replit (Current)**
1. Open Bootah project in Replit
2. Click three-dot menu > "Download as zip"
3. Extract and transfer to server:
```bash
# Create directory and transfer (use /. to include hidden files):
ssh user@server "mkdir -p ~/bootah"
scp -r ~/Downloads/bootah-main/. user@server:~/bootah/
ssh user@server
cd ~/bootah
```

**Option B: Git Clone (Once Repository is Public)**
```bash
git clone https://github.com/drifftr6x/bootah.git
cd bootah
```

**Option C: Download Archive (Once Repository is Public)**
```bash
wget https://github.com/drifftr6x/bootah/archive/refs/heads/main.zip
unzip main.zip && cd bootah-main
```

**Step 2: Run the installer:**
```bash
# Docker (easiest)
./scripts/install-docker.sh

# Linux bare metal
sudo ./scripts/install-linux.sh

# Proxmox LXC container
./scripts/install-proxmox.sh
```

**Alternative: One-Line Install (Once Repository is Public)**
```bash
# These work after the GitHub repository is made public:
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-docker.sh | bash
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-linux.sh | sudo bash
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-proxmox.sh | bash
```

---

## Docker Installation (Recommended)

### Prerequisites

- Docker Engine 20.10 or later
- Docker Compose 1.29 or later
- 4GB RAM minimum
- 2 CPU cores minimum
- 30GB free disk space

### Step 1: Install Docker

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER
newgrp docker  # Apply group membership without logout
```

**macOS:**
```bash
brew install docker docker-compose
# Then start Docker Desktop from Applications
```

**Windows:**
- Download and install Docker Desktop from https://www.docker.com/products/docker-desktop
- Enable WSL 2 if prompted

### Step 2: Get Bootah Files

**Option A: Download from Replit (Current)**
1. Open Bootah project in Replit
2. Click three-dot menu > "Download as zip"
3. Extract and transfer to server:
```bash
# Create directory and transfer (use /. to include hidden files):
ssh user@server "mkdir -p ~/bootah"
scp -r ~/Downloads/bootah-main/. user@server:~/bootah/
ssh user@server
cd ~/bootah
```

**Option B: Git Clone (Once Repository is Public)**
```bash
git clone https://github.com/drifftr6x/bootah.git
cd bootah
```

**Option C: Download Archive (Once Repository is Public)**
```bash
wget https://github.com/drifftr6x/bootah/archive/refs/heads/main.zip
unzip main.zip && cd bootah-main
```

### Step 3: Create Environment File

Create `.env` file in the Bootah directory (this generates secure secrets automatically):

```bash
# Generate secure passwords and create .env file
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
SESSION_SECRET=$(openssl rand -base64 32)
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "192.168.1.50")

cat > .env << EOF
# Application Settings
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://bootah:${POSTGRES_PASSWORD}@postgres:5432/bootah

# Security
SESSION_SECRET=${SESSION_SECRET}

# Role Configuration (options: admin, operator, viewer)
DEFAULT_USER_ROLE=admin

# PXE Configuration
PXE_SERVER_IP=${SERVER_IP}
TFTP_PORT=6969
DHCP_PORT=4067
EOF

echo "Generated .env with SERVER_IP=${SERVER_IP}"
```

**Important:** Verify the `PXE_SERVER_IP` matches your server's actual IP address on the network where PXE clients will boot from.

### Step 4: Use the Included Docker Compose

The repository includes a pre-configured `docker-compose.yml` that uses environment variables from your `.env` file. Simply run:

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f
```

The included `docker-compose.yml` will:
- Start PostgreSQL with your generated password
- Build and run the Bootah application
- Configure all ports (web UI, TFTP, DHCP proxy)
- Persist data in Docker volumes

### Step 5: Build and Start

```bash
# Build Docker image
docker-compose build

# Start services
docker-compose up -d

# View logs (optional, for debugging)
docker-compose logs -f bootah
```

**Wait 30-60 seconds for services to start.** The application performs database initialization on first run.

### Step 6: Verify Docker Installation

```bash
# Check container status
docker-compose ps

# Expected output:
# NAME              COMMAND             STATUS
# bootah-postgres   "docker-entrypoint" Up (healthy)
# bootah-app        "node dist/index.js" Up (healthy)
```

### Step 7: Access Bootah

Open your browser and navigate to:
```
http://localhost:5000
```

Or use your server's IP:
```
http://192.168.1.50:5000
```

You should see the Bootah login page.

---

## Linux Bare Metal Installation

### Prerequisites

- Ubuntu 22.04 LTS or Debian 12
- 2GB+ RAM
- 2+ CPU cores
- 30GB free disk space
- Root or sudo access
- PostgreSQL 14+ or access to external database

### Step 1: System Update

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### Step 2: Install Dependencies

```bash
sudo apt-get install -y \
  curl \
  git \
  nodejs \
  npm \
  postgresql \
  postgresql-contrib \
  net-tools \
  build-essential \
  python3-dev
```

### Step 3: Verify Node.js Version

```bash
node --version  # Should be 18.x or higher
npm --version   # Should be 8.x or higher
```

### Step 4: Get Bootah Files

**Option A: Download from Replit (Current)**
1. Download zip from Replit (three-dot menu > "Download as zip")
2. Extract and transfer to server:
```bash
scp -r ~/Downloads/bootah-main user@server:/tmp/
ssh user@server
sudo mv /tmp/bootah-main /opt/bootah
sudo chown -R $USER:$USER /opt/bootah
cd /opt/bootah
```

**Option B: Git Clone (Once Repository is Public)**
```bash
cd /opt
sudo git clone https://github.com/drifftr6x/bootah.git bootah
sudo chown -R $USER:$USER /opt/bootah
cd /opt/bootah
```

### Step 5: Create Environment File

```bash
cat > /opt/bootah/.env << 'EOF'
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://bootah:bootah_password@localhost:5432/bootah
SESSION_SECRET=$(openssl rand -base64 32)
DEFAULT_USER_ROLE=admin
PXE_SERVER_IP=192.168.1.50
TFTP_PORT=6969
DHCP_PORT=4067
EOF
```

### Step 6: Setup PostgreSQL Database

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database user
sudo -u postgres psql << SQL
CREATE USER bootah WITH PASSWORD 'bootah_password';
CREATE DATABASE bootah OWNER bootah;
ALTER ROLE bootah CREATEDB;
SQL

# Verify connection
PGPASSWORD=bootah_password psql -h localhost -U bootah -d bootah -c "SELECT version();"
```

### Step 7: Install Node Dependencies

```bash
cd /opt/bootah
npm install
```

### Step 8: Build Application

```bash
npm run build
```

### Step 9: Create Systemd Service

```bash
sudo tee /etc/systemd/system/bootah.service > /dev/null << 'EOF'
[Unit]
Description=Bootah PXE Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$USER
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

sudo mkdir -p /var/log/bootah
sudo chown $USER:$USER /var/log/bootah
```

### Step 10: Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable bootah
sudo systemctl start bootah

# Check status
sudo systemctl status bootah

# View logs
sudo journalctl -u bootah -f
```

### Step 11: Verify Installation

```bash
# Check service is running
sudo systemctl is-active bootah

# Check logs for startup messages
sudo journalctl -u bootah -n 20

# Test API endpoint
curl http://localhost:5000/api/auth/user
```

---

## Database Setup

### Apply Schema (First Time Only)

If using a **new PostgreSQL database**, apply the schema:

**Option A: Automatic (Recommended)**
```bash
# From bootah directory
npm run db:push
```

**Option B: Manual SQL**
If Option A doesn't work, follow [PRODUCTION_MIGRATION_OPTION_B.md](PRODUCTION_MIGRATION_OPTION_B.md) for manual SQL application.

### Verify Database

```bash
# Connect to database
PGPASSWORD=bootah_password psql -h localhost -U bootah -d bootah

# Run verification queries
\dt                           # List all tables
SELECT COUNT(*) FROM devices; # Should return 0 initially
\q                            # Exit
```

---

## Configuration

### Basic Settings

**Environment Variables** (in `.env` file):

```bash
# Application
NODE_ENV=production           # development or production
PORT=5000                    # Application port
HOST=0.0.0.0                # Bind to all interfaces

# Database
DATABASE_URL=postgresql://..  # PostgreSQL connection string

# Security
SESSION_SECRET=<random>       # Generate: openssl rand -base64 32
DEFAULT_USER_ROLE=admin       # admin, operator, or viewer

# PXE/Networking
PXE_SERVER_IP=192.168.1.50   # Your server's IP address
TFTP_PORT=6969               # TFTP port (non-privileged)
DHCP_PORT=4067               # DHCP proxy port (non-privileged)
```

### Network Configuration

**Important: Configure your router/network appropriately:**

1. **DHCP Server**: Ensure your main DHCP server includes PXE boot server info
   - Option 66 (TFTP Server): Point to Bootah server IP
   - Option 67 (Boot File): `bootah.ipxe`

2. **Firewall Rules** (if using firewall):
   ```bash
   sudo ufw allow 5000/tcp   # Web UI
   sudo ufw allow 6969/udp   # TFTP
   sudo ufw allow 4067/udp   # DHCP Proxy
   ```

3. **Port Forwarding** (if behind NAT):
   - Forward port 5000 to your Bootah server IP on port 5000

---

## Verification & Testing

### 1. Web Interface Access

```bash
# Test local access
curl -I http://localhost:5000

# Test from another machine
curl -I http://192.168.1.50:5000
```

### 2. API Endpoints

```bash
# Health check
curl http://localhost:5000/api/system/status

# Devices list (may require auth)
curl http://localhost:5000/api/devices
```

### 3. Database Connectivity

```bash
# Check database connection
curl http://localhost:5000/api/auth/user

# Should return 401 Unauthorized (expected, no session)
```

### 4. PXE Services

```bash
# Check TFTP (replace 192.168.1.50 with your IP)
tftp 192.168.1.50
> get bootah.ipxe
> quit

# Check if bootah.ipxe downloaded successfully
ls -lh bootah.ipxe
```

### 5. Full Application Test

1. Open browser: `http://localhost:5000`
2. You should see login page
3. Login with default credentials (first time setup)
4. Navigate to:
   - **Devices**: Should be empty initially
   - **Images**: Add an OS image
   - **Device Groups**: Create a test group
   - **Templates**: Create a deployment template

---

## Post-Installation

### 1. Secure Your Installation

```bash
# Change default passwords
# - Create admin user with strong password
# - Disable anonymous access (if applicable)

# Generate new SESSION_SECRET
openssl rand -base64 32

# Update .env with new secret
# Restart application
docker-compose restart bootah  # Docker
sudo systemctl restart bootah   # Linux
```

### 2. Setup OS Images

```bash
# Option A: Upload through Web UI
# 1. Go to Images page
# 2. Upload Windows/Linux ISO or WIM files

# Option B: Copy to image directory
mkdir -p /opt/bootah/images
cp /path/to/ubuntu-22.04.iso /opt/bootah/images/
```

### 3. Configure Device Discovery

**Option A: Auto-Discovery**
- Devices on same network will be auto-discovered via PXE

**Option B: Manual Addition**
```bash
# Go to Devices page and add manually:
- Device Name: WORKSTATION-01
- MAC Address: 00:1A:2B:3C:4D:5E
- IP Address: 192.168.1.101
```

### 4. Create First Deployment

1. Go to **Deployments**
2. Click **New Deployment**
3. Select device and image
4. Review settings
5. Click **Deploy**

### 5. Monitor Progress

- Real-time progress visible in Deployments page
- Logs available in Activity section
- WebSocket connection for live updates

### 6. Setup Backups

**Docker:**
```bash
# Backup database
docker-compose exec postgres pg_dump -U bootah -d bootah > bootah_backup_$(date +%Y%m%d).sql

# Backup configuration
tar -czf bootah_config_$(date +%Y%m%d).tar.gz /opt/bootah/.env

# Backup images
tar -czf bootah_images_$(date +%Y%m%d).tar.gz /opt/bootah/images/
```

**Linux:**
```bash
# Same commands, without docker-compose exec
pg_dump -U bootah -d bootah > bootah_backup_$(date +%Y%m%d).sql
tar -czf bootah_config_$(date +%Y%m%d).tar.gz /opt/bootah/.env
```

---

## Troubleshooting

### Connection Refused

```bash
# Check if service is running
docker-compose ps                    # Docker
sudo systemctl status bootah         # Linux

# Check logs
docker-compose logs bootah           # Docker
sudo journalctl -u bootah -f         # Linux

# Restart service
docker-compose restart bootah        # Docker
sudo systemctl restart bootah        # Linux
```

### Database Connection Error

```bash
# Test PostgreSQL connection
PGPASSWORD=bootah_password psql -h localhost -U bootah -d bootah

# Check database service
sudo systemctl status postgresql     # Linux
docker-compose ps postgres           # Docker

# Verify DATABASE_URL in .env is correct
cat .env | grep DATABASE_URL
```

### Port Already in Use

```bash
# Find process using port 5000
sudo lsof -i :5000
sudo netstat -tulpn | grep 5000

# Kill process (if safe)
sudo kill -9 <PID>

# Or change PORT in .env
PORT=8000  # Use different port
```

### PXE/TFTP Not Working

```bash
# Check TFTP port open
sudo netstat -tulpn | grep 6969

# Check firewall
sudo ufw status
sudo ufw allow 6969/udp

# Test TFTP connection
tftp -l bootah.ipxe 192.168.1.50 6969 get
```

### Device Not Discovering

```bash
# Ensure device is on same network
ping <device-ip>

# Check device logs for boot attempts
curl http://localhost:5000/api/deployments

# Verify PXE server IP in .env
grep PXE_SERVER_IP .env

# Check network boots (check device BIOS/UEFI settings)
# - Enable PXE/Network Boot
# - Set boot order to PXE first
```

### Performance Issues

```bash
# Increase resources
# Docker: Edit docker-compose.yml - add resources section
# Linux: Monitor with top/htop

# Check database performance
# Enable query logging in PostgreSQL
sudo -u postgres psql -d bootah -c "ALTER SYSTEM SET log_statement = 'all';"
sudo systemctl restart postgresql
```

### SSL/HTTPS Issues

For production with HTTPS, use a reverse proxy:

```bash
# Using Nginx (example)
sudo apt-get install nginx
# Configure Nginx to proxy to localhost:5000 with SSL
# See full setup in SELF_HOSTING_INSTALLATION.md
```

---

## Next Steps

### For Administrators

1. ✅ Complete initial setup
2. 📚 Read [SELF_HOSTING_INSTALLATION.md](SELF_HOSTING_INSTALLATION.md) for advanced configs
3. 🔒 Setup SSL/HTTPS with reverse proxy
4. 📊 Configure monitoring and alerting
5. 🔄 Setup automated backups

### For Development

1. See [README.md](README.md) for development setup
2. See [IMPROVEMENTS_ROADMAP.md](IMPROVEMENTS_ROADMAP.md) for feature planning

### For Proxmox Deployment

See [PROXMOX_INSTALLATION_GUIDE.md](PROXMOX_INSTALLATION_GUIDE.md)

### For Kubernetes

See [SELF_HOSTING_INSTALLATION.md - Kubernetes Section](SELF_HOSTING_INSTALLATION.md)

---

## Support & Debugging

### Enable Debug Logging

```bash
# Docker
DEBUG=bootah:* docker-compose up

# Linux
DEBUG=bootah:* systemctl start bootah
```

### Collect System Information

```bash
# System info
uname -a
docker --version
docker-compose --version
node --version

# Network info
ip addr
netstat -tlnp | grep 5000
netstat -tulpn | grep 6969

# Logs
docker-compose logs --tail=100 bootah
journalctl -u bootah -n 100
```

### Check Common Issues

- [ ] PostgreSQL is running
- [ ] Network connectivity to devices
- [ ] Firewall not blocking ports
- [ ] PXE_SERVER_IP is correct
- [ ] DATABASE_URL connection working
- [ ] SESSION_SECRET is set
- [ ] TFTP/DHCP ports not in use

---

## Maintenance

### Update Bootah

```bash
# Docker
cd /path/to/bootah
git pull origin main
docker-compose build
docker-compose up -d

# Linux
cd /opt/bootah
git pull origin main
npm install
npm run build
sudo systemctl restart bootah
```

### Monitor Application Health

```bash
# Docker
docker-compose ps
docker-compose stats

# Linux
systemctl status bootah
journalctl -u bootah --since "1 hour ago"
```

---

**Need Help?** Check logs, verify network connectivity, and ensure all prerequisites are installed.

**For detailed configuration options**, see [SELF_HOSTING_INSTALLATION.md](SELF_HOSTING_INSTALLATION.md).
