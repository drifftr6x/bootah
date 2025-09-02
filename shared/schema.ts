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

// Extended types for API responses
export type DeploymentWithDetails = Deployment & {
  device: Device;
  image: Image;
};

export type DashboardStats = {
  totalDevices: number;
  activeDeployments: number;
  successRate: number;
  imagesCount: number;
  totalImageSize: number;
};
