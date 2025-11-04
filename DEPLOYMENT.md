# Bootah64x Local Deployment Guide
## Complete PXE Imaging Platform with Clonezilla Integration

---

## Overview

This guide provides complete instructions for deploying Bootah64x on a local server for network-isolated PXE imaging operations. This setup supports Dell, Lenovo, and HP desktops and laptops with both UEFI and Legacy BIOS boot modes.

**Benefits of Local Deployment:**
- ✅ Complete network isolation (no public internet exposure)
- ✅ Real PXE booting capabilities for actual hardware
- ✅ VPN-compatible for secure access
- ✅ No firewall alerts or external scanning
- ✅ Full control over imaging operations

---

## System Requirements

### Hardware Requirements
- **Dedicated Server or VM**:
  - CPU: 2+ cores (4+ recommended)
  - RAM: 4GB minimum (8GB+ recommended for multi-client imaging)
  - Storage: 100GB+ (depends on number of images)
  - Network: Gigabit Ethernet adapter

### Operating System
- **Ubuntu Server 20.04 LTS or 22.04 LTS** (recommended)
- Debian 11+ (compatible)
- Other Linux distributions (may require adaptation)

### Network Requirements
- **Static IP address** on your local network
- **DHCP server** with PXE boot configuration capability
- Network access to target machines
- Firewall rules for required ports

---

## Step 1: Prepare Your Server

### 1.1 Download the Project

Download `bootah64x-local.zip` from your Replit workspace:
1. In Replit Files panel, find `bootah64x-local.zip`
2. Right-click → Download
3. Transfer to your local server

### 1.2 Extract and Setup

```bash
# Create installation directory
mkdir -p ~/bootah64x
cd ~/bootah64x

# Extract the package
unzip /path/to/bootah64x-local.zip

# Verify extraction
ls -la
```

---

## Step 2: Install Dependencies

### 2.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Install Node.js 20

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x
npm --version
```

### 2.3 Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verify installation
psql --version
```

### 2.4 Install Additional Tools

```bash
# Install required tools for Clonezilla setup
sudo apt install -y p7zip-full wget curl nfs-kernel-server tftpd-hpa
```

---

## Step 3: Configure PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql
```

**In the PostgreSQL prompt:**

```sql
-- Create database
CREATE DATABASE bootah64x;

-- Create user with password (choose a strong password)
CREATE USER bootah64x_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bootah64x TO bootah64x_user;

-- Connect to the database and grant schema privileges
\c bootah64x
GRANT ALL ON SCHEMA public TO bootah64x_user;

-- Exit
\q
```

---

## Step 4: Configure Application

### 4.1 Create Environment File

```bash
cd ~/bootah64x
nano .env
```

**Add the following configuration:**

```bash
# Database Configuration
DATABASE_URL="postgresql://bootah64x_user:your_secure_password_here@localhost:5432/bootah64x"

# Server Configuration
NODE_ENV=production
PORT=5000

# Session Secret (generate a long random string)
SESSION_SECRET="your-very-long-random-secret-key-minimum-32-characters"

# Replit Auth (optional - remove if not using Replit Auth)
REPL_ID="your-repl-id-if-applicable"

# Object Storage (if configured)
# DEFAULT_OBJECT_STORAGE_BUCKET_ID="your-bucket-id"
```

**Generate a secure session secret:**
```bash
openssl rand -base64 32
```

### 4.2 Install Node Dependencies

```bash
# Install all dependencies
npm install

# This may take a few minutes
```

### 4.3 Initialize Database Schema

```bash
# Push database schema
npm run db:push

# If prompted, select "+" to create new columns
```

---

## Step 5: Install Clonezilla Integration

### 5.1 Run Clonezilla Setup Script

```bash
# Make script executable
chmod +x scripts/setup-clonezilla.sh

# Run the setup (requires sudo for some operations)
./scripts/setup-clonezilla.sh
```

**This script will:**
- Download Clonezilla Live ISO (latest version)
- Extract kernel, initrd, and filesystem
- Download and install SYSLINUX/PXELINUX bootloaders
- Configure UEFI and Legacy BIOS support
- Set proper permissions

**Note:** Download is ~300MB and may take several minutes depending on your connection.

### 5.2 Configure PXE Server

```bash
# Make configuration script executable
chmod +x scripts/configure-pxe-server.sh

# Run configuration (requires sudo)
./scripts/configure-pxe-server.sh
```

**This script will:**
- Detect your server's IP address
- Update PXE configuration files
- Configure NFS exports for image sharing
- Setup TFTP server
- Configure firewall rules

---

## Step 6: Network Configuration

### 6.1 Set Static IP Address

**Find your network interface:**
```bash
ip addr show
```

**Edit Netplan configuration:**
```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

**Example configuration:**
```yaml
network:
  version: 2
  ethernets:
    ens160:  # Replace with your interface name (e.g., eth0, ens33, etc.)
      addresses:
        - 192.168.1.100/24  # Your chosen static IP
      routes:
        - to: default
          via: 192.168.1.1  # Your gateway
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

**Apply configuration:**
```bash
sudo netplan apply

# Verify new IP
ip addr show
```

### 6.2 Configure Firewall

```bash
# Allow required ports
sudo ufw allow 5000/tcp   # Web interface
sudo ufw allow 67/udp     # DHCP
sudo ufw allow 69/udp     # TFTP
sudo ufw allow 80/tcp     # HTTP for boot files
sudo ufw allow 2049/tcp   # NFS
sudo ufw allow 2049/udp   # NFS
sudo ufw allow 111/tcp    # NFS RPC
sudo ufw allow 111/udp    # NFS RPC

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 7: Configure Your DHCP Server

### Option 1: ISC DHCP Server (Automatic BIOS/UEFI Detection)

Add to your `/etc/dhcp/dhcpd.conf`:

```conf
# Bootah64x PXE Configuration
next-server 192.168.1.100;  # Replace with your Bootah64x server IP

# Auto-detect BIOS vs UEFI
if exists user-class and option user-class = "iPXE" {
    filename "http://192.168.1.100:5000/boot.ipxe";
} elsif option arch = 00:07 {
    # UEFI 64-bit
    filename "efi64/syslinux.efi";
} else {
    # Legacy BIOS
    filename "pxelinux.0";
}
```

### Option 2: Manual BIOS Configuration

```conf
next-server 192.168.1.100;
filename "pxelinux.0";
```

### Option 3: Manual UEFI Configuration

```conf
next-server 192.168.1.100;
filename "efi64/syslinux.efi";
```

**Restart DHCP service:**
```bash
sudo systemctl restart isc-dhcp-server
# or
sudo systemctl restart dnsmasq
```

---

## Step 8: Start Bootah64x

### Option A: Development Mode (for testing)

```bash
cd ~/bootah64x
npm run dev
```

### Option B: Production Mode (recommended)

**Install PM2 process manager:**
```bash
sudo npm install -g pm2
```

**Start application:**
```bash
cd ~/bootah64x
pm2 start npm --name "bootah64x" -- run dev
```

**Make it start on boot:**
```bash
pm2 startup
# Run the command it displays

pm2 save
```

**Useful PM2 commands:**
```bash
pm2 status          # Check status
pm2 logs bootah64x  # View logs
pm2 restart bootah64x  # Restart app
pm2 stop bootah64x  # Stop app
pm2 delete bootah64x   # Remove from PM2
```

---

## Step 9: Access Your Platform

### 9.1 Web Interface

From any device on your local network:
- **URL**: `http://192.168.1.100:5000` (replace with your server IP)
- **Browser**: Any modern browser (Chrome, Firefox, Edge)

### 9.2 First Login

1. Navigate to the URL above
2. Click "Log In to Continue"
3. Authenticate using Replit Auth (or your configured auth method)
4. You should now see the Bootah64x dashboard

---

## Step 10: PXE Boot Your First Machine

### 10.1 Prepare Target Machine

1. **Enable PXE Boot** in BIOS/UEFI:
   - **Dell**: Press F2 during boot → Boot Settings → Enable Network Boot
   - **HP**: Press F10 during boot → Boot Options → Enable Network Boot
   - **Lenovo**: Press F1 during boot → Startup → Network Boot

2. **Set boot order**: Network boot should be first priority

3. **Connect to network**: Ensure target machine is on same network as Bootah64x server

### 10.2 Boot via PXE

1. Power on target machine
2. Press F12 (or appropriate key) to access boot menu
3. Select "Network Boot" or "PXE Boot"
4. You should see the Bootah64x boot menu

### 10.3 Test with Clonezilla Live

1. Select **"Clonezilla Live (Full Environment)"** from boot menu
2. Wait for Clonezilla to load
3. You should boot into full Clonezilla environment
4. Success! Your PXE boot system is working

---

## Imaging Workflows

### Capture a System Image

**From PXE Boot Menu:**
1. Boot target machine via PXE
2. Select **"Capture System Image"**
3. Follow on-screen prompts:
   - Select source disk (usually /dev/sda)
   - Enter image name
   - Confirm capture
4. Image will be saved to `/pxe-images/` on server
5. Machine auto-registers image in Bootah64x web interface

**From Web Interface:**
1. Navigate to **Images** page
2. View captured images with metadata
3. Edit, deploy, or delete images as needed

### Deploy a System Image

**From PXE Boot Menu:**
1. Boot target machine via PXE
2. Select **"Deploy System Image"**
3. Select image from list
4. Select target disk
5. Type "YES" to confirm
6. Deployment begins automatically
7. Machine reboots when complete

**From Web Interface:**
1. Navigate to **Devices** page
2. Select target device
3. Click **"Deploy Image"**
4. Select image to deploy
5. Monitor progress in real-time

---

## Troubleshooting

### PXE Boot Issues

**Problem: "No bootable device" or "PXE-E51: No DHCP or ProxyDHCP offers"**
- Verify DHCP server is configured correctly
- Check `next-server` points to correct IP
- Ensure firewall allows DHCP (67/UDP) and TFTP (69/UDP)

**Problem: "TFTP timeout" or "File not found"**
```bash
# Verify TFTP service
sudo systemctl status tftpd-hpa

# Check TFTP directory
ls -la ~/bootah64x/pxe-files/tftp/

# Test TFTP locally
tftp localhost
> get pxelinux.0
```

**Problem: UEFI boot not working**
- Ensure `efi64/syslinux.efi` exists
- Check DHCP configuration for option arch = 00:07
- Try manual UEFI filename in DHCP config

### NFS Mount Issues

**Problem: "Failed to mount NFS share"**
```bash
# Verify NFS exports
sudo exportfs -v

# Check NFS service
sudo systemctl status nfs-kernel-server

# Verify firewall
sudo ufw status | grep 2049

# Test NFS locally
showmount -e localhost
```

### Application Issues

**Problem: Database connection errors**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify database exists
sudo -u postgres psql -l | grep bootah64x

# Test connection
psql "postgresql://bootah64x_user:password@localhost:5432/bootah64x"
```

**Problem: Application won't start**
```bash
# Check logs
pm2 logs bootah64x

# Or if running in dev mode
npm run dev

# Verify all dependencies installed
npm install
```

---

## Hardware Compatibility

### Tested and Supported

**Dell:**
- OptiPlex series (7090, 7080, 5090, 3080)
- Latitude laptops
- Precision workstations

**Lenovo:**
- ThinkCentre M series
- ThinkPad T/X/E series
- ThinkStation P series

**HP:**
- EliteBook 840/850
- ProBook 440/450
- EliteDesk 800 series
- Z workstations

### Boot Mode Support
- ✅ Legacy BIOS
- ✅ UEFI (Secure Boot must be disabled)
- ✅ Dual boot configurations
- ✅ GPT and MBR partitions

### Storage Controller Support
- ✅ SATA (all manufacturers)
- ✅ NVMe (all manufacturers)
- ✅ Dell PERC RAID controllers
- ✅ HP Smart Array controllers
- ✅ Lenovo ThinkSystem RAID

---

## Performance Optimization

### Image Storage
```bash
# Use dedicated disk for images
sudo mkdir /mnt/images
sudo mount /dev/sdb1 /mnt/images
sudo ln -s /mnt/images ~/bootah64x/pxe-images
```

### Network Performance
```bash
# Enable jumbo frames (if supported by network)
sudo ip link set ens160 mtu 9000

# Verify
ip link show ens160
```

### Concurrent Deployments
- 1GB network: 2-3 concurrent deployments recommended
- 10GB network: 10+ concurrent deployments supported
- Adjust based on available bandwidth and storage I/O

---

## Security Recommendations

### Network Security
1. **Network Segmentation**: Place Bootah64x on isolated imaging VLAN
2. **Firewall Rules**: Only allow required ports
3. **VPN Access**: Access web interface only via VPN
4. **No Public Exposure**: Never expose to internet

### Authentication
1. **Strong Passwords**: Use long, complex passwords
2. **Session Management**: Configure appropriate session timeout
3. **RBAC**: Assign minimum required permissions to users

### Data Protection
1. **Encrypted Storage**: Use LUKS for image storage
2. **Secure Deletion**: Securely wipe images when no longer needed
3. **Access Logs**: Regularly review audit logs

---

## Maintenance

### Regular Updates
```bash
# Update application
cd ~/bootah64x
git pull  # If using git
npm install
pm2 restart bootah64x

# Update Clonezilla
./scripts/setup-clonezilla.sh
```

### Database Backup
```bash
# Backup database
pg_dump -U bootah64x_user bootah64x > backup-$(date +%Y%m%d).sql

# Restore database
psql -U bootah64x_user bootah64x < backup-20241104.sql
```

### Image Cleanup
```bash
# Check disk usage
df -h ~/bootah64x/pxe-images

# Remove old images via web interface or:
rm -rf ~/bootah64x/pxe-images/old-image-name
```

---

## Support and Documentation

### Log Files
- **Application**: `pm2 logs bootah64x`
- **TFTP**: `/var/log/syslog` (grep for tftp)
- **NFS**: `/var/log/syslog` (grep for nfs)
- **PostgreSQL**: `/var/log/postgresql/`

### Configuration Files
- **Application**: `~/bootah64x/.env`
- **PXE Menu**: `~/bootah64x/pxe-files/pxelinux.cfg/default`
- **TFTP**: `/etc/default/tftpd-hpa`
- **NFS**: `/etc/exports`

### Getting Help
1. Check logs for error messages
2. Review troubleshooting section above
3. Consult Clonezilla documentation: https://clonezilla.org/
4. Check network configuration

---

## Quick Reference

### Useful Commands
```bash
# Start Bootah64x
pm2 start bootah64x

# Stop Bootah64x
pm2 stop bootah64x

# View logs
pm2 logs bootah64x

# Check NFS exports
showmount -e localhost

# Check TFTP service
sudo systemctl status tftpd-hpa

# Check database
sudo -u postgres psql bootah64x

# Network scan
nmap -sn 192.168.1.0/24

# Check disk space
df -h
```

### Default Ports
- **5000**: Web Interface (HTTP)
- **67**: DHCP
- **69**: TFTP
- **80**: HTTP (boot files)
- **2049**: NFS
- **5432**: PostgreSQL (local only)

---

## Congratulations!

Your Bootah64x platform is now fully deployed and ready for production imaging operations. This local deployment ensures complete network isolation while providing enterprise-grade PXE imaging capabilities for Dell, Lenovo, and HP hardware.

**Next Steps:**
1. Capture your first golden image
2. Deploy to multiple machines
3. Explore advanced features in the web interface
4. Configure automated deployment templates

**Remember:** This is a network-isolated system - it will NOT be accessible from the public internet, ensuring complete security for your imaging operations.
