import { 
  type Device, 
  type InsertDevice,
  type Image,
  type InsertImage,
  type Deployment,
  type InsertDeployment,
  type DeploymentWithDetails,
  type ActivityLog,
  type InsertActivityLog,
  type ServerStatus,
  type UpdateServerStatus,
  type DashboardStats
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Devices
  getDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  getDeviceByMac(macAddress: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, device: Partial<InsertDevice>): Promise<Device | undefined>;
  deleteDevice(id: string): Promise<boolean>;

  // Images
  getImages(): Promise<Image[]>;
  getImage(id: string): Promise<Image | undefined>;
  createImage(image: InsertImage): Promise<Image>;
  updateImage(id: string, image: Partial<InsertImage>): Promise<Image | undefined>;
  deleteImage(id: string): Promise<boolean>;

  // Deployments
  getDeployments(): Promise<DeploymentWithDetails[]>;
  getDeployment(id: string): Promise<DeploymentWithDetails | undefined>;
  getActiveDeployments(): Promise<DeploymentWithDetails[]>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeployment(id: string, deployment: Partial<InsertDeployment>): Promise<Deployment | undefined>;
  deleteDeployment(id: string): Promise<boolean>;

  // Activity Logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Server Status
  getServerStatus(): Promise<ServerStatus>;
  updateServerStatus(status: Partial<UpdateServerStatus>): Promise<ServerStatus>;

  // Dashboard Stats
  getDashboardStats(): Promise<DashboardStats>;
}

export class MemStorage implements IStorage {
  private devices: Map<string, Device> = new Map();
  private images: Map<string, Image> = new Map();
  private deployments: Map<string, Deployment> = new Map();
  private activityLogs: ActivityLog[] = [];
  private serverStatus: ServerStatus;

  constructor() {
    // Initialize server status
    this.serverStatus = {
      id: "singleton",
      pxeServerStatus: true,
      tftpServerStatus: true,
      httpServerStatus: true,
      dhcpProxyStatus: true,
      serverIp: "192.168.1.100",
      uptime: 172800, // 2 days in seconds
      networkTraffic: 2.4,
      lastUpdated: new Date(),
    };

    // Initialize with some sample data for demonstration
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample devices
    const device1: Device = {
      id: randomUUID(),
      name: "DESK-WS001",
      macAddress: "00:1B:44:11:3A:B7",
      ipAddress: "192.168.1.101",
      status: "deploying",
      lastSeen: new Date(),
      manufacturer: "Dell",
      model: "OptiPlex 7090",
    };

    const device2: Device = {
      id: randomUUID(),
      name: "LAB-PC15",
      macAddress: "00:1B:44:11:3A:C2",
      ipAddress: "192.168.1.115",
      status: "deploying",
      lastSeen: new Date(),
      manufacturer: "HP",
      model: "EliteDesk 800",
    };

    const device3: Device = {
      id: randomUUID(),
      name: "KIOSK-02",
      macAddress: "00:1B:44:11:3A:D8",
      ipAddress: "192.168.1.102",
      status: "deploying",
      lastSeen: new Date(),
      manufacturer: "Intel",
      model: "NUC11",
    };

    this.devices.set(device1.id, device1);
    this.devices.set(device2.id, device2);
    this.devices.set(device3.id, device3);

    // Sample images
    const image1: Image = {
      id: randomUUID(),
      name: "Windows 11 Pro v23H2",
      filename: "win11_pro_23h2.wim",
      size: 4294967296, // 4GB
      osType: "windows",
      version: "23H2",
      description: "Windows 11 Professional with latest updates",
      uploadedAt: new Date(),
    };

    const image2: Image = {
      id: randomUUID(),
      name: "Ubuntu 22.04 LTS Desktop",
      filename: "ubuntu_22.04_desktop.iso",
      size: 3758096384, // 3.5GB
      osType: "linux",
      version: "22.04 LTS",
      description: "Ubuntu Desktop with standard applications",
      uploadedAt: new Date(),
    };

    const image3: Image = {
      id: randomUUID(),
      name: "Windows 11 IoT Enterprise",
      filename: "win11_iot_enterprise.wim",
      size: 3221225472, // 3GB
      osType: "windows",
      version: "22H2",
      description: "Windows 11 IoT Enterprise for embedded systems",
      uploadedAt: new Date(),
    };

    this.images.set(image1.id, image1);
    this.images.set(image2.id, image2);
    this.images.set(image3.id, image3);

    // Sample deployments
    const deployment1: Deployment = {
      id: randomUUID(),
      deviceId: device1.id,
      imageId: image1.id,
      status: "deploying",
      progress: 73,
      startedAt: new Date(Date.now() - 300000), // 5 minutes ago
      completedAt: null,
      errorMessage: null,
    };

    const deployment2: Deployment = {
      id: randomUUID(),
      deviceId: device2.id,
      imageId: image2.id,
      status: "deploying",
      progress: 45,
      startedAt: new Date(Date.now() - 600000), // 10 minutes ago
      completedAt: null,
      errorMessage: null,
    };

    const deployment3: Deployment = {
      id: randomUUID(),
      deviceId: device3.id,
      imageId: image3.id,
      status: "deploying",
      progress: 91,
      startedAt: new Date(Date.now() - 900000), // 15 minutes ago
      completedAt: null,
      errorMessage: null,
    };

    this.deployments.set(deployment1.id, deployment1);
    this.deployments.set(deployment2.id, deployment2);
    this.deployments.set(deployment3.id, deployment3);

    // Sample activity logs
    this.activityLogs = [
      {
        id: randomUUID(),
        type: "deployment",
        message: "DESK-WS001 started Windows 11 deployment",
        deviceId: device1.id,
        deploymentId: deployment1.id,
        timestamp: new Date(Date.now() - 300000),
      },
      {
        id: randomUUID(),
        type: "discovery",
        message: "New device discovered: LAB-PC20 (00:1B:44:11:3A:F1)",
        deviceId: null,
        deploymentId: null,
        timestamp: new Date(Date.now() - 480000),
      },
      {
        id: randomUUID(),
        type: "info",
        message: "Ubuntu 22.04 LTS Desktop image updated",
        deviceId: null,
        deploymentId: null,
        timestamp: new Date(Date.now() - 900000),
      },
      {
        id: randomUUID(),
        type: "error",
        message: "KIOSK-01 deployment failed - network timeout",
        deviceId: null,
        deploymentId: null,
        timestamp: new Date(Date.now() - 1920000),
      },
    ];
  }

  // Devices
  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async getDeviceByMac(macAddress: string): Promise<Device | undefined> {
    return Array.from(this.devices.values()).find(device => device.macAddress === macAddress);
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = randomUUID();
    const device: Device = {
      ...insertDevice,
      id,
      lastSeen: new Date(),
    };
    this.devices.set(id, device);
    return device;
  }

  async updateDevice(id: string, updateData: Partial<InsertDevice>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;

    const updatedDevice = { ...device, ...updateData };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }

  async deleteDevice(id: string): Promise<boolean> {
    return this.devices.delete(id);
  }

  // Images
  async getImages(): Promise<Image[]> {
    return Array.from(this.images.values());
  }

  async getImage(id: string): Promise<Image | undefined> {
    return this.images.get(id);
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const id = randomUUID();
    const image: Image = {
      ...insertImage,
      id,
      uploadedAt: new Date(),
    };
    this.images.set(id, image);
    return image;
  }

  async updateImage(id: string, updateData: Partial<InsertImage>): Promise<Image | undefined> {
    const image = this.images.get(id);
    if (!image) return undefined;

    const updatedImage = { ...image, ...updateData };
    this.images.set(id, updatedImage);
    return updatedImage;
  }

  async deleteImage(id: string): Promise<boolean> {
    return this.images.delete(id);
  }

  // Deployments
  async getDeployments(): Promise<DeploymentWithDetails[]> {
    const deployments = Array.from(this.deployments.values());
    const deploymentsWithDetails: DeploymentWithDetails[] = [];

    for (const deployment of deployments) {
      const device = this.devices.get(deployment.deviceId);
      const image = this.images.get(deployment.imageId);
      
      if (device && image) {
        deploymentsWithDetails.push({
          ...deployment,
          device,
          image,
        });
      }
    }

    return deploymentsWithDetails;
  }

  async getDeployment(id: string): Promise<DeploymentWithDetails | undefined> {
    const deployment = this.deployments.get(id);
    if (!deployment) return undefined;

    const device = this.devices.get(deployment.deviceId);
    const image = this.images.get(deployment.imageId);

    if (!device || !image) return undefined;

    return {
      ...deployment,
      device,
      image,
    };
  }

  async getActiveDeployments(): Promise<DeploymentWithDetails[]> {
    const allDeployments = await this.getDeployments();
    return allDeployments.filter(deployment => 
      deployment.status === "deploying" || deployment.status === "pending"
    );
  }

  async createDeployment(insertDeployment: InsertDeployment): Promise<Deployment> {
    const id = randomUUID();
    const deployment: Deployment = {
      ...insertDeployment,
      id,
      startedAt: new Date(),
      completedAt: null,
    };
    this.deployments.set(id, deployment);
    return deployment;
  }

  async updateDeployment(id: string, updateData: Partial<InsertDeployment>): Promise<Deployment | undefined> {
    const deployment = this.deployments.get(id);
    if (!deployment) return undefined;

    const updatedDeployment = { ...deployment, ...updateData };
    this.deployments.set(id, updatedDeployment);
    return updatedDeployment;
  }

  async deleteDeployment(id: string): Promise<boolean> {
    return this.deployments.delete(id);
  }

  // Activity Logs
  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    return this.activityLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const log: ActivityLog = {
      ...insertLog,
      id: randomUUID(),
      timestamp: new Date(),
    };
    this.activityLogs.unshift(log);
    
    // Keep only last 1000 logs
    if (this.activityLogs.length > 1000) {
      this.activityLogs = this.activityLogs.slice(0, 1000);
    }
    
    return log;
  }

  // Server Status
  async getServerStatus(): Promise<ServerStatus> {
    return this.serverStatus;
  }

  async updateServerStatus(updateData: Partial<UpdateServerStatus>): Promise<ServerStatus> {
    this.serverStatus = {
      ...this.serverStatus,
      ...updateData,
      lastUpdated: new Date(),
    };
    return this.serverStatus;
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const devices = await this.getDevices();
    const deployments = await this.getDeployments();
    const images = await this.getImages();

    const activeDeployments = deployments.filter(d => 
      d.status === "deploying" || d.status === "pending"
    ).length;

    const completedDeployments = deployments.filter(d => d.status === "completed").length;
    const totalDeployments = deployments.length;
    const successRate = totalDeployments > 0 ? (completedDeployments / totalDeployments) * 100 : 0;

    const totalImageSize = images.reduce((sum, image) => sum + image.size, 0);

    return {
      totalDevices: devices.length,
      activeDeployments,
      successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
      imagesCount: images.length,
      totalImageSize,
    };
  }
}

export const storage = new MemStorage();
