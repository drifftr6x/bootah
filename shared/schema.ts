import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, boolean, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  macAddress: text("mac_address").notNull().unique(),
  ipAddress: text("ip_address"),
  status: text("status").notNull().default("offline"), // online, offline, deploying, idle
  lastSeen: timestamp("last_seen"),
  manufacturer: text("manufacturer"),
  model: text("model"),
});

export const images = pgTable("images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  size: integer("size").notNull(), // in bytes
  checksum: text("checksum"),
  osType: text("os_type").notNull(), // windows, linux, macos
  version: text("version"),
  description: text("description"),
  category: text("category").default("General"),
  tags: text("tags").array().default(sql`'{}'`),
  compressionType: text("compression_type").default("none"),
  originalSize: integer("original_size"),
  architecture: text("architecture").default("x64"),
  isValidated: boolean("is_validated").default(false),
  validationDate: timestamp("validation_date"),
  downloadCount: integer("download_count").default(0),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const deployments = pgTable("deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id").notNull().references(() => devices.id),
  imageId: varchar("image_id").notNull().references(() => images.id),
  status: text("status").notNull().default("pending"), // pending, deploying, completed, failed, cancelled
  progress: real("progress").default(0), // 0-100
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // deployment, discovery, error, info
  message: text("message").notNull(),
  deviceId: varchar("device_id").references(() => devices.id),
  deploymentId: varchar("deployment_id").references(() => deployments.id),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const serverStatus = pgTable("server_status", {
  id: varchar("id").primaryKey().default("singleton"),
  serverName: text("server_name").default("Bootah64x-Server"),
  pxeServerStatus: boolean("pxe_server_status").default(true),
  tftpServerStatus: boolean("tftp_server_status").default(true),
  httpServerStatus: boolean("http_server_status").default(true),
  dhcpProxyStatus: boolean("dhcp_proxy_status").default(true),
  serverIp: text("server_ip").default("192.168.1.100"),
  pxePort: integer("pxe_port").default(67),
  tftpPort: integer("tftp_port").default(69),
  httpPort: integer("http_port").default(80),
  dhcpPort: integer("dhcp_port").default(67),
  uptime: integer("uptime").default(0), // in seconds
  networkTraffic: real("network_traffic").default(0), // MB/s
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const systemMetrics = pgTable("system_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").defaultNow(),
  cpuUsage: real("cpu_usage").notNull(), // percentage
  memoryUsage: real("memory_usage").notNull(), // percentage
  memoryTotal: bigint("memory_total", { mode: "number" }).notNull(), // bytes
  memoryUsed: bigint("memory_used", { mode: "number" }).notNull(), // bytes
  diskUsage: real("disk_usage").notNull(), // percentage
  diskTotal: bigint("disk_total", { mode: "number" }).notNull(), // bytes
  diskUsed: bigint("disk_used", { mode: "number" }).notNull(), // bytes
  networkThroughputIn: real("network_throughput_in").default(0), // MB/s
  networkThroughputOut: real("network_throughput_out").default(0), // MB/s
  activeConnections: integer("active_connections").default(0),
  temperature: real("temperature"), // Celsius
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // system, deployment, network, image
  severity: text("severity").notNull(), // info, warning, error, critical
  title: text("title").notNull(),
  message: text("message").notNull(),
  source: text("source"), // cpu, memory, disk, network, etc.
  value: real("value"), // metric value that triggered alert
  threshold: real("threshold"), // threshold that was exceeded
  isRead: boolean("is_read").default(false),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alertRules = pgTable("alert_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  metric: text("metric").notNull(), // cpu, memory, disk, network, etc.
  condition: text("condition").notNull(), // greater_than, less_than, equals
  threshold: real("threshold").notNull(),
  severity: text("severity").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Management & RBAC Tables
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  profileImage: text("profile_image"),
  department: text("department"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  isSystemRole: boolean("is_system_role").default(false), // admin, operator, viewer
  createdAt: timestamp("created_at").defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  resource: text("resource").notNull(), // devices, images, deployments, users, etc.
  action: text("action").notNull(), // create, read, update, delete, deploy, etc.
  description: text("description"),
});

export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by").references(() => users.id),
});

export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
});

// Deployment Templates
export const deploymentTemplates = pgTable("deployment_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // standard, custom, rescue, diagnostic
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  estimatedDuration: integer("estimated_duration"), // minutes
  compatibleOSTypes: text("compatible_os_types").array().default(sql`'{}'`),
  tags: text("tags").array().default(sql`'{}'`),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const templateSteps = pgTable("template_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => deploymentTemplates.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // image_deploy, script_run, reboot, wait, custom
  configuration: text("configuration").notNull(), // JSON string
  isOptional: boolean("is_optional").default(false),
  timeoutMinutes: integer("timeout_minutes").default(30),
  retryCount: integer("retry_count").default(0),
});

export const templateVariables = pgTable("template_variables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => deploymentTemplates.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // string, number, boolean, select, image, device
  defaultValue: text("default_value"),
  isRequired: boolean("is_required").default(true),
  options: text("options").array().default(sql`'{}'`), // for select type
  description: text("description"),
});

export const templateDeployments = pgTable("template_deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => deploymentTemplates.id),
  deploymentId: varchar("deployment_id").notNull().references(() => deployments.id),
  variables: text("variables"), // JSON string of variable values
  currentStep: integer("current_step").default(0),
  startedBy: varchar("started_by").references(() => users.id),
  startedAt: timestamp("started_at").defaultNow(),
});

// Audit Logs for User Actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(), // login, logout, create, update, delete, deploy, etc.
  resource: text("resource"), // user, role, device, image, deployment, template
  resourceId: text("resource_id"),
  details: text("details"), // JSON string with additional context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  lastSeen: true,
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  uploadedAt: true,
  validationDate: true,
  downloadCount: true,
});

export const insertDeploymentSchema = createInsertSchema(deployments).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

export const insertSystemMetricsSchema = createInsertSchema(systemMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export const insertAlertRuleSchema = createInsertSchema(alertRules).omit({
  id: true,
  createdAt: true,
});

export const updateServerStatusSchema = createInsertSchema(serverStatus).omit({
  id: true,
  lastUpdated: true,
});

// User Management & RBAC Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  assignedAt: true,
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
});

// Deployment Templates Insert Schemas
export const insertDeploymentTemplateSchema = createInsertSchema(deploymentTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateStepSchema = createInsertSchema(templateSteps).omit({
  id: true,
});

export const insertTemplateVariableSchema = createInsertSchema(templateVariables).omit({
  id: true,
});

export const insertTemplateDeploymentSchema = createInsertSchema(templateDeployments).omit({
  id: true,
  startedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type Image = typeof images.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type ServerStatus = typeof serverStatus.$inferSelect;
export type UpdateServerStatus = z.infer<typeof updateServerStatusSchema>;

export type SystemMetrics = typeof systemMetrics.$inferSelect;
export type InsertSystemMetrics = z.infer<typeof insertSystemMetricsSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;

// User Management & RBAC Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

// Deployment Templates Types
export type DeploymentTemplate = typeof deploymentTemplates.$inferSelect;
export type InsertDeploymentTemplate = z.infer<typeof insertDeploymentTemplateSchema>;

export type TemplateStep = typeof templateSteps.$inferSelect;
export type InsertTemplateStep = z.infer<typeof insertTemplateStepSchema>;

export type TemplateVariable = typeof templateVariables.$inferSelect;
export type InsertTemplateVariable = z.infer<typeof insertTemplateVariableSchema>;

export type TemplateDeployment = typeof templateDeployments.$inferSelect;
export type InsertTemplateDeployment = z.infer<typeof insertTemplateDeploymentSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Extended types for API responses
export type DeploymentWithDetails = Deployment & {
  device: Device;
  image: Image;
};

export type UserWithRoles = User & {
  roles: (UserRole & { role: Role })[];
};

export type RoleWithPermissions = Role & {
  permissions: (RolePermission & { permission: Permission })[];
};

export type DeploymentTemplateWithDetails = DeploymentTemplate & {
  steps: TemplateStep[];
  variables: TemplateVariable[];
  creator?: User;
};

export type TemplateStepWithConfig = TemplateStep & {
  parsedConfiguration: any; // Parsed JSON configuration
};

export type DashboardStats = {
  totalDevices: number;
  activeDeployments: number;
  successRate: number;
  imagesCount: number;
  totalImageSize: number;
};

// Permission checking types
export type PermissionCheck = {
  resource: string;
  action: string;
  resourceId?: string;
};

export type UserPermissions = {
  [resource: string]: string[]; // resource -> actions[]
};
