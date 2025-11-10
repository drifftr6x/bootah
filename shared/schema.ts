import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, boolean, bigint, jsonb, index, foreignKey, unique } from "drizzle-orm/pg-core";
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
  cloudUrl: text("cloud_url"), // Cloud storage URL for the image
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const deployments = pgTable("deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id").notNull().references(() => devices.id),
  imageId: varchar("image_id").notNull().references(() => images.id),
  status: text("status").notNull().default("pending"), // pending, scheduled, deploying, completed, failed, cancelled
  progress: real("progress").default(0), // 0-100
  startedAt: timestamp("started_at"), // Set by scheduler when deployment actually starts
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  // Scheduling fields
  scheduleType: text("schedule_type").notNull().default("instant"), // instant, delayed, recurring
  scheduledFor: timestamp("scheduled_for"), // Required for delayed/recurring - when to start deployment
  recurringPattern: text("recurring_pattern"), // Required for recurring - Cron-style: "0 2 * * 0" (Every Sunday at 2 AM)
  lastRunAt: timestamp("last_run_at"), // For recurring deployments - last execution time
  nextRunAt: timestamp("next_run_at"), // For recurring deployments - next scheduled execution
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const multicastSessions = pgTable("multicast_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  imageId: varchar("image_id").notNull().references(() => images.id),
  status: text("status").notNull().default("waiting"), // waiting, active, completed, failed, cancelled
  multicastAddress: text("multicast_address").notNull(), // e.g., "239.255.0.1"
  port: integer("port").notNull().default(9000),
  maxClients: integer("max_clients"), // Optional limit on participants
  clientCount: integer("client_count").default(0), // Current number of participants
  totalBytes: bigint("total_bytes", { mode: "number" }).default(0), // Total bytes to transfer
  bytesSent: bigint("bytes_sent", { mode: "number" }).default(0), // Bytes sent so far
  throughput: real("throughput").default(0), // MB/s
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusIdx: index("multicast_sessions_status_idx").on(table.status),
}));

export const multicastParticipants = pgTable("multicast_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => multicastSessions.id, { onDelete: 'cascade' }),
  deviceId: varchar("device_id").notNull().references(() => devices.id),
  status: text("status").notNull().default("waiting"), // waiting, downloading, completed, failed
  progress: real("progress").default(0), // 0-100
  bytesReceived: bigint("bytes_received", { mode: "number" }).default(0), // Bytes received by this participant
  errorMessage: text("error_message"),
  joinedAt: timestamp("joined_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  sessionDeviceIdx: index("multicast_participants_session_device_idx").on(table.sessionId, table.deviceId),
  sessionDeviceUnique: unique("multicast_participants_session_device_unique").on(table.sessionId, table.deviceId),
}));

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

// Network Topology tables for visualization
export const networkSegments = pgTable("network_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "VLAN 100 - Production", "Main Network"
  subnet: text("subnet").notNull(), // CIDR notation e.g., "192.168.1.0/24"
  vlanId: integer("vlan_id"),
  description: text("description"),
  color: text("color").default("#3b82f6"), // Hex color for visualization
  createdAt: timestamp("created_at").defaultNow(),
});

export const deviceConnections = pgTable("device_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceDeviceId: varchar("source_device_id").references(() => devices.id, { onDelete: 'cascade' }),
  targetDeviceId: varchar("target_device_id").references(() => devices.id, { onDelete: 'cascade' }),
  connectionType: text("connection_type").notNull().default("ethernet"), // ethernet, wifi, virtual
  bandwidth: integer("bandwidth"), // Mbps
  latency: real("latency"), // ms
  packetLoss: real("packet_loss"), // percentage
  isActive: boolean("is_active").default(true),
  lastSeen: timestamp("last_seen").defaultNow(),
}, (table) => ({
  sourceTargetIdx: index("device_connections_source_target_idx").on(table.sourceDeviceId, table.targetDeviceId),
}));

export const topologySnapshots = pgTable("topology_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  snapshotData: jsonb("snapshot_data").notNull(), // Full topology state
  deviceCount: integer("device_count").default(0),
  connectionCount: integer("connection_count").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
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

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User Management & RBAC Tables (integrated with Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Replit Auth fields
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Local Auth fields
  username: text("username").unique(),
  fullName: text("full_name"),
  passwordHash: text("password_hash"),
  // Account status and security
  isActive: boolean("is_active").default(true),
  isLocked: boolean("is_locked").default(false),
  accountStatus: text("account_status").default("active"), // active, locked, disabled, pending
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lastFailedLogin: timestamp("last_failed_login"),
  lockedUntil: timestamp("locked_until"),
  forcePasswordChange: boolean("force_password_change").default(false),
  // Password policy
  passwordLastChanged: timestamp("password_last_changed"),
  passwordExpiresAt: timestamp("password_expires_at"),
  // User info
  lastLogin: timestamp("last_login"),
  department: text("department"),
  jobTitle: text("job_title"),
  phoneNumber: text("phone_number"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"),
}, (users) => ({
  createdByFk: foreignKey({ columns: [users.createdBy], foreignColumns: [users.id] }),
}));

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(), // SHA-256 hash of token
  oneTimeCode: text("one_time_code"), // SHA-256 hash of 6-digit code
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  isUsed: boolean("is_used").default(false),
  createdBy: varchar("created_by").references(() => users.id), // Admin who initiated reset
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
},
(table) => [index("IDX_password_reset_userId").on(table.userId)],
);

// Login History
export const loginHistory = pgTable("login_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  username: text("username"), // Store username for failed attempts
  success: boolean("success").notNull(),
  failureReason: text("failure_reason"), // invalid_credentials, account_locked, account_disabled
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"), // Optional: city, country
  method: text("method").default("local"), // local, replit_auth
  timestamp: timestamp("timestamp").defaultNow(),
},
(table) => [index("IDX_login_history_userId").on(table.userId)],
);

// Password History (prevent password reuse)
export const passwordHistory = pgTable("password_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
},
(table) => [index("IDX_password_history_userId").on(table.userId)],
);

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

// Security & Compliance Tables
export const securityIncidents = pgTable("security_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), // low, medium, high, critical
  category: text("category").notNull(), // unauthorized_access, malware, data_breach, policy_violation
  status: text("status").notNull().default("open"), // open, investigating, resolved, closed
  affectedSystems: text("affected_systems").array().default(sql`'{}'`),
  sourceIp: text("source_ip"),
  detectedBy: text("detected_by"), // system, user, automated
  assignedTo: varchar("assigned_to").references(() => users.id),
  reportedBy: varchar("reported_by").references(() => users.id),
  detectedAt: timestamp("detected_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  mitigationSteps: text("mitigation_steps").array().default(sql`'{}'`),
});

export const compliancePolicies = pgTable("compliance_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  framework: text("framework").notNull(), // ISO27001, SOC2, GDPR, HIPAA, PCI-DSS
  description: text("description").notNull(),
  category: text("category").notNull(), // access_control, data_protection, network_security, audit
  requirements: text("requirements").array().default(sql`'{}'`),
  isActive: boolean("is_active").default(true),
  complianceLevel: text("compliance_level").notNull(), // compliant, partial, non_compliant
  lastAssessed: timestamp("last_assessed"),
  nextReview: timestamp("next_review"),
  owner: varchar("owner").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const securityAssessments = pgTable("security_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // vulnerability_scan, penetration_test, compliance_audit, risk_assessment
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, failed
  scope: text("scope").notNull(), // network, application, system, physical
  findings: integer("findings").default(0),
  criticalIssues: integer("critical_issues").default(0),
  highIssues: integer("high_issues").default(0),
  mediumIssues: integer("medium_issues").default(0),
  lowIssues: integer("low_issues").default(0),
  overallScore: real("overall_score"), // 0-100
  assessor: varchar("assessor").references(() => users.id),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  reportPath: text("report_path"),
});

export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // ssl, ca, client, server
  domain: text("domain"),
  issuer: text("issuer").notNull(),
  subject: text("subject").notNull(),
  serialNumber: text("serial_number"),
  fingerprint: text("fingerprint"),
  keyAlgorithm: text("key_algorithm"),
  keySize: integer("key_size"),
  status: text("status").notNull().default("active"), // active, expired, revoked, pending
  issuedAt: timestamp("issued_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  lastChecked: timestamp("last_checked"),
  autoRenew: boolean("auto_renew").default(false),
  usedBy: text("used_by").array().default(sql`'{}'`), // services using this cert
});

export const securityConfigurations = pgTable("security_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // firewall, encryption, authentication, monitoring
  setting: text("setting").notNull(),
  value: text("value").notNull(),
  defaultValue: text("default_value"),
  description: text("description"),
  severity: text("severity").notNull(), // info, warning, critical
  isCompliant: boolean("is_compliant").default(true),
  recommendedValue: text("recommended_value"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const complianceReports = pgTable("compliance_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  framework: text("framework").notNull(), // ISO27001, SOC2, GDPR, etc.
  reportType: text("report_type").notNull(), // quarterly, annual, incident, audit
  period: text("period").notNull(), // Q1 2024, 2024, etc.
  overallScore: real("overall_score"), // 0-100
  totalControls: integer("total_controls").default(0),
  compliantControls: integer("compliant_controls").default(0),
  partialControls: integer("partial_controls").default(0),
  nonCompliantControls: integer("non_compliant_controls").default(0),
  status: text("status").notNull().default("draft"), // draft, final, approved
  generatedBy: varchar("generated_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  reportPath: text("report_path"),
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
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
  lastRunAt: true,
  nextRunAt: true,
  createdAt: true,
}).extend({
  scheduleType: z.enum(["instant", "delayed", "recurring"]).default("instant"),
}).refine(
  (data) => {
    // For delayed or recurring, scheduledFor is required
    if (data.scheduleType !== "instant" && !data.scheduledFor) {
      return false;
    }
    // For recurring, recurringPattern is required
    if (data.scheduleType === "recurring" && !data.recurringPattern) {
      return false;
    }
    return true;
  },
  {
    message: "scheduledFor is required for delayed/recurring deployments, and recurringPattern is required for recurring deployments",
  }
);

export const insertMulticastSessionSchema = createInsertSchema(multicastSessions).omit({
  id: true,
  clientCount: true,
  totalBytes: true,
  bytesSent: true,
  throughput: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMulticastParticipantSchema = createInsertSchema(multicastParticipants).omit({
  id: true,
  progress: true,
  bytesReceived: true,
  joinedAt: true,
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
  failedLoginAttempts: true,
  lastFailedLogin: true,
  lockedUntil: true,
  passwordLastChanged: true,
  passwordExpiresAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export const insertLoginHistorySchema = createInsertSchema(loginHistory).omit({
  id: true,
  timestamp: true,
});

export const insertPasswordHistorySchema = createInsertSchema(passwordHistory).omit({
  id: true,
  createdAt: true,
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

// Security & Compliance Insert Schemas
export const insertSecurityIncidentSchema = createInsertSchema(securityIncidents).omit({
  id: true,
  detectedAt: true,
});

export const insertCompliancePolicySchema = createInsertSchema(compliancePolicies).omit({
  id: true,
  createdAt: true,
});

export const insertSecurityAssessmentSchema = createInsertSchema(securityAssessments).omit({
  id: true,
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({
  id: true,
});

export const insertSecurityConfigurationSchema = createInsertSchema(securityConfigurations).omit({
  id: true,
  lastUpdated: true,
});

export const insertComplianceReportSchema = createInsertSchema(complianceReports).omit({
  id: true,
  createdAt: true,
});

// Network Topology Insert Schemas
export const insertNetworkSegmentSchema = createInsertSchema(networkSegments).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceConnectionSchema = createInsertSchema(deviceConnections).omit({
  id: true,
  lastSeen: true,
});

export const insertTopologySnapshotSchema = createInsertSchema(topologySnapshots).omit({
  id: true,
  createdAt: true,
});

// Types
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type Image = typeof images.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;

export type MulticastSession = typeof multicastSessions.$inferSelect;
export type InsertMulticastSession = z.infer<typeof insertMulticastSessionSchema>;

export type MulticastParticipant = typeof multicastParticipants.$inferSelect;
export type InsertMulticastParticipant = z.infer<typeof insertMulticastParticipantSchema>;

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
export type UpsertUser = typeof users.$inferInsert;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;

export type PasswordHistory = typeof passwordHistory.$inferSelect;
export type InsertPasswordHistory = z.infer<typeof insertPasswordHistorySchema>;

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

// Security & Compliance Types
export type SecurityIncident = typeof securityIncidents.$inferSelect;
export type InsertSecurityIncident = z.infer<typeof insertSecurityIncidentSchema>;

export type CompliancePolicy = typeof compliancePolicies.$inferSelect;
export type InsertCompliancePolicy = z.infer<typeof insertCompliancePolicySchema>;

export type SecurityAssessment = typeof securityAssessments.$inferSelect;
export type InsertSecurityAssessment = z.infer<typeof insertSecurityAssessmentSchema>;

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;

export type SecurityConfiguration = typeof securityConfigurations.$inferSelect;
export type InsertSecurityConfiguration = z.infer<typeof insertSecurityConfigurationSchema>;

export type ComplianceReport = typeof complianceReports.$inferSelect;
export type InsertComplianceReport = z.infer<typeof insertComplianceReportSchema>;

// Network Topology Types
export type NetworkSegment = typeof networkSegments.$inferSelect;
export type InsertNetworkSegment = z.infer<typeof insertNetworkSegmentSchema>;

export type DeviceConnection = typeof deviceConnections.$inferSelect;
export type InsertDeviceConnection = z.infer<typeof insertDeviceConnectionSchema>;

export type TopologySnapshot = typeof topologySnapshots.$inferSelect;
export type InsertTopologySnapshot = z.infer<typeof insertTopologySnapshotSchema>;

// Extended types for API responses
export type TopologyData = {
  nodes: (Device & {
    segment?: NetworkSegment;
    activeDeployment?: Deployment;
  })[];
  edges: DeviceConnection[];
  segments: NetworkSegment[];
};
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
