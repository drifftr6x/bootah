# Bootah64x Installation & Configuration Guide

Complete guide to deploying and configuring Bootah64x PXE imaging platform on Replit.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Deployment Options](#deployment-options)
3. [Environment Configuration](#environment-configuration)
4. [Network Setup](#network-setup)
5. [First-Time Setup](#first-time-setup)
6. [User Management](#user-management)
7. [Testing & Verification](#testing--verification)
8. [Troubleshooting](#troubleshooting)

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
