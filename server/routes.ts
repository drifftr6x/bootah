import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertDeviceSchema, 
  insertImageSchema, 
  insertDeploymentSchema, 
  insertActivityLogSchema,
  updateServerStatusSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Devices endpoints
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.get("/api/devices/:id", async (req, res) => {
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

  app.post("/api/devices", async (req, res) => {
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

  app.put("/api/devices/:id", async (req, res) => {
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

  app.delete("/api/devices/:id", async (req, res) => {
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
  app.get("/api/images", async (req, res) => {
    try {
      const images = await storage.getImages();
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  app.get("/api/images/:id", async (req, res) => {
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

  app.post("/api/images", async (req, res) => {
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

  app.put("/api/images/:id", async (req, res) => {
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

  app.delete("/api/images/:id", async (req, res) => {
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
  app.get("/api/deployments", async (req, res) => {
    try {
      const deployments = await storage.getDeployments();
      res.json(deployments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deployments" });
    }
  });

  app.get("/api/deployments/active", async (req, res) => {
    try {
      const deployments = await storage.getActiveDeployments();
      res.json(deployments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active deployments" });
    }
  });

  app.get("/api/deployments/:id", async (req, res) => {
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

  app.post("/api/deployments", async (req, res) => {
    try {
      const deploymentData = insertDeploymentSchema.parse(req.body);
      const deployment = await storage.createDeployment(deploymentData);
      
      // Update device status
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
      
      res.status(201).json(deployment);
    } catch (error) {
      res.status(400).json({ message: "Invalid deployment data" });
    }
  });

  app.put("/api/deployments/:id", async (req, res) => {
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

  app.delete("/api/deployments/:id", async (req, res) => {
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

  // Network scan endpoint  
  app.post("/api/network/scan", async (req, res) => {
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
  app.get("/api/activity", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Server status endpoints
  app.get("/api/server-status", async (req, res) => {
    try {
      const status = await storage.getServerStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch server status" });
    }
  });

  app.put("/api/server-status", async (req, res) => {
    try {
      const statusData = updateServerStatusSchema.parse(req.body);
      const status = await storage.updateServerStatus(statusData);
      res.json(status);
    } catch (error) {
      res.status(400).json({ message: "Invalid server status data" });
    }
  });

  // Dashboard stats endpoint
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
