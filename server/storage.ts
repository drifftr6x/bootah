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
  type SystemMetrics,
  type InsertSystemMetrics,
  type Alert,
  type InsertAlert,
  type AlertRule,
  type InsertAlertRule,
  type DashboardStats,
  type User,
  type InsertUser,
  type Role,
  type InsertRole,
  type Permission,
  type InsertPermission,
  type UserRole,
  type InsertUserRole,
  type RolePermission,
  type InsertRolePermission,
  type DeploymentTemplate,
  type InsertDeploymentTemplate,
  type TemplateStep,
  type InsertTemplateStep,
  type TemplateVariable,
  type InsertTemplateVariable,
  type TemplateDeployment,
  type InsertTemplateDeployment,
  type AuditLog,
  type InsertAuditLog,
  type UserWithRoles,
  type RoleWithPermissions,
  type DeploymentTemplateWithDetails,
  type SecurityIncident,
  type InsertSecurityIncident,
  type CompliancePolicy,
  type InsertCompliancePolicy,
  type SecurityAssessment,
  type InsertSecurityAssessment,
  type Certificate,
  type InsertCertificate,
  type SecurityConfiguration,
  type InsertSecurityConfiguration,
  type ComplianceReport,
  type InsertComplianceReport
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
  validateImage(id: string): Promise<Image | undefined>;
  incrementImageDownloadCount(id: string): Promise<Image | undefined>;

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

  // System Metrics
  getSystemMetrics(limit?: number): Promise<SystemMetrics[]>;
  createSystemMetrics(metrics: InsertSystemMetrics): Promise<SystemMetrics>;
  getLatestSystemMetrics(): Promise<SystemMetrics | undefined>;

  // Alerts
  getAlerts(): Promise<Alert[]>;
  getUnreadAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: string): Promise<Alert | undefined>;
  resolveAlert(id: string): Promise<Alert | undefined>;

  // Alert Rules
  getAlertRules(): Promise<AlertRule[]>;
  getEnabledAlertRules(): Promise<AlertRule[]>;
  createAlertRule(rule: InsertAlertRule): Promise<AlertRule>;
  updateAlertRule(id: string, rule: Partial<InsertAlertRule>): Promise<AlertRule | undefined>;
  deleteAlertRule(id: string): Promise<boolean>;

  // Server Status
  getServerStatus(): Promise<ServerStatus>;
  updateServerStatus(status: Partial<UpdateServerStatus>): Promise<ServerStatus>;

  // Dashboard Stats
  getDashboardStats(): Promise<DashboardStats>;

  // User Management
  getUsers(): Promise<UserWithRoles[]>;
  getUser(id: string): Promise<UserWithRoles | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  toggleUserActive(id: string): Promise<User | undefined>;

  // Roles
  getRoles(): Promise<RoleWithPermissions[]>;
  getRole(id: string): Promise<RoleWithPermissions | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, role: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: string): Promise<boolean>;

  // Permissions
  getPermissions(): Promise<Permission[]>;
  getPermission(id: string): Promise<Permission | undefined>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  deletePermission(id: string): Promise<boolean>;

  // User-Role Assignments
  getUserRoles(userId: string): Promise<UserRole[]>;
  assignUserRole(userRole: InsertUserRole): Promise<UserRole>;
  removeUserRole(userId: string, roleId: string): Promise<boolean>;

  // Role-Permission Assignments
  getRolePermissions(roleId: string): Promise<RolePermission[]>;
  assignRolePermission(rolePermission: InsertRolePermission): Promise<RolePermission>;
  removeRolePermission(roleId: string, permissionId: string): Promise<boolean>;

  // Deployment Templates
  getTemplates(): Promise<DeploymentTemplateWithDetails[]>;
  getTemplate(id: string): Promise<DeploymentTemplateWithDetails | undefined>;
  createTemplate(template: InsertDeploymentTemplate): Promise<DeploymentTemplate>;
  updateTemplate(id: string, template: Partial<InsertDeploymentTemplate>): Promise<DeploymentTemplate | undefined>;
  deleteTemplate(id: string): Promise<boolean>;
  duplicateTemplate(id: string, newName: string): Promise<DeploymentTemplate | undefined>;

  // Template Steps
  getTemplateSteps(templateId: string): Promise<TemplateStep[]>;
  createTemplateStep(step: InsertTemplateStep): Promise<TemplateStep>;
  updateTemplateStep(id: string, step: Partial<InsertTemplateStep>): Promise<TemplateStep | undefined>;
  deleteTemplateStep(id: string): Promise<boolean>;

  // Template Variables
  getTemplateVariables(templateId: string): Promise<TemplateVariable[]>;
  createTemplateVariable(variable: InsertTemplateVariable): Promise<TemplateVariable>;
  updateTemplateVariable(id: string, variable: Partial<InsertTemplateVariable>): Promise<TemplateVariable | undefined>;
  deleteTemplateVariable(id: string): Promise<boolean>;

  // Template Deployments
  getTemplateDeployments(): Promise<TemplateDeployment[]>;
  getTemplateDeployment(id: string): Promise<TemplateDeployment | undefined>;
  createTemplateDeployment(templateDeployment: InsertTemplateDeployment): Promise<TemplateDeployment>;
  updateTemplateDeployment(id: string, templateDeployment: Partial<InsertTemplateDeployment>): Promise<TemplateDeployment | undefined>;

  // Audit Logs
  getAuditLogs(limit?: number, userId?: string): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Security & Compliance
  getSecurityIncidents(): Promise<SecurityIncident[]>;
  getSecurityIncident(id: string): Promise<SecurityIncident | undefined>;
  createSecurityIncident(incident: InsertSecurityIncident): Promise<SecurityIncident>;
  updateSecurityIncident(id: string, incident: Partial<InsertSecurityIncident>): Promise<SecurityIncident | undefined>;
  resolveSecurityIncident(id: string, resolution: string): Promise<SecurityIncident | undefined>;

  getCompliancePolicies(): Promise<CompliancePolicy[]>;
  getCompliancePolicy(id: string): Promise<CompliancePolicy | undefined>;
  createCompliancePolicy(policy: InsertCompliancePolicy): Promise<CompliancePolicy>;
  updateCompliancePolicy(id: string, policy: Partial<InsertCompliancePolicy>): Promise<CompliancePolicy | undefined>;
  deleteCompliancePolicy(id: string): Promise<boolean>;

  getSecurityAssessments(): Promise<SecurityAssessment[]>;
  getSecurityAssessment(id: string): Promise<SecurityAssessment | undefined>;
  createSecurityAssessment(assessment: InsertSecurityAssessment): Promise<SecurityAssessment>;
  updateSecurityAssessment(id: string, assessment: Partial<InsertSecurityAssessment>): Promise<SecurityAssessment | undefined>;
  deleteSecurityAssessment(id: string): Promise<boolean>;

  getCertificates(): Promise<Certificate[]>;
  getCertificate(id: string): Promise<Certificate | undefined>;
  getExpiringCertificates(days?: number): Promise<Certificate[]>;
  createCertificate(certificate: InsertCertificate): Promise<Certificate>;
  updateCertificate(id: string, certificate: Partial<InsertCertificate>): Promise<Certificate | undefined>;
  deleteCertificate(id: string): Promise<boolean>;

  getSecurityConfigurations(): Promise<SecurityConfiguration[]>;
  getSecurityConfiguration(id: string): Promise<SecurityConfiguration | undefined>;
  createSecurityConfiguration(config: InsertSecurityConfiguration): Promise<SecurityConfiguration>;
  updateSecurityConfiguration(id: string, config: Partial<InsertSecurityConfiguration>): Promise<SecurityConfiguration | undefined>;
  deleteSecurityConfiguration(id: string): Promise<boolean>;

  getComplianceReports(): Promise<ComplianceReport[]>;
  getComplianceReport(id: string): Promise<ComplianceReport | undefined>;
  createComplianceReport(report: InsertComplianceReport): Promise<ComplianceReport>;
  updateComplianceReport(id: string, report: Partial<InsertComplianceReport>): Promise<ComplianceReport | undefined>;
  deleteComplianceReport(id: string): Promise<boolean>;
  approveComplianceReport(id: string, approvedBy: string): Promise<ComplianceReport | undefined>;
}

export class MemStorage implements IStorage {
  private devices: Map<string, Device> = new Map();
  private images: Map<string, Image> = new Map();
  private deployments: Map<string, Deployment> = new Map();
  private activityLogs: ActivityLog[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private serverStatus: ServerStatus;
  
  // User Management & RBAC
  private users: Map<string, User> = new Map();
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private userRoles: Map<string, UserRole> = new Map();
  private rolePermissions: Map<string, RolePermission> = new Map();
  
  // Deployment Templates
  private templates: Map<string, DeploymentTemplate> = new Map();
  private templateSteps: Map<string, TemplateStep> = new Map();
  private templateVariables: Map<string, TemplateVariable> = new Map();
  private templateDeployments: Map<string, TemplateDeployment> = new Map();
  private auditLogs: AuditLog[] = [];

  // Security & Compliance
  private securityIncidents: Map<string, SecurityIncident> = new Map();
  private compliancePolicies: Map<string, CompliancePolicy> = new Map();
  private securityAssessments: Map<string, SecurityAssessment> = new Map();
  private certificates: Map<string, Certificate> = new Map();
  private securityConfigurations: Map<string, SecurityConfiguration> = new Map();
  private complianceReports: Map<string, ComplianceReport> = new Map();

  constructor() {
    // Initialize server status
    this.serverStatus = {
      id: "singleton",
      serverName: "Bootah64x-Server",
      pxeServerStatus: true,
      tftpServerStatus: true,
      httpServerStatus: true,
      dhcpProxyStatus: true,
      serverIp: "192.168.1.100",
      pxePort: 67,
      tftpPort: 69,
      httpPort: 80,
      dhcpPort: 67,
      uptime: 172800, // 2 days in seconds
      networkTraffic: 2.4,
      lastUpdated: new Date(),
    };

    // Initialize with some sample data for demonstration
    this.initializeSampleData();
    this.initializeUserManagement();
    this.initializeTemplates();
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
      checksum: "sha256:a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      osType: "windows",
      version: "23H2",
      description: "Windows 11 Professional with latest updates",
      category: "Operating Systems",
      tags: ["windows", "pro", "business"],
      compressionType: "none",
      originalSize: null,
      architecture: "x64",
      isValidated: true,
      validationDate: new Date(),
      downloadCount: 15,
      uploadedAt: new Date(),
    };

    const image2: Image = {
      id: randomUUID(),
      name: "Ubuntu 22.04 LTS Desktop",
      filename: "ubuntu_22.04_desktop.iso",
      size: 3758096384, // 3.5GB
      checksum: "sha256:b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567",
      osType: "linux",
      version: "22.04 LTS",
      description: "Ubuntu Desktop with standard applications",
      category: "Operating Systems",
      tags: ["ubuntu", "linux", "desktop"],
      compressionType: "gzip",
      originalSize: 4500000000,
      architecture: "x64",
      isValidated: true,
      validationDate: new Date(),
      downloadCount: 8,
      uploadedAt: new Date(),
    };

    const image3: Image = {
      id: randomUUID(),
      name: "Windows 11 IoT Enterprise",
      filename: "win11_iot_enterprise.wim",
      size: 3221225472, // 3GB
      checksum: "sha256:c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678",
      osType: "windows",
      version: "22H2",
      description: "Windows 11 IoT Enterprise for embedded systems",
      category: "IoT/Embedded",
      tags: ["windows", "iot", "embedded"],
      compressionType: "none",
      originalSize: null,
      architecture: "x64",
      isValidated: false,
      validationDate: null,
      downloadCount: 3,
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
      status: insertDevice.status || "offline",
      lastSeen: new Date(),
      ipAddress: insertDevice.ipAddress || null,
      manufacturer: insertDevice.manufacturer || null,
      model: insertDevice.model || null,
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
      version: insertImage.version || null,
      description: insertImage.description || null,
      checksum: insertImage.checksum || null,
      category: insertImage.category || "General",
      tags: insertImage.tags || [],
      compressionType: insertImage.compressionType || "none",
      originalSize: insertImage.originalSize || null,
      architecture: insertImage.architecture || "x64",
      isValidated: insertImage.isValidated || false,
      validationDate: null,
      downloadCount: 0,
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

  async validateImage(id: string): Promise<Image | undefined> {
    const image = this.images.get(id);
    if (!image) return undefined;

    const updatedImage = { 
      ...image, 
      isValidated: true, 
      validationDate: new Date() 
    };
    this.images.set(id, updatedImage);
    return updatedImage;
  }

  async incrementImageDownloadCount(id: string): Promise<Image | undefined> {
    const image = this.images.get(id);
    if (!image) return undefined;

    const updatedImage = { 
      ...image, 
      downloadCount: (image.downloadCount || 0) + 1 
    };
    this.images.set(id, updatedImage);
    return updatedImage;
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
      status: insertDeployment.status || "pending",
      progress: insertDeployment.progress || 0,
      errorMessage: insertDeployment.errorMessage || null,
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
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit);
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const log: ActivityLog = {
      ...insertLog,
      id: randomUUID(),
      timestamp: new Date(),
      deviceId: insertLog.deviceId || null,
      deploymentId: insertLog.deploymentId || null,
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

  // System Metrics
  async getSystemMetrics(limit: number = 100): Promise<SystemMetrics[]> {
    return this.systemMetrics
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit);
  }

  async createSystemMetrics(insertMetrics: InsertSystemMetrics): Promise<SystemMetrics> {
    const metrics: SystemMetrics = {
      ...insertMetrics,
      id: randomUUID(),
      timestamp: new Date(),
      networkThroughputIn: insertMetrics.networkThroughputIn ?? 0,
      networkThroughputOut: insertMetrics.networkThroughputOut ?? 0,
      activeConnections: insertMetrics.activeConnections ?? 0,
      temperature: insertMetrics.temperature ?? null,
    };
    this.systemMetrics.unshift(metrics);
    
    // Keep only last 1000 metrics
    if (this.systemMetrics.length > 1000) {
      this.systemMetrics = this.systemMetrics.slice(0, 1000);
    }
    
    return metrics;
  }

  async getLatestSystemMetrics(): Promise<SystemMetrics | undefined> {
    const sorted = this.systemMetrics.sort((a, b) => 
      (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
    );
    return sorted[0];
  }

  // Alerts
  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getUnreadAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.isRead)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert: Alert = {
      ...insertAlert,
      id,
      source: insertAlert.source ?? null,
      value: insertAlert.value ?? null,
      threshold: insertAlert.threshold ?? null,
      isRead: insertAlert.isRead ?? false,
      isResolved: insertAlert.isResolved ?? false,
      resolvedAt: insertAlert.resolvedAt ?? null,
      createdAt: new Date(),
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async markAlertAsRead(id: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    const updatedAlert = { ...alert, isRead: true };
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }

  async resolveAlert(id: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    const updatedAlert = { 
      ...alert, 
      isResolved: true, 
      resolvedAt: new Date() 
    };
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }

  // Alert Rules
  async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values());
  }

  async getEnabledAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values()).filter(rule => rule.isEnabled);
  }

  async createAlertRule(insertRule: InsertAlertRule): Promise<AlertRule> {
    const id = randomUUID();
    const rule: AlertRule = {
      ...insertRule,
      id,
      isEnabled: insertRule.isEnabled ?? true,
      createdAt: new Date(),
    };
    this.alertRules.set(id, rule);
    return rule;
  }

  async updateAlertRule(id: string, updateData: Partial<InsertAlertRule>): Promise<AlertRule | undefined> {
    const rule = this.alertRules.get(id);
    if (!rule) return undefined;

    const updatedRule = { ...rule, ...updateData };
    this.alertRules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteAlertRule(id: string): Promise<boolean> {
    return this.alertRules.delete(id);
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

  // Initialize sample user management data
  private initializeUserManagement() {
    // Sample permissions
    const permissions = [
      { id: randomUUID(), name: "view_dashboard", description: "View dashboard" },
      { id: randomUUID(), name: "manage_devices", description: "Manage devices" },
      { id: randomUUID(), name: "manage_images", description: "Manage OS images" },
      { id: randomUUID(), name: "manage_deployments", description: "Manage deployments" },
      { id: randomUUID(), name: "manage_users", description: "Manage users" },
      { id: randomUUID(), name: "manage_roles", description: "Manage roles" },
      { id: randomUUID(), name: "view_logs", description: "View activity logs" },
      { id: randomUUID(), name: "manage_system", description: "Manage system settings" },
    ];

    permissions.forEach(p => this.permissions.set(p.id, p));

    // Sample roles
    const adminRole: Role = {
      id: randomUUID(),
      name: "Administrator",
      description: "Full system access",
      isSystemRole: true,
      createdAt: new Date(),
    };

    const operatorRole: Role = {
      id: randomUUID(),
      name: "Operator",
      description: "Deploy and manage images",
      isSystemRole: true,
      createdAt: new Date(),
    };

    const viewerRole: Role = {
      id: randomUUID(),
      name: "Viewer",
      description: "Read-only access",
      isSystemRole: true,
      createdAt: new Date(),
    };

    this.roles.set(adminRole.id, adminRole);
    this.roles.set(operatorRole.id, operatorRole);
    this.roles.set(viewerRole.id, viewerRole);

    // Assign all permissions to admin
    permissions.forEach(perm => {
      const rolePermission: RolePermission = {
        id: randomUUID(),
        roleId: adminRole.id,
        permissionId: perm.id,
        assignedAt: new Date(),
      };
      this.rolePermissions.set(rolePermission.id, rolePermission);
    });

    // Assign deployment permissions to operator
    const operatorPerms = permissions.filter(p => 
      ["view_dashboard", "manage_devices", "manage_images", "manage_deployments", "view_logs"].includes(p.name)
    );
    operatorPerms.forEach(perm => {
      const rolePermission: RolePermission = {
        id: randomUUID(),
        roleId: operatorRole.id,
        permissionId: perm.id,
        assignedAt: new Date(),
      };
      this.rolePermissions.set(rolePermission.id, rolePermission);
    });

    // Assign view permissions to viewer
    const viewerPerms = permissions.filter(p => 
      ["view_dashboard", "view_logs"].includes(p.name)
    );
    viewerPerms.forEach(perm => {
      const rolePermission: RolePermission = {
        id: randomUUID(),
        roleId: viewerRole.id,
        permissionId: perm.id,
        assignedAt: new Date(),
      };
      this.rolePermissions.set(rolePermission.id, rolePermission);
    });

    // Sample users
    const adminUser: User = {
      id: randomUUID(),
      username: "admin",
      email: "admin@bootah.local",
      firstName: "System",
      lastName: "Administrator",
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const operatorUser: User = {
      id: randomUUID(),
      username: "operator",
      email: "operator@bootah.local",
      firstName: "IT",
      lastName: "Operator",
      isActive: true,
      lastLoginAt: new Date(Date.now() - 3600000), // 1 hour ago
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(operatorUser.id, operatorUser);

    // Assign roles to users
    const adminUserRole: UserRole = {
      id: randomUUID(),
      userId: adminUser.id,
      roleId: adminRole.id,
      assignedAt: new Date(),
    };

    const operatorUserRole: UserRole = {
      id: randomUUID(),
      userId: operatorUser.id,
      roleId: operatorRole.id,
      assignedAt: new Date(),
    };

    this.userRoles.set(adminUserRole.id, adminUserRole);
    this.userRoles.set(operatorUserRole.id, operatorUserRole);
  }

  // Initialize sample deployment templates
  private initializeTemplates() {
    // Windows deployment template
    const winTemplate: DeploymentTemplate = {
      id: randomUUID(),
      name: "Windows 11 Enterprise Deployment",
      description: "Complete Windows 11 Enterprise deployment with domain join and software installation",
      version: "1.0",
      isActive: true,
      createdBy: Array.from(this.users.values())[0]?.id || "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Linux deployment template
    const linuxTemplate: DeploymentTemplate = {
      id: randomUUID(),
      name: "Ubuntu Server Setup",
      description: "Ubuntu 22.04 LTS server deployment with Docker and monitoring tools",
      version: "1.2",
      isActive: true,
      createdBy: Array.from(this.users.values())[0]?.id || "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(winTemplate.id, winTemplate);
    this.templates.set(linuxTemplate.id, linuxTemplate);

    // Windows template steps
    const winSteps = [
      {
        id: randomUUID(),
        templateId: winTemplate.id,
        stepNumber: 1,
        name: "Boot from Network",
        description: "Configure BIOS/UEFI for PXE boot",
        action: "pxe_boot",
        parameters: { bootMode: "uefi", networkInterface: "primary" },
        timeoutSeconds: 300,
        retryCount: 3,
        isOptional: false,
        dependsOn: null,
      },
      {
        id: randomUUID(),
        templateId: winTemplate.id,
        stepNumber: 2,
        name: "Deploy Windows Image",
        description: "Deploy Windows 11 Enterprise base image",
        action: "deploy_image",
        parameters: { imageId: "{{WINDOWS_IMAGE_ID}}", partitionScheme: "gpt" },
        timeoutSeconds: 2400,
        retryCount: 1,
        isOptional: false,
        dependsOn: null,
      },
      {
        id: randomUUID(),
        templateId: winTemplate.id,
        stepNumber: 3,
        name: "Domain Join",
        description: "Join computer to Active Directory domain",
        action: "domain_join",
        parameters: { domain: "{{DOMAIN_NAME}}", ou: "{{TARGET_OU}}" },
        timeoutSeconds: 180,
        retryCount: 2,
        isOptional: true,
        dependsOn: null,
      }
    ];

    winSteps.forEach(step => this.templateSteps.set(step.id, step));

    // Template variables
    const winVariables = [
      {
        id: randomUUID(),
        templateId: winTemplate.id,
        name: "WINDOWS_IMAGE_ID",
        description: "Windows 11 Enterprise Image ID",
        defaultValue: "",
        isRequired: true,
        variableType: "string" as const,
      },
      {
        id: randomUUID(),
        templateId: winTemplate.id,
        name: "DOMAIN_NAME",
        description: "Active Directory Domain Name",
        defaultValue: "company.local",
        isRequired: false,
        variableType: "string" as const,
      },
      {
        id: randomUUID(),
        templateId: winTemplate.id,
        name: "TARGET_OU",
        description: "Target Organizational Unit",
        defaultValue: "OU=Workstations,DC=company,DC=local",
        isRequired: false,
        variableType: "string" as const,
      }
    ];

    winVariables.forEach(variable => this.templateVariables.set(variable.id, variable));
  }

  // User Management Implementation
  async getUsers(): Promise<UserWithRoles[]> {
    const users = Array.from(this.users.values());
    const usersWithRoles: UserWithRoles[] = [];

    for (const user of users) {
      const userRoles = Array.from(this.userRoles.values())
        .filter(ur => ur.userId === user.id)
        .map(ur => this.roles.get(ur.roleId))
        .filter(Boolean) as Role[];

      usersWithRoles.push({
        ...user,
        roles: userRoles,
      });
    }

    return usersWithRoles;
  }

  async getUser(id: string): Promise<UserWithRoles | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const userRoles = Array.from(this.userRoles.values())
      .filter(ur => ur.userId === id)
      .map(ur => this.roles.get(ur.roleId))
      .filter(Boolean) as Role[];

    return {
      ...user,
      roles: userRoles,
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      isActive: insertUser.isActive ?? true,
      lastLoginAt: insertUser.lastLoginAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { 
      ...user, 
      ...updateData, 
      updatedAt: new Date() 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Remove user role assignments
    Array.from(this.userRoles.values())
      .filter(ur => ur.userId === id)
      .forEach(ur => this.userRoles.delete(ur.id));
    
    return this.users.delete(id);
  }

  async toggleUserActive(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { 
      ...user, 
      isActive: !user.isActive, 
      updatedAt: new Date() 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Role Management Implementation
  async getRoles(): Promise<RoleWithPermissions[]> {
    const roles = Array.from(this.roles.values());
    const rolesWithPermissions: RoleWithPermissions[] = [];

    for (const role of roles) {
      const rolePermissions = Array.from(this.rolePermissions.values())
        .filter(rp => rp.roleId === role.id)
        .map(rp => this.permissions.get(rp.permissionId))
        .filter(Boolean) as Permission[];

      rolesWithPermissions.push({
        ...role,
        permissions: rolePermissions,
      });
    }

    return rolesWithPermissions;
  }

  async getRole(id: string): Promise<RoleWithPermissions | undefined> {
    const role = this.roles.get(id);
    if (!role) return undefined;

    const rolePermissions = Array.from(this.rolePermissions.values())
      .filter(rp => rp.roleId === id)
      .map(rp => this.permissions.get(rp.permissionId))
      .filter(Boolean) as Permission[];

    return {
      ...role,
      permissions: rolePermissions,
    };
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const id = randomUUID();
    const role: Role = {
      ...insertRole,
      id,
      isSystemRole: insertRole.isSystemRole ?? false,
      createdAt: new Date(),
    };
    this.roles.set(id, role);
    return role;
  }

  async updateRole(id: string, updateData: Partial<InsertRole>): Promise<Role | undefined> {
    const role = this.roles.get(id);
    if (!role) return undefined;

    const updatedRole = { ...role, ...updateData };
    this.roles.set(id, updatedRole);
    return updatedRole;
  }

  async deleteRole(id: string): Promise<boolean> {
    // Remove role permission assignments
    Array.from(this.rolePermissions.values())
      .filter(rp => rp.roleId === id)
      .forEach(rp => this.rolePermissions.delete(rp.id));
    
    // Remove user role assignments
    Array.from(this.userRoles.values())
      .filter(ur => ur.roleId === id)
      .forEach(ur => this.userRoles.delete(ur.id));
    
    return this.roles.delete(id);
  }

  // Permission Management Implementation
  async getPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values());
  }

  async getPermission(id: string): Promise<Permission | undefined> {
    return this.permissions.get(id);
  }

  async createPermission(insertPermission: InsertPermission): Promise<Permission> {
    const id = randomUUID();
    const permission: Permission = {
      ...insertPermission,
      id,
    };
    this.permissions.set(id, permission);
    return permission;
  }

  async deletePermission(id: string): Promise<boolean> {
    // Remove role permission assignments
    Array.from(this.rolePermissions.values())
      .filter(rp => rp.permissionId === id)
      .forEach(rp => this.rolePermissions.delete(rp.id));
    
    return this.permissions.delete(id);
  }

  // User-Role Assignment Implementation
  async getUserRoles(userId: string): Promise<UserRole[]> {
    return Array.from(this.userRoles.values()).filter(ur => ur.userId === userId);
  }

  async assignUserRole(insertUserRole: InsertUserRole): Promise<UserRole> {
    const id = randomUUID();
    const userRole: UserRole = {
      ...insertUserRole,
      id,
      assignedAt: new Date(),
    };
    this.userRoles.set(id, userRole);
    return userRole;
  }

  async removeUserRole(userId: string, roleId: string): Promise<boolean> {
    const userRole = Array.from(this.userRoles.values())
      .find(ur => ur.userId === userId && ur.roleId === roleId);
    
    if (!userRole) return false;
    return this.userRoles.delete(userRole.id);
  }

  // Role-Permission Assignment Implementation
  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    return Array.from(this.rolePermissions.values()).filter(rp => rp.roleId === roleId);
  }

  async assignRolePermission(insertRolePermission: InsertRolePermission): Promise<RolePermission> {
    const id = randomUUID();
    const rolePermission: RolePermission = {
      ...insertRolePermission,
      id,
      assignedAt: new Date(),
    };
    this.rolePermissions.set(id, rolePermission);
    return rolePermission;
  }

  async removeRolePermission(roleId: string, permissionId: string): Promise<boolean> {
    const rolePermission = Array.from(this.rolePermissions.values())
      .find(rp => rp.roleId === roleId && rp.permissionId === permissionId);
    
    if (!rolePermission) return false;
    return this.rolePermissions.delete(rolePermission.id);
  }

  // Template Management Implementation
  async getTemplates(): Promise<DeploymentTemplateWithDetails[]> {
    const templates = Array.from(this.templates.values());
    const templatesWithDetails: DeploymentTemplateWithDetails[] = [];

    for (const template of templates) {
      const steps = Array.from(this.templateSteps.values())
        .filter(step => step.templateId === template.id)
        .sort((a, b) => a.stepNumber - b.stepNumber);

      const variables = Array.from(this.templateVariables.values())
        .filter(variable => variable.templateId === template.id);

      templatesWithDetails.push({
        ...template,
        steps,
        variables,
      });
    }

    return templatesWithDetails;
  }

  async getTemplate(id: string): Promise<DeploymentTemplateWithDetails | undefined> {
    const template = this.templates.get(id);
    if (!template) return undefined;

    const steps = Array.from(this.templateSteps.values())
      .filter(step => step.templateId === id)
      .sort((a, b) => a.stepNumber - b.stepNumber);

    const variables = Array.from(this.templateVariables.values())
      .filter(variable => variable.templateId === id);

    return {
      ...template,
      steps,
      variables,
    };
  }

  async createTemplate(insertTemplate: InsertDeploymentTemplate): Promise<DeploymentTemplate> {
    const id = randomUUID();
    const template: DeploymentTemplate = {
      ...insertTemplate,
      id,
      isActive: insertTemplate.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.set(id, template);
    return template;
  }

  async updateTemplate(id: string, updateData: Partial<InsertDeploymentTemplate>): Promise<DeploymentTemplate | undefined> {
    const template = this.templates.get(id);
    if (!template) return undefined;

    const updatedTemplate = { 
      ...template, 
      ...updateData, 
      updatedAt: new Date() 
    };
    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    // Remove template steps
    Array.from(this.templateSteps.values())
      .filter(step => step.templateId === id)
      .forEach(step => this.templateSteps.delete(step.id));
    
    // Remove template variables
    Array.from(this.templateVariables.values())
      .filter(variable => variable.templateId === id)
      .forEach(variable => this.templateVariables.delete(variable.id));
    
    return this.templates.delete(id);
  }

  async duplicateTemplate(id: string, newName: string): Promise<DeploymentTemplate | undefined> {
    const originalTemplate = await this.getTemplate(id);
    if (!originalTemplate) return undefined;

    // Create new template
    const newTemplate = await this.createTemplate({
      name: newName,
      description: `Copy of ${originalTemplate.description}`,
      version: "1.0",
      createdBy: originalTemplate.createdBy,
    });

    // Copy steps
    for (const step of originalTemplate.steps) {
      await this.createTemplateStep({
        templateId: newTemplate.id,
        stepNumber: step.stepNumber,
        name: step.name,
        description: step.description,
        action: step.action,
        parameters: step.parameters,
        timeoutSeconds: step.timeoutSeconds,
        retryCount: step.retryCount,
        isOptional: step.isOptional,
        dependsOn: step.dependsOn,
      });
    }

    // Copy variables
    for (const variable of originalTemplate.variables) {
      await this.createTemplateVariable({
        templateId: newTemplate.id,
        name: variable.name,
        description: variable.description,
        defaultValue: variable.defaultValue,
        isRequired: variable.isRequired,
        variableType: variable.variableType,
      });
    }

    return newTemplate;
  }

  // Template Steps Implementation
  async getTemplateSteps(templateId: string): Promise<TemplateStep[]> {
    return Array.from(this.templateSteps.values())
      .filter(step => step.templateId === templateId)
      .sort((a, b) => a.stepNumber - b.stepNumber);
  }

  async createTemplateStep(insertStep: InsertTemplateStep): Promise<TemplateStep> {
    const id = randomUUID();
    const step: TemplateStep = {
      ...insertStep,
      id,
      timeoutSeconds: insertStep.timeoutSeconds ?? 300,
      retryCount: insertStep.retryCount ?? 0,
      isOptional: insertStep.isOptional ?? false,
      dependsOn: insertStep.dependsOn ?? null,
    };
    this.templateSteps.set(id, step);
    return step;
  }

  async updateTemplateStep(id: string, updateData: Partial<InsertTemplateStep>): Promise<TemplateStep | undefined> {
    const step = this.templateSteps.get(id);
    if (!step) return undefined;

    const updatedStep = { ...step, ...updateData };
    this.templateSteps.set(id, updatedStep);
    return updatedStep;
  }

  async deleteTemplateStep(id: string): Promise<boolean> {
    return this.templateSteps.delete(id);
  }

  // Template Variables Implementation
  async getTemplateVariables(templateId: string): Promise<TemplateVariable[]> {
    return Array.from(this.templateVariables.values())
      .filter(variable => variable.templateId === templateId);
  }

  async createTemplateVariable(insertVariable: InsertTemplateVariable): Promise<TemplateVariable> {
    const id = randomUUID();
    const variable: TemplateVariable = {
      ...insertVariable,
      id,
      defaultValue: insertVariable.defaultValue ?? "",
      isRequired: insertVariable.isRequired ?? false,
    };
    this.templateVariables.set(id, variable);
    return variable;
  }

  async updateTemplateVariable(id: string, updateData: Partial<InsertTemplateVariable>): Promise<TemplateVariable | undefined> {
    const variable = this.templateVariables.get(id);
    if (!variable) return undefined;

    const updatedVariable = { ...variable, ...updateData };
    this.templateVariables.set(id, updatedVariable);
    return updatedVariable;
  }

  async deleteTemplateVariable(id: string): Promise<boolean> {
    return this.templateVariables.delete(id);
  }

  // Template Deployments Implementation
  async getTemplateDeployments(): Promise<TemplateDeployment[]> {
    return Array.from(this.templateDeployments.values());
  }

  async getTemplateDeployment(id: string): Promise<TemplateDeployment | undefined> {
    return this.templateDeployments.get(id);
  }

  async createTemplateDeployment(insertTemplateDeployment: InsertTemplateDeployment): Promise<TemplateDeployment> {
    const id = randomUUID();
    const templateDeployment: TemplateDeployment = {
      ...insertTemplateDeployment,
      id,
      status: insertTemplateDeployment.status ?? "pending",
      progress: insertTemplateDeployment.progress ?? 0,
      startedAt: new Date(),
      completedAt: insertTemplateDeployment.completedAt ?? null,
      errorMessage: insertTemplateDeployment.errorMessage ?? null,
    };
    this.templateDeployments.set(id, templateDeployment);
    return templateDeployment;
  }

  async updateTemplateDeployment(id: string, updateData: Partial<InsertTemplateDeployment>): Promise<TemplateDeployment | undefined> {
    const templateDeployment = this.templateDeployments.get(id);
    if (!templateDeployment) return undefined;

    const updatedTemplateDeployment = { ...templateDeployment, ...updateData };
    this.templateDeployments.set(id, updatedTemplateDeployment);
    return updatedTemplateDeployment;
  }

  // Audit Logs Implementation
  async getAuditLogs(limit: number = 50, userId?: string): Promise<AuditLog[]> {
    let logs = this.auditLogs;
    
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    
    return logs
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit);
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const log: AuditLog = {
      ...insertLog,
      id: randomUUID(),
      timestamp: new Date(),
      details: insertLog.details ?? null,
    };
    this.auditLogs.unshift(log);
    
    // Keep only last 1000 audit logs
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(0, 1000);
    }
    
    return log;
  }

  // Security Incidents Implementation
  async getSecurityIncidents(): Promise<SecurityIncident[]> {
    return Array.from(this.securityIncidents.values()).sort((a, b) => 
      (b.detectedAt?.getTime() || 0) - (a.detectedAt?.getTime() || 0)
    );
  }

  async getSecurityIncident(id: string): Promise<SecurityIncident | undefined> {
    return this.securityIncidents.get(id);
  }

  async createSecurityIncident(insertIncident: InsertSecurityIncident): Promise<SecurityIncident> {
    const incident: SecurityIncident = {
      ...insertIncident,
      id: randomUUID(),
      detectedAt: new Date(),
      affectedSystems: insertIncident.affectedSystems ?? [],
      mitigationSteps: insertIncident.mitigationSteps ?? [],
    };
    this.securityIncidents.set(incident.id, incident);
    return incident;
  }

  async updateSecurityIncident(id: string, update: Partial<InsertSecurityIncident>): Promise<SecurityIncident | undefined> {
    const incident = this.securityIncidents.get(id);
    if (!incident) return undefined;
    
    const updated = { ...incident, ...update };
    this.securityIncidents.set(id, updated);
    return updated;
  }

  async resolveSecurityIncident(id: string, resolution: string): Promise<SecurityIncident | undefined> {
    const incident = this.securityIncidents.get(id);
    if (!incident) return undefined;
    
    const resolved = {
      ...incident,
      status: "resolved" as const,
      resolution,
      resolvedAt: new Date()
    };
    this.securityIncidents.set(id, resolved);
    return resolved;
  }

  // Compliance Policies Implementation
  async getCompliancePolicies(): Promise<CompliancePolicy[]> {
    return Array.from(this.compliancePolicies.values()).sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getCompliancePolicy(id: string): Promise<CompliancePolicy | undefined> {
    return this.compliancePolicies.get(id);
  }

  async createCompliancePolicy(insertPolicy: InsertCompliancePolicy): Promise<CompliancePolicy> {
    const policy: CompliancePolicy = {
      ...insertPolicy,
      id: randomUUID(),
      createdAt: new Date(),
      requirements: insertPolicy.requirements ?? [],
    };
    this.compliancePolicies.set(policy.id, policy);
    return policy;
  }

  async updateCompliancePolicy(id: string, update: Partial<InsertCompliancePolicy>): Promise<CompliancePolicy | undefined> {
    const policy = this.compliancePolicies.get(id);
    if (!policy) return undefined;
    
    const updated = { ...policy, ...update };
    this.compliancePolicies.set(id, updated);
    return updated;
  }

  async deleteCompliancePolicy(id: string): Promise<boolean> {
    return this.compliancePolicies.delete(id);
  }

  // Security Assessments Implementation
  async getSecurityAssessments(): Promise<SecurityAssessment[]> {
    return Array.from(this.securityAssessments.values()).sort((a, b) => 
      (b.scheduledAt?.getTime() || 0) - (a.scheduledAt?.getTime() || 0)
    );
  }

  async getSecurityAssessment(id: string): Promise<SecurityAssessment | undefined> {
    return this.securityAssessments.get(id);
  }

  async createSecurityAssessment(insertAssessment: InsertSecurityAssessment): Promise<SecurityAssessment> {
    const assessment: SecurityAssessment = {
      ...insertAssessment,
      id: randomUUID(),
    };
    this.securityAssessments.set(assessment.id, assessment);
    return assessment;
  }

  async updateSecurityAssessment(id: string, update: Partial<InsertSecurityAssessment>): Promise<SecurityAssessment | undefined> {
    const assessment = this.securityAssessments.get(id);
    if (!assessment) return undefined;
    
    const updated = { ...assessment, ...update };
    this.securityAssessments.set(id, updated);
    return updated;
  }

  async deleteSecurityAssessment(id: string): Promise<boolean> {
    return this.securityAssessments.delete(id);
  }

  // Certificates Implementation
  async getCertificates(): Promise<Certificate[]> {
    return Array.from(this.certificates.values()).sort((a, b) => 
      (a.expiresAt?.getTime() || 0) - (b.expiresAt?.getTime() || 0)
    );
  }

  async getCertificate(id: string): Promise<Certificate | undefined> {
    return this.certificates.get(id);
  }

  async getExpiringCertificates(days: number = 30): Promise<Certificate[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    
    return Array.from(this.certificates.values())
      .filter(cert => cert.expiresAt && cert.expiresAt <= threshold && cert.status === "active")
      .sort((a, b) => (a.expiresAt?.getTime() || 0) - (b.expiresAt?.getTime() || 0));
  }

  async createCertificate(insertCertificate: InsertCertificate): Promise<Certificate> {
    const certificate: Certificate = {
      ...insertCertificate,
      id: randomUUID(),
      usedBy: insertCertificate.usedBy ?? [],
    };
    this.certificates.set(certificate.id, certificate);
    return certificate;
  }

  async updateCertificate(id: string, update: Partial<InsertCertificate>): Promise<Certificate | undefined> {
    const certificate = this.certificates.get(id);
    if (!certificate) return undefined;
    
    const updated = { ...certificate, ...update };
    this.certificates.set(id, updated);
    return updated;
  }

  async deleteCertificate(id: string): Promise<boolean> {
    return this.certificates.delete(id);
  }

  // Security Configurations Implementation
  async getSecurityConfigurations(): Promise<SecurityConfiguration[]> {
    return Array.from(this.securityConfigurations.values()).sort((a, b) => 
      a.category.localeCompare(b.category) || a.setting.localeCompare(b.setting)
    );
  }

  async getSecurityConfiguration(id: string): Promise<SecurityConfiguration | undefined> {
    return this.securityConfigurations.get(id);
  }

  async createSecurityConfiguration(insertConfig: InsertSecurityConfiguration): Promise<SecurityConfiguration> {
    const config: SecurityConfiguration = {
      ...insertConfig,
      id: randomUUID(),
      lastUpdated: new Date(),
    };
    this.securityConfigurations.set(config.id, config);
    return config;
  }

  async updateSecurityConfiguration(id: string, update: Partial<InsertSecurityConfiguration>): Promise<SecurityConfiguration | undefined> {
    const config = this.securityConfigurations.get(id);
    if (!config) return undefined;
    
    const updated = { ...config, ...update, lastUpdated: new Date() };
    this.securityConfigurations.set(id, updated);
    return updated;
  }

  async deleteSecurityConfiguration(id: string): Promise<boolean> {
    return this.securityConfigurations.delete(id);
  }

  // Compliance Reports Implementation
  async getComplianceReports(): Promise<ComplianceReport[]> {
    return Array.from(this.complianceReports.values()).sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getComplianceReport(id: string): Promise<ComplianceReport | undefined> {
    return this.complianceReports.get(id);
  }

  async createComplianceReport(insertReport: InsertComplianceReport): Promise<ComplianceReport> {
    const report: ComplianceReport = {
      ...insertReport,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.complianceReports.set(report.id, report);
    return report;
  }

  async updateComplianceReport(id: string, update: Partial<InsertComplianceReport>): Promise<ComplianceReport | undefined> {
    const report = this.complianceReports.get(id);
    if (!report) return undefined;
    
    const updated = { ...report, ...update };
    this.complianceReports.set(id, updated);
    return updated;
  }

  async deleteComplianceReport(id: string): Promise<boolean> {
    return this.complianceReports.delete(id);
  }

  async approveComplianceReport(id: string, approvedBy: string): Promise<ComplianceReport | undefined> {
    const report = this.complianceReports.get(id);
    if (!report) return undefined;
    
    const approved = {
      ...report,
      status: "approved" as const,
      approvedBy,
      approvedAt: new Date()
    };
    this.complianceReports.set(id, approved);
    return approved;
  }
}

export const storage = new MemStorage();
