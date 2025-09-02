import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, boolean } from "drizzle-orm/pg-core";
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
  osType: text("os_type").notNull(), // windows, linux, macos
  version: text("version"),
  description: text("description"),
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
  pxeServerStatus: boolean("pxe_server_status").default(true),
  tftpServerStatus: boolean("tftp_server_status").default(true),
  httpServerStatus: boolean("http_server_status").default(true),
  dhcpProxyStatus: boolean("dhcp_proxy_status").default(true),
  serverIp: text("server_ip").default("192.168.1.100"),
  uptime: integer("uptime").default(0), // in seconds
  networkTraffic: real("network_traffic").default(0), // MB/s
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Insert schemas
export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  lastSeen: true,
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  uploadedAt: true,
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
