# Bootah Troubleshooting Guide

Complete guide for testing your installation and solving common issues.

---

## 📋 Table of Contents

1. [Installation Verification Tests](#installation-verification-tests)
2. [Troubleshooting by Component](#troubleshooting-by-component)
3. [Common Error Messages](#common-error-messages)
4. [Diagnostic Commands](#diagnostic-commands)
5. [Performance Issues](#performance-issues)
6. [Network Configuration](#network-configuration)

---

## Installation Verification Tests

### Test 1: Web Interface Accessibility

**Purpose:** Verify Bootah web server is running and accessible.

**For Docker:**
```bash
curl -I http://localhost:5000
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
```

**For Linux:**
```bash
curl -I http://192.168.1.50:5000
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
```

**Expected:** HTTP 200 response.

**If you get "Connection refused":**
```bash
# Check if service is running
docker-compose ps  # Docker
sudo systemctl status bootah  # Linux

# Restart if needed
docker-compose restart bootah  # Docker
sudo systemctl restart bootah  # Linux
```

---

### Test 2: Database Connection

**Purpose:** Verify PostgreSQL is running and connected.

**For Docker:**
```bash
docker-compose exec postgres psql -U bootah -d bootah -c "SELECT version();"
PostgreSQL 15.1 on x86_64-pc-linux-gnu...
```

**For Linux:**
```bash
PGPASSWORD=bootah_password psql -h localhost -U bootah -d bootah -c "SELECT version();"
PostgreSQL 14.6 on x86_64-pc-linux-gnu...
```

**Expected:** PostgreSQL version displayed.

**If you get "connection refused":**
```bash
# Check PostgreSQL service
sudo systemctl status postgresql  # Linux
docker-compose ps  # Docker

# Start if not running
sudo systemctl start postgresql  # Linux
docker-compose up -d postgres  # Docker
```

---

### Test 3: PXE Server Components

**Purpose:** Verify TFTP and DHCP proxy are listening.

**Check TFTP (port 6969):**
```bash
sudo netstat -tulpn | grep 6969
udp     0    0 0.0.0.0:6969    0.0.0.0:*    1234/node

# Or use ss command (newer systems)
sudo ss -tulpn | grep 6969
```

**Expected:** Shows node process listening on port 6969.

**Check DHCP Proxy (port 4067):**
```bash
sudo netstat -tulpn | grep 4067
udp     0    0 0.0.0.0:4067    0.0.0.0:*    1234/node
```

**Expected:** Shows node process listening on port 4067.

**If ports not listening:**
```bash
# Check application logs
docker-compose logs bootah  # Docker
sudo journalctl -u bootah -f  # Linux

# Look for: "TFTP Server listening" and "DHCP Proxy listening"
```

---

### Test 4: TFTP Connectivity

**Purpose:** Verify TFTP server is serving files.

**From another computer on your network:**
```bash
tftp 192.168.1.50
> get bootah.ipxe
> quit

# Verify file was downloaded
ls -lh bootah.ipxe
-rw-r--r-- 1 user staff 4.2K Nov 27 10:30 bootah.ipxe
```

**Expected:** bootah.ipxe file downloaded successfully.

**If download fails:**
```bash
# Check TFTP is running
sudo netstat -tulpn | grep 6969

# Test locally first
echo "test" > /tmp/test.txt
# Verify /tmp is accessible via TFTP

# Check firewall
sudo ufw status
sudo ufw allow 6969/udp
```

---

### Test 5: API Endpoint Connectivity

**Purpose:** Verify API routes are responding.

**Test devices endpoint:**
```bash
curl -s http://localhost:5000/api/devices | head -20
[]
```

**Expected:** JSON response (empty array initially).

**Test images endpoint:**
```bash
curl -s http://localhost:5000/api/images | head -20
[]
```

**Expected:** JSON response (empty array initially).

**Test deployments:**
```bash
curl -s http://localhost:5000/api/deployments | head -20
[]
```

**Expected:** JSON response (empty array initially).

**If API returns 500 error:**
```bash
# Check app logs
docker-compose logs bootah | grep -i error
sudo journalctl -u bootah | grep -i error

# Check database connection in logs
docker-compose logs bootah | grep -i "database\|connection"
```

---

### Test 6: WebSocket Connection

**Purpose:** Verify real-time updates are working.

**In browser console (F12 → Console tab):**
```javascript
// Test WebSocket connection
const ws = new WebSocket(`wss://${window.location.host}/ws`);
ws.onopen = () => console.log("WebSocket connected!");
ws.onerror = (err) => console.log("WebSocket error:", err);
ws.onmessage = (msg) => console.log("Message:", msg.data);
```

**Expected:** You see "WebSocket connected!" in console.

**If connection fails:**
```bash
# Check WebSocket port (same as HTTP)
sudo netstat -tulpn | grep 5000

# Check firewall
sudo ufw status
sudo ufw allow 5000/tcp
```

---

## Troubleshooting by Component

### Component 1: Web Server (Express)

**Issue: "Port already in use"**

```bash
# Find what's using port 5000
sudo lsof -i :5000
COMMAND    PID       USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node      1234      user    15u  IPv4  12345       0t0  TCP *:5000 (LISTEN)

# Kill the process
sudo kill -9 1234

# Or change port in .env
PORT=8000
```

**Issue: "CORS errors in browser"**

```bash
# Check CORS is configured
grep -i cors server/index.ts

# Verify origin in logs
docker-compose logs bootah | grep -i cors
```

**Fix:** CORS should be automatically configured. If not, restart the service.

---

### Component 2: Database (PostgreSQL)

**Issue: "Cannot connect to database"**

**Step 1: Check if PostgreSQL is running**
```bash
# Linux
sudo systemctl status postgresql
● postgresql.service - PostgreSQL RDBMS
     Loaded: loaded (/lib/systemd/system/postgresql.service; enabled)
     Active: active (running)

# Docker
docker-compose ps postgres
NAME         COMMAND              STATUS
bootah-postgres  docker-entrypoint...  Up (healthy)
```

**Step 2: Verify connection string in .env**
```bash
cat .env | grep DATABASE_URL
DATABASE_URL=postgresql://bootah:bootah_password@localhost:5432/bootah
```

**Step 3: Test connection manually**
```bash
# Linux
PGPASSWORD=bootah_password psql -h localhost -U bootah -d bootah -c "SELECT 1;"

# Docker
docker-compose exec postgres psql -U bootah -d bootah -c "SELECT 1;"
```

**Expected:** Shows `1` result.

**Step 4: Check PostgreSQL logs**
```bash
# Linux
sudo tail -100 /var/log/postgresql/postgresql.log | grep error

# Docker
docker-compose logs postgres | tail -50
```

**Issue: "Database does not exist"**

```bash
# Linux
PGPASSWORD=bootah_password psql -h localhost -U bootah -c "CREATE DATABASE bootah OWNER bootah;"

# Docker
docker-compose exec postgres createdb -U bootah bootah
```

**Issue: "User does not exist"**

```bash
# Linux
sudo -u postgres psql -c "CREATE USER bootah WITH PASSWORD 'bootah_password';"
sudo -u postgres psql -c "ALTER ROLE bootah CREATEDB;"

# Docker
docker-compose exec postgres psql -U postgres -c "CREATE USER bootah WITH PASSWORD 'bootah_password';"
```

**Issue: "Migration failed"**

```bash
# Re-apply migrations
npm run db:push

# If that fails, force apply
npm run db:push --force
```

---

### Component 3: PXE Server (TFTP/DHCP)

**Issue: "Devices not discovering"**

**Step 1: Verify PXE server is running**
```bash
docker-compose logs bootah | grep "PXE servers started"
```

**Step 2: Verify TFTP port is open**
```bash
sudo netstat -tulpn | grep 6969
```

**Step 3: Check firewall**
```bash
sudo ufw status
# Should see port 6969 allowed

# If not:
sudo ufw allow 6969/udp
sudo ufw allow 4067/udp
```

**Step 4: Verify PXE_SERVER_IP in .env**
```bash
grep PXE_SERVER_IP .env
PXE_SERVER_IP=192.168.1.50

# Should be your actual server IP, not localhost
```

**Step 5: Test from another device**
```bash
# From another computer on network
tftp 192.168.1.50 6969
> get bootah.ipxe
```

**Issue: "TFTP timeout"**

```bash
# Check network connectivity
ping 192.168.1.50

# Check if Bootah is running
docker-compose ps
sudo systemctl status bootah

# Check firewall on network switch/router
# Verify UDP 6969 is not being blocked
```

**Issue: "DHCP proxy not responding"**

```bash
# Verify DHCP proxy is listening
sudo netstat -tulpn | grep 4067

# Check if port is firewalled
sudo ufw status | grep 4067

# Allow if needed
sudo ufw allow 4067/udp
```

---

### Component 4: Frontend (React)

**Issue: "Blank page or loading forever"**

```bash
# Check browser console for errors (F12 → Console)
# Common errors:
# - "Failed to construct WebSocket"
# - "CORS error"
# - "Cannot fetch /api/devices"

# Solution: Restart the app
docker-compose restart bootah  # Docker
sudo systemctl restart bootah  # Linux
```

**Issue: "WebSocket connection fails"**

```bash
# Check WebSocket is working
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:5000/ws

# Should see 101 Switching Protocols

# If not, check backend logs
docker-compose logs bootah | grep -i websocket
```

**Issue: "Buttons not responding"**

```bash
# Check authentication
# Verify you're logged in by checking browser storage
# F12 → Application → Local Storage → Should see auth tokens

# If not logged in:
# 1. Logout
# 2. Clear browser cache
# 3. Login again
```

---

## Common Error Messages

### Error: "column devices.tags does not exist"

**Cause:** Database schema not updated.

**Solution:**
```bash
npm run db:push
```

---

### Error: "ENOENT: no such file or directory '/app/images'"

**Cause:** Images directory doesn't exist.

**Solution:**
```bash
# Docker - create volume
docker-compose up -d

# Linux - create directory
mkdir -p /opt/bootah/images
sudo chown -R $(whoami):$(whoami) /opt/bootah/images
```

---

### Error: "Connect ECONNREFUSED 127.0.0.1:5432"

**Cause:** PostgreSQL not running.

**Solution:**
```bash
# Docker
docker-compose up -d postgres
docker-compose restart bootah

# Linux
sudo systemctl restart postgresql
sudo systemctl restart bootah
```

---

### Error: "Failed to construct 'WebSocket'"

**Cause:** WebSocket URL is invalid (usually undefined port).

**Solution:**
```bash
# Verify port is set in environment
echo $PORT

# Restart application
docker-compose restart bootah
sudo systemctl restart bootah
```

---

### Error: "Session secret is not set"

**Cause:** SESSION_SECRET environment variable missing.

**Solution:**
```bash
# Generate new secret
openssl rand -base64 32

# Add to .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env

# Restart
docker-compose restart bootah
```

---

### Error: "TFTP: File not found"

**Cause:** bootah.ipxe not being served.

**Solution:**
```bash
# Check if file exists
ls -la dist/public/bootah.ipxe

# Restart TFTP server
docker-compose restart bootah
```

---

## Diagnostic Commands

### Get System Information

**Docker:**
```bash
# Container status
docker-compose ps

# View logs (last 50 lines)
docker-compose logs --tail 50 bootah

# Follow logs in real-time
docker-compose logs -f bootah

# Container resource usage
docker stats bootah

# Inspect container
docker inspect bootah-app
```

**Linux:**
```bash
# Service status
sudo systemctl status bootah

# View logs (last 50 lines)
sudo journalctl -u bootah -n 50

# Follow logs in real-time
sudo journalctl -u bootah -f

# Process info
ps aux | grep node

# Resource usage
top -p $(pgrep -f "node.*bootah")

# Disk usage
du -sh /opt/bootah
```

### Network Diagnostics

```bash
# View listening ports
sudo netstat -tulpn | grep node

# View connections
sudo netstat -tupn | grep node

# DNS resolution
nslookup bootah.example.com
dig bootah.example.com

# Test connectivity
ping 192.168.1.50
traceroute 192.168.1.50
```

### Database Diagnostics

```bash
# List databases
PGPASSWORD=bootah_password psql -h localhost -U bootah -c "\l"

# List tables
PGPASSWORD=bootah_password psql -h localhost -U bootah -d bootah -c "\dt"

# Check device count
PGPASSWORD=bootah_password psql -h localhost -U bootah -d bootah -c "SELECT COUNT(*) FROM devices;"

# Check image count
PGPASSWORD=bootah_password psql -h localhost -U bootah -d bootah -c "SELECT COUNT(*) FROM images;"
```

### Application Diagnostics

```bash
# Test API
curl -v http://localhost:5000/api/devices

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/devices

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/devices

# Load testing (requires Apache Bench)
ab -n 100 -c 10 http://localhost:5000/
```

---

## Performance Issues

### Issue: Deployment very slow (1 MB/s or less)

**Root Causes:**
1. WiFi connection (unstable)
2. Network congestion
3. Disk I/O bottleneck
4. Single-threaded transfer

**Solutions:**

```bash
# 1. Use Gigabit Ethernet (not WiFi)
# Connect device to network via Ethernet cable

# 2. Check network speed
iperf3 -s  # On Bootah server
iperf3 -c 192.168.1.50  # From another computer

# 3. Check disk speed
dd if=/dev/zero of=/tmp/test.img bs=1M count=1000
# Should see 50+ MB/s for local SSDs

# 4. Use multicast (10+ devices)
# Instead of individual deployments, use multicast sessions

# 5. Compress images before upload
gzip ubuntu-22.04.iso
# Reduces 3 GB to ~1.8 GB
```

---

### Issue: High CPU usage

**Symptoms:** Bootah service using 80%+ CPU

**Diagnostics:**
```bash
# See what's using CPU
top
# Look for node process, check %CPU column

# Profile the application
# Enable debug mode in logs
DEBUG=bootah:* npm start
```

**Solutions:**
```bash
# Restart service
docker-compose restart bootah
sudo systemctl restart bootah

# Check for hung deployments
curl http://localhost:5000/api/deployments

# Cancel stuck deployments
curl -X DELETE http://localhost:5000/api/deployments/stuck-id
```

---

### Issue: High memory usage

**Symptoms:** Bootah using 500+ MB RAM

**Diagnostics:**
```bash
# Check memory
free -h
docker stats bootah

# Check for memory leaks in logs
docker-compose logs bootah | grep -i "memory\|leak"
```

**Solutions:**
```bash
# Restart service
docker-compose restart bootah
sudo systemctl restart bootah

# Increase allocated memory
# Docker: Edit docker-compose.yml
# Linux: Ensure 4GB+ RAM available
```

---

## Network Configuration

### Configure Router for PXE Boot

**Steps:**

1. **Access router admin panel**
   ```
   http://192.168.1.1 (default gateway IP)
   ```

2. **Login with admin credentials**
   ```
   Default: admin/admin or admin/password
   (Check router manual if unsure)
   ```

3. **Find DHCP settings**
   - DHCP Settings / DHCP Options
   - Or: Services → DHCP

4. **Set Option 66 (TFTP Server)**
   ```
   Option 66: 192.168.1.50  (your Bootah IP)
   ```

5. **Set Option 67 (Boot File)**
   ```
   Option 67: bootah.ipxe  (optional but recommended)
   ```

6. **Save and apply changes**

7. **Reboot router** (if required)

---

### Verify PXE Configuration

**From a Windows computer:**
```bash
# Check DHCP configuration received
ipconfig /all | find "TFTP"

# Should show: DHCP Server: 192.168.1.50
```

**From a Linux computer:**
```bash
# Check DHCP configuration
dhclient -v eth0

# Look for: Option 66 (TFTP Server): 192.168.1.50
```

---

## Testing Checklist

Use this checklist to verify your installation is working:

- [ ] Test 1: Web interface accessible (`http://localhost:5000` or `http://your-ip:5000`)
- [ ] Test 2: Database connection working
- [ ] Test 3: PXE servers running on ports 6969 and 4067
- [ ] Test 4: TFTP files accessible from other machines
- [ ] Test 5: API endpoints responding with JSON
- [ ] Test 6: WebSocket connection working
- [ ] Test 7: Can create admin account
- [ ] Test 8: Can add devices
- [ ] Test 9: Can upload OS images
- [ ] Test 10: Can create deployments
- [ ] Router DHCP Option 66 configured for PXE boot
- [ ] Devices can network boot and reach Bootah TFTP
- [ ] Deployment progresses to 100%

**If all tests pass:** Installation is successful! ✅

**If any test fails:** Follow the troubleshooting steps above for that component.

---

## Getting Help

If you're still stuck:

1. **Check the logs** - Most issues are explained in logs
   ```bash
   # Docker
   docker-compose logs bootah | tail -100
   
   # Linux
   sudo journalctl -u bootah -n 200
   ```

2. **Review error message** - Search this guide for the exact error

3. **Run diagnostic commands** - Use commands above to gather information

4. **Check GitHub issues** - https://github.com/drifftr6x/bootah/issues

5. **Contact support** - Include:
   - Error message (exact text)
   - Installation method (Docker/Linux/Proxmox)
   - OS version
   - Network setup
   - Relevant logs (from diagnostic commands)

---

**Need more help?** See [DETAILED_INSTALLATION_WALKTHROUGH.md](DETAILED_INSTALLATION_WALKTHROUGH.md) for step-by-step installation with examples.
