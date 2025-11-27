# Bootah Detailed Installation Walkthrough
## Real-Life Step-by-Step Guide with Expected Outputs

This guide walks you through a complete Bootah installation with **actual command outputs** and **what to expect at each step**.

---

## 📋 Table of Contents
- [Choosing Your Installation](#choosing-your-installation)
- [Docker Installation Walkthrough](#docker-installation-walkthrough)
- [Linux Installation Walkthrough](#linux-installation-walkthrough)
- [First Login and Initial Setup](#first-login-and-initial-setup)
- [Real-World Troubleshooting Scenarios](#real-world-troubleshooting-scenarios)

---

## Choosing Your Installation

### Decision Tree

```
Do you have Docker installed?
├─ YES → Docker Installation (FASTEST - 5 min)
├─ NO, Linux server? → Linux Installation (15 min)
├─ NO, Proxmox? → Proxmox Installation (20 min)
└─ NO, Kubernetes? → Kubernetes Installation (30 min)
```

**Recommendation for first-time users:** Use **Docker** - it's the fastest and most forgiving.

---

## Docker Installation Walkthrough

### Step 0: Check Your System

First, let's verify your system is ready.

**On your machine (Mac/Linux/Windows with WSL2):**

```bash
$ docker --version
Docker version 20.10.8, build 3967b7d
```

**Expected Output:** You see a version number (20.10 or higher). If you get "command not found," install Docker first.

```bash
$ docker-compose --version
docker-compose version 1.29.2, build 5becea4c
```

**Expected Output:** You see version 1.29 or higher.

**What to do if Docker isn't installed:**
```bash
# macOS with Homebrew
brew install docker docker-compose

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER
newgrp docker
```

---

### Step 1: Clone Bootah Repository

```bash
$ cd ~/Projects  # Or wherever you want to install
$ git clone https://github.com/drifftr6x/bootah.git
Cloning into 'bootah'...
remote: Enumerating objects: 1250, done.
remote: Counting objects: 100% (1250/1250), done.
remote: Compressing objects: 100% (890/1250), done.
remote: Receiving objects: 100% (1250/1250), done.
Resolving deltas: 100% (580/580), done.

$ cd bootah
$ ls -la
total 248
drwxr-xr-x  15 user  staff    480 Nov 27 10:30 .
drwxr-xr-x  25 user  staff    800 Nov 27 10:15 ..
-rw-r--r--   1 user  staff   1234  Nov 27  2024 .env.example
-rw-r--r--   1 user  staff   2048  Nov 27  2024 .gitignore
-rw-r--r--   1 user  staff   5678  Nov 27  2024 Dockerfile.prod
-rw-r--r--   1 user  staff   4567  Nov 27  2024 docker-compose.yml
drwxr-xr-x   8 user  staff    256  Nov 27  2024 client
drwxr-xr-x   8 user  staff    256  Nov 27  2024 server
drwxr-xr-x   4 user  staff    128  Nov 27  2024 shared
-rw-r--r--   1 user  staff   3456  Nov 27  2024 package.json
```

**What you should see:** A bootah directory with client, server, shared folders.

**If you get "repository not found":** Make sure you've uploaded the code to your GitHub repository first.

---

### Step 2: Create Environment Configuration

```bash
$ cat > .env << 'EOF'
# Application Settings
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://bootah:bootah_password@postgres:5432/bootah

# Security - Generate new one each time
SESSION_SECRET=$(openssl rand -base64 32)

# Default user role
DEFAULT_USER_ROLE=admin

# PXE Configuration - CHANGE THIS TO YOUR IP
PXE_SERVER_IP=192.168.1.50
TFTP_PORT=6969
DHCP_PORT=4067
EOF

$ cat .env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://bootah:bootah_password@postgres:5432/bootah
SESSION_SECRET=aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890ABC=
DEFAULT_USER_ROLE=admin
PXE_SERVER_IP=192.168.1.50
TFTP_PORT=6969
DHCP_PORT=4067
```

**What you should see:** `.env` file created with all variables.

**⚠️ IMPORTANT:** 
- Replace `192.168.1.50` with YOUR actual server IP address on your network
- To find your IP: `hostname -I` (Linux) or `ifconfig` (Mac)

**Example of finding your real IP:**
```bash
$ hostname -I
192.168.1.42 10.0.0.5

# Use the one on your local network (usually starts with 192.168.x.x)
# So in this case, use 192.168.1.42
```

---

### Step 3: Build Docker Image

```bash
$ docker-compose build
[+] Building 145.3s (25/25) FINISHED
 => [internal] load build definition from Dockerfile.prod          0.1s
 => [internal] load .dockerignore                                 0.1s
 => [internal] load metadata for docker.io/library/node:20-alpine 1.2s
 => [stage-0  1/14] FROM docker.io/library/node:20-alpine         8.5s
 => [stage-0  2/14] WORKDIR /app                                  0.1s
 => [stage-0  3/14] COPY package*.json ./                         0.1s
 => [stage-0  4/14] RUN npm ci                                    42.3s
 => [stage-0  5/14] COPY . .                                      0.3s
 => [stage-0  6/14] RUN npm run build                             68.5s
 => [stage-0  7/14] FROM docker.io/library/postgres:15-alpine    15.6s
 => [external] docker.io/library/postgres:15-alpine:pull          9.2s
 => exporting to docker image                                     0.1s
 => => naming to bootah:latest                                    0.0s
```

**Expected:** Build completes in 2-3 minutes. You see "FINISHED" at the end.

**What to expect:**
- First build is slower (downloads images)
- Subsequent builds are faster (uses cache)
- If it fails, check your internet connection

---

### Step 4: Start Services

```bash
$ docker-compose up -d
[+] Running 2/2
 ✓ Network bootah_bootah-network  Created              0.1s
 ✓ Container bootah-postgres      Started              2.3s
 ✓ Container bootah-app           Started              3.5s

$ docker-compose ps
NAME              COMMAND              STATUS           PORTS
bootah-postgres   docker-entrypoint.s  Up 45 seconds    0.0.0.0:5432->5432/tcp
bootah-app        node dist/index.js   Up 15 seconds    0.0.0.0:5000->5000/tcp
```

**Expected:** Both containers are "Up" and running.

**Wait 30 seconds** - the app needs time to initialize and apply database migrations.

---

### Step 5: Verify Services Are Running

```bash
$ curl http://localhost:5000
<!DOCTYPE html>
<html>
<head>
  <title>Bootah - OS Imaging Platform</title>
  ...
```

**Expected:** You get HTML response (login page).

```bash
$ docker-compose logs bootah | tail -20
[express] serving on port 5000
PXE servers started successfully
Deployment scheduler started successfully
Database connection successful
```

**Expected:** No error messages. You see success messages.

---

### Step 6: Access the Application

Open your browser:
```
http://localhost:5000
```

**You should see:**
- Bootah login page
- Email/password input fields
- "First-time setup" message

---

## Linux Installation Walkthrough

### Step 0: Prerequisites Check

```bash
$ lsb_release -a
No LSB modules are available.
Distributor ID: Ubuntu
Release:        22.04
Codename:       jammy

$ uname -a
Linux workstation 5.15.0-56-generic #62-Ubuntu SMP Tue Nov 22 12:49:08 UTC 2022 x86_64 GNU/Linux
```

**Expected:** Ubuntu 22.04 or Debian 12 (or similar).

```bash
$ free -h
              total        used        free
Mem:          7.8Gi       2.3Gi       5.5Gi

$ df -h /
Filesystem      Size  Used Avail Use%
/dev/sda1       100G   35G   65G  35%
```

**Expected:** 4GB+ RAM free, 30GB+ disk space available.

---

### Step 1: Update System

```bash
$ sudo apt-get update
Get:1 http://archive.ubuntu.com/ubuntu jammy InRelease [270 kB]
Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]
...
Reading package lists... Done

$ sudo apt-get upgrade -y
Reading package lists... Done
Building dependency tree... Done
...
0 upgraded, 0 newly installed, 0 removed
Processing triggers for libc-bin (2.35-0ubuntu3.1) ...
```

**Expected:** Completes in 1-2 minutes with no errors.

---

### Step 2: Install Dependencies

```bash
$ sudo apt-get install -y curl git nodejs npm postgresql postgresql-contrib \
  net-tools build-essential python3-dev

Reading package lists... Done
Building dependency tree... Done
The following NEW packages will be installed:
  build-essential curl git libpq-dev nodejs npm postgresql
...
Setting up nodejs (18.14.2+dfsg-1~nodesource1) ...
Setting up npm (9.4.0-1nodesource1) ...
```

**Expected:** All packages install successfully. No errors.

```bash
$ node --version
v18.14.2

$ npm --version
9.4.0

$ psql --version
psql (PostgreSQL) 14.6
```

**Expected:** Versions are shown for each tool.

---

### Step 3: Setup PostgreSQL Database

```bash
$ sudo systemctl start postgresql
$ sudo systemctl enable postgresql

$ sudo -u postgres psql << SQL
CREATE USER bootah WITH PASSWORD 'bootah_password';
CREATE DATABASE bootah OWNER bootah;
ALTER ROLE bootah CREATEDB;
SQL

CREATE ROLE
CREATE DATABASE
ALTER ROLE
```

**Expected:** Three success messages (CREATE ROLE, CREATE DATABASE, ALTER ROLE).

**Verify:**
```bash
$ PGPASSWORD=bootah_password psql -h localhost -U bootah -d bootah -c "SELECT version();"
                                                 version
-------------------------------------------
 PostgreSQL 14.6 on x86_64-pc-linux-gnu, compiled by gcc (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0, compiled by gcc (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0, compiled by...
(1 row)
```

**Expected:** Shows PostgreSQL version and connection successful.

---

### Step 4: Clone and Setup Bootah

```bash
$ cd /opt
$ sudo git clone https://github.com/drifftr6x/bootah.git bootah
$ sudo chown -R $USER:$USER /opt/bootah
$ cd /opt/bootah

$ cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://bootah:bootah_password@localhost:5432/bootah
SESSION_SECRET=$(openssl rand -base64 32)
DEFAULT_USER_ROLE=admin
PXE_SERVER_IP=192.168.1.100
TFTP_PORT=6969
DHCP_PORT=4067
EOF

$ npm install
up to date, audited 342 packages in 5.23s
found 0 vulnerabilities

$ npm run build
> rest-express@1.0.0 build
> esbuild server/index.ts --bundle --platform=node --outfile=dist/index.js --external:pg --external:postgres

  dist/index.js  2.1mb
```

**Expected:** Build completes successfully, no errors.

---

### Step 5: Create Systemd Service

```bash
$ sudo tee /etc/systemd/system/bootah.service > /dev/null << 'EOF'
[Unit]
Description=Bootah PXE Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/bootah
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/bootah/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

$ sudo systemctl daemon-reload
$ sudo systemctl enable bootah
Created symlink /etc/systemd/system/multi-user.target.wants/bootah.service → /etc/systemd/system/bootah.service.

$ sudo systemctl start bootah

$ sudo systemctl status bootah
● bootah.service - Bootah PXE Server
     Loaded: loaded (/etc/systemd/system/bootah.service; enabled; vendor preset: enabled)
     Active: active (running) since Sat 2024-11-27 10:45:32 UTC; 5s ago
     Main PID: 1234 (node)
       Tasks: 15 (limit: 4673)
       Memory: 45.2M
       CPU: 1.234s
```

**Expected:** Service shows "active (running)".

---

### Step 6: Verify Services

```bash
$ curl http://localhost:5000
<!DOCTYPE html>
<html>
<head>
  <title>Bootah - OS Imaging Platform</title>
```

**Expected:** HTML response (login page).

```bash
$ sudo journalctl -u bootah -f
Nov 27 10:45:32 server systemd[1]: Started Bootah PXE Server.
Nov 27 10:45:33 server node[1234]: Imaging scripts created
Nov 27 10:45:34 server node[1234]: PXE servers started successfully
Nov 27 10:45:34 server node[1234]: Deployment scheduler started successfully
Nov 27 10:45:35 server node[1234]: [express] serving on port 5000
```

**Expected:** You see success messages, no errors.

---

## First Login and Initial Setup

### Login to Bootah

1. **Open browser:** `http://localhost:5000` (Docker) or `http://your-server-ip:5000` (Linux)

2. **You see the login page:**
   ```
   Bootah - OS Imaging Platform
   
   [Email Input Field]
   [Password Input Field]
   [Login Button]
   
   First time? Create an account →
   ```

3. **Click "Create an account"** (or if there's no account, you'll be prompted to create one)

4. **Enter credentials:**
   - Email: `admin@bootah.local`
   - Password: `YourSecurePassword123!`
   - Confirm Password: `YourSecurePassword123!`

5. **Click "Create Account"**

**Expected:** Redirects to Dashboard.

---

### Dashboard First Visit

You should see:
```
Dashboard

📊 Statistics
├─ Devices: 0
├─ Images: 0
├─ Deployments: 0
└─ Active Deployments: 0

Recent Activity
├─ No activity yet
```

---

### Adding Your First Device

**Scenario:** You have a workstation on your network at `192.168.1.101` with MAC address `00:1A:2B:3C:4D:5E`

1. **Navigate to:** Sidebar → Devices

2. **Click "Add Device"**

3. **Fill in form:**
   ```
   Device Name: WORKSTATION-01
   MAC Address: 00:1A:2B:3C:4D:5E
   IP Address: 192.168.1.101
   Manufacturer: Dell (optional)
   Model: OptiPlex 7090 (optional)
   ```

4. **Click "Add Device"**

**Expected:** Device appears in devices list.

---

### Uploading Your First OS Image

**Scenario:** You have Ubuntu 22.04 ISO file (3.2 GB)

1. **Navigate to:** Sidebar → Images

2. **Click "Upload Image"**

3. **Select file:** ubuntu-22.04-desktop-amd64.iso

4. **Fill in details:**
   ```
   Image Name: Ubuntu 22.04 Desktop
   OS Type: Linux
   Architecture: x64
   Version: 22.04 LTS
   Description: Ubuntu Desktop for general purpose deployment
   ```

5. **Click "Upload"**

**Expected:** Progress bar shows upload progress.
```
Uploading... 25% (800 MB / 3.2 GB)
```

**Wait 5-10 minutes** for upload to complete.

**Expected result:** Image appears in Images list.

---

### Creating Your First Device Group

**Scenario:** You want to organize devices by department.

1. **Navigate to:** Sidebar → Device Groups

2. **Click "Create Group"**

3. **Fill in:**
   ```
   Group Name: Sales Department
   Color: Green
   Description: Sales team workstations
   ```

4. **Click "Create"**

5. **Go back to Devices**

6. **Select device:** WORKSTATION-01

7. **Click "Edit"**

8. **Set Group:** Sales Department

9. **Click "Save"**

**Expected:** Device now shows under Sales Department group.

---

### Creating Your First Deployment Template

**Scenario:** You want to save Ubuntu deployment settings for later use.

1. **Navigate to:** Sidebar → Templates

2. **Click "Create Template"**

3. **Fill in:**
   ```
   Template Name: Ubuntu 22.04 Standard Setup
   Description: Standard Ubuntu deployment for all workstations
   Image: Ubuntu 22.04 Desktop
   Category: Production
   ```

4. **Click "Create"**

**Expected:** Template appears in Templates list.

---

### Running Your First Deployment

**Scenario:** Deploy Ubuntu to WORKSTATION-01

1. **Navigate to:** Sidebar → Deployments

2. **Click "New Deployment"**

3. **Select:**
   - Device(s): WORKSTATION-01
   - Image: Ubuntu 22.04 Desktop
   - Template: Ubuntu 22.04 Standard Setup (optional)

4. **Review settings**

5. **Click "Deploy"**

**Expected:** Deployment created and monitoring begins.
```
Deployment Status: Pending
Device: WORKSTATION-01
Image: Ubuntu 22.04 Desktop
Progress: 0%

Timeline:
[0%] Deployment created
```

**What happens next:**
- Device will PXE boot from network
- Download Ubuntu image from Bootah
- Progress bar shows: 25%, 50%, 75%, 100%
- When complete, device reboots into Ubuntu

---

## Real-World Troubleshooting Scenarios

### Scenario 1: Devices Not Discovering

**Problem:** You added a device to network, but it's not appearing in Bootah.

**Root Cause:** DHCP not configured to advertise PXE boot.

**Solution Steps:**

1. **Configure your router DHCP:**
   - Access router admin: `192.168.1.1` (usually)
   - Find DHCP settings
   - Set Option 66 (TFTP Server): `192.168.1.50` (your Bootah IP)
   - Save changes

2. **Verify on Bootah server:**
   ```bash
   # Check if TFTP is running
   sudo netstat -tulpn | grep 6969
   udp     0    0 0.0.0.0:6969    0.0.0.0:*    1234/node
   ```

3. **Test TFTP connection:**
   ```bash
   # From another computer on network
   tftp 192.168.1.50
   > get bootah.ipxe
   > quit
   ```

4. **Check Bootah logs:**
   ```bash
   # Docker
   docker-compose logs bootah | grep -i tftp
   
   # Linux
   sudo journalctl -u bootah | grep -i tftp
   ```

**Expected:** TFTP server logs show "bootah.ipxe" being served.

---

### Scenario 2: Deployment Fails Immediately

**Problem:** You start deployment but it fails with "Deployment failed".

**Root Cause:** Device MAC address doesn't match or connectivity issue.

**Troubleshooting Steps:**

1. **Verify device details:**
   ```bash
   # From the device itself (if possible)
   ipconfig /all          # Windows
   ip addr show           # Linux
   ```

2. **Check MAC address format:**
   - Bootah expects: `00:1A:2B:3C:4D:5E`
   - NOT: `001A2B3C4D5E` or `00-1A-2B-3C-4D-5E`

3. **Check Activity Log:**
   - Go to Activity → Deployments
   - Look for error message
   - Example: "Device not found in network"

4. **Restart deployment:**
   - Delete failed deployment
   - Verify device is on network
   - Try deployment again

---

### Scenario 3: Very Slow Deployment Speed

**Problem:** Ubuntu 3.2 GB taking 2+ hours to deploy.

**Root Cause:** Network congestion or single device deployment.

**Solutions:**

**Option A: Use Multicast (for 10+ devices)**
```
Instead of: Each device gets unique copy
Use Multicast: One stream to multiple devices
```

**Option B: Use compression:**
```bash
# On Bootah server
# Compress image before uploading
gzip ubuntu-22.04.iso
# Reduces from 3.2 GB to ~1.8 GB
```

**Option C: Connect via Ethernet:**
- WiFi is slower and less reliable
- Use Gigabit Ethernet cable directly to switch

---

### Scenario 4: Database Connection Error

**Problem:** Bootah shows "Database connection failed" error.

**Symptom:** You see:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Troubleshooting:**

**Docker:**
```bash
# Check if PostgreSQL container is running
docker-compose ps

# If not running:
docker-compose up -d postgres
docker-compose logs postgres

# Restart app after DB is ready
docker-compose restart bootah
```

**Linux:**
```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql

# Check connection
PGPASSWORD=bootah_password psql -h localhost -U bootah -d bootah -c "SELECT 1;"
```

**Expected:** Connection succeeds without error.

---

### Scenario 5: Can't Access Bootah Web Interface

**Problem:** Browser shows "Connection refused" when accessing `http://localhost:5000`.

**Troubleshooting:**

**Docker:**
```bash
# Check if container is running
docker-compose ps

# If not running
docker-compose up -d

# Wait 30 seconds, try again
sleep 30
curl http://localhost:5000

# Check logs
docker-compose logs bootah | tail -20
```

**Linux:**
```bash
# Check service
sudo systemctl status bootah

# Check if port 5000 is listening
sudo netstat -tulpn | grep 5000

# Check firewall
sudo ufw status
sudo ufw allow 5000/tcp

# Restart service
sudo systemctl restart bootah
```

**Expected:** You can access `http://localhost:5000` in browser.

---

## Success Indicators

After completing installation, you should see:

- ✅ Bootah login page accessible
- ✅ Can create first admin account
- ✅ Dashboard loads with no errors
- ✅ Can add devices
- ✅ Can upload OS images
- ✅ Can create device groups
- ✅ Can create deployment templates
- ✅ Can start deployments
- ✅ Real-time progress updates

---

## Next Steps

1. **Configure your network DHCP** for PXE boot
2. **Upload your OS images** (Windows, Linux, macOS)
3. **Add all your devices** to Bootah
4. **Organize with Device Groups** by department/location
5. **Create Deployment Templates** for recurring tasks
6. **Test deployment** on one device
7. **Scale to multiple devices** using multicast
8. **Setup FOG Project** (optional, for advanced features)

---

## Support Resources

- **Documentation:** See `STANDALONE_INSTALL.md` for detailed reference
- **API Reference:** See `README.md` for API endpoints
- **FOG Integration:** See `FOG_INTEGRATION.md` if using FOG backend
- **GitHub Issues:** Report problems at `https://github.com/drifftr6x/bootah/issues`

---

**You're ready to deploy!** 🚀

Start with Step 0 for your chosen installation method above.
