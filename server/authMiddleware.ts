import { Request, Response, NextFunction } from "express";
import { getUserPermissions, userHasRole } from "./rbacSeed";

/**
 * Permission cache stored in session
 * Format: { userId: { permissions: string[], cachedAt: number } }
 * Note: cachedAt is stored as timestamp (number) to avoid Date serialization issues
 */
interface PermissionCache {
  permissions: string[];
  cachedAt: number; // Unix timestamp in milliseconds
}

/**
 * Cache duration: 5 minutes
 */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/**
 * Get cached permissions from session or fetch fresh
 */
async function getCachedPermissions(userId: string, req: Request): Promise<string[]> {
  const session = req.session as any;
  const cache = session.permissionCache as Record<string, PermissionCache> | undefined;

  // Check if cache exists and is fresh
  if (cache && cache[userId]) {
    const cached = cache[userId];
    const age = Date.now() - cached.cachedAt;
    
    if (age < CACHE_DURATION_MS) {
      return cached.permissions;
    }
  }

  // Fetch fresh permissions
  const permissions = await getUserPermissions(userId);

  // Store in session cache with timestamp
  if (!session.permissionCache) {
    session.permissionCache = {};
  }
  session.permissionCache[userId] = {
    permissions,
    cachedAt: Date.now(), // Store as number to avoid Date serialization issues
  };

  return permissions;
}

/**
 * Invalidate permission cache for a user
 * Call this when user roles or permissions change
 */
export function invalidatePermissionCache(req: Request, userId: string): void {
  const session = req.session as any;
  if (session.permissionCache && session.permissionCache[userId]) {
    delete session.permissionCache[userId];
  }
}

/**
 * Middleware to require a specific role
 * Usage: app.get('/admin', requireRole('admin'), handler)
 */
export function requireRole(...roleNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      
      if (!user || !user.claims || !user.claims.sub) {
        return res.status(401).json({ message: "Unauthorized: No authenticated user" });
      }

      const userId = user.claims.sub;

      // Check if user has any of the required roles
      const hasRole = await Promise.all(
        roleNames.map(roleName => userHasRole(userId, roleName))
      );

      if (hasRole.some(result => result)) {
        return next(); // User has at least one required role
      }

      return res.status(403).json({ 
        message: `Forbidden: Required role (${roleNames.join(" or ")}) not found`,
        requiredRoles: roleNames,
      });
    } catch (error) {
      console.error("Error in requireRole middleware:", error);
      return res.status(500).json({ message: "Internal server error during authorization" });
    }
  };
}

/**
 * Middleware to require a specific permission
 * Usage: app.post('/devices', requirePermission('devices', 'create'), handler)
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      
      if (!user || !user.claims || !user.claims.sub) {
        return res.status(401).json({ message: "Unauthorized: No authenticated user" });
      }

      const userId = user.claims.sub;
      const permissionName = `${resource}:${action}`;

      // Get cached permissions
      const userPermissions = await getCachedPermissions(userId, req);

      if (userPermissions.includes(permissionName)) {
        return next(); // User has the required permission
      }

      return res.status(403).json({ 
        message: `Forbidden: Required permission (${permissionName}) not found`,
        requiredPermission: permissionName,
      });
    } catch (error) {
      console.error("Error in requirePermission middleware:", error);
      return res.status(500).json({ message: "Internal server error during authorization" });
    }
  };
}

/**
 * Middleware to require any one of multiple permissions
 * Usage: app.put('/item/:id', requireAnyPermission([['items', 'update'], ['items', 'admin']]), handler)
 */
export function requireAnyPermission(permissionPairs: [string, string][]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      
      if (!user || !user.claims || !user.claims.sub) {
        return res.status(401).json({ message: "Unauthorized: No authenticated user" });
      }

      const userId = user.claims.sub;

      // Get cached permissions
      const userPermissions = await getCachedPermissions(userId, req);

      // Check if user has any of the required permissions
      const hasPermission = permissionPairs.some(([resource, action]) => {
        const permissionName = `${resource}:${action}`;
        return userPermissions.includes(permissionName);
      });

      if (hasPermission) {
        return next(); // User has at least one required permission
      }

      const permissionNames = permissionPairs.map(([r, a]) => `${r}:${a}`);
      return res.status(403).json({ 
        message: `Forbidden: Required permission (${permissionNames.join(" or ")}) not found`,
        requiredPermissions: permissionNames,
      });
    } catch (error) {
      console.error("Error in requireAnyPermission middleware:", error);
      return res.status(500).json({ message: "Internal server error during authorization" });
    }
  };
}

/**
 * Helper to check if current user has a permission (for use in route handlers)
 */
export async function checkPermission(req: Request, resource: string, action: string): Promise<boolean> {
  try {
    const user = req.user as any;
    if (!user || !user.claims || !user.claims.sub) {
      return false;
    }

    const userId = user.claims.sub;
    const permissionName = `${resource}:${action}`;
    const userPermissions = await getCachedPermissions(userId, req);

    return userPermissions.includes(permissionName);
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Helper to check if current user has a role (for use in route handlers)
 */
export async function checkRole(req: Request, roleName: string): Promise<boolean> {
  try {
    const user = req.user as any;
    if (!user || !user.claims || !user.claims.sub) {
      return false;
    }

    const userId = user.claims.sub;
    return await userHasRole(userId, roleName);
  } catch (error) {
    console.error("Error checking role:", error);
    return false;
  }
}
