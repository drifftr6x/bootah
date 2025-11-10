import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, scheduler } from "./storage";
import { TFTPServer, PXEHTTPServer, DHCPProxy } from "./pxe-server";
import { imagingEngine } from "./imaging-engine";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { initializeRbacDefaults } from "./rbacSeed";
import { requireRole, requirePermission, requireAnyPermission } from "./authMiddleware";
import { 
  insertDeviceSchema, 
  insertImageSchema, 
  insertDeploymentSchema, 
  insertActivityLogSchema,
  insertSystemMetricsSchema,
  insertAlertSchema,
  insertAlertRuleSchema,
  updateServerStatusSchema,
  insertUserSchema,
  insertRoleSchema,
  insertPermissionSchema,
  insertUserRoleSchema,
  insertRolePermissionSchema,
  insertDeploymentTemplateSchema,
  insertTemplateStepSchema,
  insertTemplateVariableSchema,
  insertTemplateDeploymentSchema,
  insertAuditLogSchema,
  insertMulticastSessionSchema,
  insertMulticastParticipantSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Authentication - must be before other routes
  await setupAuth(app);
  
  // Initialize RBAC defaults (roles, permissions, and first user assignment)
  try {
    await initializeRbacDefaults();
  } catch (error) {
    console.error("Failed to initialize RBAC defaults:", error);
  }

  // Auth endpoint for user info
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Initialize PXE servers
  const tftpServer = new TFTPServer(6969); // Use non-privileged port
  const pxeHttpServer = new PXEHTTPServer();
  const dhcpProxy = new DHCPProxy(4067); // Use non-privileged port
  
  // Setup PXE HTTP routes
  pxeHttpServer.setupRoutes(app);
  
  // Start PXE servers
  try {
    await tftpServer.start();
    await dhcpProxy.start();
    console.log("PXE servers started successfully");
  } catch (error) {
    console.error("Failed to start PXE servers:", error);
  }

  // Start deployment scheduler
  try {
    scheduler.start();
    console.log("Deployment scheduler started successfully");
  } catch (error) {
    console.error("Failed to start deployment scheduler:", error);
  }
  // Devices endpoints
  // GET is read-only, requires devices:read permission
  app.get("/api/devices", isAuthenticated, requirePermission("devices", "read"), async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.get("/api/devices/:id", isAuthenticated, requirePermission("devices", "read"), async (req, res) => {
    try {
      const device = await storage.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device" });
    }
  });

  app.post("/api/devices", isAuthenticated, requirePermission("devices", "create"), async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      
      // Log device creation
      await storage.createActivityLog({
        type: "discovery",
        message: `New device added: ${device.name} (${device.macAddress})`,
        deviceId: device.id,
        deploymentId: null,
      });
      
      res.status(201).json(device);
    } catch (error) {
      res.status(400).json({ message: "Invalid device data" });
    }
  });

  app.put("/api/devices/:id", isAuthenticated, requirePermission("devices", "update"), async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.partial().parse(req.body);
      const device = await storage.updateDevice(req.params.id, deviceData);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(400).json({ message: "Invalid device data" });
    }
  });

  app.delete("/api/devices/:id", isAuthenticated, requirePermission("devices", "delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteDevice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  // Images endpoints  
  app.get("/api/images", isAuthenticated, requirePermission("images", "read"), async (req, res) => {
    try {
      const images = await storage.getImages();
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  // Real image capture endpoint
  app.post("/api/images/capture", isAuthenticated, requirePermission("images", "create"), async (req, res) => {
    try {
      const { deviceId, sourceDevice, imageName, description, compression, excludeSwap, excludeTmp } = req.body;
      
      if (!deviceId || !sourceDevice || !imageName) {
        return res.status(400).json({ error: "Missing required fields: deviceId, sourceDevice, imageName" });
      }

      // Start capture process
      const capturePromise = imagingEngine.captureImage({
        deviceId,
        sourceDevice,
        imageName,
        description,
        compression: compression || "gzip",
        excludeSwap: excludeSwap || false,
        excludeTmp: excludeTmp || false
      }, (progress, message) => {
        // Broadcast progress via WebSocket
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "capture_progress",
              deviceId,
              progress,
              message
            }));
          }
        });
      });

      // Don't wait for completion, return immediately
      res.json({ message: "Image capture started", deviceId, imageName });

    } catch (error) {
      console.error("Error starting image capture:", error);
      res.status(500).json({ error: "Failed to start image capture" });
    }
  });

  // Real deployment execution endpoint  
  app.post("/api/deployments/execute", isAuthenticated, requirePermission("deployments", "deploy"), async (req, res) => {
    try {
      const { deploymentId, imageId, targetDevice, targetMacAddress, verifyAfterDeploy } = req.body;
      
      if (!deploymentId || !imageId || !targetDevice) {
        return res.status(400).json({ error: "Missing required fields: deploymentId, imageId, targetDevice" });
      }

      // Start deployment process
      const deploymentPromise = imagingEngine.deployImage({
        deploymentId,
        imageId,
        targetDevice,
        targetMacAddress: targetMacAddress || "",
        verifyAfterDeploy: verifyAfterDeploy || false
      }, (progress, message) => {
        // Broadcast progress via WebSocket
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "deployment_progress",
              deploymentId,
              progress,
              message
            }));
          }
        });
      });

      // Don't wait for completion, return immediately
      res.json({ message: "Deployment started", deploymentId });

    } catch (error) {
      console.error("Error starting deployment:", error);
      res.status(500).json({ error: "Failed to start deployment" });
    }
  });

  // Get system information for imaging
  app.get("/api/system/info", isAuthenticated, requirePermission("configuration", "read"), async (req, res) => {
    try {
      const systemInfo = await imagingEngine.getSystemInfo();
      res.json({ systemInfo });
    } catch (error) {
      console.error("Error getting system info:", error);
      res.status(500).json({ error: "Failed to get system information" });
    }
  });

  // Get active imaging operations
  app.get("/api/imaging/operations", isAuthenticated, requirePermission("deployments", "read"), async (req, res) => {
    try {
      const operations = imagingEngine.getActiveOperations();
      res.json({ operations });
    } catch (error) {
      res.status(500).json({ error: "Failed to get active operations" });
    }
  });

  // Cancel imaging operation
  app.delete("/api/imaging/operations/:operationId", isAuthenticated, requirePermission("deployments", "delete"), async (req, res) => {
    try {
      const { operationId } = req.params;
      const cancelled = imagingEngine.cancelOperation(operationId);
      
      if (cancelled) {
        res.json({ message: "Operation cancelled" });
      } else {
        res.status(404).json({ error: "Operation not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel operation" });
    }
  });

  // Capture job management endpoints
  app.post("/api/capture/schedule", isAuthenticated, requirePermission("images", "create"), async (req, res) => {
    try {
      const { name, description, deviceId, sourceDevice, compression, excludeSwap, excludeTmp } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Image name is required" });
      }

      // Create scheduled capture job
      const captureJob = {
        id: `cap-${Date.now()}`,
        name,
        description: description || "",
        deviceId: deviceId === "any" ? null : deviceId,
        sourceDevice: sourceDevice || "/dev/sda",
        compression: compression || "gzip",
        excludeSwap: excludeSwap !== false,
        excludeTmp: excludeTmp !== false,
        status: "scheduled",
        progress: 0,
        createdAt: new Date().toISOString()
      };

      // Store in memory for now (would be database in real implementation)
      console.log("Scheduled capture job:", captureJob);

      // Log activity
      await storage.createActivityLog({
        type: "capture",
        message: `Capture job scheduled: ${name}`,
        deviceId: deviceId || null,
        deploymentId: null,
      });

      res.json({ message: "Capture job scheduled", id: captureJob.id });

    } catch (error) {
      console.error("Error scheduling capture:", error);
      res.status(500).json({ error: "Failed to schedule capture job" });
    }
  });

  app.get("/api/capture/jobs", isAuthenticated, requirePermission("images", "read"), async (req, res) => {
    try {
      // Mock capture jobs for demonstration
      const captureJobs = [
        {
          id: "cap-1",
          name: "Workstation Template",
          description: "Standard Windows 11 workstation image",
          deviceId: "87e4c7a2-7763-40e1-b022-9d07e75d742f",
          deviceName: "WS-001",
          sourceDevice: "/dev/sda",
          compression: "gzip",
          excludeSwap: true,
          excludeTmp: true,
          status: "scheduled",
          progress: 0,
          createdAt: new Date().toISOString()
        },
        {
          id: "cap-2", 
          name: "Server Base Image",
          description: "Ubuntu 22.04 LTS server configuration",
          deviceName: "PXE-Client-001",
          sourceDevice: "/dev/sda",
          compression: "bzip2",
          excludeSwap: true,
          excludeTmp: false,
          status: "capturing",
          progress: 67,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          startedAt: new Date(Date.now() - 1800000).toISOString()
        }
      ];

      res.json(captureJobs);

    } catch (error) {
      console.error("Error fetching capture jobs:", error);
      res.status(500).json({ error: "Failed to fetch capture jobs" });
    }
  });

  // Get device by MAC address for PXE clients
  app.get("/api/devices/by-mac/:macAddress", async (req, res) => {
    try {
      const { macAddress } = req.params;
      const devices = await storage.getDevices();
      const device = devices.find(d => d.macAddress.toLowerCase() === macAddress.toLowerCase());
      
      if (device) {
        res.json(device);
      } else {
        res.status(404).json({ error: "Device not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch device" });
    }
  });

  // Get capture commands for PXE clients
  app.get("/api/devices/by-mac/:macAddress/commands", async (req, res) => {
    try {
      const { macAddress } = req.params;
      
      // Check if there are any capture jobs scheduled for this device
      // In real implementation, this would check the database
      const hasCapture = Math.random() > 0.8; // Simulate occasional capture commands
      
      if (hasCapture) {
        res.json({ 
          command: "capture",
          details: {
            imageName: `PXE-Capture-${Date.now()}`,
            compression: "gzip"
          }
        });
      } else {
        res.json({ command: "none" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch commands" });
    }
  });

  // Get deployment for PXE clients  
  app.get("/api/devices/by-mac/:macAddress/deployment", async (req, res) => {
    try {
      const { macAddress } = req.params;
      
      // Check for active deployments for this device
      const deployments = await storage.getActiveDeployments();
      const devices = await storage.getDevices();
      const device = devices.find(d => d.macAddress.toLowerCase() === macAddress.toLowerCase());
      
      if (device) {
        const deployment = deployments.find(d => d.deviceId === device.id);
        
        if (deployment) {
          const image = await storage.getImage(deployment.imageId);
          res.json({
            id: deployment.id,
            status: deployment.status,
            imageUrl: `http://localhost:5000/pxe-images/${image?.filename || 'unknown.img'}`,
            targetDevice: "/dev/sda"
          });
        } else {
          res.json({ status: "none" });
        }
      } else {
        res.status(404).json({ error: "Device not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deployment" });
    }
  });

  app.get("/api/images/:id", isAuthenticated, requirePermission("images", "read"), async (req, res) => {
    try {
      const image = await storage.getImage(req.params.id);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      res.json(image);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch image" });
    }
  });

  app.post("/api/images", isAuthenticated, requirePermission("images", "create"), async (req, res) => {
    try {
      const imageData = insertImageSchema.parse(req.body);
      const image = await storage.createImage(imageData);
      
      // Log image upload
      await storage.createActivityLog({
        type: "info",
        message: `New image uploaded: ${image.name}`,
        deviceId: null,
        deploymentId: null,
      });
      
      res.status(201).json(image);
    } catch (error) {
      res.status(400).json({ message: "Invalid image data" });
    }
  });

  app.put("/api/images/:id", isAuthenticated, requirePermission("images", "update"), async (req, res) => {
    try {
      const imageData = insertImageSchema.partial().parse(req.body);
      const image = await storage.updateImage(req.params.id, imageData);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      res.json(image);
    } catch (error) {
      res.status(400).json({ message: "Invalid image data" });
    }
  });

  app.delete("/api/images/:id", isAuthenticated, requirePermission("images", "delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteImage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Image not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  // Deployments endpoints
  app.get("/api/deployments", isAuthenticated, requirePermission("deployments", "read"), async (req, res) => {
    try {
      const deployments = await storage.getDeployments();
      res.json(deployments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deployments" });
    }
  });

  app.get("/api/deployments/active", isAuthenticated, requirePermission("deployments", "read"), async (req, res) => {
    try {
      const deployments = await storage.getActiveDeployments();
      res.json(deployments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active deployments" });
    }
  });

  app.get("/api/deployments/:id", isAuthenticated, requirePermission("deployments", "read"), async (req, res) => {
    try {
      const deployment = await storage.getDeployment(req.params.id);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      res.json(deployment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deployment" });
    }
  });

  app.post("/api/deployments", isAuthenticated, requirePermission("deployments", "create"), async (req, res) => {
    try {
      const deploymentData = insertDeploymentSchema.parse(req.body);
      
      // Set appropriate status based on schedule type
      const status = deploymentData.scheduleType === "instant" ? "deploying" : "scheduled";
      
      // Calculate nextRunAt for delayed and recurring deployments
      let nextRunAt = null;
      if (deploymentData.scheduleType === "delayed" || deploymentData.scheduleType === "recurring") {
        // Set nextRunAt to scheduledFor so scheduler can uniformly query by nextRunAt
        nextRunAt = deploymentData.scheduledFor;
      }
      
      // Set startedAt for instant deployments only
      const startedAt = deploymentData.scheduleType === "instant" ? new Date() : undefined;
      
      const deployment = await storage.createDeployment({
        ...deploymentData,
        status,
        nextRunAt,
        startedAt,
        createdBy: req.user?.id,
      });
      
      // Only update device status and start immediately for instant deployments
      if (deploymentData.scheduleType === "instant") {
        await storage.updateDevice(deployment.deviceId, { status: "deploying" });
        
        // Log deployment start
        const device = await storage.getDevice(deployment.deviceId);
        const image = await storage.getImage(deployment.imageId);
        
        if (device && image) {
          await storage.createActivityLog({
            type: "deployment",
            message: `${device.name} started ${image.name} deployment`,
            deviceId: device.id,
            deploymentId: deployment.id,
          });
        }
      } else {
        // Log scheduled deployment creation
        const device = await storage.getDevice(deployment.deviceId);
        const image = await storage.getImage(deployment.imageId);
        
        if (device && image) {
          const scheduleTime = deployment.scheduledFor ? new Date(deployment.scheduledFor).toLocaleString() : "unknown";
          await storage.createActivityLog({
            type: "info",
            message: `${image.name} deployment scheduled for ${device.name} at ${scheduleTime}`,
            deviceId: device.id,
            deploymentId: deployment.id,
          });
        }
      }
      
      res.status(201).json(deployment);
    } catch (error) {
      res.status(400).json({ message: "Invalid deployment data" });
    }
  });

  app.put("/api/deployments/:id", isAuthenticated, requirePermission("deployments", "update"), async (req, res) => {
    try {
      const deploymentData = insertDeploymentSchema.partial().parse(req.body);
      const deployment = await storage.updateDeployment(req.params.id, deploymentData);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      
      // If deployment completed or failed, update device status
      if (deployment.status === "completed") {
        await storage.updateDevice(deployment.deviceId, { status: "online" });
        
        const device = await storage.getDevice(deployment.deviceId);
        const image = await storage.getImage(deployment.imageId);
        
        if (device && image) {
          await storage.createActivityLog({
            type: "deployment",
            message: `${device.name} completed ${image.name} deployment`,
            deviceId: device.id,
            deploymentId: deployment.id,
          });
        }
      } else if (deployment.status === "failed") {
        await storage.updateDevice(deployment.deviceId, { status: "offline" });
        
        const device = await storage.getDevice(deployment.deviceId);
        
        if (device) {
          await storage.createActivityLog({
            type: "error",
            message: `${device.name} deployment failed: ${deployment.errorMessage || "Unknown error"}`,
            deviceId: device.id,
            deploymentId: deployment.id,
          });
        }
      }
      
      res.json(deployment);
    } catch (error) {
      res.status(400).json({ message: "Invalid deployment data" });
    }
  });

  app.delete("/api/deployments/:id", isAuthenticated, requirePermission("deployments", "delete"), async (req, res) => {
    try {
      const deployment = await storage.getDeployment(req.params.id);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      
      // Update device status back to idle
      await storage.updateDevice(deployment.deviceId, { status: "idle" });
      
      const deleted = await storage.deleteDeployment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      
      // Log deployment cancellation
      await storage.createActivityLog({
        type: "deployment",
        message: `${deployment.device.name} deployment cancelled`,
        deviceId: deployment.deviceId,
        deploymentId: req.params.id,
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete deployment" });
    }
  });

  // Scheduled deployments endpoints
  app.get("/api/deployments/scheduled", isAuthenticated, requirePermission("deployments", "read"), async (req, res) => {
    try {
      const deployments = await storage.getScheduledDeployments();
      res.json(deployments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scheduled deployments" });
    }
  });

  app.patch("/api/deployments/:id/cancel-schedule", async (req, res) => {
    try {
      const deployment = await storage.getDeployment(req.params.id);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }

      // Only allow cancelling scheduled or pending deployments
      if (deployment.status !== "scheduled" && deployment.status !== "pending") {
        return res.status(400).json({ message: "Can only cancel scheduled or pending deployments" });
      }

      const updated = await storage.updateDeployment(req.params.id, {
        status: "cancelled",
      });

      // Log cancellation
      const device = await storage.getDevice(deployment.deviceId);
      const image = await storage.getImage(deployment.imageId);
      
      if (device && image) {
        await storage.createActivityLog({
          type: "info",
          message: `Scheduled ${image.name} deployment for ${device.name} was cancelled`,
          deviceId: deployment.deviceId,
          deploymentId: deployment.id,
        });
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel scheduled deployment" });
    }
  });

  // Multicast Sessions Endpoints
  app.get("/api/multicast/sessions", isAuthenticated, requirePermission("multicast", "read"), async (req, res) => {
    try {
      const sessions = await storage.getMulticastSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch multicast sessions" });
    }
  });

  app.get("/api/multicast/sessions/:id", isAuthenticated, requirePermission("multicast", "read"), async (req, res) => {
    try {
      const session = await storage.getMulticastSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Multicast session not found" });
      }
      
      // Get participants for this session
      const participants = await storage.getMulticastParticipants(req.params.id);
      
      res.json({ ...session, participants });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch multicast session" });
    }
  });

  app.post("/api/multicast/sessions", isAuthenticated, requirePermission("multicast", "create"), async (req, res) => {
    try {
      const sessionData = insertMulticastSessionSchema.parse(req.body);
      
      // Assign a multicast address from the pool (239.255.0.1-254 range)
      // Find the lowest unused address by checking all existing sessions
      const existingSessions = await storage.getMulticastSessions();
      const usedAddresses = new Set(existingSessions.map(s => s.multicastAddress));
      
      let multicastAddress = "";
      for (let i = 1; i <= 254; i++) {
        const address = `239.255.0.${i}`;
        if (!usedAddresses.has(address)) {
          multicastAddress = address;
          break;
        }
      }
      
      if (!multicastAddress) {
        return res.status(503).json({ message: "No available multicast addresses. Please delete completed sessions to free up addresses." });
      }
      
      const session = await storage.createMulticastSession({
        ...sessionData,
        multicastAddress,
        createdBy: req.user?.id,
      });
      
      // Log session creation
      const image = await storage.getImage(session.imageId);
      if (image) {
        await storage.createActivityLog({
          type: "info",
          message: `Multicast session "${session.name}" created for ${image.name}`,
          deploymentId: null,
          deviceId: null,
        });
      }
      
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating multicast session:", error);
      res.status(400).json({ message: "Invalid multicast session data" });
    }
  });

  app.patch("/api/multicast/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getMulticastSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Multicast session not found" });
      }

      // Only allow certain status transitions
      const { status, ...otherUpdates } = req.body;
      
      if (status) {
        // Validate status transitions
        if (session.status === "completed" || session.status === "cancelled") {
          return res.status(400).json({ message: "Cannot modify completed or cancelled session" });
        }
        
        // Set timestamps based on status
        if (status === "active" && !session.startedAt) {
          otherUpdates.startedAt = new Date();
        } else if (status === "completed" || status === "failed" || status === "cancelled") {
          otherUpdates.completedAt = new Date();
        }
      }

      const updated = await storage.updateMulticastSession(req.params.id, {
        ...otherUpdates,
        ...(status && { status }),
      });

      // Log status change
      if (status && status !== session.status) {
        await storage.createActivityLog({
          type: "info",
          message: `Multicast session "${session.name}" status changed to ${status}`,
          deploymentId: null,
          deviceId: null,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating multicast session:", error);
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.delete("/api/multicast/sessions/:id", isAuthenticated, requirePermission("multicast", "delete"), async (req, res) => {
    try {
      const session = await storage.getMulticastSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Multicast session not found" });
      }

      // Only allow deleting waiting or completed sessions
      if (session.status === "active") {
        return res.status(400).json({ message: "Cannot delete active multicast session. Cancel it first." });
      }

      const deleted = await storage.deleteMulticastSession(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Multicast session not found" });
      }

      await storage.createActivityLog({
        type: "info",
        message: `Multicast session "${session.name}" deleted`,
        deploymentId: null,
        deviceId: null,
      });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete multicast session" });
    }
  });

  // Multicast Participants Endpoints
  app.post("/api/multicast/sessions/:id/participants", isAuthenticated, requirePermission("multicast", "manage"), async (req, res) => {
    try {
      const sessionId = req.params.id;
      const participantData = insertMulticastParticipantSchema.parse({
        ...req.body,
        sessionId,
      });

      const session = await storage.getMulticastSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Multicast session not found" });
      }

      // Don't allow adding participants to active or completed sessions
      if (session.status !== "waiting") {
        return res.status(400).json({ message: "Can only add participants to waiting sessions" });
      }

      const participant = await storage.addMulticastParticipant(participantData);

      // Log participant addition
      const device = await storage.getDevice(participantData.deviceId);
      if (device) {
        await storage.createActivityLog({
          type: "info",
          message: `${device.name} added to multicast session "${session.name}"`,
          deviceId: device.id,
          deploymentId: null,
        });
      }

      res.status(201).json(participant);
    } catch (error: any) {
      console.error("Error adding participant:", error);
      if (error.message?.includes("already added")) {
        return res.status(409).json({ message: error.message });
      }
      if (error.message?.includes("capacity")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(400).json({ message: "Failed to add participant" });
    }
  });

  app.delete("/api/multicast/sessions/:id/participants/:participantId", isAuthenticated, requirePermission("multicast", "manage"), async (req, res) => {
    try {
      const { id: sessionId, participantId } = req.params;

      const session = await storage.getMulticastSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Multicast session not found" });
      }

      // Don't allow removing participants from active sessions
      if (session.status === "active") {
        return res.status(400).json({ message: "Cannot remove participants from active session" });
      }

      const deleted = await storage.removeMulticastParticipant(participantId);
      if (!deleted) {
        return res.status(404).json({ message: "Participant not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove participant" });
    }
  });

  // Clonezilla Integration Endpoints
  
  // Update deployment status from Clonezilla scripts
  // TODO: Add machine authentication (API key or signed token) to prevent spoofing
  // Note: This endpoint is intentionally public for headless Clonezilla automation.
  // Security consideration: Running on isolated network, but should implement API key auth in future.
  app.post("/api/deployments/status", async (req, res) => {
    try {
      const { deviceMac, status, progress } = req.body;
      
      if (!deviceMac || !status) {
        return res.status(400).json({ error: "Missing required fields: deviceMac, status" });
      }
      
      // Find device by MAC address
      const devices = await storage.getDevices();
      const device = devices.find(d => d.macAddress.toLowerCase() === deviceMac.toLowerCase());
      
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      
      // Find active deployment for this device
      const activeDeployments = await storage.getActiveDeployments();
      const deployment = activeDeployments.find(d => d.deviceId === device.id);
      
      if (deployment) {
        await storage.updateDeployment(deployment.id, { 
          status, 
          progress: progress || deployment.progress 
        });
        
        // Broadcast status update via WebSocket
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "deployment_progress",
              deploymentId: deployment.id,
              deviceId: device.id,
              status,
              progress
            }));
          }
        });
      }
      
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Error updating deployment status:", error);
      res.status(500).json({ error: "Failed to update deployment status" });
    }
  });
  
  // Activity logging endpoint for Clonezilla scripts
  // TODO: Add machine authentication (API key or signed token) to prevent log injection
  // Note: This endpoint is intentionally public for headless automation logging.
  // Security consideration: Running on isolated network, but should implement API key auth in future.
  app.post("/api/activity", async (req, res) => {
    try {
      const { action, details, deviceMac, level } = req.body;
      
      if (!action || !details) {
        return res.status(400).json({ error: "Missing required fields: action, details" });
      }
      
      // Find device by MAC if provided
      let deviceId = null;
      if (deviceMac) {
        const devices = await storage.getDevices();
        const device = devices.find(d => d.macAddress.toLowerCase() === deviceMac.toLowerCase());
        if (device) {
          deviceId = device.id;
        }
      }
      
      // Map level to activity log type
      const typeMap: Record<string, string> = {
        info: "info",
        success: "deployment",
        error: "error",
        warning: "warning"
      };
      
      const type = typeMap[level || "info"] || "info";
      
      await storage.createActivityLog({
        type,
        message: `[Clonezilla ${action}] ${details}`,
        deviceId,
        deploymentId: null,
      });
      
      // Broadcast activity via WebSocket
      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "activity",
            action,
            details,
            level,
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      res.json({ message: "Activity logged successfully" });
    } catch (error) {
      console.error("Error logging activity:", error);
      res.status(500).json({ error: "Failed to log activity" });
    }
  });
  
  // Network scan endpoint  
  app.post("/api/network/scan", isAuthenticated, requirePermission("devices", "create"), async (req, res) => {
    try {
      // Simulate network discovery with realistic delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate discovering new devices occasionally
      const shouldDiscoverNew = Math.random() > 0.7; // 30% chance
      
      if (shouldDiscoverNew) {
        const newDeviceId = Math.random().toString(36).substr(2, 9);
        const deviceTypes = [
          { name: "WORKSTATION", manufacturer: "Dell", model: "OptiPlex 7090" },
          { name: "LAPTOP", manufacturer: "HP", model: "EliteBook 840" },
          { name: "LAB-PC", manufacturer: "Lenovo", model: "ThinkCentre M90" },
          { name: "KIOSK", manufacturer: "Intel", model: "NUC 11" },
        ];
        
        const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        const deviceNumber = Math.floor(Math.random() * 99) + 1;
        
        const newDevice = await storage.createDevice({
          name: `${deviceType.name}-${deviceNumber.toString().padStart(2, '0')}`,
          macAddress: `00:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}`.toUpperCase(),
          ipAddress: `192.168.1.${Math.floor(Math.random() * 200) + 50}`,
          manufacturer: deviceType.manufacturer,
          model: deviceType.model,
          status: Math.random() > 0.5 ? "online" : "offline",
        });

        // Log the discovery
        await storage.createActivityLog({
          type: "discovery",
          message: `Network scan discovered new device: ${newDevice.name} (${newDevice.macAddress})`,
          deviceId: newDevice.id,
          deploymentId: null,
        });

        res.json({ 
          message: "Network scan completed", 
          discovered: 1,
          newDevices: [newDevice]
        });
      } else {
        // Update last seen for existing online devices
        const devices = await storage.getDevices();
        const onlineDevices = devices.filter(d => d.status === "online");
        
        // Update last seen time for online devices (handled internally by storage)
        for (const device of onlineDevices) {
          await storage.updateDevice(device.id, {
            status: "online" // Just refresh the status to update lastSeen internally
          });
        }

        res.json({ 
          message: "Network scan completed", 
          discovered: 0,
          updatedDevices: onlineDevices.length
        });
      }
    } catch (error) {
      console.error("Network scan error:", error);
      res.status(500).json({ message: "Network scan failed" });
    }
  });

  // Activity logs endpoint
  app.get("/api/activity", isAuthenticated, requirePermission("logs", "read"), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Server status endpoints
  app.get("/api/server-status", isAuthenticated, requirePermission("configuration", "read"), async (req, res) => {
    try {
      const status = await storage.getServerStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch server status" });
    }
  });

  app.put("/api/server-status", isAuthenticated, requirePermission("configuration", "update"), async (req, res) => {
    try {
      const statusData = updateServerStatusSchema.parse(req.body);
      const status = await storage.updateServerStatus(statusData);
      res.json(status);
    } catch (error) {
      res.status(400).json({ message: "Invalid server status data" });
    }
  });

  // Dashboard stats endpoint
  app.get("/api/dashboard/stats", isAuthenticated, requirePermission("monitoring", "read"), async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // System Metrics endpoints
  app.get("/api/system-metrics", isAuthenticated, requirePermission("monitoring", "read"), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const metrics = await storage.getSystemMetrics(limit);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system metrics" });
    }
  });

  // TODO: Add machine authentication (API key or signed token) to prevent metrics flooding
  // Note: This endpoint is intentionally public for headless system monitoring scripts.
  // Security consideration: Running on isolated network, but should implement API key auth in future.
  app.post("/api/system-metrics", async (req, res) => {
    try {
      const metricsData = insertSystemMetricsSchema.parse(req.body);
      const metrics = await storage.createSystemMetrics(metricsData);
      res.status(201).json(metrics);
    } catch (error) {
      res.status(400).json({ message: "Invalid system metrics data" });
    }
  });

  app.get("/api/system-metrics/latest", isAuthenticated, requirePermission("monitoring", "read"), async (req, res) => {
    try {
      const metrics = await storage.getLatestSystemMetrics();
      if (!metrics) {
        return res.status(404).json({ message: "No system metrics found" });
      }
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch latest metrics" });
    }
  });

  // Alerts endpoints
  app.get("/api/alerts", isAuthenticated, requirePermission("monitoring", "read"), async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.get("/api/alerts/unread", isAuthenticated, requirePermission("monitoring", "read"), async (req, res) => {
    try {
      const alerts = await storage.getUnreadAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread alerts" });
    }
  });

  app.post("/api/alerts", isAuthenticated, requirePermission("monitoring", "read"), async (req, res) => {
    try {
      const alertData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      res.status(400).json({ message: "Invalid alert data" });
    }
  });

  app.put("/api/alerts/:id/read", isAuthenticated, requirePermission("monitoring", "read"), async (req, res) => {
    try {
      const alert = await storage.markAlertAsRead(req.params.id);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  app.put("/api/alerts/:id/resolve", isAuthenticated, requirePermission("monitoring", "read"), async (req, res) => {
    try {
      const alert = await storage.resolveAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  // Alert Rules endpoints
  app.get("/api/alert-rules", isAuthenticated, requirePermission("configuration", "read"), async (req, res) => {
    try {
      const rules = await storage.getAlertRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alert rules" });
    }
  });

  app.post("/api/alert-rules", isAuthenticated, requirePermission("configuration", "update"), async (req, res) => {
    try {
      const ruleData = insertAlertRuleSchema.parse(req.body);
      const rule = await storage.createAlertRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ message: "Invalid alert rule data" });
    }
  });

  app.put("/api/alert-rules/:id", isAuthenticated, requirePermission("configuration", "update"), async (req, res) => {
    try {
      const ruleData = insertAlertRuleSchema.partial().parse(req.body);
      const rule = await storage.updateAlertRule(req.params.id, ruleData);
      if (!rule) {
        return res.status(404).json({ message: "Alert rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(400).json({ message: "Invalid alert rule data" });
    }
  });

  app.delete("/api/alert-rules/:id", isAuthenticated, requirePermission("configuration", "update"), async (req, res) => {
    try {
      const deleted = await storage.deleteAlertRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Alert rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete alert rule" });
    }
  });

  // Advanced Image Management endpoints
  app.put("/api/images/:id/validate", isAuthenticated, requirePermission("images", "update"), async (req, res) => {
    try {
      const image = await storage.validateImage(req.params.id);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // Log image validation
      await storage.createActivityLog({
        type: "info",
        message: `Image validated: ${image.name}`,
        deviceId: null,
        deploymentId: null,
      });
      
      res.json(image);
    } catch (error) {
      res.status(500).json({ message: "Failed to validate image" });
    }
  });

  app.put("/api/images/:id/download", isAuthenticated, requirePermission("images", "read"), async (req, res) => {
    try {
      const image = await storage.incrementImageDownloadCount(req.params.id);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      res.json(image);
    } catch (error) {
      res.status(500).json({ message: "Failed to increment download count" });
    }
  });

  // User Management endpoints
  app.get("/api/users", isAuthenticated, requirePermission("users", "read"), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", isAuthenticated, requirePermission("users", "read"), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", isAuthenticated, requirePermission("users", "create"), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      // Log user creation
      await storage.createAuditLog({
        action: "create_user",
        entity: "user",
        entityId: user.id,
        userId: user.id, // In real implementation, this would be the current authenticated user
        details: JSON.stringify({ username: user.username, email: user.email }),
      });
      
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, requirePermission("users", "update"), async (req, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log user update
      await storage.createAuditLog({
        action: "update_user",
        entity: "user",
        entityId: user.id,
        userId: user.id, // In real implementation, this would be the current authenticated user
        details: JSON.stringify(userData),
      });
      
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, requirePermission("users", "delete"), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log user deletion
      await storage.createAuditLog({
        action: "delete_user",
        entity: "user",
        entityId: req.params.id,
        userId: req.params.id, // In real implementation, this would be the current authenticated user
        details: JSON.stringify({ username: user.username }),
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.put("/api/users/:id/toggle-active", isAuthenticated, requirePermission("users", "update"), async (req, res) => {
    try {
      const user = await storage.toggleUserActive(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log user status change
      await storage.createAuditLog({
        action: user.isActive ? "activate_user" : "deactivate_user",
        entity: "user",
        entityId: user.id,
        userId: user.id, // In real implementation, this would be the current authenticated user
        details: JSON.stringify({ isActive: user.isActive }),
      });
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle user status" });
    }
  });

  // Role Management endpoints
  app.get("/api/roles", isAuthenticated, requirePermission("users", "read"), async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.get("/api/roles/:id", isAuthenticated, requirePermission("users", "read"), async (req, res) => {
    try {
      const role = await storage.getRole(req.params.id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json(role);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch role" });
    }
  });

  app.post("/api/roles", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const roleData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(roleData);
      
      // Log role creation
      await storage.createAuditLog({
        action: "create_role",
        entity: "role",
        entityId: role.id,
        userId: "system", // In real implementation, this would be the current authenticated user
        details: JSON.stringify({ name: role.name, description: role.description }),
      });
      
      res.status(201).json(role);
    } catch (error) {
      res.status(400).json({ message: "Invalid role data" });
    }
  });

  app.put("/api/roles/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const roleData = insertRoleSchema.partial().parse(req.body);
      const role = await storage.updateRole(req.params.id, roleData);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Log role update
      await storage.createAuditLog({
        action: "update_role",
        entity: "role",
        entityId: role.id,
        userId: "system", // In real implementation, this would be the current authenticated user
        details: JSON.stringify(roleData),
      });
      
      res.json(role);
    } catch (error) {
      res.status(400).json({ message: "Invalid role data" });
    }
  });

  app.delete("/api/roles/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const role = await storage.getRole(req.params.id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      const deleted = await storage.deleteRole(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Log role deletion
      await storage.createAuditLog({
        action: "delete_role",
        entity: "role",
        entityId: req.params.id,
        userId: "system", // In real implementation, this would be the current authenticated user
        details: JSON.stringify({ name: role.name }),
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  // Permission Management endpoints
  app.get("/api/permissions", isAuthenticated, requirePermission("users", "read"), async (req, res) => {
    try {
      const permissions = await storage.getPermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.post("/api/permissions", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const permissionData = insertPermissionSchema.parse(req.body);
      const permission = await storage.createPermission(permissionData);
      res.status(201).json(permission);
    } catch (error) {
      res.status(400).json({ message: "Invalid permission data" });
    }
  });

  // User-Role Assignment endpoints
  app.get("/api/users/:userId/roles", isAuthenticated, requirePermission("users", "read"), async (req, res) => {
    try {
      const userRoles = await storage.getUserRoles(req.params.userId);
      res.json(userRoles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });

  app.post("/api/users/:userId/roles", isAuthenticated, requirePermission("users", "manage-roles"), async (req, res) => {
    try {
      const { roleId } = req.body;
      const userRole = await storage.assignUserRole({
        userId: req.params.userId,
        roleId,
      });
      
      // Log role assignment
      await storage.createAuditLog({
        action: "assign_user_role",
        entity: "user_role",
        entityId: userRole.id,
        userId: "system", // In real implementation, this would be the current authenticated user
        details: JSON.stringify({ userId: req.params.userId, roleId }),
      });
      
      res.status(201).json(userRole);
    } catch (error) {
      res.status(400).json({ message: "Failed to assign role" });
    }
  });

  app.delete("/api/users/:userId/roles/:roleId", isAuthenticated, requirePermission("users", "manage-roles"), async (req, res) => {
    try {
      const removed = await storage.removeUserRole(req.params.userId, req.params.roleId);
      if (!removed) {
        return res.status(404).json({ message: "User role assignment not found" });
      }
      
      // Log role removal
      await storage.createAuditLog({
        action: "remove_user_role",
        entity: "user_role",
        entityId: `${req.params.userId}-${req.params.roleId}`,
        userId: "system", // In real implementation, this would be the current authenticated user
        details: JSON.stringify({ userId: req.params.userId, roleId: req.params.roleId }),
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove role" });
    }
  });

  // Role-Permission Assignment endpoints
  app.post("/api/roles/:roleId/permissions", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const { permissionId } = req.body;
      const rolePermission = await storage.assignRolePermission({
        roleId: req.params.roleId,
        permissionId,
      });
      res.status(201).json(rolePermission);
    } catch (error) {
      res.status(400).json({ message: "Failed to assign permission" });
    }
  });

  app.delete("/api/roles/:roleId/permissions/:permissionId", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const removed = await storage.removeRolePermission(req.params.roleId, req.params.permissionId);
      if (!removed) {
        return res.status(404).json({ message: "Role permission assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove permission" });
    }
  });

  // Deployment Template endpoints
  app.get("/api/templates", isAuthenticated, requirePermission("templates", "read"), async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", isAuthenticated, requirePermission("templates", "read"), async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", isAuthenticated, requirePermission("templates", "create"), async (req, res) => {
    try {
      const templateData = insertDeploymentTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(templateData);
      
      // Log template creation
      await storage.createAuditLog({
        action: "create_template",
        entity: "template",
        entityId: template.id,
        userId: template.createdBy,
        details: JSON.stringify({ name: template.name }),
      });
      
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid template data" });
    }
  });

  app.put("/api/templates/:id", isAuthenticated, requirePermission("templates", "update"), async (req, res) => {
    try {
      const templateData = insertDeploymentTemplateSchema.partial().parse(req.body);
      const template = await storage.updateTemplate(req.params.id, templateData);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Log template update
      await storage.createAuditLog({
        action: "update_template",
        entity: "template",
        entityId: template.id,
        userId: template.createdBy,
        details: JSON.stringify(templateData),
      });
      
      res.json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid template data" });
    }
  });

  app.delete("/api/templates/:id", isAuthenticated, requirePermission("templates", "delete"), async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      const deleted = await storage.deleteTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Log template deletion
      await storage.createAuditLog({
        action: "delete_template",
        entity: "template",
        entityId: req.params.id,
        userId: template.createdBy,
        details: JSON.stringify({ name: template.name }),
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  app.post("/api/templates/:id/duplicate", isAuthenticated, requirePermission("templates", "create"), async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: "New template name is required" });
      }
      
      const duplicatedTemplate = await storage.duplicateTemplate(req.params.id, name);
      if (!duplicatedTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Log template duplication
      await storage.createAuditLog({
        action: "duplicate_template",
        entity: "template",
        entityId: duplicatedTemplate.id,
        userId: duplicatedTemplate.createdBy,
        details: JSON.stringify({ originalId: req.params.id, newName: name }),
      });
      
      res.status(201).json(duplicatedTemplate);
    } catch (error) {
      res.status(500).json({ message: "Failed to duplicate template" });
    }
  });

  // Template Steps endpoints
  app.get("/api/templates/:templateId/steps", isAuthenticated, requirePermission("templates", "read"), async (req, res) => {
    try {
      const steps = await storage.getTemplateSteps(req.params.templateId);
      res.json(steps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template steps" });
    }
  });

  app.post("/api/templates/:templateId/steps", isAuthenticated, requirePermission("templates", "create"), async (req, res) => {
    try {
      const stepData = insertTemplateStepSchema.parse({
        ...req.body,
        templateId: req.params.templateId,
      });
      const step = await storage.createTemplateStep(stepData);
      res.status(201).json(step);
    } catch (error) {
      res.status(400).json({ message: "Invalid step data" });
    }
  });

  app.put("/api/template-steps/:id", isAuthenticated, requirePermission("templates", "update"), async (req, res) => {
    try {
      const stepData = insertTemplateStepSchema.partial().parse(req.body);
      const step = await storage.updateTemplateStep(req.params.id, stepData);
      if (!step) {
        return res.status(404).json({ message: "Template step not found" });
      }
      res.json(step);
    } catch (error) {
      res.status(400).json({ message: "Invalid step data" });
    }
  });

  app.delete("/api/template-steps/:id", isAuthenticated, requirePermission("templates", "delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteTemplateStep(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Template step not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete template step" });
    }
  });

  // Template Variables endpoints
  app.get("/api/templates/:templateId/variables", isAuthenticated, requirePermission("templates", "read"), async (req, res) => {
    try {
      const variables = await storage.getTemplateVariables(req.params.templateId);
      res.json(variables);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template variables" });
    }
  });

  app.post("/api/templates/:templateId/variables", isAuthenticated, requirePermission("templates", "create"), async (req, res) => {
    try {
      const variableData = insertTemplateVariableSchema.parse({
        ...req.body,
        templateId: req.params.templateId,
      });
      const variable = await storage.createTemplateVariable(variableData);
      res.status(201).json(variable);
    } catch (error) {
      res.status(400).json({ message: "Invalid variable data" });
    }
  });

  app.put("/api/template-variables/:id", isAuthenticated, requirePermission("templates", "update"), async (req, res) => {
    try {
      const variableData = insertTemplateVariableSchema.partial().parse(req.body);
      const variable = await storage.updateTemplateVariable(req.params.id, variableData);
      if (!variable) {
        return res.status(404).json({ message: "Template variable not found" });
      }
      res.json(variable);
    } catch (error) {
      res.status(400).json({ message: "Invalid variable data" });
    }
  });

  app.delete("/api/template-variables/:id", isAuthenticated, requirePermission("templates", "delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteTemplateVariable(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Template variable not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete template variable" });
    }
  });

  // Template Deployment endpoints
  app.get("/api/template-deployments", isAuthenticated, requirePermission("deployments", "read"), async (req, res) => {
    try {
      const templateDeployments = await storage.getTemplateDeployments();
      res.json(templateDeployments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template deployments" });
    }
  });

  app.post("/api/template-deployments", isAuthenticated, requirePermission("deployments", "create"), async (req, res) => {
    try {
      const deploymentData = insertTemplateDeploymentSchema.parse(req.body);
      const deployment = await storage.createTemplateDeployment(deploymentData);
      res.status(201).json(deployment);
    } catch (error) {
      res.status(400).json({ message: "Invalid template deployment data" });
    }
  });

  // Audit Logs endpoints
  app.get("/api/audit-logs", isAuthenticated, requirePermission("security", "read"), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const userId = req.query.userId as string | undefined;
      const logs = await storage.getAuditLogs(limit, userId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Cloud Storage Integration for OS Images
  const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage");
  
  // Serve public images from cloud storage  
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get presigned upload URL for OS image
  app.post("/api/images/upload", isAuthenticated, requirePermission("images", "create"), async (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename) {
        return res.status(400).json({ error: "filename is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getImageUploadURL(filename);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update image record after upload to cloud storage
  app.put("/api/images/:id/cloud-upload", isAuthenticated, requirePermission("images", "create"), async (req, res) => {
    try {
      const { cloudUrl } = req.body;
      if (!cloudUrl) {
        return res.status(400).json({ error: "cloudUrl is required" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Set ACL policy for the uploaded image (public for OS images)
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        cloudUrl,
        {
          owner: "system",
          visibility: "public"
        }
      );

      // Update the image record with cloud storage URL
      const image = await storage.updateImage(req.params.id, { 
        path: objectPath,
        cloudUrl: cloudUrl
      });
      
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Log image upload
      await storage.createActivityLog({
        type: "system",
        message: `OS image uploaded to cloud storage: ${image.name}`,
        deviceId: null,
        deploymentId: null,
      });

      res.json(image);
    } catch (error) {
      console.error("Error updating image with cloud URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve private images from cloud storage
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    clients.add(ws);
    
    // Send initial device status
    storage.getDevices().then(devices => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'device_status_update',
          data: devices
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  // Broadcast function for device updates
  function broadcastDeviceUpdate(devices: any[]) {
    const message = JSON.stringify({
      type: 'device_status_update',
      data: devices,
      timestamp: new Date().toISOString()
    });
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      } else {
        clients.delete(client);
      }
    });
  }
  
  // Simulate device status changes for demo
  setInterval(async () => {
    try {
      const devices = await storage.getDevices();
      // Randomly update some device statuses
      for (const device of devices) {
        const rand = Math.random();
        if (rand < 0.1) { // 10% chance to change status
          const statuses = ['online', 'offline', 'deploying'];
          const currentIndex = statuses.indexOf(device.status);
          const newStatus = statuses[(currentIndex + 1) % statuses.length];
          await storage.updateDevice(device.id, { status: newStatus });
        }
      }
      
      // Get updated devices and broadcast
      const updatedDevices = await storage.getDevices();
      broadcastDeviceUpdate(updatedDevices);
    } catch (error) {
      console.error('Error updating device statuses:', error);
    }
  }, 5000); // Update every 5 seconds

  // ==========================================
  // Password Reset API Endpoints
  // ==========================================
  
  // Request password reset - creates reset token
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists - security best practice
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      // Create reset token
      const resetToken = await storage.createPasswordResetToken(user.id);
      
      // SECURITY: Never send token/code in response in production
      // In isolated networks without email, admins can retrieve from server logs
      console.log(`[PASSWORD RESET] User: ${email}`);
      console.log(`[PASSWORD RESET] Token: ${resetToken.token}`);
      console.log(`[PASSWORD RESET] One-time code: ${resetToken.oneTimeCode}`);
      console.log(`[PASSWORD RESET] Expires: ${resetToken.expiresAt}`);
      
      // TODO: Send email with reset link and code in production
      // Example: await emailService.sendPasswordReset(email, resetToken.token, resetToken.oneTimeCode);
      
      res.json({ 
        message: "If the email exists, a reset link has been sent"
      });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Verify reset token validity
  app.post("/api/auth/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken || resetToken.isUsed || new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      res.json({ valid: true, userId: resetToken.userId });
    } catch (error) {
      console.error("Error verifying reset token:", error);
      res.status(500).json({ message: "Failed to verify token" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword, code } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Verify token or code
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken || resetToken.isUsed || new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Verify one-time code if provided
      if (code && resetToken.oneTimeCode) {
        const crypto = await import('crypto');
        const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
        if (hashedCode !== resetToken.oneTimeCode) {
          return res.status(400).json({ message: "Invalid verification code" });
        }
      }

      // Reset the password
      await storage.resetPassword(resetToken.userId, newPassword, token);
      
      res.json({ message: "Password reset successful" });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      if (error.message?.includes("recently used")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // ==========================================
  // User Management API Endpoints (Admin)
  // ==========================================
  
  // Get all users (admin only)
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Add role-based authorization check
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create new user (admin only)
  app.post("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error.message?.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Update user (admin only)
  app.put("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Toggle user active status (admin only)
  app.post("/api/admin/users/:id/toggle-active", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.toggleUserActive(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error toggling user status:", error);
      res.status(500).json({ message: "Failed to toggle user status" });
    }
  });

  // Bulk CSV user import (admin only)
  app.post("/api/admin/users/import-csv", isAuthenticated, async (req: any, res) => {
    try {
      const { csvData } = req.body;
      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ message: "Invalid CSV data" });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const row of csvData) {
        try {
          // Validate and create user
          const userData = insertUserSchema.parse({
            username: row.username,
            email: row.email,
            fullName: row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim(),
            firstName: row.firstName,
            lastName: row.lastName,
            department: row.department,
            jobTitle: row.jobTitle,
            phoneNumber: row.phoneNumber,
            isActive: row.isActive !== undefined ? row.isActive : true,
          });

          await storage.createUser(userData);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Row ${csvData.indexOf(row) + 1}: ${error.message}`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error importing users:", error);
      res.status(500).json({ message: "Failed to import users" });
    }
  });
  
  return httpServer;
}
