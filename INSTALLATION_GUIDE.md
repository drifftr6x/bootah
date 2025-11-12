# Bootah64x Installation & Configuration Guide

Complete guide to deploying and configuring Bootah64x PXE imaging platform on Replit or your own server.

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Replit Cloud Deployment](#replit-cloud-deployment)
3. [Local Server Installation](#local-server-installation)
4. [Environment Configuration](#environment-configuration)
5. [Network Setup](#network-setup)
6. [First-Time Setup](#first-time-setup)
7. [User Management](#user-management)
8. [Testing & Verification](#testing--verification)
9. [Troubleshooting](#troubleshooting)

---

## Deployment Overview

Bootah64x can be deployed in two ways:

### ☁️ Replit Cloud Deployment
**Best for:** Development, testing, small-scale deployments, cloud-managed infrastructure

**Advantages:**
- Zero infrastructure setup
- Automatic HTTPS/TLS
- Managed database
- Auto-scaling
- Built-in monitoring

**Limitations:**
- Internet connectivity required
- Free tier has sleep/wake delays
- Network latency for PXE operations

### 🖥️ Local Server Installation
**Best for:** Production environments, isolated networks, high-volume imaging, air-gapped networks

**Advantages:**
- Full control over infrastructure
- No internet dependency
- Low latency for PXE operations
- No cloud service fees
- Custom network configuration

**Limitations:**
- Manual server setup required
- You manage backups and updates
- Need technical expertise

---

## Replit Cloud Deployment

---

## Quick Start

Bootah64x is designed to run on Replit with zero external dependencies. Everything runs in a single container.

### What's Included

- ✅ **Web Interface** (React + TypeScript)
- ✅ **REST API** (Express.js backend)
- ✅ **PostgreSQL Database** (managed by Replit)
- ✅ **Built-in TFTP Server** (port 6969)
- ✅ **Built-in DHCP Proxy** (port 4067)
- ✅ **WebSocket** for real-time updates
- ✅ **Deployment Scheduler** for automated imaging
- ✅ **Multicast Support** for simultaneous deployments

### Access the Application

1. Open your Replit project
2. Click **Run** to start the application
3. Access the web interface at your Replit URL (e.g., `https://your-repl.replit.dev`)
4. Log in with Replit authentication

---

## Deployment Options

### Option 1: Development Mode (Default)

Running on Replit for development and testing:

```bash
npm run dev
```

**What happens:**
- Express server starts on port 5000
- Vite dev server provides hot-reload
- TFTP server listens on port 6969
- DHCP proxy listens on port 4067
- Deployment simulator runs (for testing)

**Workflow:**
The "Start application" workflow is pre-configured and runs automatically when you click Run.

### Option 2: Production Deployment

To deploy Bootah64x for production use:

1. Click the **Publish** button in Replit
2. Configure your custom domain (optional)
3. Application will be deployed with:
   - Automatic HTTPS/TLS
   - Health checks
   - Auto-scaling
   - Production database

**Environment:**
- `NODE_ENV=production` (automatically set)
- All services start in production mode
- Deployment simulator is disabled
- Enhanced security settings

---

## Local Server Installation

This section covers installing Bootah64x on your own physical or virtual server.

### Prerequisites

#### Required Software
- **Ubuntu Server 22.04 LTS** or **Debian 11+** (recommended)
  - Also compatible with: CentOS Stream 9, Rocky Linux 9, RHEL 9
- **Node.js 20+** and **npm 10+**
- **PostgreSQL 14+**
- **Root/sudo access**

#### Network Requirements
- **Static IP address** for the Bootah64x server
- **DHCP server** on your network (or ability to configure one)
- **Gigabit network** recommended for imaging performance
- **Isolated network segment** (VLAN) recommended for security

#### Hardware Requirements
- **CPU**: 4 cores minimum (8+ recommended for multicast)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 
  - 50GB for system and application
  - Additional storage for images (plan 20-50GB per image)
  - SSD strongly recommended for performance
- **Network**: Gigabit Ethernet (required)

---

### Step 1: Prepare Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl git unzip build-essential
```

---

### Step 2: Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

---

### Step 3: Install PostgreSQL

```bash
# Install PostgreSQL 14+
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << 'EOF'
CREATE DATABASE bootah64x;
CREATE USER bootah64x WITH ENCRYPTED PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE bootah64x TO bootah64x;
\c bootah64x
GRANT ALL ON SCHEMA public TO bootah64x;
EOF

# Verify database connection
sudo -u postgres psql -d bootah64x -c "\dt"
```

---

### Step 4: Clone and Install Bootah64x

```bash
# Create installation directory
sudo mkdir -p /opt/bootah64x
sudo chown $USER:$USER /opt/bootah64x
cd /opt/bootah64x

# Clone repository (or upload your code)
# Option A: If you have git repository
git clone https://github.com/your-org/bootah64x.git .

# Option B: Upload from Replit
# Download your Replit project as ZIP, then:
# scp bootah64x.zip user@your-server:/tmp/
# cd /opt/bootah64x
# unzip /tmp/bootah64x.zip

# Install dependencies
npm install

# This installs all required packages (may take 2-5 minutes)
```

---

### Step 5: Configure Environment Variables

```bash
# Create .env file
cat > /opt/bootah64x/.env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://bootah64x:CHANGE_THIS_PASSWORD@localhost:5432/bootah64x
PGHOST=localhost
PGPORT=5432
PGUSER=bootah64x
PGPASSWORD=CHANGE_THIS_PASSWORD
PGDATABASE=bootah64x

# Server Configuration
NODE_ENV=production
PORT=5000

# Session Secret (generate a strong random string)
SESSION_SECRET=$(openssl rand -base64 32)

# Encryption Key (generate a strong random string)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# RBAC Configuration (choose: viewer, operator, or admin)
DEFAULT_USER_ROLE=viewer

# Server Identity
SERVER_NAME=Bootah64x-Production

# Network Configuration (will be auto-detected if not set)
# SERVER_IP=192.168.1.100
EOF

# Secure the .env file
chmod 600 /opt/bootah64x/.env

# Replace CHANGE_THIS_PASSWORD with your actual password
nano /opt/bootah64x/.env
```

---

### Step 6: Initialize Database Schema

```bash
cd /opt/bootah64x

# Push database schema (creates all tables)
npm run db:push

# Verify tables were created
PGPASSWORD=your_password psql -U bootah64x -d bootah64x -c "\dt"

# You should see tables:
# - users
# - roles
# - permissions
# - devices
# - images
# - deployments
# - activity_logs
# - multicast_sessions
# - and more...
```

---

### Step 7: Build Frontend

```bash
cd /opt/bootah64x

# Build production frontend
npm run build

# This creates optimized production build in dist/
```

---

### Step 8: Configure Firewall

```bash
# Allow required ports
sudo ufw allow 5000/tcp   # Web interface
sudo ufw allow 69/udp     # TFTP
sudo ufw allow 4067/udp   # DHCP Proxy
sudo ufw allow 22/tcp     # SSH (if not already open)

# Enable firewall if not already enabled
sudo ufw enable

# Check status
sudo ufw status
```

---

### Step 9: Create System Service

```bash
# Create systemd service
sudo tee /etc/systemd/system/bootah64x.service > /dev/null << 'EOF'
[Unit]
Description=Bootah64x PXE Imaging Platform
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=bootah64x
WorkingDirectory=/opt/bootah64x
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bootah64x

[Install]
WantedBy=multi-user.target
EOF

# Create dedicated user (optional but recommended)
sudo useradd -r -s /bin/false -d /opt/bootah64x bootah64x
sudo chown -R bootah64x:bootah64x /opt/bootah64x

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable bootah64x
sudo systemctl start bootah64x

# Check service status
sudo systemctl status bootah64x
```

---

### Step 10: Verify Installation

```bash
# Check service is running
sudo systemctl status bootah64x

# Check logs
sudo journalctl -u bootah64x -f

# Test web interface
curl http://localhost:5000

# You should see HTML response (login page)

# Test API
curl http://localhost:5000/api/server-status

# You should see JSON response with server info
```

---

### Step 11: Configure Network DHCP

You need to configure your DHCP server to point PXE clients to Bootah64x.

#### Option A: Using dnsmasq (Recommended for dedicated imaging server)

```bash
# Install dnsmasq
sudo apt install -y dnsmasq

# Backup original config
sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.backup

# Create PXE configuration
sudo tee /etc/dnsmasq.d/pxe.conf > /dev/null << 'EOF'
# Network Interface
interface=eth0  # Change to your network interface

# DHCP Range
dhcp-range=192.168.100.50,192.168.100.200,12h
dhcp-option=3,192.168.100.1       # Gateway
dhcp-option=6,8.8.8.8,8.8.4.4     # DNS servers

# PXE Boot Configuration
dhcp-boot=pxelinux.0,bootah64x,192.168.100.10  # Change to your server IP

# UEFI Support
dhcp-match=set:efi-x86_64,option:client-arch,7
dhcp-boot=tag:efi-x86_64,efi64/syslinux.efi

# Legacy BIOS Support
dhcp-match=set:bios,option:client-arch,0
dhcp-boot=tag:bios,pxelinux.0

# Enable TFTP (if using dnsmasq for TFTP)
# enable-tftp
# tftp-root=/opt/bootah64x/pxe-files/tftp
EOF

# Note: Replace IP addresses and interface name with your configuration

# Restart dnsmasq
sudo systemctl restart dnsmasq
sudo systemctl enable dnsmasq

# Check status
sudo systemctl status dnsmasq
```

#### Option B: Using ISC DHCP Server

```bash
# Install ISC DHCP
sudo apt install -y isc-dhcp-server

# Configure
sudo tee -a /etc/dhcp/dhcpd.conf > /dev/null << 'EOF'

# Bootah64x PXE Configuration
option domain-name "imaging.local";
option domain-name-servers 8.8.8.8, 8.8.4.4;
default-lease-time 600;
max-lease-time 7200;
authoritative;

subnet 192.168.100.0 netmask 255.255.255.0 {
  range 192.168.100.50 192.168.100.200;
  option routers 192.168.100.1;
  option broadcast-address 192.168.100.255;
  
  # PXE boot options
  next-server 192.168.100.10;  # Bootah64x server IP
  
  # BIOS clients
  if option arch = 00:07 {
    # UEFI 64-bit
    filename "efi64/syslinux.efi";
  } else {
    # Legacy BIOS
    filename "pxelinux.0";
  }
}
EOF

# Specify network interface
sudo tee /etc/default/isc-dhcp-server > /dev/null << 'EOF'
INTERFACESv4="eth0"  # Change to your network interface
EOF

# Restart DHCP server
sudo systemctl restart isc-dhcp-server
sudo systemctl enable isc-dhcp-server

# Check status
sudo systemctl status isc-dhcp-server
```

#### Option C: Existing DHCP Server (Windows Server, Router, etc.)

**Add these DHCP options to your existing server:**

| Option | Name | Value |
|--------|------|-------|
| 66 | TFTP Server Name | `192.168.100.10` (your Bootah64x server IP) |
| 67 | Boot Filename | `pxelinux.0` (for BIOS) or `efi64/syslinux.efi` (for UEFI) |

**For Windows DHCP Server:**
1. Open DHCP Manager
2. Right-click on Scope Options → Configure Options
3. Check option 66, enter your Bootah64x server IP
4. Check option 67, enter `pxelinux.0`
5. Click OK and restart DHCP service

---

### Step 12: Access Web Interface

Open your browser and navigate to:

```
http://your-server-ip:5000
```

**First Login:**
1. You'll see the login page
2. Click **Sign in with Replit** (for local deployments, this uses local credentials)
3. Create your first admin account
4. Set your profile information

---

### Step 13: Set Up Reverse Proxy (Optional but Recommended)

For production, use Nginx as a reverse proxy to add HTTPS:

```bash
# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/bootah64x > /dev/null << 'EOF'
server {
    listen 80;
    server_name bootah.yourdomain.com;  # Change to your domain

    # Redirect HTTP to HTTPS (after certbot setup)
    # return 301 https://$server_name$request_uri;

    # For now, proxy to app
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/bootah64x /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Optional: Set up SSL with Let's Encrypt
sudo certbot --nginx -d bootah.yourdomain.com
```

---

### Step 14: Configure Automatic Backups

```bash
# Create backup script
sudo tee /usr/local/bin/backup-bootah64x.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/bootah64x"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup database
PGPASSWORD=your_password pg_dump -U bootah64x -d bootah64x > "$BACKUP_DIR/db_$DATE.sql"

# Backup images (if you have a local image directory)
# rsync -av /opt/bootah64x/pxe-images/ "$BACKUP_DIR/images_$DATE/"

# Backup configuration
cp /opt/bootah64x/.env "$BACKUP_DIR/env_$DATE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "db_*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "env_*" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

sudo chmod +x /usr/local/bin/backup-bootah64x.sh

# Schedule daily backups via cron
sudo crontab -e
# Add this line:
# 0 2 * * * /usr/local/bin/backup-bootah64x.sh >> /var/log/bootah64x-backup.log 2>&1
```

---

### Installation Complete!

Your Bootah64x server is now running. Next steps:

1. ✅ **Verify all services** are running
2. ✅ **Test PXE boot** with a test machine
3. ✅ **Create user accounts** for your team
4. ✅ **Configure RBAC** roles and permissions
5. ✅ **Upload OS images** for deployment
6. ✅ **Set up monitoring** and alerts

---

## Environment Configuration

### Required Environment Variables

These are automatically configured by Replit:

| Variable | Purpose | Set By |
|----------|---------|--------|
| `DATABASE_URL` | PostgreSQL connection string | Replit |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Database credentials | Replit |
| `SESSION_SECRET` | Express session encryption | Auto-generated |
| `ENCRYPTION_KEY` | Data encryption key | Auto-generated |

### Optional Configuration

Set these in Replit Secrets for customization:

#### RBAC Configuration

```bash
DEFAULT_USER_ROLE=viewer
```

**Valid roles:**
- `viewer` - Read-only access (recommended default)
- `operator` - Can manage devices and deployments
- `admin` - Full system access

**Security Note:** Production deployments should use `viewer` as default. Set to `operator` or `admin` only in trusted environments.

#### Server Configuration

```bash
# Server identity
SERVER_NAME=Bootah64x-Production

# Network settings (auto-detected if not set)
SERVER_IP=192.168.1.100
```

### Setting Secrets in Replit

1. Open your Repl
2. Click on **Tools** → **Secrets**
3. Add key-value pairs
4. Restart the application

---

## Network Setup

### Replit Network Architecture

```
Internet
   ↓
Replit Cloud (HTTPS/WSS)
   ↓
Your Application (port 5000)
   ├─ Web Interface (HTTP/HTTPS)
   ├─ WebSocket (real-time updates)
   ├─ REST API (/api/*)
   └─ Built-in Services
      ├─ TFTP Server (port 6969)
      └─ DHCP Proxy (port 4067)
```

### Connecting Physical Network

To use Bootah64x for PXE booting physical machines:

#### Option A: Cloud Deployment (Recommended)

1. **Publish your Repl** to get a public URL
2. **Configure your network DHCP** to point to Replit:
   ```
   DHCP Option 66: <your-repl-url>
   DHCP Option 67: pxelinux.0
   ```

3. **Firewall rules:**
   - Allow TFTP (UDP 69) from your network to Replit
   - Allow HTTP/HTTPS from machines to Replit

#### Option B: Hybrid Deployment

For networks that can't reach Replit directly:

1. Use **Replit for management** (web interface, database)
2. Run a **local TFTP/DHCP proxy** on your network
3. Sync images between Replit and local storage

---

## First-Time Setup

### Step 1: Initialize Database

The database schema is automatically created on first run. Verify it's working:

1. Start the application
2. Check logs for: `[RBAC] Initializing RBAC defaults...`
3. Database tables are created automatically via Drizzle ORM

### Step 2: Create Admin User

**First login automatically creates an admin user:**

1. Access the web interface
2. Click **Sign in with Replit**
3. Your Replit account becomes the first admin
4. Default role: `operator` (configurable via `DEFAULT_USER_ROLE`)

### Step 3: Configure Server Settings

1. Navigate to **Settings** (gear icon)
2. Update server information:
   - Server name
   - Network settings
   - Deployment preferences
3. Click **Save Changes**

### Step 4: Verify Services

Check the Dashboard to ensure all services are running:

- ✅ **PXE Server** - Should show "Running"
- ✅ **TFTP Server** - Port 6969
- ✅ **DHCP Proxy** - Port 4067
- ✅ **Database** - Connected
- ✅ **WebSocket** - Active connections shown

---

## User Management

### Creating Users

**Via Web Interface:**

1. Navigate to **User Management** from sidebar
2. Click **Create User**
3. Fill in user details:
   - Username (required, unique)
   - Email (required for notifications)
   - First Name / Last Name
   - Department / Job Title
   - Phone Number
4. Click **Create User**

**Via CSV Import:**

1. Click **Import CSV** button
2. Paste CSV data:
   ```csv
   username,email,firstName,lastName,department,jobTitle,phoneNumber
   jdoe,john@example.com,John,Doe,IT,Systems Engineer,555-1234
   asmith,alice@example.com,Alice,Smith,IT,Network Admin,555-5678
   ```
3. Click **Import Users**

### Role-Based Access Control (RBAC)

Bootah64x supports three roles:

| Role | Permissions |
|------|-------------|
| **Viewer** | View devices, images, deployments, activity logs |
| **Operator** | Viewer + Create/delete devices, deploy images, manage deployments |
| **Admin** | Operator + User management, system settings, delete images |

**Assigning Roles:**

1. Navigate to **User Management**
2. Click **Assign Roles** next to a user
3. Select desired roles
4. Click **Update Roles**

### Password Management

**For local authentication (non-Replit users):**

1. Click **Reset Password** icon next to user
2. User receives reset email (if email configured)
3. User sets new password via reset link

**Password Requirements:**
- Minimum 8 characters
- Must include: uppercase, lowercase, number, special character
- Password history enforced (last 5 passwords)

---

## Testing & Verification

### Test 1: Web Interface

```bash
# Access your Replit URL
https://your-repl.replit.dev

# Expected:
# - Login page appears
# - Can authenticate with Replit
# - Dashboard loads with stats
# - No console errors (check browser DevTools)
```

### Test 2: API Endpoints

```bash
# Test API health
curl https://your-repl.replit.dev/api/devices

# Expected: JSON array of devices
# Status: 200 OK
```

### Test 3: WebSocket Connection

Open browser console (F12) and look for:
```
WebSocket connected
```

### Test 4: Built-in Services

Check the Dashboard for service status:

- **TFTP Server**: Status should be "Running" on port 6969
- **DHCP Proxy**: Status should be "Running" on port 4067
- **Database**: Connection status shown
- **Active Deployments**: Counter should update in real-time

### Test 5: Database Operations

1. **Create a test device:**
   - Go to **Devices** page
   - Click **Add Device**
   - Enter MAC address and IP
   - Click **Save**

2. **Verify database persistence:**
   - Refresh page
   - Device should still appear
   - Check activity log for creation event

3. **Test deletion:**
   - Click delete icon
   - Confirm deletion
   - Verify cascading delete (no foreign key errors)

---

## Troubleshooting

### Problem: Application won't start

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
```

**Solution:**
```bash
# Kill existing processes
pkill -f "tsx server/index.ts"

# Restart workflow
# Click "Restart" button in Replit
```

### Problem: Database connection errors

**Symptoms:**
```
Error: connect ECONNREFUSED
FATAL: database "bootah64x" does not exist
```

**Solution:**

1. **Check Replit database:**
   - Open **Database** tab in Replit
   - Verify PostgreSQL is enabled
   - Check connection string

2. **Verify environment variables:**
   ```bash
   echo $DATABASE_URL
   # Should output: postgresql://...
   ```

3. **Reset database schema:**
   ```bash
   npm run db:push
   ```

### Problem: TFTP/DHCP services fail to start

**Symptoms:**
```
TFTP Server error: Error: bind EADDRINUSE 0.0.0.0:6969
```

**Solution:**

Ports 6969 and 4067 are already in use from previous run.

```bash
# Method 1: Restart the Repl completely
# Click "Stop" then "Run"

# Method 2: Kill process manually
pkill -f "tsx server/index.ts"
# Then click "Run"
```

### Problem: WebSocket disconnects frequently

**Symptoms:**
- Browser console shows: `WebSocket disconnected`
- Real-time updates stop working
- Dashboard stats don't refresh

**Solution:**

1. **Check browser console for errors**
2. **Verify Replit is not sleeping:**
   - Free tier Repls sleep after inactivity
   - Consider upgrading to keep alive
3. **Hard refresh:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Problem: React warnings about invalid hooks or NaN

**Symptoms:**
```
Warning: Invalid hook call
Warning: Received NaN for the `children` attribute
```

**Solution:**

This has been fixed in the latest version. If you see this:

1. Hard refresh: Ctrl+Shift+R
2. Clear browser cache
3. Restart the application

### Problem: Deletion fails with foreign key constraint

**Symptoms:**
```
Error: update or delete on table "devices" violates foreign key constraint
```

**Solution:**

This has been fixed with cascading deletes. If you still see this:

1. **Update to latest code:**
   ```bash
   git pull origin main
   ```

2. **Restart application:**
   - Click "Stop" then "Run"

3. **Verify fix is applied:**
   - Try deleting a device
   - Should see success toast
   - No error in console

### Problem: Images page shows errors

**Symptoms:**
- Can't delete images
- API requests fail
- Console shows 400/500 errors

**Solution:**

API signature was corrected. Ensure you have latest code:

```bash
# In images.tsx, mutations should use:
apiRequest("DELETE", `/api/images/${id}`)

# NOT:
apiRequest(`/api/images/${id}`, { method: "DELETE" })
```

### Getting Help

**Check Application Logs:**

In Replit console, look for:
```
[Encryption] Validation successful
[RBAC] Initializing RBAC defaults
PXE servers started successfully
[DeploymentSimulator] Started in development mode
```

**Enable Debug Logging:**

Add to Replit Secrets:
```
LOG_LEVEL=debug
```

Then restart the application.

---

## Performance Optimization

### For High-Volume Deployments

**Database Connection Pooling:**

Already configured in `server/db.ts`:
```typescript
// Connection pool handles concurrent requests
// Max connections: 20 (default)
```

**Caching:**

React Query provides automatic caching:
- Dashboard stats: 10-second cache
- Devices list: 5-second cache
- Real-time updates via WebSocket

**Multicast Deployments:**

For deploying to multiple machines simultaneously:

1. Navigate to **Multicast Sessions**
2. Click **Create Session**
3. Select image and configure:
   - Max clients: 10-50 (adjust based on network)
   - Bandwidth limit: Auto or manual
4. Add devices to session
5. Start deployment

**Advantages:**
- Deploy to 10+ machines simultaneously
- Shared bandwidth (more efficient)
- Progress tracking per device

---

## Security Best Practices

### 1. Environment Variables

- ✅ Never commit `.env` files to git
- ✅ Use Replit Secrets for sensitive data
- ✅ Rotate `SESSION_SECRET` and `ENCRYPTION_KEY` periodically

### 2. RBAC Configuration

- ✅ Set `DEFAULT_USER_ROLE=viewer` in production
- ✅ Grant admin roles sparingly
- ✅ Audit user permissions regularly

### 3. Network Security

- ✅ Use HTTPS for web interface (automatic on published Repls)
- ✅ Restrict database access to application only
- ✅ Enable rate limiting for API endpoints (future feature)

### 4. Data Protection

- ✅ Database backups via Replit (automatic)
- ✅ Sensitive data encrypted at rest
- ✅ Activity logs track all actions

### 5. User Management

- ✅ Strong password requirements enforced
- ✅ Password history prevents reuse
- ✅ Account lockout after failed attempts (future feature)

---

## Backup & Recovery

### Automatic Backups

Replit provides automatic database backups:

1. Open **Database** tab
2. Click **Backups**
3. Download backup or restore to point in time

### Manual Export

**Export users:**
```bash
# Via API (requires admin role)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-repl.replit.dev/api/users/export > users.csv
```

**Export activity logs:**
```bash
curl https://your-repl.replit.dev/api/activity > activity.json
```

### Disaster Recovery

If you need to restore:

1. **Create new Repl** from template
2. **Import database backup** via Replit Database tab
3. **Set environment variables** in Secrets
4. **Start application** - schema auto-updates
5. **Import users** if needed via CSV

---

## Monitoring & Maintenance

### Health Checks

The application provides health endpoints:

```bash
# Check overall health
curl https://your-repl.replit.dev/api/health

# Check service status
curl https://your-repl.replit.dev/api/server-status
```

### Activity Monitoring

Navigate to **Activity Log** page to monitor:
- User logins
- Device discoveries
- Image deployments
- System events
- Errors and warnings

### Performance Metrics

Dashboard displays real-time metrics:
- Total devices managed
- Active deployments
- Success rate (last 30 days)
- Data transferred

---

## Upgrading

### Updating Bootah64x

1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Install new dependencies:**
   ```bash
   npm install
   ```

3. **Update database schema:**
   ```bash
   npm run db:push
   ```

4. **Restart application:**
   - Click "Stop" then "Run"

5. **Verify upgrade:**
   - Check logs for successful startup
   - Test key features (login, device management)
   - Review changelog for breaking changes

### Migration Notes

- Database migrations are automatic via Drizzle
- No manual SQL scripts needed
- Backup before major upgrades

---

## Next Steps

After installation is complete:

1. ✅ **Configure user roles** - Set up RBAC for your team
2. ✅ **Add devices** - Import your device inventory
3. ✅ **Upload images** - Prepare OS images for deployment
4. ✅ **Test deployments** - Run a test deployment
5. ✅ **Monitor activity** - Check logs and metrics
6. ✅ **Train users** - Share access with your team

---

## Additional Resources

- **Application Documentation:** `replit.md`
- **Deployment Guide:** `DEPLOYMENT.md`
- **Feature Comparison:** `FOG_COMPARISON_ROADMAP.md`
- **Integration Review:** `CLONEZILLA_INTEGRATION_REVIEW.md`

---

## Support

For issues or questions:

1. Check the **Troubleshooting** section above
2. Review application logs in Replit console
3. Check browser console (F12) for client-side errors
4. Enable debug logging for detailed diagnostics

**Common Resources:**
- Replit Documentation: https://docs.replit.com
- Drizzle ORM: https://orm.drizzle.team
- React Query: https://tanstack.com/query

---

**Version:** 1.0.0  
**Last Updated:** November 12, 2025  
**Platform:** Replit Cloud
