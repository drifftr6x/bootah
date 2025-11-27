# Bootah FOG Wrapper - Completion Plan

Step-by-step plan to ensure Bootah wrapper fully supports all FOG Project features and integrations.

---

## 1. Complete Deployment Templates with FOG

### Changes Required

**A. Update Database Schema**

```sql
-- Add FOG-specific fields to deployment_templates
ALTER TABLE deployment_templates ADD COLUMN IF NOT EXISTS imaging_engine text DEFAULT 'clonezilla';
ALTER TABLE deployment_templates ADD COLUMN IF NOT EXISTS fog_image_id integer;
ALTER TABLE deployment_templates ADD COLUMN IF NOT EXISTS fog_task_type integer DEFAULT 1;
ALTER TABLE deployment_templates ADD COLUMN IF NOT EXISTS fog_shutdown boolean DEFAULT true;

-- Create fog_template_configs for advanced settings
CREATE TABLE IF NOT EXISTS fog_template_configs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  template_id varchar NOT NULL REFERENCES deployment_templates(id) ON DELETE CASCADE,
  virus_scan boolean DEFAULT false,
  snapins text[] DEFAULT '{}',
  kernel_args text,
  bandwidth_limit integer, -- Mbps
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_fog_template_configs_template_id ON fog_template_configs(template_id);
```

**B. Update Deployment Template Schema (TypeScript)**

```typescript
// In shared/schema.ts
export const deploymentTemplates = pgTable("deployment_templates", {
  // Existing fields...
  
  // FOG Integration
  imagingEngine: text("imaging_engine").default("clonezilla"), // clonezilla | fog | multicast
  fogImageId: integer("fog_image_id"), // References FOG image ID
  fogTaskType: integer("fog_task_type").default(1), // 1=Deploy, 2=Capture
  fogShutdown: boolean("fog_shutdown").default(true),
});
```

**C. Add Storage Methods**

```typescript
// In server/storage.ts
async updateTemplateWithFOGSettings(templateId: string, fogSettings: {
  imagingEngine: string;
  fogImageId?: number;
  fogTaskType?: number;
  fogShutdown?: boolean;
}) {
  return db.update(deploymentTemplates)
    .set(fogSettings)
    .where(eq(deploymentTemplates.id, templateId))
    .returning();
}

async getTemplateWithFOGConfig(templateId: string) {
  const template = await db.query.deploymentTemplates.findFirst({
    where: eq(deploymentTemplates.id, templateId)
  });
  
  const fogConfig = await db.query.fogTemplateConfigs.findFirst({
    where: eq(fogTemplateConfigs.templateId, templateId)
  });
  
  return { ...template, fogConfig };
}
```

**D. Update API Endpoints**

```typescript
// In server/routes.ts
app.post("/api/templates/:id/fog-settings", async (req, res) => {
  try {
    const { imagingEngine, fogImageId, fogTaskType, fogShutdown } = req.body;
    
    const updated = await storage.updateTemplateWithFOGSettings(
      req.params.id,
      { imagingEngine, fogImageId, fogTaskType, fogShutdown }
    );
    
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Failed to update FOG settings" });
  }
});

app.get("/api/templates/:id/full", async (req, res) => {
  try {
    const template = await storage.getTemplateWithFOGConfig(req.params.id);
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch template" });
  }
});
```

---

## 2. Complete Post-Deployment Integration with FOG

### Changes Required

**A. Add Post-Deployment Trigger**

```typescript
// In FOG_STORAGE_INTEGRATION.ts
export async function monitorFOGDeploymentWithPostTasks(
  taskId: number,
  postDeploymentProfileId?: string,
  onProgress?: (progress: number, status: string) => void
): Promise<boolean> {
  let lastPercent = 0;

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const task = await getFOGTaskStatus(taskId);

        if (!task) {
          clearInterval(interval);
          reject(new Error('Task not found'));
          return;
        }

        const progress = task.percent || 0;

        if (progress !== lastPercent) {
          lastPercent = progress;
          onProgress?.(progress, getStatusString(task.taskState));
        }

        // Check if task completed
        if (progress === 100 || task.taskState === '2') {
          clearInterval(interval);
          
          // Trigger post-deployment tasks if specified
          if (postDeploymentProfileId) {
            try {
              await triggerPostDeploymentTasks(postDeploymentProfileId, task.hostID);
            } catch (error) {
              console.error('Post-deployment failed:', error);
            }
          }
          
          resolve(true);
        } else if (task.taskState === '3' || task.taskState === '4') {
          clearInterval(interval);
          reject(new Error(`Task failed with state: ${task.taskState}`));
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, 2000);
  });
}

async function triggerPostDeploymentTasks(
  profileId: string,
  fogHostId: number
): Promise<void> {
  console.log(`[Post-Deployment] Triggering tasks for profile ${profileId} on host ${fogHostId}`);
  
  // Get post-deployment profile
  const profile = await storage.getPostDeploymentProfile(profileId);
  if (!profile) throw new Error('Profile not found');
  
  // Get associated tasks
  const tasks = await storage.getPostDeploymentTasks(profileId);
  
  // Execute each task
  for (const task of tasks) {
    try {
      console.log(`[Post-Deployment] Executing task: ${task.name}`);
      // Execute task (custom scripts, domain join, etc.)
      await executePostDeploymentTask(task, fogHostId);
    } catch (error) {
      console.error(`[Post-Deployment] Task ${task.name} failed:`, error);
    }
  }
}
```

**B. Update Deployment API**

```typescript
// In server/routes.ts
app.post("/api/deployments/fog-with-post", 
  isAuthenticated, 
  requirePermission("deployments", "deploy"), 
  async (req, res) => {
    try {
      const { 
        deploymentId, 
        fogImageId, 
        deviceIds, 
        postDeploymentProfileId,
        taskType, 
        shutdown 
      } = req.body;
      
      if (!fogImageId || !deviceIds?.length) {
        return res.status(400).json({ message: "FOG image ID and device IDs required" });
      }

      const devices = await Promise.all(
        deviceIds.map((id: string) => storage.getDevice(id))
      );
      const macAddresses = devices
        .filter(d => d)
        .map(d => d!.macAddress);

      // Create FOG task
      const fogTaskId = await createFOGTask(
        fogImageId,
        macAddresses,
        taskType || 1,
        shutdown !== false
      );

      // Update deployment
      await storage.updateDeployment(deploymentId, {
        status: "deploying",
        progress: 0,
      });

      // Store post-deployment mapping
      if (postDeploymentProfileId) {
        await storage.createFOGDeploymentMapping({
          bootahDeploymentId: deploymentId,
          fogTaskId,
          postDeploymentProfileId,
        });
      }

      // Start monitoring with post-deployment trigger
      monitorFOGDeploymentWithPostTasks(
        fogTaskId,
        postDeploymentProfileId,
        (progress, status) => {
          wss.clients.forEach((client: any) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "fog_progress",
                deploymentId,
                fogTaskId,
                progress,
                status
              }));
            }
          });
        }
      ).catch(error => console.error("FOG monitoring error:", error));

      res.json({ 
        deploymentId,
        fogTaskId,
        status: "deploying",
        devicesCount: macAddresses.length,
        postDeploymentProfileId
      });
    } catch (error) {
      res.status(500).json({ message: "FOG deployment failed", error: String(error) });
    }
  }
);
```

---

## 3. Enable Scheduled FOG Deployments

### Changes Required

**A. Update Scheduler**

```typescript
// In server/scheduler.ts
async checkScheduledDeployments() {
  const deployments = await storage.getScheduledDeployments();
  
  for (const deployment of deployments) {
    if (this.shouldDeploy(deployment)) {
      try {
        if (deployment.imagingEngine === 'fog' && process.env.FOG_ENABLED === 'true') {
          // Deploy via FOG
          const device = await storage.getDevice(deployment.deviceId);
          if (!device) continue;
          
          const fogTaskId = await createFOGTask(
            deployment.fogImageId,
            [device.macAddress],
            deployment.fogTaskType || 1
          );
          
          // Store mapping
          await storage.storeFOGDeploymentMapping(
            deployment.id,
            fogTaskId,
            deployment.postDeploymentProfileId
          );
          
          // Start monitoring
          this.monitorFOGDeployment(fogTaskId, deployment);
          
        } else {
          // Deploy via Clonezilla
          await this.executeDeployment(deployment);
        }
        
        // Update deployment status
        await storage.updateDeployment(deployment.id, { 
          status: 'deploying',
          startedAt: new Date()
        });
        
      } catch (error) {
        console.error(`Scheduled deployment failed: ${error}`);
        await storage.updateDeployment(deployment.id, { 
          status: 'failed',
          errorMessage: String(error)
        });
      }
    }
  }
}

private monitorFOGDeployment(fogTaskId: number, deployment: any) {
  monitorFOGDeploymentWithPostTasks(
    fogTaskId,
    deployment.postDeploymentProfileId,
    async (progress, status) => {
      await storage.updateDeployment(deployment.id, {
        progress,
        status: status === 'Completed' ? 'completed' : 'deploying'
      });
    }
  ).catch(error => console.error("FOG monitoring error:", error));
}
```

---

## 4. Fix Multicast with FOG

### Changes Required

```typescript
// In server/routes.ts
app.post("/api/multicast/sessions/fog", 
  isAuthenticated,
  requirePermission("multicast", "create"),
  async (req, res) => {
    try {
      const { name, fogImageId, deviceIds, shutdown } = req.body;
      
      if (!fogImageId || !deviceIds?.length) {
        return res.status(400).json({ message: "FOG image and devices required" });
      }

      // Get device MAC addresses
      const devices = await Promise.all(
        deviceIds.map(id => storage.getDevice(id))
      );
      const macAddresses = devices
        .filter(d => d)
        .map(d => d!.macAddress);

      // Create FOG multicast task
      const fogTaskId = await createFOGTask(
        fogImageId,
        macAddresses,
        1, // Deploy task type
        shutdown !== false
      );

      // Create multicast session record
      const session = await storage.createMulticastSession({
        name,
        description: `FOG Multicast - Task ${fogTaskId}`,
        imageId: '', // Map to FOG image
        status: 'active',
        multicastAddress: '0.0.0.0', // FOG handles this
        clientCount: macAddresses.length,
        createdBy: (req as any).user?.claims.sub,
      });

      // Store FOG task mapping
      await storage.storeFOGMulticastMapping(session.id, fogTaskId);

      res.status(201).json({
        sessionId: session.id,
        fogTaskId,
        devicesCount: macAddresses.length,
        status: 'active'
      });
    } catch (error) {
      res.status(500).json({ message: "FOG multicast failed", error: String(error) });
    }
  }
);
```

---

## 5. Add Hardware Inventory from FOG

### Changes Required

```typescript
// In FOG_STORAGE_INTEGRATION.ts
export async function getFOGHostInventory(hostId: number) {
  if (!isFOGEnabled()) return null;

  try {
    const fogUrl = process.env.FOG_SERVER_URL;
    const response = await fetch(`${fogUrl}/api/host/${hostId}/inventory`, {
      headers: getFOGHeaders(),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      manufacturer: data.system?.manufacturer,
      model: data.system?.model,
      cpuCount: data.cpu?.count,
      cpuModel: data.cpu?.model,
      ramMB: data.memory?.total,
      diskGB: data.disk?.total / 1024 / 1024 / 1024,
      biosVersion: data.bios?.version,
      biosDate: data.bios?.date,
      networkAdapters: data.network?.adapters?.length,
    };
  } catch (error) {
    console.error('[FOG] Inventory fetch failed:', error);
    return null;
  }
}
```

**Update Device Schema:**
```typescript
export const devices = pgTable("devices", {
  // Existing fields...
  
  // Hardware inventory from FOG
  manufacturer: text("manufacturer"),
  model: text("model"),
  cpuCount: integer("cpu_count"),
  cpuModel: text("cpu_model"),
  ramMB: integer("ram_mb"),
  diskGB: integer("disk_gb"),
  biosVersion: text("bios_version"),
  lastInventorySync: timestamp("last_inventory_sync"),
});
```

---

## 6. Add Wake-on-LAN Support

### Changes Required

```typescript
// Add to FOG_STORAGE_INTEGRATION.ts
export async function wakeOnLAN(macAddress: string) {
  if (!isFOGEnabled()) {
    console.log('[WoL] FOG not enabled, using local WoL');
  }

  try {
    const fogUrl = process.env.FOG_SERVER_URL;
    const response = await fetch(`${fogUrl}/api/host/mac/${macAddress}/wakeup`, {
      method: 'POST',
      headers: getFOGHeaders(),
    });

    return response.ok;
  } catch (error) {
    console.error('[WoL] Failed:', error);
    return false;
  }
}
```

**Add API Endpoint:**
```typescript
app.post("/api/devices/:deviceId/wakeup",
  isAuthenticated,
  requirePermission("devices", "manage"),
  async (req, res) => {
    try {
      const device = await storage.getDevice(req.params.deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      const success = await wakeOnLAN(device.macAddress);
      res.json({ 
        success,
        device: device.name,
        macAddress: device.macAddress 
      });
    } catch (error) {
      res.status(500).json({ message: "WoL failed" });
    }
  }
);
```

---

## Implementation Timeline

| Phase | Features | Time |
|-------|----------|------|
| **Phase 1** | Templates + Post-Deployment + Scheduling | 2 hours |
| **Phase 2** | Multicast mapping + Hardware Inventory | 1.5 hours |
| **Phase 3** | Wake-on-LAN + Advanced FOG options | 1 hour |
| **Phase 4** | Testing + Documentation | 1.5 hours |

**Total: ~6 hours** for complete FOG wrapper implementation.

---

## Verification Checklist

- [ ] Deploy single device via FOG template
- [ ] Deploy multiple devices with post-deployment tasks
- [ ] Monitor real-time progress and post-deployment execution
- [ ] Schedule recurring FOG deployment
- [ ] Create FOG multicast session
- [ ] Sync FOG host hardware inventory
- [ ] Wake device via WoL
- [ ] Cancel FOG deployment mid-progress
- [ ] All operations logged in activity trail
- [ ] RBAC enforced on all FOG operations

---

**All features must pass verification before marking FOG wrapper as complete.**
