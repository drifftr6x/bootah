# Bootah - Complete Proxmox Installation Guide

## 🚀 Quick Start - Installation Options

Choose the installation method that works for your situation:

### Option A: Download & Run Locally (Recommended for Testing)

```bash
# 1. Create Ubuntu 24.04 LXC container in Proxmox (see Part 1 below)
# 2. Enter the container
pct enter <CTID>
```

**Get Bootah files (choose one method):**

**Method 1: Download from Replit (Current)**
1. Open Bootah project in Replit
2. Click three-dot menu > "Download as zip"
3. Extract on your local machine
4. Transfer to container:
```bash
# First, create the directory on the container:
ssh root@<container-ip> "mkdir -p /root/bootah"
# Then transfer files (use /. to include hidden files):
scp -r ~/Downloads/bootah-main/. root@<container-ip>:/root/bootah/
```

**Method 2: Git Clone (Once Repository is Public)**
```bash
git clone https://github.com/drifftr6x/bootah.git
cd bootah
```

**Method 3: Copy from Local Machine**
```bash
scp -r /path/to/bootah root@<container-ip>:/root/
```

**Run the installer:**
```bash
cd /root/bootah
chmod +x scripts/install-proxmox.sh
./scripts/install-proxmox.sh
```

### Option B: One-Line Remote Install (Once Repository is Public)

```bash
# After the GitHub repository is public:
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-proxmox.sh | bash
```

### Option C: Manual Installation (Copy/Paste Steps Below)

See [Part 3: Install Dependencies](#part-3-install-dependencies) for complete manual steps.

---

The install script will:
- Detect if running inside LXC container
- Install Node.js 20 and PostgreSQL
- Prompt for configuration (IP, ports, email)
- Build and deploy the application
- Create systemd service (or init script)
- Start Bootah automatically

---

## 📖 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Part 1: Create Proxmox Container/VM](#part-1-create-the-proxmox-containervm)
4. [Part 2: Initial Container Setup](#part-2-initial-container-setup)
5. [Part 3: Install Dependencies](#part-3-install-dependencies)
6. [Part 4: Deploy Bootah Application](#part-4-deploy-bootah-application)
7. [Part 5: Network & PXE Configuration](#part-5-network--pxe-configuration)
8. [Part 6: Start Bootah Application](#part-6-start-bootah-application)
9. [Part 7: Integrate with Clonezilla (Optional)](#part-7-integrate-with-clonezilla-optional)
10. [Part 8: Setup Reverse Proxy (Production)](#part-8-setup-reverse-proxy-production)
11. [Part 9: Testing & Verification](#part-9-testing--verification)
12. [Part 10: Production Hardening](#part-10-production-hardening)
13. [Part 11: Network Architecture Examples](#part-11-network-architecture-examples)
14. [Common Issues & Solutions](#common-issues--solutions)
15. [Quick Reference Commands](#quick-reference-commands)

---

## 🏗️ Architecture Overview

**Bootah is a modern PXE boot management platform** that can work alongside or replace Clonezilla Server. Here are your deployment options:

### Option A: Bootah + Clonezilla Hybrid
- Bootah manages the PXE boot infrastructure and deployment orchestration
- Clonezilla handles the actual disk imaging
- **Best for:** Organizations migrating from Clonezilla

### Option B: Standalone Bootah  
- Bootah manages everything: PXE boot, image deployment, monitoring
- Clonezilla removed or not installed
- **Best for:** New deployments, modern infrastructure

---

## 📋 Prerequisites

- ✅ Proxmox VE 8.x installed and configured
- ✅ Network with DHCP server (or ability to configure one)
- ✅ Static IP address for the PXE server
- ✅ At least 4GB RAM, 2 CPU cores available
- ✅ 50GB+ storage for OS images

---

## 🚀 Part 1: Create the Proxmox Container/VM

### Decision: LXC Container vs VM

**✅ Recommended: LXC Container**
- 65% less overhead than VM
- Fast startup (<5 seconds)
- Perfect for Node.js applications
- Easy backups and cloning

**Use VM only if:**
- You need Docker integration
- Running untrusted third-party code
- Need kernel-level isolation

### Step 1.1: Create Ubuntu LXC Container

**In Proxmox Web UI:**

1. **Create CT** (top-right button)
   - Template: `Ubuntu 24.04 LTS` or `Ubuntu 22.04 LTS`
   - CT ID: e.g., `100`
   - Hostname: `bootah-server`
   - Password: Set root password

2. **Resources:**
   - **CPU**: 2 cores minimum (4 recommended for production)
   - **Memory**: 2048 MB minimum (4096 MB recommended)
   - **Swap**: 512 MB
   - **Disk**: 20 GB minimum (50+ GB if storing many images)

3. **Network:**
   - **Bridge**: `vmbr0` (or your main network bridge)
   - **IPv4**: Static IP (e.g., `192.168.1.50/24`)
   - **Gateway**: Your network gateway (e.g., `192.168.1.1`)
   - **DNS**: Your DNS server (e.g., `192.168.1.1` or `8.8.8.8`)

4. **Options:**
   - **Unprivileged container**: ✅ Checked (for security)
   - **Start at boot**: ✅ Checked
   - **Nesting**: ✅ Checked (if you might use Docker later)

**Via Command Line (Alternative):**

```bash
# On Proxmox host
pct create 100 local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst \
  --hostname bootah-server \
  --cores 2 \
  --memory 2048 \
  --swap 512 \
  --storage local-lvm \
  --rootfs local-lvm:20 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.1.50/24,gw=192.168.1.1 \
  --unprivileged 1 \
  --onboot 1 \
  --features nesting=1

# Start the container
pct start 100
```

---

## 🔧 Part 2: Initial Container Setup

### Step 2.1: Access Container

```bash
# From Proxmox host
pct enter 100

# Or use Proxmox UI: Container → Console
```

### Step 2.2: System Updates

```bash
apt update && apt upgrade -y
apt install -y curl git wget nano htop net-tools sudo openssh-server unzip
```

### Step 2.3: Create Application User

```bash
# Create non-root user for running the application
adduser bootah
usermod -aG sudo bootah

# Switch to bootah user
su - bootah
```

---

## 💾 Part 3: Install Dependencies

### Step 3.1: Install Node.js (via NVM)

```bash
# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Install Node.js LTS (v20.x)
nvm install --lts
nvm use --lts

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Step 3.2: Install PostgreSQL

**Option A: Local PostgreSQL (Recommended for production)**

```bash
# Switch back to root
exit
sudo -i

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE bootah;
CREATE USER bootah WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE bootah TO bootah;
\c bootah
GRANT ALL ON SCHEMA public TO bootah;
ALTER DATABASE bootah OWNER TO bootah;
EOF
```

**Option B: Use Neon Database (Cloud PostgreSQL)**

The application is already configured to use Neon. You'll just need the DATABASE_URL environment variable (covered in Part 4).

### Step 3.3: Install PM2 Process Manager

```bash
# Switch to bootah user
su - bootah

# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

---

## 📦 Part 4: Deploy Bootah Application

### Step 4.1: Get Bootah Files

```bash
# As bootah user
cd /home/bootah
```

**Option A: Download from Replit (Current)**
1. Download zip from Replit (three-dot menu > "Download as zip")
2. Create directory and transfer to container:
```bash
# Create directory on container first:
ssh bootah@<container-ip> "mkdir -p /home/bootah/bootah"
# Transfer files (use /. to include hidden files):
scp -r ~/Downloads/bootah-main/. bootah@<container-ip>:/home/bootah/bootah/
# Navigate to directory:
ssh bootah@<container-ip>
cd /home/bootah/bootah
```

**Option B: Git Clone (Once Repository is Public)**
```bash
git clone https://github.com/drifftr6x/bootah.git
cd bootah
```

**Option C: Copy from Local Machine**
```bash
scp -r /path/to/bootah bootah@<container-ip>:/home/bootah/
```

### Step 4.2: Configure Environment Variables

```bash
# Create .env file
nano .env
```

**Add the following configuration:**

```env
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database (PostgreSQL)
# Option A: Local PostgreSQL
DATABASE_URL=postgresql://bootah:your_secure_password_here@localhost:5432/bootah

# Option B: Neon Database
# DATABASE_URL=postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/bootah?sslmode=require

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your_random_session_secret_here_min_32_chars

# RBAC Default Role (viewer, operator, or admin)
DEFAULT_USER_ROLE=admin

# Replit Auth (if using)
REPLIT_AUTH_ENABLED=false
# ISSUER_URL=https://replit.com
# REPL_ID=your-repl-id

# PXE Server Configuration
PXE_SERVER_IP=192.168.1.50
TFTP_PORT=69
HTTP_PORT=80
DHCP_PORT=67

# Image Storage
IMAGE_STORAGE_PATH=/home/bootah/images
```

**Save and exit** (Ctrl+X, Y, Enter)

### Step 4.3: Install Application Dependencies

```bash
npm install --production

# Build the application (if TypeScript compilation is needed)
npm run build
```

### Step 4.4: Run Database Migrations

```bash
# If using Drizzle ORM migrations
npm run db:migrate

# Or manually initialize schema
npx drizzle-kit push
```

### Step 4.5: Create Image Storage Directory

```bash
mkdir -p /home/bootah/images
chmod 755 /home/bootah/images
```

---

## 🌐 Part 5: Network & PXE Configuration

### Step 5.1: Configure DHCP (Proxy Mode)

Bootah includes a built-in DHCP proxy. If you have an existing DHCP server (like your router), Bootah will work alongside it.

**Option A: Use Bootah's Built-in DHCP Proxy** (Default)
- No additional configuration needed
- Bootah listens on port 4067 by default
- Works with existing network DHCP

**Option B: Configure dnsmasq for Full DHCP Control**

If you want dedicated DHCP for your imaging network:

```bash
# Install dnsmasq
sudo apt install -y dnsmasq

# Backup original config
sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.backup

# Create new config
sudo nano /etc/dnsmasq.conf
```

**Add this configuration:**

```ini
# Disable DNS (use existing DNS server)
port=0

# Enable DHCP logging
log-dhcp
log-facility=/var/log/dnsmasq.log

# DHCP range for PXE clients
# Adjust to match your network
interface=eth0
dhcp-range=192.168.1.100,192.168.1.200,12h

# Gateway and DNS
dhcp-option=3,192.168.1.1      # Gateway
dhcp-option=6,192.168.1.1      # DNS server

# PXE boot options
dhcp-boot=pxelinux.0,bootah-server,192.168.1.50

# Enable TFTP server
enable-tftp
tftp-root=/srv/tftp

# PXE boot files for different architectures
pxe-service=x86PC,"PXE Boot BIOS",pxelinux.0
pxe-service=X86-64_EFI,"PXE Boot UEFI",bootx64.efi
```

**Restart dnsmasq:**

```bash
sudo systemctl restart dnsmasq
sudo systemctl enable dnsmasq
```

### Step 5.2: Configure TFTP Server

Bootah has a built-in TFTP server, but you may want a traditional setup:

```bash
# Install TFTP server
sudo apt install -y tftpd-hpa

# Edit TFTP configuration
sudo nano /etc/default/tftpd-hpa
```

**Configure:**

```bash
TFTP_USERNAME="tftp"
TFTP_DIRECTORY="/srv/tftp"
TFTP_ADDRESS="0.0.0.0:69"
TFTP_OPTIONS="--secure"
```

**Create TFTP directory and restart:**

```bash
sudo mkdir -p /srv/tftp
sudo chown -R tftp:tftp /srv/tftp
sudo systemctl restart tftpd-hpa
sudo systemctl enable tftpd-hpa
```

### Step 5.3: Configure Firewall

```bash
# Allow PXE/DHCP traffic
sudo ufw allow 67/udp    # DHCP
sudo ufw allow 68/udp    # DHCP
sudo ufw allow 69/udp    # TFTP
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 5000/tcp  # Bootah web interface
sudo ufw allow 22/tcp    # SSH

# Enable firewall
sudo ufw enable
```

**On Proxmox host** (if Proxmox firewall is enabled):

```bash
# Edit /etc/pve/firewall/100.fw (where 100 is your CT ID)
[OPTIONS]
enable: 1

[RULES]
IN ACCEPT -p udp --dport 67:68
IN ACCEPT -p udp --dport 69
IN ACCEPT -p tcp --dport 80
IN ACCEPT -p tcp --dport 5000
IN ACCEPT -p tcp --dport 22
```

---

## 🚦 Part 6: Start Bootah Application

### Step 6.1: Start with PM2

```bash
# As bootah user
cd /home/bootah/bootah

# Start the application
pm2 start npm --name "bootah" -- run dev

# Or for production build:
pm2 start npm --name "bootah" -- start

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup systemd
# Copy and run the command it outputs (may need sudo)

# Verify it's running
pm2 status
pm2 logs bootah
```

### Step 6.2: Alternative: Systemd Service

**Create service file:**

```bash
sudo nano /etc/systemd/system/bootah.service
```

**Add configuration:**

```ini
[Unit]
Description=Bootah PXE Boot Management Server
After=network.target postgresql.service

[Service]
Type=simple
User=bootah
WorkingDirectory=/home/bootah/bootah
ExecStart=/home/bootah/.nvm/versions/node/v20.x.x/bin/npm run dev
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable bootah
sudo systemctl start bootah
sudo systemctl status bootah
```

---

## 🔄 Part 7: Integrate with Clonezilla (Optional)

If you want to keep Clonezilla alongside Bootah:

### Step 7.1: Install Clonezilla Server Edition

```bash
# Add DRBL repository
wget -q http://drbl.org/GPG-KEY-DRBL -O- | sudo apt-key add -
echo "deb http://free.nchc.org.tw/drbl-core drbl stable" | sudo tee /etc/apt/sources.list.d/drbl.list

sudo apt update
sudo apt install -y drbl clonezilla

# Run DRBL setup
sudo /usr/sbin/drblsrv -i
# Follow prompts to configure network settings

# Configure Clonezilla
sudo /usr/sbin/drblpush -i
```

### Step 7.2: Configure PXE Menu Integration

Create a combined PXE boot menu that offers both Bootah and Clonezilla options:

```bash
sudo nano /srv/tftp/pxelinux.cfg/default
```

**Example menu:**

```
DEFAULT vesamenu.c32
TIMEOUT 300
PROMPT 0

MENU TITLE PXE Boot Menu
MENU BACKGROUND pxelinux.cfg/logo.png

LABEL bootah
  MENU LABEL Boot with Bootah Management
  KERNEL ::192.168.1.50/boot/vmlinuz
  APPEND initrd=::192.168.1.50/boot/initrd.img

LABEL clonezilla
  MENU LABEL Clonezilla Server Disk Cloning
  KERNEL ::192.168.1.50/clonezilla/vmlinuz
  APPEND initrd=::192.168.1.50/clonezilla/initrd.img boot=live

LABEL local
  MENU LABEL Boot from Local Disk
  LOCALBOOT 0
```

---

## 🌐 Part 8: Setup Reverse Proxy (Production)

For production deployment, use NGINX as a reverse proxy:

### Step 8.1: Install NGINX

```bash
sudo apt install -y nginx
```

### Step 8.2: Configure NGINX

```bash
sudo nano /etc/nginx/sites-available/bootah
```

**Add configuration:**

```nginx
server {
    listen 80;
    server_name bootah.yourdomain.com;  # or use IP: 192.168.1.50
    
    client_max_body_size 10G;  # Allow large image uploads
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running operations
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/bootah /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 8.3: Optional: SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d bootah.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## ✅ Part 9: Testing & Verification

### Step 9.1: Verify Services

```bash
# Check Bootah is running
pm2 status
curl http://localhost:5000

# Check TFTP server
echo "test" > /srv/tftp/test.txt
tftp localhost -c get test.txt

# Check DHCP
sudo journalctl -u dnsmasq -f  # Watch DHCP logs

# Check PostgreSQL
psql -U bootah -d bootah -c "SELECT version();"
```

### Step 9.2: Access Web Interface

Open a browser and navigate to:
- **Local access**: `http://192.168.1.50:5000`
- **With NGINX**: `http://192.168.1.50` or `http://bootah.yourdomain.com`

Default login (if using Replit Auth, first user becomes admin):
- Create account through the interface

### Step 9.3: Test PXE Boot

1. **Configure a test machine/VM:**
   - Set network boot as first boot option
   - Connect to same network as Bootah server
   
2. **Boot the machine:**
   - Should receive IP from DHCP
   - Should contact TFTP server
   - Should display boot menu

3. **Monitor in Bootah:**
   - Check Dashboard for new device discovery
   - Verify device appears in Device Management

---

## 🔒 Part 10: Production Hardening

### Step 10.1: Security Best Practices

```bash
# Restrict SSH to key-only authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Set: PermitRootLogin no

# Install fail2ban
sudo apt install -y fail2ban

# Configure automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Step 10.2: Backups

**In Proxmox UI:**
1. Datacenter → Backup → Add
2. Schedule: Daily at 2 AM
3. Selection: Include CT 100 (Bootah)
4. Compression: ZSTD
5. Mode: Snapshot

**Application-level backups:**

```bash
# Backup script
cat > /home/bootah/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U bootah bootah > /home/bootah/backups/bootah_db_$DATE.sql
tar -czf /home/bootah/backups/bootah_images_$DATE.tar.gz /home/bootah/images
find /home/bootah/backups -mtime +7 -delete
EOF

chmod +x /home/bootah/backup.sh

# Add to crontab
crontab -e
# Add: 0 3 * * * /home/bootah/backup.sh
```

### Step 10.3: Monitoring

```bash
# Install monitoring tools
npm install -g pm2-logrotate

pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7

# View logs
pm2 logs bootah --lines 100
pm2 monit
```

---

## 📊 Part 11: Network Architecture Examples

### Example 1: Isolated Imaging Network

```
Internet
   |
Router (192.168.1.0/24)
   |
Proxmox Host (192.168.1.10)
   |
   +--- vmbr0 (bridged to physical NIC)
   |      |
   |      +--- Other VMs/CTs
   |
   +--- vmbr1 (isolated imaging network: 10.0.10.0/24)
          |
          +--- Bootah CT (10.0.10.1) - DHCP/TFTP/PXE server
          +--- Client machines get 10.0.10.x addresses
```

**Create isolated bridge:**

```bash
# On Proxmox host
nano /etc/network/interfaces

# Add:
auto vmbr1
iface vmbr1 inet static
    address 10.0.10.1/24
    bridge-ports none
    bridge-stp off
    bridge-fd 0

# Apply
ifreload -a

# Update Bootah CT network
pct set 100 -net1 name=eth1,bridge=vmbr1,ip=10.0.10.2/24
```

### Example 2: Production Multi-Service Setup

```
Proxmox Cluster
├── CT 100: Bootah Application (2GB RAM)
├── CT 101: PostgreSQL Database (4GB RAM)
├── CT 102: NGINX Reverse Proxy (512MB RAM)
├── VM 200: Clonezilla Server (2GB RAM)
└── Storage: NFS/CIFS share for OS images
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Permission denied" on port 69 (TFTP)

**Solution:**

```bash
# Allow low ports for Node.js
sudo setcap 'cap_net_bind_service=+ep' $(which node)

# Or run with different port and redirect
sudo iptables -t nat -A PREROUTING -p udp --dport 69 -j REDIRECT --to-port 6969
```

### Issue 2: Clients not receiving PXE boot options

**Solution:**

```bash
# Check DHCP is responding
sudo tcpdump -i eth0 port 67 or port 68

# Verify dnsmasq is running
sudo systemctl status dnsmasq

# Check logs
sudo journalctl -u dnsmasq -f
```

### Issue 3: Database connection errors

**Solution:**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U bootah -d bootah -h localhost

# Check DATABASE_URL in .env matches your setup
cat /home/bootah/bootah/.env | grep DATABASE_URL
```

### Issue 4: Out of memory

**Solution:**

```bash
# On Proxmox host - increase container RAM
pct set 100 -memory 4096

# Restart container
pct restart 100
```

---

## 📚 Quick Reference Commands

```bash
# Restart Bootah
pm2 restart bootah

# View logs
pm2 logs bootah --lines 200

# Update application
cd /home/bootah/bootah
git pull
npm install
pm2 restart bootah

# Check resource usage
htop
df -h
free -m

# Network diagnostics
ip addr show
netstat -tulpn | grep :5000
ping 192.168.1.1

# Database backup
pg_dump -U bootah bootah > backup.sql

# Restore database
psql -U bootah -d bootah < backup.sql
```

---

## 🎯 Summary

You now have a complete Bootah PXE boot server running on Proxmox! The setup provides:

✅ **Modern Node.js application** with production-grade deployment  
✅ **PostgreSQL database** for persistent storage  
✅ **PXE/TFTP/DHCP services** for network booting  
✅ **Optional Clonezilla integration** for disk imaging  
✅ **NGINX reverse proxy** for security and performance  
✅ **Automated backups** via Proxmox and application scripts  
✅ **Monitoring and logging** with PM2  

The application is now accessible at `http://192.168.1.50:5000` (or your configured address) and ready to manage PXE boot deployments across your network!

---

## 📝 Notes

- Replace `192.168.1.50` with your actual server IP address throughout this guide
- Replace `your_secure_password_here` with strong passwords
- Adjust network ranges to match your environment
- Keep backups before making major changes
- Review security settings for your specific use case

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Compatible with:** Proxmox VE 8.x, Ubuntu 24.04 LTS, Node.js 20.x
