# Bootah64x Installation & Configuration Guide

Complete guide to installing and configuring Bootah64x PXE imaging platform on your local network.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Installation Steps](#installation-steps)
4. [Network Configuration](#network-configuration)
5. [DHCP Server Setup](#dhcp-server-setup)
6. [Testing & Verification](#testing--verification)
7. [First Image Capture](#first-image-capture)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Ubuntu Server 22.04 LTS** or **Debian 11+** (recommended)
- **Node.js 18+** and **npm**
- **PostgreSQL 14+**
- **Root/sudo access**

### Network Requirements
- **Static IP address** for the Bootah64x server
- **DHCP server** on your network (or ability to configure one)
- **Gigabit network** recommended for imaging performance
- **Isolated network segment** (VLAN) recommended for security

### Hardware Requirements
- **CPU**: 4 cores minimum (8+ recommended)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 
  - 50GB for system and application
  - Additional storage for images (plan 20-50GB per image)
  - SSD strongly recommended for performance
- **Network**: Gigabit Ethernet (required)

---

## Installation Steps

### Step 1: Download Deployment Package

Transfer the `bootah64x-clonezilla-deployment.zip` file to your server:

```bash
# Option A: Using scp from your workstation
scp bootah64x-clonezilla-deployment.zip user@your-server-ip:~

# Option B: Using wget (if hosted somewhere)
wget https://your-hosting-location/bootah64x-clonezilla-deployment.zip
```

### Step 2: Extract Package

```bash
# Create installation directory
mkdir -p ~/bootah64x
cd ~/bootah64x

# Extract files
unzip ~/bootah64x-clonezilla-deployment.zip -d .

# Set permissions
chmod +x scripts/*.sh
```

### Step 3: Install Node.js Dependencies

```bash
cd ~/bootah64x

# Install dependencies
npm install

# This will install all required packages (may take 2-5 minutes)
```

### Step 4: Setup PostgreSQL Database

```bash
# Install PostgreSQL if not already installed
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE bootah64x;
CREATE USER bootah64x WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE bootah64x TO bootah64x;
\c bootah64x
GRANT ALL ON SCHEMA public TO bootah64x;
EOF
```

### Step 5: Configure Environment Variables

```bash
# Create .env file
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://bootah64x:your-secure-password@localhost:5432/bootah64x

# Server Configuration
NODE_ENV=production
PORT=5000

# Session Secret (generate a random string)
SESSION_SECRET=$(openssl rand -base64 32)
EOF

# Secure the .env file
chmod 600 .env
```

### Step 6: Initialize Database Schema

```bash
# Run database migrations
npm run db:push

# Verify database is ready
psql -U bootah64x -d bootah64x -c "\dt"
# You should see tables: users, devices, images, deployments, etc.
```

### Step 7: Download Clonezilla

This downloads ~350MB of Clonezilla and SYSLINUX files:

```bash
cd ~/bootah64x

# Run setup script (takes 5-10 minutes depending on internet speed)
./scripts/setup-clonezilla.sh

# When prompted:
# - Press Enter to start download
# - Wait for extraction and setup
# - Type 'y' when asked to cleanup temporary files
```

**What this does:**
- Downloads Clonezilla Live 3.1.2-22 ISO
- Extracts kernel, initrd, and filesystem
- Downloads SYSLINUX bootloaders (BIOS + UEFI)
- Sets up directory structure

### Step 8: Configure PXE Server

This configures all network services:

```bash
cd ~/bootah64x

# Run configuration script
sudo ./scripts/configure-pxe-server.sh

# This will:
# - Detect your server IP automatically
# - Update all configuration files
# - Install NFS server
# - Install TFTP server
# - Configure firewall rules
```

**Server IP Detection:**
The script automatically detects your server's IP address. If you have multiple network interfaces, verify it detected the correct one:

```bash
# Check detected IP
hostname -I

# If wrong IP was detected, manually edit configs:
# nano pxe-files/pxelinux.cfg/default
# nano pxe-files/bootah-clonezilla-capture.sh
# nano pxe-files/bootah-clonezilla-deploy.sh
```

### Step 9: Create Image Storage Directory

```bash
# Create directory for captured images
mkdir -p ~/bootah64x/pxe-images

# Set proper permissions
chmod 755 ~/bootah64x/pxe-images
```

### Step 10: Start Bootah64x Application

```bash
# Option A: Using PM2 (recommended for production)
sudo npm install -g pm2
pm2 start npm --name "bootah64x" -- run dev
pm2 save
pm2 startup  # Follow the instructions to enable autostart

# Option B: Using systemd (alternative)
sudo tee /etc/systemd/system/bootah64x.service > /dev/null << EOF
[Unit]
Description=Bootah64x PXE Imaging Platform
After=network.target postgresql.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/npm run dev
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable bootah64x
sudo systemctl start bootah64x
```

### Step 11: Verify Services

```bash
# Check Bootah64x application
pm2 status
# OR
sudo systemctl status bootah64x

# Check NFS exports
showmount -e localhost
# Expected output:
# /home/user/bootah64x/pxe-files *
# /home/user/bootah64x/pxe-images *

# Check TFTP server
sudo systemctl status tftpd-hpa

# Test TFTP access
tftp localhost
> get pxelinux.0 /tmp/test.bin
> quit
ls -lh /tmp/test.bin  # Should show the downloaded file
```

### Step 12: Access Web Interface

Open your browser and navigate to:

```
http://your-server-ip:5000
```

**First Login:**
1. Click "Sign in with Replit" (this uses local authentication, not cloud)
2. Create your admin account
3. Set up your profile

---

## Network Configuration

### Firewall Configuration

The configure script opens these ports automatically, but verify:

```bash
# Check firewall status
sudo ufw status

# Required ports:
# 5000/tcp  - Web interface
# 67/udp    - DHCP (if running DHCP server)
# 69/udp    - TFTP
# 80/tcp    - HTTP (optional)
# 111/tcp   - RPC (NFS)
# 2049/tcp  - NFS
# 2049/udp  - NFS

# If not opened, add them:
sudo ufw allow 5000/tcp
sudo ufw allow 69/udp
sudo ufw allow 111/tcp
sudo ufw allow 2049/tcp
sudo ufw allow 2049/udp
```

### Network Topology

**Recommended Setup:**

```
Internet
   |
 Router ─── Management Network (192.168.1.0/24)
   |
 Switch ─── Imaging VLAN (192.168.100.0/24)
            |
            ├─ Bootah64x Server (192.168.100.10)
            ├─ Target Machine 1
            ├─ Target Machine 2
            └─ Target Machine N
```

**Benefits of dedicated imaging VLAN:**
- Network isolation from production
- No interference with production DHCP
- Better security
- Easier troubleshooting

---

## DHCP Server Setup

You need to configure your DHCP server to point machines to Bootah64x for PXE booting.

### Option 1: Using dnsmasq (Recommended for dedicated server)

```bash
# Install dnsmasq
sudo apt install -y dnsmasq

# Configure for PXE
sudo tee /etc/dnsmasq.d/pxe.conf > /dev/null << EOF
# DHCP Configuration
interface=eth0                    # Your network interface
dhcp-range=192.168.100.50,192.168.100.200,12h
dhcp-option=3,192.168.100.1       # Gateway
dhcp-option=6,8.8.8.8,8.8.4.4     # DNS servers

# PXE Boot Configuration
dhcp-boot=pxelinux.0,bootah64x,192.168.100.10  # Your Bootah64x server IP

# UEFI Support
dhcp-match=set:efi-x86_64,option:client-arch,7
dhcp-boot=tag:efi-x86_64,efi64/syslinux.efi

# Legacy BIOS Support
dhcp-match=set:bios,option:client-arch,0
dhcp-boot=tag:bios,pxelinux.0

# TFTP Configuration
enable-tftp
tftp-root=/home/user/bootah64x/pxe-files/tftp
EOF

# Replace /home/user with your actual path
# Replace IP addresses with your network configuration

# Restart dnsmasq
sudo systemctl restart dnsmasq
sudo systemctl enable dnsmasq
```

### Option 2: Using ISC DHCP Server

```bash
# Install ISC DHCP
sudo apt install -y isc-dhcp-server

# Configure
sudo tee /etc/dhcp/dhcpd.conf > /dev/null << 'EOF'
# Global settings
option domain-name "imaging.local";
option domain-name-servers 8.8.8.8, 8.8.4.4;
default-lease-time 600;
max-lease-time 7200;
authoritative;

# Imaging subnet
subnet 192.168.100.0 netmask 255.255.255.0 {
  range 192.168.100.50 192.168.100.200;
  option routers 192.168.100.1;
  option broadcast-address 192.168.100.255;
  
  # PXE boot options
  next-server 192.168.100.10;  # Bootah64x server IP
  
  # BIOS clients
  if exists user-class and option user-class = "iPXE" {
    filename "pxelinux.0";
  }
  elsif option arch = 00:07 {
    # UEFI 64-bit
    filename "efi64/syslinux.efi";
  }
  else {
    # Legacy BIOS
    filename "pxelinux.0";
  }
}
EOF

# Restart DHCP server
sudo systemctl restart isc-dhcp-server
sudo systemctl enable isc-dhcp-server
```

### Option 3: Existing DHCP Server (Windows Server, Router, etc.)

**Add these DHCP options:**

| Option | Name | Value |
|--------|------|-------|
| 66 | TFTP Server Name | `192.168.100.10` (your Bootah64x IP) |
| 67 | Boot Filename | `pxelinux.0` (for BIOS) or `efi64/syslinux.efi` (for UEFI) |

**For Windows DHCP:**
1. Open DHCP Manager
2. Right-click on Scope Options → Configure Options
3. Add Option 66: Enter Bootah64x server IP
4. Add Option 67: Enter `pxelinux.0`
5. Click OK

---

## Testing & Verification

### Test 1: Verify Services

```bash
# Check all services are running
pm2 status                        # Bootah64x app
sudo systemctl status nfs-kernel-server
sudo systemctl status tftpd-hpa
sudo systemctl status dnsmasq     # If using dnsmasq

# Check network connectivity
curl http://localhost:5000        # Should return HTML
showmount -e localhost            # Should show NFS exports
```

### Test 2: Test PXE Boot Menu

1. **Configure test machine:**
   - Enter BIOS/UEFI settings (F2, F12, Del, or Esc during boot)
   - Enable Network Boot / PXE Boot
   - Disable Secure Boot (for UEFI)
   - Set network boot as first boot priority
   - Save and exit

2. **Boot the machine:**
   - Machine should request IP from DHCP
   - Should download bootloader via TFTP
   - Bootah64x menu should appear

3. **Expected boot menu:**
   ```
   ╔═══════════════════════════════════════════╗
   ║      Bootah64x PXE Boot Menu              ║
   ╚═══════════════════════════════════════════╝
   
   1) Boot from Local Disk
   2) Clonezilla Live (Full Environment)
   3) Capture System Image
   4) Deploy System Image
   5) Quick Capture (Minimal prompts)
   6) Batch Deploy (Auto mode)
   7) Clonezilla Shell (Advanced)
   8) Memory Test (Memtest86+)
   9) Reboot System
   0) Power Off System
   ```

### Test 3: Test Clonezilla Boot

1. Select option **2) Clonezilla Live**
2. Clonezilla should load (takes 30-60 seconds)
3. You should see Clonezilla welcome screen
4. Verify network connectivity:
   ```bash
   # Inside Clonezilla
   ip addr show
   ping 192.168.100.10  # Your Bootah64x server
   ```

---

## First Image Capture

### Prepare Source Machine

1. **Install and configure OS** on the machine you want to image
2. **Install all drivers and applications**
3. **Run Windows Updates** (if Windows)
4. **Run Sysprep** (Windows only):
   ```cmd
   C:\Windows\System32\Sysprep\sysprep.exe /oobe /generalize /shutdown
   ```
5. **Machine will shut down** - don't boot it again before capturing

### Capture Process

1. **Boot via PXE**
   - Power on the machine
   - Press F12 (or your network boot key)
   - Select network boot

2. **Select capture option**
   - From menu, select **3) Capture System Image**
   - Wait for Clonezilla to load

3. **Follow prompts:**
   ```
   Image name: win11-dell-optiplex-7090
   Source disk: /dev/sda (or /dev/nvme0n1)
   Compression: Use default (gzip)
   Verification: Yes (recommended)
   Encryption: No (unless required)
   ```

4. **Monitor progress:**
   - Image capture begins
   - Progress shown in terminal
   - Web interface updates in real-time

5. **Completion:**
   - Image saved to `/pxe-images/win11-dell-optiplex-7090/`
   - Machine reboots automatically
   - Image appears in Bootah64x web interface

### Verify Captured Image

```bash
# Check image exists
ls -lh ~/bootah64x/pxe-images/

# Check image size
du -sh ~/bootah64x/pxe-images/win11-dell-optiplex-7090/

# Check image contents
ls -la ~/bootah64x/pxe-images/win11-dell-optiplex-7090/
# Should contain:
# - parts/  (partition data)
# - Info file
# - Checksum files
```

### Deploy Image to Target

1. **Boot target machine via PXE**
2. **Select option 4) Deploy System Image**
3. **Select your image** from the list
4. **Confirm target disk** (WARNING: This will erase the disk!)
5. **Type YES to confirm**
6. **Deployment begins**
7. **Machine auto-reboots** when complete
8. **Boot from local disk** - OS should be ready

---

## Troubleshooting

### Problem: PXE boot fails with "No bootable device"

**Cause:** DHCP not configured or machine not finding boot server

**Solution:**
```bash
# Verify DHCP is running
sudo systemctl status dnsmasq  # or isc-dhcp-server

# Check DHCP leases
cat /var/lib/dhcp/dhcpd.leases

# Verify TFTP is accessible
tftp localhost
> get pxelinux.0
> quit

# Check firewall
sudo ufw status
sudo ufw allow 67/udp
sudo ufw allow 69/udp
```

### Problem: Boot menu appears but Clonezilla fails to load

**Cause:** NFS mount failure or incorrect paths

**Solution:**
```bash
# Verify NFS exports
showmount -e localhost

# Check NFS paths in config
grep "nfsroot=" pxe-files/pxelinux.cfg/default

# Test NFS mount from another machine
sudo mount -t nfs 192.168.100.10:/home/user/bootah64x/pxe-files /mnt
ls /mnt/clonezilla/
sudo umount /mnt

# Restart NFS server
sudo systemctl restart nfs-kernel-server
```

### Problem: "Permission denied" during image capture

**Cause:** NFS permissions or filesystem issues

**Solution:**
```bash
# Check pxe-images directory permissions
ls -ld ~/bootah64x/pxe-images/
# Should be: drwxr-xr-x

# Fix permissions
chmod 755 ~/bootah64x/pxe-images/

# Verify NFS export options
cat /etc/exports
# Should have: no_root_squash

# Re-export
sudo exportfs -ra
```

### Problem: Web interface doesn't update during imaging

**Cause:** WebSocket connection issue or API endpoint not reachable

**Solution:**
```bash
# Check application logs
pm2 logs bootah64x

# Verify API is responding
curl http://192.168.100.10:5000/api/activity

# Check WebSocket connection from browser console:
# Open browser Dev Tools (F12) → Console
# Look for WebSocket connection errors

# Restart application
pm2 restart bootah64x
```

### Problem: Slow imaging performance

**Causes & Solutions:**

1. **Network bottleneck:**
   ```bash
   # Test network speed
   iperf3 -s  # On server
   iperf3 -c 192.168.100.10  # On client
   
   # Should see 900+ Mbps on gigabit
   # If lower, check switch, cables, network card
   ```

2. **Disk I/O bottleneck:**
   ```bash
   # Check disk performance
   sudo hdparm -tT /dev/sda
   
   # Check I/O wait
   iostat -x 1
   
   # Consider moving pxe-images to faster disk (SSD)
   ```

3. **Compression settings:**
   - Use `-z1p` (parallel gzip) instead of `-z9p`
   - Edit capture scripts to use lower compression

### Problem: UEFI machines won't boot

**Cause:** Secure Boot enabled or wrong bootloader

**Solution:**
1. Enter UEFI settings
2. **Disable Secure Boot**
3. Verify boot file is `efi64/syslinux.efi`
4. Check DHCP option 67 points to correct file

### Getting Help

**Check logs:**
```bash
# Application logs
pm2 logs bootah64x

# NFS logs
sudo journalctl -u nfs-kernel-server

# TFTP logs
sudo journalctl -u tftpd-hpa

# DHCP logs
sudo journalctl -u dnsmasq
# or
sudo journalctl -u isc-dhcp-server
```

**Enable debug mode:**
```bash
# Edit .env file
echo "LOG_LEVEL=debug" >> .env

# Restart application
pm2 restart bootah64x

# Watch logs in real-time
pm2 logs bootah64x --lines 100
```

---

## Next Steps

1. **Create baseline images** for your standard machine types
2. **Document your images** in the web interface
3. **Test deployment** on non-critical machines first
4. **Set up regular backups** of your image library
5. **Configure automated imaging** for batch deployments
6. **Train your team** on the imaging process

---

## Security Recommendations

1. **Network Isolation:**
   - Use dedicated VLAN for imaging
   - Firewall rules to restrict access
   - No internet access from imaging network

2. **Access Control:**
   - Create individual user accounts (not shared)
   - Use strong passwords
   - Implement RBAC roles

3. **Image Security:**
   - Encrypt sensitive images
   - Use checksums for verification
   - Regularly audit image library

4. **Monitoring:**
   - Enable activity logging
   - Monitor for unauthorized access
   - Set up alerts for failures

---

## Backup & Recovery

### Backup Your Images

```bash
# Create backup script
cat > ~/backup-images.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/mnt/backup/bootah64x-images"
IMAGE_DIR="$HOME/bootah64x/pxe-images"

mkdir -p "$BACKUP_DIR"
rsync -av --progress "$IMAGE_DIR/" "$BACKUP_DIR/"
EOF

chmod +x ~/backup-images.sh

# Run daily via cron
crontab -e
# Add: 0 2 * * * /home/user/backup-images.sh
```

### Disaster Recovery

If server fails, restore on new server:

1. Install Bootah64x (steps 1-10)
2. Restore images: `rsync -av /mnt/backup/bootah64x-images/ ~/bootah64x/pxe-images/`
3. Restore database: `pg_restore -d bootah64x backup.sql`
4. Restart services

---

## Performance Optimization

### For High-Volume Deployments

```bash
# Increase NFS threads
sudo nano /etc/default/nfs-kernel-server
# Set: RPCNFSDCOUNT=16

# Tune network settings
sudo tee -a /etc/sysctl.conf > /dev/null << EOF
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864
EOF

sudo sysctl -p

# Enable jumbo frames (if supported)
sudo ip link set eth0 mtu 9000
```

---

## Support & Documentation

- **Full Deployment Guide:** `DEPLOYMENT.md`
- **Code Review:** `CLONEZILLA_INTEGRATION_REVIEW.md`
- **This Installation Guide:** `INSTALLATION_GUIDE.md`

**Clonezilla Documentation:**
- https://clonezilla.org/clonezilla-live-doc.php
- https://clonezilla.org/fine-print.php

---

## User Management and Authentication

Bootah64x supports dual-mode authentication for flexible deployment scenarios:
- **Replit OAuth** - For cloud-connected deployments
- **Local Credentials** - For isolated network deployments

### User Management Features

The User Management page (`/user-management`) provides comprehensive user administration:

#### Creating Users

1. Navigate to **User Management** from the sidebar
2. Click **Create User** button
3. Fill in user details:
   - **Username** (required) - Must be unique
   - **Email** - For OAuth and password reset
   - **First Name / Last Name** - User's full name
   - **Department / Job Title** - Organizational information
   - **Phone Number** - Contact information
   - **Password** - Optional for local auth (OAuth users don't need passwords)
4. Click **Create User**

#### Editing Users

1. Click the **Edit** (pencil) icon next to any user
2. Update user information
3. Click **Update User** to save changes

#### Managing User Status

- **Toggle Active/Inactive**: Click the power icon to enable/disable users
- **Delete User**: Click the trash icon (requires confirmation)

#### Bulk User Import (CSV)

For importing multiple users at once:

1. Click **Import CSV** button
2. Paste CSV data in the following format:
   ```
   username,email,firstName,lastName,department,jobTitle,phoneNumber
   jdoe,john@example.com,John,Doe,IT,Systems Engineer,555-1234
   asmith,alice@example.com,Alice,Smith,IT,Network Admin,555-5678
   ```
3. Click **Import Users**
4. Review the import results (success/failure count)

**CSV Import Notes:**
- First row must contain column headers
- Username is required for all users
- Email is required for password reset functionality
- Invalid rows will be skipped with error messages

### Password Reset Functionality

Administrators can initiate password resets for local authentication users:

#### Requesting Password Reset

**API Endpoint:**
```bash
POST /api/auth/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, a reset link has been sent"
}
```

**Important Security Note:** 
- Reset tokens and codes are **NEVER** returned in the API response for security reasons
- In production: Tokens/codes are sent via email to the user
- In isolated networks without email: 
  - Tokens/codes are logged to server console (check application logs)
  - Administrators with server access can retrieve them from logs: `pm2 logs bootah64x | grep "PASSWORD RESET"`
  - This ensures only authorized administrators can access reset credentials

#### Verifying Reset Token

**API Endpoint:**
```bash
POST /api/auth/verify-reset-token
Content-Type: application/json

{
  "token": "reset-token-from-request"
}
```

#### Resetting Password

**API Endpoint:**
```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-request",
  "newPassword": "newSecurePassword123",
  "code": "123456"
}
```

**Password Requirements:**
- Minimum 8 characters
- Cannot reuse last 5 passwords
- Password expires after 90 days

#### Password Security Features

Bootah64x implements enterprise-grade password security:

1. **Password Hashing**: bcrypt with 12 rounds
2. **Password History**: Prevents reuse of last 5 passwords
3. **Password Expiry**: 90-day automatic expiration
4. **Account Lockout**: 5 failed login attempts → 30-minute lockout
5. **Reset Token Security**: 
   - SHA-256 hashed tokens
   - 1-hour expiration
   - Single-use tokens
   - Optional 6-digit verification code

### Authentication Best Practices

#### For Isolated Network Deployments

1. **Create local admin account immediately after installation:**
   ```bash
   # Use the User Management UI or API
   POST /api/admin/users
   {
     "username": "admin",
     "email": "admin@local",
     "fullName": "System Administrator",
     "passwordHash": "your-strong-password",
     "isActive": true
   }
   ```

2. **Disable Replit OAuth** (if not needed):
   - Set environment variable: `DISABLE_OAUTH=true`
   - Restart application

3. **Implement password rotation policy:**
   - Force password changes every 90 days (automatic)
   - Maintain password history (automatic)

#### For Cloud-Connected Deployments

1. **Use Replit OAuth as primary authentication**
2. **Create local fallback admin account** for emergency access
3. **Monitor login history** via Security Center

### User Role and Permission System

Currently in development. Future releases will include:
- Role-based access control (RBAC)
- Granular permissions (view, edit, delete, deploy)
- Audit logging for all user actions
- Multi-factor authentication (MFA)

---

**Installation Complete!** Your Bootah64x platform is ready for enterprise PXE imaging operations with comprehensive user management and security features.
