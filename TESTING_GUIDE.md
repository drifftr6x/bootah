# Bootah Installation Testing Guide

This guide provides step-by-step instructions to verify your Bootah installation is working correctly. Tests are organized from basic connectivity to full deployment workflows.

---

## Table of Contents

1. [Pre-Flight Checks](#pre-flight-checks)
2. [Component Verification](#component-verification)
3. [Web Interface Testing](#web-interface-testing)
4. [PXE/TFTP Service Testing](#pxetftp-service-testing)
5. [FOG Integration Testing](#fog-integration-testing)
6. [Device Discovery Testing](#device-discovery-testing)
7. [Multicast Deployment Testing](#multicast-deployment-testing)
8. [Security Verification](#security-verification)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Flight Checks

Before testing, verify your environment is properly configured.

### 1.1 Check Bootah Service Status

```bash
# If using systemd
sudo systemctl status bootah

# If using PM2
pm2 status bootah

# Check if process is running
ps aux | grep node | grep bootah
```

**Expected:** Service shows "active (running)" or similar.

### 1.2 Verify Required Ports

```bash
# Check which ports are listening
sudo ss -tlnp | grep -E '(5000|6969|4067|9000)'

# Or with netstat
sudo netstat -tlnp | grep -E '(5000|6969|4067|9000)'
```

**Expected Ports:**
| Port | Service | Protocol |
|------|---------|----------|
| 5000 | Web UI / API | HTTP |
| 6969 | TFTP Server | UDP |
| 4067 | DHCP Proxy | UDP |
| 9000 | Multicast | UDP |

### 1.3 Verify Database Connection

```bash
# Test PostgreSQL connection
psql -U bootah -d bootah -h localhost -c "SELECT COUNT(*) FROM devices;"

# Or check via Bootah logs
journalctl -u bootah --since "5 minutes ago" | grep -i database
```

**Expected:** Query returns a number (0 is fine for fresh install).

### 1.4 Check Environment Variables

```bash
# View current environment (mask sensitive values)
cat /opt/bootah/.env | grep -v PASSWORD | grep -v SECRET
```

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Random secret for sessions
- `PXE_SERVER_IP` - IP address clients will connect to
- `AUTH_MODE` - Either "local" or "replit"

---

## Component Verification

### 2.1 Health Check Endpoint

```bash
# Basic health check
curl -s http://localhost:5000/api/status | jq .

# Expected response:
# {
#   "status": "healthy",
#   "services": {
#     "pxe": true,
#     "tftp": true,
#     "dhcp": true,
#     "http": true
#   }
# }
```

### 2.2 API Connectivity

```bash
# Test API without authentication (should return 401)
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/devices
# Expected: 401

# Test public endpoints
curl -s http://localhost:5000/api/server-status | jq .
```

### 2.3 Database Migrations

```bash
# Check if all tables exist
psql -U bootah -d bootah -c "\dt"

# Expected tables: devices, images, deployments, multicast_sessions, 
# multicast_participants, activity_logs, users, sessions
```

---

## Web Interface Testing

### 3.1 Access Web UI

1. Open browser to `http://YOUR_SERVER_IP:5000`
2. You should see the Bootah login page

**First-time setup:**
- If `ALLOW_REGISTRATION=true`, click "Register" to create admin account
- Default role should be "admin" per `DEFAULT_USER_ROLE` setting

### 3.2 Login Test

1. Enter your credentials
2. Click Login
3. **Expected:** Redirected to Dashboard

### 3.3 Dashboard Verification

After login, verify these dashboard elements:
- [ ] Device count displays
- [ ] Image count displays
- [ ] Server status shows (PXE, TFTP, DHCP, HTTP)
- [ ] Activity log loads
- [ ] Navigation menu works

### 3.4 Page Navigation Test

Visit each main section:
- [ ] Dashboard (`/`)
- [ ] Devices (`/devices`)
- [ ] Images (`/images`)
- [ ] Deployments (`/deployments`)
- [ ] Multicast (`/multicast`)
- [ ] Settings (`/settings`)

---

## PXE/TFTP Service Testing

### 4.1 TFTP Server Test

```bash
# Install tftp client if needed
sudo apt install tftp-hpa

# Test TFTP connectivity (from another machine on the network)
tftp YOUR_SERVER_IP 6969 -c get pxelinux.0

# Check if file downloaded
ls -la pxelinux.0
```

**Expected:** File downloads successfully (or shows in transfer).

### 4.2 PXE Boot Test (VM Method)

Create a test VM to verify PXE booting:

**Proxmox:**
```bash
# Create a small test VM with PXE boot
qm create 999 --name pxe-test --memory 512 --net0 virtio,bridge=vmbr0
qm set 999 --boot order=net0
qm start 999
```

**VirtualBox:**
1. Create new VM with 512MB RAM
2. Network: Bridged Adapter (same network as Bootah)
3. Boot Order: Network first

### 4.3 Verify PXE Traffic Detection

1. Boot the test VM
2. In Bootah web UI, go to Dashboard
3. **Expected:** PXE traffic indicator shows activity
4. Check Activity Log for DHCP/TFTP requests

### 4.4 Check Boot Menu

When PXE client boots, you should see:
1. DHCP request received
2. TFTP transfer begins
3. Boot menu appears (if configured)

### 4.5 BIOS vs UEFI Boot Testing

Test both boot modes to ensure full compatibility:

**BIOS/Legacy Boot Test:**
```bash
# Verify BIOS boot files exist
ls -la /opt/bootah/tftpboot/pxelinux.0
ls -la /opt/bootah/tftpboot/ldlinux.c32

# Create BIOS test VM (Proxmox)
qm create 998 --name bios-test --memory 512 --bios seabios \
  --net0 virtio,bridge=vmbr0
qm set 998 --boot order=net0
qm start 998
```

**Expected:** VM boots to PXE menu using pxelinux.0.

**UEFI Boot Test:**
```bash
# Verify UEFI boot files exist
ls -la /opt/bootah/tftpboot/ipxe.efi
ls -la /opt/bootah/tftpboot/snponly.efi

# Create UEFI test VM (Proxmox)
qm create 997 --name uefi-test --memory 512 --bios ovmf \
  --net0 virtio,bridge=vmbr0 --efidisk0 local-lvm:1,format=raw
qm set 997 --boot order=net0
qm start 997
```

**Expected:** VM boots to PXE menu using ipxe.efi.

**UEFI Secure Boot Test (if enabled):**
1. Enable Secure Boot in VM BIOS settings
2. Ensure signed boot files are present
3. Boot should proceed without security warnings

**Verification Checklist:**
| Boot Mode | Boot File | Status |
|-----------|-----------|--------|
| BIOS/Legacy | pxelinux.0 | [ ] Works |
| UEFI | ipxe.efi | [ ] Works |
| UEFI Secure Boot | snponly.efi (signed) | [ ] Works |

### 4.6 Real-Time Telemetry Verification

Verify WebSocket/polling updates work in real-time:

**Test 1: Dashboard Live Updates**
1. Open Bootah Dashboard in browser
2. Open browser Developer Tools (F12) > Network tab
3. Filter by "WS" or "api" to see WebSocket/polling requests
4. PXE boot a test device
5. **Expected:** Dashboard updates without page refresh

**Test 2: Activity Log Streaming**
1. Keep Activity Log visible in browser
2. In another terminal, trigger an action:
```bash
# Add a test device via API
curl -X POST http://localhost:5000/api/devices \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"telemetry-test","macAddress":"AA:BB:CC:DD:EE:FF"}'
```
3. **Expected:** New activity entry appears in log within 2 seconds

**Test 3: Multicast Progress Updates**
1. Start a multicast session with 1+ participants
2. Watch progress bars on Multicast page
3. **Expected:** Progress updates every 1-2 seconds during transfer

---

## FOG Integration Testing

> Skip this section if not using FOG Project backend.

### 5.1 Configure FOG Connection

1. Go to Settings > FOG Integration
2. Enter:
   - FOG Server URL: `http://YOUR_FOG_SERVER/fog`
   - API Token: Your FOG API token
   - User Token: Your FOG user token

### 5.2 Test FOG API Connectivity

```bash
# Via Bootah API
curl -s http://localhost:5000/api/fog/status \
  -H "Cookie: YOUR_SESSION_COOKIE" | jq .

# Expected:
# {
#   "connected": true,
#   "version": "1.5.x",
#   "images": 5,
#   "hosts": 10
# }
```

### 5.3 Sync Images from FOG

1. Go to Images page
2. Click "Sync from FOG"
3. **Expected:** FOG images appear in list

```bash
# Via API
curl -X POST http://localhost:5000/api/fog/sync-images \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"
```

### 5.4 Sync Hosts from FOG

1. Go to Devices page
2. Click "Sync from FOG"
3. **Expected:** FOG hosts appear as devices

### 5.5 Test FOG Deployment

1. Select a device synced from FOG
2. Click "Deploy" and select a FOG image
3. Choose "FOG Backend" deployment method
4. **Expected:** Task created in FOG, visible in both Bootah and FOG UI

### 5.6 Verify Task ID Synchronization

```bash
# Get Bootah deployment ID
curl -s http://localhost:5000/api/deployments \
  -H "Cookie: YOUR_SESSION_COOKIE" | jq '.[0] | {id, fogTaskId}'

# Verify matching task in FOG
curl -s "http://FOG_SERVER/fog/task/current" \
  -H "fog-api-token: YOUR_TOKEN" \
  -H "fog-user-token: YOUR_USER_TOKEN" | jq .
```

**Expected:** Bootah `fogTaskId` matches the task ID in FOG.

### 5.7 Test Task Cancellation

1. Start a FOG deployment on a test device
2. While deployment is in progress, click "Cancel" in Bootah
3. **Expected:** 
   - Bootah deployment status changes to "cancelled"
   - FOG task is also cancelled

```bash
# Via API
curl -X POST http://localhost:5000/api/fog/tasks/TASK_ID/cancel \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"
```

### 5.8 Test Task Retry

1. Cancel or fail a FOG deployment
2. Click "Retry" on the failed deployment
3. **Expected:** New task created in FOG, deployment restarts

---

## Device Discovery Testing

### 6.1 Manual Device Add

1. Go to Devices > Add Device
2. Enter:
   - Name: `test-device-01`
   - MAC Address: `00:11:22:33:44:55`
   - IP Address: `192.168.1.100`
3. Click Save
4. **Expected:** Device appears in list

### 6.2 Network Scan

1. Go to Devices > Scan Network
2. Enter subnet: `192.168.1.0/24`
3. Click Scan
4. **Expected:** Discovered devices appear for import

### 6.3 Device Status Updates

1. PXE boot a test device
2. Watch Dashboard/Devices page
3. **Expected:** Device status changes to "online" within 30 seconds

### 6.4 Wake-on-LAN Test

1. Ensure target device supports WoL
2. Put device in powered-off state
3. Click "Wake" button in Bootah
4. **Expected:** Device powers on

---

## Multicast Deployment Testing

### 7.1 Prerequisites

- At least 2 PXE-capable test machines/VMs
- An OS image uploaded to Bootah
- All devices on same network/VLAN

### 7.2 Create Multicast Session

1. Go to Multicast > New Session
2. Configure:
   - Session Name: `test-multicast-01`
   - Image: Select your test image
   - Timeout: 300 seconds
3. Click Create

### 7.3 Add Participants

1. Click "Add Participants"
2. Select 2+ test devices
3. Click Add

### 7.4 Start Session

1. Click "Start Session"
2. Boot all participant devices via PXE
3. **Expected:** Devices join session automatically

### 7.5 Monitor Progress

Watch the multicast session page:
- [ ] All participants show "connected"
- [ ] Progress bars update in real-time
- [ ] Chunk delivery status displays

### 7.6 Verify Completion

1. All participants reach 100%
2. Session status changes to "completed"
3. Activity log shows success entries

### 7.7 Persistence Test

```bash
# Restart Bootah service during a session
sudo systemctl restart bootah

# Check if session state persisted
curl http://localhost:5000/api/multicast-sessions | jq .
```

**Expected:** Active sessions restore after restart.

---

## Security Verification

### 8.1 CSRF Protection Test

```bash
# Attempt POST without CSRF token (should fail)
curl -X POST http://localhost:5000/api/devices \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}' \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: 403 Forbidden
```

### 8.2 Authentication Test

```bash
# Attempt access without login (should fail)
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/devices
# Expected: 401

# Attempt with invalid session
curl -s -o /dev/null -w "%{http_code}" \
  -H "Cookie: connect.sid=invalid" \
  http://localhost:5000/api/devices
# Expected: 401
```

### 8.3 Rate Limiting Test

```bash
# Test registration rate limit (60/min)
for i in {1..65}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:5000/api/register \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
done

# Expected: First 60 return 400 (validation), then 429 (rate limited)
```

### 8.4 Role-Based Access Test

1. Create user with "viewer" role
2. Login as viewer
3. Attempt to delete a device
4. **Expected:** Operation denied (403)

---

## Troubleshooting

### Common Issues

#### Issue: Web UI won't load

```bash
# Check if service is running
sudo systemctl status bootah

# Check logs
journalctl -u bootah -n 100 --no-pager

# Verify port binding
sudo ss -tlnp | grep 5000
```

#### Issue: PXE clients not getting IP

```bash
# Check DHCP proxy status
journalctl -u bootah | grep -i dhcp

# Verify no DHCP conflicts
# Ensure your main DHCP server allows Bootah's proxy

# Check firewall
sudo ufw status
sudo iptables -L -n | grep -E '(4067|6969)'
```

#### Issue: TFTP transfer fails

```bash
# Test TFTP locally
tftp localhost 6969 -c get pxelinux.0

# Check TFTP logs
journalctl -u bootah | grep -i tftp

# Verify boot files exist
ls -la /opt/bootah/tftpboot/
```

#### Issue: FOG API returns 401

```bash
# Verify FOG credentials
curl -s "http://FOG_SERVER/fog/service/api/system/status" \
  -H "fog-api-token: YOUR_API_TOKEN" \
  -H "fog-user-token: YOUR_USER_TOKEN"

# Check FOG API settings in Bootah
cat /opt/bootah/.env | grep FOG
```

#### Issue: Multicast session won't start

```bash
# Check multicast port
sudo ss -ulnp | grep 9000

# Verify IGMP snooping (on managed switches)
# May need to enable IGMP querier or disable snooping

# Check multicast route
ip maddr show
```

#### Issue: Database connection failed

```bash
# Test PostgreSQL
psql -U bootah -d bootah -h localhost -c "SELECT 1"

# Check PostgreSQL service
sudo systemctl status postgresql

# Verify connection string
grep DATABASE_URL /opt/bootah/.env
```

### Log Locations

| Log | Location |
|-----|----------|
| Bootah Service | `journalctl -u bootah` |
| PostgreSQL | `/var/log/postgresql/` |
| System | `/var/log/syslog` |
| Application | `/opt/bootah/logs/` (if configured) |

### Getting Help

If issues persist:
1. Collect logs: `journalctl -u bootah > bootah-logs.txt`
2. Check GitHub Issues: https://github.com/drifftr6x/bootah/issues
3. Visit: https://bootah64x.com/support

---

## Test Checklist Summary

Use this checklist to track your testing progress:

```
[ ] Pre-Flight Checks
    [ ] Service running
    [ ] Ports open (5000, 6969, 4067, 9000)
    [ ] Database connected
    [ ] Environment configured

[ ] Component Verification
    [ ] Health endpoint returns healthy
    [ ] All database tables exist
    
[ ] Web Interface
    [ ] Login works
    [ ] Dashboard loads
    [ ] All pages accessible
    
[ ] PXE/TFTP
    [ ] TFTP transfers work
    [ ] PXE boot menu appears
    [ ] Traffic detected in UI
    [ ] BIOS/Legacy boot works
    [ ] UEFI boot works
    [ ] Real-time telemetry updates
    
[ ] FOG Integration (if applicable)
    [ ] API connected
    [ ] Images sync
    [ ] Hosts sync
    [ ] Deployments work
    [ ] Task IDs synchronized
    [ ] Cancel task works
    [ ] Retry task works
    
[ ] Device Discovery
    [ ] Manual add works
    [ ] Network scan works
    [ ] Status updates work
    
[ ] Multicast Deployment
    [ ] Session creates
    [ ] Participants join
    [ ] Progress tracked
    [ ] Completion logged
    
[ ] Security
    [ ] CSRF blocks requests without token
    [ ] Auth required for protected routes
    [ ] Rate limiting works
    [ ] RBAC enforced
```

---

**Testing Complete!**

Once all checks pass, your Bootah installation is verified and ready for production use.
