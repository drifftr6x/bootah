# Bootah Quick Start Guide

Fast-track installation for both Replit cloud and local server deployments.

---

## 🚀 Replit Cloud (Fastest)

### 1. Deploy
```bash
# Already done if you're reading this!
npm run dev
```

### 2. Access
- Open your Replit URL: `https://your-repl.replit.dev`
- Login with Replit authentication
- Done! ✅

### 3. Optional: Set Default Role
```bash
# In Replit Secrets, add:
DEFAULT_USER_ROLE=viewer  # or operator, or admin
```

### 4. Publish for Production
- Click **Publish** button in Replit
- Automatic HTTPS, scaling, backups
- No additional setup needed

---

## 🖥️ One-Line Installers (Self-Hosted)

Choose your deployment method:

### Docker (Recommended - 5 minutes) ⭐
```bash
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-docker.sh | bash
```

### Linux Bare Metal (15 minutes)
```bash
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-linux.sh | sudo bash
```

### Proxmox LXC Container (20 minutes)
```bash
# Run inside your Proxmox LXC container:
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-proxmox.sh | bash
```

All scripts are interactive and will prompt for configuration (IP address, ports, email settings).

---

## 🖥️ Manual Server Installation

**Requirements:** Ubuntu 22.04 LTS, sudo access, 8GB RAM, static IP

### Manual Install Script

Save this as `install.sh` and run with `sudo bash install.sh`:

```bash
#!/bin/bash
set -e

echo "=== Installing Bootah64x ==="

# 1. Install dependencies
apt update && apt upgrade -y
apt install -y curl git postgresql postgresql-contrib nginx

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Setup PostgreSQL
sudo -u postgres psql << 'EOF'
CREATE DATABASE bootah64x;
CREATE USER bootah64x WITH ENCRYPTED PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE bootah64x TO bootah64x;
\c bootah64x
GRANT ALL ON SCHEMA public TO bootah64x;
EOF

# 4. Create app directory
mkdir -p /opt/bootah64x
cd /opt/bootah64x

# 5. Clone/upload your code here
# git clone https://github.com/your-org/bootah64x.git .
# OR: unzip your downloaded Replit project

# 6. Install packages
npm install

# 7. Configure environment
cat > /opt/bootah64x/.env << 'EOF'
DATABASE_URL=postgresql://bootah64x:SecurePassword123!@localhost:5432/bootah64x
PGHOST=localhost
PGPORT=5432
PGUSER=bootah64x
PGPASSWORD=SecurePassword123!
PGDATABASE=bootah64x
NODE_ENV=production
PORT=5000
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
DEFAULT_USER_ROLE=viewer
SERVER_NAME=Bootah64x
EOF

chmod 600 /opt/bootah64x/.env

# 8. Initialize database
npm run db:push

# 9. Build frontend
npm run build

# 10. Configure firewall
ufw allow 5000/tcp
ufw allow 69/udp
ufw allow 4067/udp
ufw --force enable

# 11. Create systemd service
cat > /etc/systemd/system/bootah64x.service << 'EOF'
[Unit]
Description=Bootah64x PXE Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bootah64x
ExecStart=/usr/bin/npm run dev
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bootah64x
systemctl start bootah64x

echo "=== Installation Complete ==="
echo "Access: http://$(hostname -I | awk '{print $1}'):5000"
```

### Manual Steps (If You Prefer)

```bash
# 1. Prepare server
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git postgresql nodejs npm

# 2. Setup database
sudo -u postgres psql -c "CREATE DATABASE bootah64x;"
sudo -u postgres psql -c "CREATE USER bootah64x WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "GRANT ALL ON DATABASE bootah64x TO bootah64x;"

# 3. Clone app
sudo mkdir -p /opt/bootah64x
cd /opt/bootah64x
# Upload your code here

# 4. Install & configure
npm install
cp .env.example .env
nano .env  # Edit DATABASE_URL and secrets

# 5. Initialize
npm run db:push
npm run build

# 6. Start service
sudo systemctl enable bootah64x
sudo systemctl start bootah64x
```

---

## 🌐 DHCP Configuration

**Choose ONE option:**

### Option A: dnsmasq (Easiest)
```bash
sudo apt install -y dnsmasq
sudo tee /etc/dnsmasq.d/pxe.conf << 'EOF'
interface=eth0
dhcp-range=192.168.100.50,192.168.100.200,12h
dhcp-boot=pxelinux.0,bootah64x,192.168.100.10
EOF
sudo systemctl restart dnsmasq
```

### Option B: ISC DHCP
```bash
sudo apt install -y isc-dhcp-server
# Edit /etc/dhcp/dhcpd.conf, add:
# next-server 192.168.100.10;
# filename "pxelinux.0";
sudo systemctl restart isc-dhcp-server
```

### Option C: Existing DHCP (Windows/Router)
Add to your DHCP server:
- **Option 66**: `192.168.100.10` (your Bootah64x IP)
- **Option 67**: `pxelinux.0`

---

## ✅ Verification

```bash
# Check service
sudo systemctl status bootah64x

# Check logs
sudo journalctl -u bootah64x -f

# Test web interface
curl http://localhost:5000

# Test API
curl http://localhost:5000/api/server-status
```

---

## 🔧 Common Commands

```bash
# Restart service
sudo systemctl restart bootah64x

# View logs
sudo journalctl -u bootah64x -n 100

# Database backup
pg_dump -U bootah64x bootah64x > backup.sql

# Update application
cd /opt/bootah64x
git pull
npm install
npm run build
sudo systemctl restart bootah64x
```

---

## 📊 Default Ports

| Service | Port | Protocol |
|---------|------|----------|
| Web Interface | 5000 | TCP |
| TFTP | 69 | UDP |
| DHCP Proxy | 4067 | UDP |

---

## 🔑 First Login

1. Navigate to `http://your-server-ip:5000`
2. Click **Sign in with Replit**
3. For local: Create admin account on first login
4. For Replit: Use your Replit account

---

## 🆘 Troubleshooting

**Service won't start:**
```bash
sudo journalctl -u bootah64x -n 50
# Check for database connection errors
```

**Database errors:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql
# Test connection
psql -U bootah64x -d bootah64x -c "SELECT version();"
```

**Can't access web interface:**
```bash
# Check firewall
sudo ufw status
# Check if app is listening
sudo netstat -tlnp | grep 5000
```

**PXE boot not working:**
- Verify DHCP options 66 and 67 are set
- Check TFTP is accessible: `tftp your-server-ip 69`
- Ensure client and server are on same network

---

## 📖 Full Documentation

For detailed setup, configuration, and advanced features, see:
- **INSTALLATION_GUIDE.md** - Complete installation and configuration
- **README.md** - Project overview and architecture
- **replit.md** - Technical architecture and preferences

---

## 🚀 Next Steps After Installation

1. **Create users** - Add team members with appropriate roles
2. **Upload images** - Add your OS images for deployment
3. **Configure network** - Set up DHCP and verify PXE boot
4. **Test deployment** - Try imaging a test device
5. **Setup backups** - Configure automated database backups
6. **Monitor logs** - Check activity logs for any issues

---

**Need help?** Check the full installation guide or troubleshooting section.
