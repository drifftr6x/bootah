import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
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
  insertAuditLogSchema
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

  // System Metrics endpoints
  app.get("/api/system-metrics", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const metrics = await storage.getSystemMetrics(limit);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system metrics" });
    }
  });

  app.post("/api/system-metrics", async (req, res) => {
    try {
      const metricsData = insertSystemMetricsSchema.parse(req.body);
      const metrics = await storage.createSystemMetrics(metricsData);
      res.status(201).json(metrics);
    } catch (error) {
      res.status(400).json({ message: "Invalid system metrics data" });
    }
  });

  app.get("/api/system-metrics/latest", async (req, res) => {
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
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.get("/api/alerts/unread", async (req, res) => {
    try {
      const alerts = await storage.getUnreadAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const alertData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      res.status(400).json({ message: "Invalid alert data" });
    }
  });

  app.put("/api/alerts/:id/read", async (req, res) => {
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

  app.put("/api/alerts/:id/resolve", async (req, res) => {
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
  app.get("/api/alert-rules", async (req, res) => {
    try {
      const rules = await storage.getAlertRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alert rules" });
    }
  });

  app.post("/api/alert-rules", async (req, res) => {
    try {
      const ruleData = insertAlertRuleSchema.parse(req.body);
      const rule = await storage.createAlertRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ message: "Invalid alert rule data" });
    }
  });

  app.put("/api/alert-rules/:id", async (req, res) => {
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

  app.delete("/api/alert-rules/:id", async (req, res) => {
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
  app.put("/api/images/:id/validate", async (req, res) => {
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

  app.put("/api/images/:id/download", async (req, res) => {
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
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
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

  app.post("/api/users", async (req, res) => {
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

  app.put("/api/users/:id", async (req, res) => {
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

  app.delete("/api/users/:id", async (req, res) => {
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

  app.put("/api/users/:id/toggle-active", async (req, res) => {
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
  app.get("/api/roles", async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.get("/api/roles/:id", async (req, res) => {
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

  app.post("/api/roles", async (req, res) => {
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

  app.put("/api/roles/:id", async (req, res) => {
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

  app.delete("/api/roles/:id", async (req, res) => {
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
  app.get("/api/permissions", async (req, res) => {
    try {
      const permissions = await storage.getPermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.post("/api/permissions", async (req, res) => {
    try {
      const permissionData = insertPermissionSchema.parse(req.body);
      const permission = await storage.createPermission(permissionData);
      res.status(201).json(permission);
    } catch (error) {
      res.status(400).json({ message: "Invalid permission data" });
    }
  });

  // User-Role Assignment endpoints
  app.post("/api/users/:userId/roles", async (req, res) => {
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

  app.delete("/api/users/:userId/roles/:roleId", async (req, res) => {
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
  app.post("/api/roles/:roleId/permissions", async (req, res) => {
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

  app.delete("/api/roles/:roleId/permissions/:permissionId", async (req, res) => {
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
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
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

  app.post("/api/templates", async (req, res) => {
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

  app.put("/api/templates/:id", async (req, res) => {
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

  app.delete("/api/templates/:id", async (req, res) => {
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

  app.post("/api/templates/:id/duplicate", async (req, res) => {
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
  app.get("/api/templates/:templateId/steps", async (req, res) => {
    try {
      const steps = await storage.getTemplateSteps(req.params.templateId);
      res.json(steps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template steps" });
    }
  });

  app.post("/api/templates/:templateId/steps", async (req, res) => {
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

  app.put("/api/template-steps/:id", async (req, res) => {
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

  app.delete("/api/template-steps/:id", async (req, res) => {
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
  app.get("/api/templates/:templateId/variables", async (req, res) => {
    try {
      const variables = await storage.getTemplateVariables(req.params.templateId);
      res.json(variables);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template variables" });
    }
  });

  app.post("/api/templates/:templateId/variables", async (req, res) => {
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

  app.put("/api/template-variables/:id", async (req, res) => {
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

  app.delete("/api/template-variables/:id", async (req, res) => {
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
  app.get("/api/template-deployments", async (req, res) => {
    try {
      const templateDeployments = await storage.getTemplateDeployments();
      res.json(templateDeployments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template deployments" });
    }
  });

  app.post("/api/template-deployments", async (req, res) => {
    try {
      const deploymentData = insertTemplateDeploymentSchema.parse(req.body);
      const deployment = await storage.createTemplateDeployment(deploymentData);
      res.status(201).json(deployment);
    } catch (error) {
      res.status(400).json({ message: "Invalid template deployment data" });
    }
  });

  // Audit Logs endpoints
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const userId = req.query.userId as string | undefined;
      const logs = await storage.getAuditLogs(limit, userId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
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
  
  return httpServer;
}
