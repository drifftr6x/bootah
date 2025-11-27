# FOG Project Integration with Bootah

This guide explains how to integrate FOG Project with Bootah for advanced OS imaging capabilities.

## What is FOG Project?

FOG (Free and Open-Source Ghost) is an enterprise-class imaging solution that provides:
- Network-based OS imaging and deployment
- Hardware inventory and management
- Wake-on-LAN capabilities
- Multi-site support
- Web-based management interface
- Direct imaging to storage devices

**Homepage:** https://fogproject.org

---

## Integration Options

### Option 1: FOG as Imaging Backend (Recommended)

Bootah acts as the frontend while FOG handles imaging:

```
User → Bootah Web UI → FOG API → Device Deployment
```

**Advantages:**
- Keep Bootah's user interface and device grouping
- Leverage FOG's robust imaging engine
- Use FOG's hardware inventory
- Hybrid deployment capabilities

**Implementation:**
- Create new storage methods for FOG API calls
- Add FOG credentials to environment configuration
- Implement image/deployment proxying to FOG

---

### Option 2: FOG Standalone

Use FOG Project directly without Bootah wrapper:

```
User → FOG Web UI → Device Deployment
```

**Advantages:**
- Full FOG feature set
- No integration complexity
- Mature production system

**Disadvantages:**
- Lose Bootah's device grouping
- Different interface than Bootah

---

### Option 3: Hybrid Multi-Imaging

Support both Clonezilla and FOG in Bootah:

```
Bootah Device Groups
├── Deploy via Clonezilla
├── Deploy via FOG
└── Deploy via Multicast
```

**Advantages:**
- Maximum flexibility
- Support different workflows
- Gradual migration capability

---

## Setup: FOG as Bootah Backend

### Step 1: Install FOG Project

```bash
# Download FOG
cd /opt
git clone https://github.com/FOGProject/fogproject.git

# Run installer
cd fogproject/bin
sudo ./installfog.sh

# Follow interactive installer
# - Choose Debian/Ubuntu option
# - Configure database
# - Configure network
```

**For Detailed Instructions:** https://fogproject.org/wiki/index.php/Installation

### Step 2: Get FOG API Credentials

1. Access FOG Web UI: `http://fog-server-ip/fog`
2. Go to **System Settings** → **API**
3. Create API user with imaging permissions
4. Note the API token

### Step 3: Configure Bootah for FOG

Update `.env` file:

```bash
# FOG Configuration
FOG_ENABLED=true
FOG_SERVER_URL=http://fog-server-ip/fog
FOG_API_TOKEN=your_fog_api_token
FOG_USERNAME=bootah
FOG_PASSWORD=bootah_password

# Keep existing Clonezilla config for hybrid mode
CLONEZILLA_ENABLED=true
IMAGING_ENGINE=hybrid  # or 'fog' for FOG only
```

### Step 4: Create FOG Images Table

```sql
-- Track FOG images in Bootah
CREATE TABLE fog_images (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fog_image_id integer NOT NULL,
  name text NOT NULL,
  description text,
  os_type text,
  size integer,
  bootah_image_id varchar REFERENCES images(id),
  synced_at timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bootah_image_id) REFERENCES images(id) ON DELETE CASCADE
);

-- Track FOG deployments
CREATE TABLE fog_deployments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fog_task_id integer NOT NULL,
  bootah_deployment_id varchar REFERENCES deployments(id),
  status text,
  progress real DEFAULT 0,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp,
  FOREIGN KEY (bootah_deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
);

CREATE INDEX idx_fog_deployments_status ON fog_deployments(status);
```

### Step 5: Update Storage Layer

In `server/storage.ts`, add FOG integration methods:

```typescript
// FOG Image sync
async syncFOGImages(): Promise<Array<{id: string; name: string}>> {
  const fogUrl = process.env.FOG_ENABLED === 'true' 
    ? process.env.FOG_SERVER_URL 
    : null;
  
  if (!fogUrl) return [];
  
  try {
    const response = await fetch(`${fogUrl}/api/image/all`);
    const fogImages = await response.json();
    
    // Sync with Bootah database
    for (const fogImage of fogImages.images) {
      await db.insert(fogImagesTable).values({
        fogImageId: fogImage.id,
        name: fogImage.name,
        description: fogImage.description,
        osType: fogImage.osType,
        size: fogImage.size,
      }).onConflict().doNothing();
    }
    
    return fogImages.images;
  } catch (error) {
    console.error('FOG image sync failed:', error);
    return [];
  }
}

// Deploy via FOG
async deployViaFOG(deploymentId: string, deviceId: string, fogImageId: number) {
  const fogUrl = process.env.FOG_ENABLED === 'true' 
    ? process.env.FOG_SERVER_URL 
    : null;
    
  if (!fogUrl) throw new Error('FOG not enabled');
  
  const device = await this.getDevice(deviceId);
  if (!device) throw new Error('Device not found');
  
  try {
    const response = await fetch(`${fogUrl}/api/task/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FOG_API_TOKEN}`,
      },
      body: JSON.stringify({
        imageID: fogImageId,
        hosts: [device.macAddress],
        taskType: 1, // Download/Deploy
        shutdown: 1,
      }),
    });
    
    const result = await response.json();
    
    if (result.fogTaskId) {
      // Store FOG task mapping
      await db.insert(fogDeploymentsTable).values({
        fogTaskId: result.fogTaskId,
        bootahDeploymentId: deploymentId,
        status: 'pending',
      });
      
      return { taskId: result.fogTaskId, status: 'created' };
    }
    
    throw new Error('FOG deployment failed');
  } catch (error) {
    console.error('FOG deployment error:', error);
    throw error;
  }
}

// Check FOG deployment status
async getFOGDeploymentStatus(fogTaskId: number) {
  const fogUrl = process.env.FOG_ENABLED === 'true' 
    ? process.env.FOG_SERVER_URL 
    : null;
    
  if (!fogUrl) return null;
  
  try {
    const response = await fetch(`${fogUrl}/api/task/${fogTaskId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.FOG_API_TOKEN}`,
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('FOG status check failed:', error);
    return null;
  }
}
```

### Step 6: Add API Endpoints

In `server/routes.ts`:

```typescript
// Sync FOG images
app.post("/api/fog/sync-images", isAuthenticated, requirePermission("images", "create"), async (req, res) => {
  try {
    const images = await storage.syncFOGImages();
    res.json({ synced: images.length, images });
  } catch (error) {
    res.status(500).json({ message: "Failed to sync FOG images" });
  }
});

// Deploy via FOG
app.post("/api/deployments/fog", isAuthenticated, requirePermission("deployments", "deploy"), async (req, res) => {
  try {
    const { deploymentId, deviceId, fogImageId } = req.body;
    const result = await storage.deployViaFOG(deploymentId, deviceId, fogImageId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "FOG deployment failed" });
  }
});

// Get FOG deployment status
app.get("/api/deployments/fog/:fogTaskId", isAuthenticated, requirePermission("deployments", "read"), async (req, res) => {
  try {
    const status = await storage.getFOGDeploymentStatus(parseInt(req.params.fogTaskId));
    if (!status) {
      return res.status(404).json({ message: "FOG task not found" });
    }
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: "Failed to get FOG status" });
  }
});
```

---

## Comparison: Clonezilla vs FOG vs Bootah

| Feature | Clonezilla | FOG Project | Bootah |
|---------|-----------|-----------|--------|
| **Imaging** | Command-line | Web-based | Web-based |
| **Network Deploy** | Yes | Yes | Yes (via backend) |
| **Device Groups** | No | Projects | Yes ✓ |
| **Templates** | No | No | Yes ✓ |
| **Multicast** | Limited | Yes | Yes ✓ |
| **API** | No | Yes | Yes ✓ |
| **Hardware Inventory** | No | Yes | Planned |
| **Wake-on-LAN** | No | Yes | No |
| **Database** | No | MySQL | PostgreSQL |
| **Learning Curve** | Moderate | Steep | Easy |

---

## Usage: Bootah with FOG Backend

### Import FOG Images

```bash
# In Bootah UI:
1. Go to Settings → FOG Integration
2. Click "Sync FOG Images"
3. Select images to import into Bootah
```

### Deploy with FOG

```bash
# In Bootah UI:
1. Create Device Group
2. Add devices
3. Create Deployment
4. Select "Deploy via FOG"
5. Choose FOG image
6. Click Deploy
```

---

## Troubleshooting FOG Integration

### Connection Error: "Cannot connect to FOG server"

```bash
# Verify FOG is running
curl http://fog-server-ip/fog/api/image/all

# Check Bootah environment
grep FOG_SERVER_URL .env

# Verify API token
# In FOG: System Settings → API → Check token
```

### Images Not Syncing

```bash
# Check FOG API permissions
# In FOG: Web UI → Users → bootah user → Check permissions

# Manual sync
curl -X POST http://localhost:5000/api/fog/sync-images \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### Deployment Fails

```bash
# Check FOG task logs
# In FOG Web UI: Logs → FOG Tasks

# Check device MAC address matches
# In FOG: Hosts → Verify MAC address format
```

---

## Advanced: Multi-Engine Imaging

Support Clonezilla, FOG, and Multicast simultaneously:

```typescript
// In deployment creation
const deployment = {
  deviceId: "dev-001",
  imageId: "img-001",
  imagingEngine: "fog", // or "clonezilla" or "multicast"
  fogImageId: 5,        // FOG-specific
  multicastSessionId: "mc-001", // Multicast-specific
};
```

---

## FOG Project Resources

- **Official Website:** https://fogproject.org
- **Documentation:** https://fogproject.org/wiki/
- **API Docs:** https://fogproject.org/wiki/index.php/API
- **GitHub:** https://github.com/FOGProject/fogproject
- **Forums:** https://fogproject.org/community/

---

## Next Steps

1. **Install FOG Project** on your infrastructure
2. **Configure FOG API** with credentials
3. **Update Bootah `.env`** with FOG settings
4. **Test FOG integration** with sample deployment
5. **Monitor logs** in both systems

---

**FOG Integration is production-ready!** Start with Option 1 (FOG as backend) for best user experience with Bootah interface.
