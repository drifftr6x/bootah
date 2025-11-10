import { db } from "./db";
import { roles, permissions, rolePermissions, users, userRoles } from "@shared/schema";
import { eq, sql, asc } from "drizzle-orm";

/**
 * Define system roles and their permissions
 */
const SYSTEM_ROLES = {
  admin: {
    name: "admin",
    description: "Full system access with all permissions",
    isSystemRole: true,
  },
  operator: {
    name: "operator",
    description: "Can manage devices, images, and deployments but not users or system configuration",
    isSystemRole: true,
  },
  viewer: {
    name: "viewer",
    description: "Read-only access to view system status and logs",
    isSystemRole: true,
  },
};

/**
 * Define all permissions in the system
 * Format: resource:action
 */
const PERMISSIONS = [
  // Device permissions
  { name: "devices:create", resource: "devices", action: "create", description: "Create new devices" },
  { name: "devices:read", resource: "devices", action: "read", description: "View devices" },
  { name: "devices:update", resource: "devices", action: "update", description: "Update device information" },
  { name: "devices:delete", resource: "devices", action: "delete", description: "Delete devices" },
  
  // Image permissions
  { name: "images:create", resource: "images", action: "create", description: "Upload and create OS images" },
  { name: "images:read", resource: "images", action: "read", description: "View OS images" },
  { name: "images:update", resource: "images", action: "update", description: "Update image metadata" },
  { name: "images:delete", resource: "images", action: "delete", description: "Delete OS images" },
  
  // Deployment permissions
  { name: "deployments:create", resource: "deployments", action: "create", description: "Start new deployments" },
  { name: "deployments:read", resource: "deployments", action: "read", description: "View deployment status" },
  { name: "deployments:update", resource: "deployments", action: "update", description: "Modify deployment settings" },
  { name: "deployments:delete", resource: "deployments", action: "delete", description: "Cancel or delete deployments" },
  { name: "deployments:deploy", resource: "deployments", action: "deploy", description: "Execute PXE deployments" },
  
  // Multicast permissions
  { name: "multicast:create", resource: "multicast", action: "create", description: "Create multicast sessions" },
  { name: "multicast:read", resource: "multicast", action: "read", description: "View multicast sessions" },
  { name: "multicast:update", resource: "multicast", action: "update", description: "Modify multicast sessions" },
  { name: "multicast:delete", resource: "multicast", action: "delete", description: "Delete multicast sessions" },
  { name: "multicast:manage", resource: "multicast", action: "manage", description: "Start/stop multicast deployments" },
  
  // User permissions
  { name: "users:create", resource: "users", action: "create", description: "Create new users" },
  { name: "users:read", resource: "users", action: "read", description: "View user accounts" },
  { name: "users:update", resource: "users", action: "update", description: "Update user information" },
  { name: "users:delete", resource: "users", action: "delete", description: "Delete user accounts" },
  { name: "users:manage-roles", resource: "users", action: "manage-roles", description: "Assign and remove user roles" },
  
  // Configuration permissions
  { name: "configuration:read", resource: "configuration", action: "read", description: "View system configuration" },
  { name: "configuration:update", resource: "configuration", action: "update", description: "Modify system configuration" },
  
  // Template permissions
  { name: "templates:create", resource: "templates", action: "create", description: "Create deployment templates" },
  { name: "templates:read", resource: "templates", action: "read", description: "View deployment templates" },
  { name: "templates:update", resource: "templates", action: "update", description: "Modify deployment templates" },
  { name: "templates:delete", resource: "templates", action: "delete", description: "Delete deployment templates" },
  
  // Logs and monitoring
  { name: "logs:read", resource: "logs", action: "read", description: "View activity logs and audit trails" },
  { name: "monitoring:read", resource: "monitoring", action: "read", description: "View system metrics and monitoring" },
  
  // Security permissions
  { name: "security:read", resource: "security", action: "read", description: "View security settings" },
  { name: "security:update", resource: "security", action: "update", description: "Modify security configuration" },
];

/**
 * Define role-permission mappings
 */
const ROLE_PERMISSIONS = {
  admin: [
    // Admin has all permissions
    ...PERMISSIONS.map(p => p.name),
  ],
  operator: [
    // Devices
    "devices:create", "devices:read", "devices:update", "devices:delete",
    // Images
    "images:create", "images:read", "images:update", "images:delete",
    // Deployments
    "deployments:create", "deployments:read", "deployments:update", "deployments:delete", "deployments:deploy",
    // Multicast
    "multicast:create", "multicast:read", "multicast:update", "multicast:delete", "multicast:manage",
    // Templates
    "templates:create", "templates:read", "templates:update", "templates:delete",
    // Monitoring and logs (read-only)
    "logs:read", "monitoring:read", "security:read",
    // Configuration (read-only)
    "configuration:read",
  ],
  viewer: [
    // Read-only access
    "devices:read",
    "images:read",
    "deployments:read",
    "multicast:read",
    "templates:read",
    "logs:read",
    "monitoring:read",
    "configuration:read",
    "security:read",
  ],
};

/**
 * Initialize RBAC defaults (roles, permissions, and assignments)
 * This is idempotent - safe to call multiple times
 */
export async function initializeRbacDefaults(): Promise<void> {
  console.log("[RBAC] Initializing RBAC defaults...");

  try {
    // Check if roles already exist
    const existingRolesCount = await db.select({ count: sql<number>`count(*)` }).from(roles);
    const rolesExist = existingRolesCount[0]?.count > 0;

    if (rolesExist) {
      console.log("[RBAC] Roles already initialized, skipping seed");
      return;
    }

    // Create system roles
    console.log("[RBAC] Creating system roles...");
    const createdRoles = new Map<string, string>(); // name -> id

    for (const [key, roleData] of Object.entries(SYSTEM_ROLES)) {
      const [role] = await db
        .insert(roles)
        .values(roleData)
        .returning();
      createdRoles.set(key, role.id);
      console.log(`[RBAC] Created role: ${roleData.name}`);
    }

    // Create permissions
    console.log("[RBAC] Creating permissions...");
    const createdPermissions = new Map<string, string>(); // name -> id

    for (const permissionData of PERMISSIONS) {
      const [permission] = await db
        .insert(permissions)
        .values(permissionData)
        .returning();
      createdPermissions.set(permission.name, permission.id);
    }
    console.log(`[RBAC] Created ${PERMISSIONS.length} permissions`);

    // Assign permissions to roles
    console.log("[RBAC] Assigning permissions to roles...");
    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
      const roleId = createdRoles.get(roleName);
      if (!roleId) continue;

      for (const permissionName of permissionNames) {
        const permissionId = createdPermissions.get(permissionName);
        if (!permissionId) continue;

        await db
          .insert(rolePermissions)
          .values({ roleId, permissionId })
          .onConflictDoNothing();
      }
      console.log(`[RBAC] Assigned ${permissionNames.length} permissions to ${roleName}`);
    }

    // Assign admin role to first user (if any users exist)
    console.log("[RBAC] Checking for first user to assign admin role...");
    const firstUser = await db
      .select()
      .from(users)
      .orderBy(asc(users.createdAt))
      .limit(1);

    if (firstUser.length > 0) {
      const adminRoleId = createdRoles.get("admin");
      if (adminRoleId) {
        await db
          .insert(userRoles)
          .values({
            userId: firstUser[0].id,
            roleId: adminRoleId,
            assignedBy: null, // System assignment
          })
          .onConflictDoNothing();
        console.log(`[RBAC] Assigned admin role to first user: ${firstUser[0].email || firstUser[0].username}`);
      }
    }

    console.log("[RBAC] RBAC initialization complete");
  } catch (error) {
    console.error("[RBAC] Error initializing RBAC defaults:", error);
    throw error;
  }
}

/**
 * Get all permissions for a user (from all their assigned roles)
 * Used for permission caching
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const result = await db
    .select({ permissionName: permissions.name })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

  return result.map(r => r.permissionName);
}

/**
 * Check if a user has a specific permission
 */
export async function userHasPermission(userId: string, resource: string, action: string): Promise<boolean> {
  const permissionName = `${resource}:${action}`;
  const userPermissions = await getUserPermissions(userId);
  return userPermissions.includes(permissionName);
}

/**
 * Check if a user has a specific role
 */
export async function userHasRole(userId: string, roleName: string): Promise<boolean> {
  const result = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return result.some(r => r.roleName === roleName);
}
