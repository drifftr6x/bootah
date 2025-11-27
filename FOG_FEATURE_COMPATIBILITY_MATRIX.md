# Bootah Features - FOG Compatibility Matrix

Complete feature mapping ensuring all Bootah features work seamlessly with FOG Project integration.

---

## Feature Compatibility Status

### ✅ IMPLEMENTED & WORKING

#### 1. Device Management
| Feature | Status | Notes |
|---------|--------|-------|
| Add Devices | ✅ | Manual or auto-discovery |
| Device Groups | ✅ | Color-coded organization (Bootah native) |
| Device Status | ✅ | Real-time updates |
| Device Tagging | ✅ | Flexible tagging system |
| FOG Host Sync | ✅ | `POST /api/fog/sync-hosts` |

#### 2. Image Management
| Feature | Status | Notes |
|---------|--------|-------|
| Upload Images | ✅ | Bootah image storage |
| FOG Image Sync | ✅ | `POST /api/fog/sync-images` |
| Image Catalog | ✅ | Mixed Bootah + FOG images |
| Image Compression | ✅ | gzip support |

#### 3. Basic Deployments
| Feature | Status | Notes |
|---------|--------|-------|
| Single Device Deployment | ✅ | Via Clonezilla or FOG |
| Deployment via FOG | ✅ | `POST /api/deployments/fog` |
| Deployment Status | ✅ | Real-time progress |
| Cancel Deployment | ✅ | `POST /api/fog/tasks/:taskId/cancel` |

#### 4. Real-Time Monitoring
| Feature | Status | Notes |
|---------|--------|-------|
| WebSocket Updates | ✅ | Live progress streaming |
| FOG Task Monitoring | ✅ | `POST /api/fog/monitor/:taskId` |
| Activity Logs | ✅ | All operations logged |
| Deployment History | ✅ | Complete audit trail |

#### 5. User Management & RBAC
| Feature | Status | Notes |
|---------|--------|-------|
| Role-Based Access Control | ✅ | Admin, Operator, Viewer |
| Permission Checks | ✅ | All API endpoints protected |
| Audit Trail | ✅ | User actions logged |
| Session Management | ✅ | PostgreSQL session store |

#### 6. API Endpoints
| Feature | Status | Notes |
|---------|--------|-------|
| Device APIs | ✅ | Full CRUD |
| Image APIs | ✅ | Full CRUD |
| Deployment APIs | ✅ | Full CRUD |
| Device Group APIs | ✅ | Full CRUD |
| FOG APIs | ✅ | Status, sync, tasks |

---

## ⚠️ PARTIALLY IMPLEMENTED (Needs Enhancement)

### 1. Deployment Templates with FOG

**Current Status:** Templates work with Bootah deployments, but FOG integration incomplete.

**Issue:** Templates don't support FOG-specific settings.

**Missing:**
- Template can specify `fogImageId` but FOG task type/options not saved
- Template variables don't include FOG parameters (shutdown behavior, task type)
- Duplicate template doesn't copy FOG settings

**Required Fix:**
```typescript
// In shared/schema.ts - extend DeploymentTemplate
templateDeploymentSchema {
  // Existing fields...
  
  // Add FOG-specific fields
  imagingEngine: text("imaging_engine").default("clonezilla"), // clonezilla | fog | multicast
  fogImageId: integer("fog_image_id"), // FOG image ID
  fogTaskType: integer("fog_task_type").default(1), // 1=Deploy, 2=Capture
  fogShutdown: boolean("fog_shutdown").default(true),
}
```

### 2. Multicast Sessions with FOG

**Current Status:** Multicast works with Bootah's simulated multicast, but FOG integration minimal.

**Issue:** Multicast sessions don't use FOG's native multicast capability.

**Missing:**
- FOG supports actual multicast streaming
- Bootah multicast should map to FOG multicast when available
- Status tracking doesn't use FOG task tracking

**Required Fix:**
```typescript
// Create FOG multicast mapping
createFOGMulticastSession(
  imageId: number,
  devices: string[], // MAC addresses
  multicastAddress: string
): Promise<FOGTaskId>
```

### 3. Scheduled/Recurring Deployments with FOG

**Current Status:** Scheduling works for Bootah, but FOG task scheduling not integrated.

**Issue:** Scheduled deployments don't trigger FOG tasks automatically.

**Missing:**
- Scheduler doesn't create FOG tasks for scheduled deployments
- Recurring deployments don't use FOG's recurring task feature
- Scheduler only handles Bootah deployments

**Required Fix:**
```typescript
// In deployment scheduler - add FOG support
if (deployment.imagingEngine === 'fog' && fogEnabled) {
  const fogTaskId = await createFOGTask(
    deployment.fogImageId,
    [device.macAddress],
    deployment.fogTaskType
  );
  // Store mapping
  await storage.storeFOGDeploymentMapping(deploymentId, fogTaskId);
}
```

### 4. Post-Deployment Tasks with FOG

**Current Status:** Post-deployment system exists, but FOG integration missing.

**Issue:** Post-deployment tasks don't execute after FOG deployments complete.

**Missing:**
- No hook to trigger post-deployment tasks when FOG task completes
- Post-deployment profile not linked to FOG deployments
- Monitoring doesn't check for task completion to trigger post-deployment

**Required Fix:**
```typescript
// In FOG monitoring
when FOG task reaches 100%:
  1. Update deployment status to "completed"
  2. Trigger post-deployment tasks
  3. Execute post-deployment profile scripts
  4. Log activity
```

### 5. Hardware Inventory with FOG

**Current Status:** Bootah collects basic device info, FOG has detailed inventory.

**Issue:** FOG's hardware inventory not synced to Bootah device details.

**Missing:**
- FOG host inventory (RAM, CPU, disk, motherboard, BIOS) not displayed
- Device details don't include FOG hardware info
- Asset tracking not integrated

**Required Fix:**
```typescript
// Add FOG inventory sync
async syncFOGHostInventory(hostId: number): Promise<{
  manufacturer: string;
  model: string;
  cpuCount: number;
  ramMB: number;
  diskGB: number;
  biosVersion: string;
}>
```

---

## ❌ NOT IMPLEMENTED (Missing Features)

### 1. Wake-on-LAN (WoL)

**Status:** FOG supports WoL, Bootah doesn't.

**Required Implementation:**
```typescript
// Add WoL support
POST /api/devices/:id/wakeup
POST /api/fog/hosts/:hostId/wakeup
```

**Database Schema:**
```typescript
ALTER TABLE devices ADD COLUMN wol_enabled boolean DEFAULT true;
```

### 2. Image Capture via FOG

**Status:** Bootah supports basic capture, FOG capture not integrated.

**Required Implementation:**
```typescript
// Capture image via FOG
POST /api/fog/capture
{
  hostId: number,
  imageId: number,
  compression: "zip" | "gzip"
}
```

### 3. Multi-Site Management

**Status:** FOG supports multiple sites/storage nodes, Bootah doesn't leverage this.

**Required Implementation:**
```typescript
// Multi-site support
POST /api/fog/sites
GET /api/fog/sites/:siteId/storage-nodes
POST /api/deployments/with-site-selection
```

### 4. Advanced FOG Settings

**Status:** FOG has advanced options not exposed through Bootah.

**Missing:**
- Virus scan before deployment
- WinPE builder integration
- Driver pack management
- Snapin package installation
- Advanced task scheduling (by time window, bandwidth limits)

**Required Implementation:**
```typescript
// Advanced deployment options
POST /api/deployments/fog/advanced
{
  scanVirus: boolean,
  installSnapins: string[], // snapin IDs
  kernelArgs: string,
  bandwidth: number // limit in Mbps
}
```

---

## Feature Implementation Checklist

### High Priority (Must Have for FOG Wrapper)

- [ ] **Fix Deployment Templates with FOG**
  - Add FOG-specific fields to template schema
  - Update template storage to save FOG settings
  - Implement template duplication with FOG settings
  - Update template UI to show FOG options
  - **Status:** Ready to implement

- [ ] **Fix Post-Deployment Tasks with FOG**
  - Add hook in FOG monitoring for task completion
  - Trigger post-deployment profile execution
  - Execute custom scripts after FOG deployment
  - Log post-deployment activities
  - **Status:** Ready to implement

- [ ] **Add Post-Deployment to Deployment API**
  - Extend POST /api/deployments/fog to include postDeploymentProfileId
  - Store mapping between FOG task and post-deployment profile
  - Ensure post-deployment tasks execute after FOG completion
  - **Status:** Partially done, needs completion

- [ ] **Implement FOG Multicast Mapping**
  - Map Bootah multicast sessions to FOG tasks
  - Use FOG's native multicast when available
  - Track FOG multicast status via API
  - **Status:** Partial implementation

- [ ] **Fix Scheduled FOG Deployments**
  - Update scheduler to support FOG task creation
  - Store recurring FOG task configuration
  - Map recurring deployments to FOG recurring tasks
  - **Status:** Ready to implement

### Medium Priority (Nice to Have)

- [ ] **Add Wake-on-LAN Support**
  - Implement WoL API endpoints
  - Add WoL to deployment workflow
  - Store WoL-enabled state per device

- [ ] **Add FOG Hardware Inventory Sync**
  - Sync device hardware details from FOG
  - Store detailed device information
  - Display in device details page

- [ ] **Add Advanced FOG Options**
  - Virus scan before deployment
  - Snapin installation selection
  - Kernel arguments
  - Bandwidth limiting

### Low Priority (Future Enhancements)

- [ ] **Multi-Site Management**
  - Support multiple FOG sites
  - Site selection in deployment UI
  - Cross-site reporting

- [ ] **Image Capture via FOG**
  - Capture from existing FOG hosts
  - Manage capture jobs
  - Store captured images

---

## Verification Tests

### Test 1: Deploy with FOG using Template

```bash
# Create template with FOG settings
curl -X POST http://localhost:5000/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ubuntu via FOG",
    "imagingEngine": "fog",
    "fogImageId": 5,
    "postDeploymentProfileId": "prof-123"
  }'

# Deploy using template
curl -X POST http://localhost:5000/api/deployments \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "tmpl-123",
    "deviceIds": ["dev-001", "dev-002"]
  }'

# Expected: Deployment via FOG with post-deployment tasks triggered
```

### Test 2: Monitor FOG Deployment Progress

```bash
# Check FOG task status
curl http://localhost:5000/api/fog/tasks/1234

# Expected: Real-time progress, post-deployment status, completion status
```

### Test 3: Multicast via FOG

```bash
# Create multicast session
curl -X POST http://localhost:5000/api/multicast/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FOG Multicast Deploy",
    "imageId": "img-001",
    "useFOGMulticast": true,
    "devices": ["dev-001", "dev-002", "dev-003"]
  }'

# Expected: Uses FOG's multicast, not simulated
```

### Test 4: Scheduled FOG Deployment

```bash
# Create scheduled deployment with FOG
curl -X POST http://localhost:5000/api/deployments \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "dev-001",
    "imageId": "img-001",
    "imagingEngine": "fog",
    "scheduleType": "recurring",
    "recurringPattern": "0 2 * * 0"  // Every Sunday 2 AM
  }'

# Expected: FOG creates recurring task, Bootah tracks it
```

---

## Summary of Gaps

**Critical Gaps (Must Fix):**
1. Templates don't store FOG-specific parameters
2. Post-deployment tasks don't trigger after FOG completion
3. Scheduled deployments don't create FOG recurring tasks

**Feature Gaps (Should Have):**
1. Multicast doesn't use FOG's native capability
2. Hardware inventory not synced from FOG
3. No Wake-on-LAN support

**Integration Gaps (Nice to Have):**
1. Advanced FOG options not exposed
2. Multi-site management not supported
3. Image capture via FOG not implemented

---

## Next Steps

1. **Immediate:** Implement critical gaps (templates, post-deployment, scheduling)
2. **Short Term:** Add multicast mapping and WoL support
3. **Long Term:** Advanced FOG options and multi-site support

All critical features must be working for Bootah to be a complete FOG wrapper.
