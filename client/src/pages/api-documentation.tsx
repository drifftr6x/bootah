import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface ApiEndpoint {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  description: string;
  auth: boolean;
  body?: string;
  response?: string;
  example?: string;
}

const endpoints: ApiEndpoint[] = [
  // Auth - Configuration
  {
    path: "/api/auth/config",
    method: "GET",
    description: "Get authentication mode configuration",
    auth: false,
  },
  {
    path: "/api/auth/setup-required",
    method: "GET",
    description: "Check if initial setup is required (local auth mode)",
    auth: false,
  },
  {
    path: "/api/auth/user",
    method: "GET",
    description: "Get current authenticated user",
    auth: true,
  },
  {
    path: "/api/auth/logout",
    method: "POST",
    description: "Logout current user",
    auth: true,
  },
  {
    path: "/api/auth/login",
    method: "POST",
    description: "Login with username and password (local auth mode)",
    auth: false,
    body: '{"username": "admin", "password": "password123"}',
  },
  {
    path: "/api/auth/register",
    method: "POST",
    description: "Register new user (local auth mode)",
    auth: false,
    body: '{"username": "newuser", "password": "password123", "email": "user@example.com"}',
  },
  {
    path: "/api/auth/forgot-password",
    method: "POST",
    description: "Request password reset email",
    auth: false,
    body: '{"email": "user@example.com"}',
  },
  {
    path: "/api/auth/reset-password",
    method: "POST",
    description: "Reset password with token",
    auth: false,
    body: '{"token": "reset-token", "newPassword": "newPassword123"}',
  },
  {
    path: "/api/auth/setup",
    method: "POST",
    description: "Create initial admin account (first-time setup)",
    auth: false,
    body: '{"username": "admin", "password": "password123", "email": "admin@example.com"}',
  },

  // Devices
  {
    path: "/api/devices",
    method: "GET",
    description: "Get all discovered devices",
    auth: true,
  },
  {
    path: "/api/devices/:id",
    method: "GET",
    description: "Get device by ID",
    auth: true,
  },
  {
    path: "/api/devices",
    method: "POST",
    description: "Create new device",
    auth: true,
    body: '{"macAddress": "00:11:22:33:44:55", "hostname": "device-name"}',
  },
  {
    path: "/api/devices/:id",
    method: "PUT",
    description: "Update device details",
    auth: true,
    body: '{"hostname": "new-name", "tags": ["group1"]}',
  },
  {
    path: "/api/devices/:id",
    method: "DELETE",
    description: "Delete device",
    auth: true,
  },
  {
    path: "/api/devices/:id/wake",
    method: "POST",
    description: "Send Wake-on-LAN magic packet to device",
    auth: true,
  },
  {
    path: "/api/devices/by-mac/:macAddress",
    method: "GET",
    description: "Get device by MAC address (for PXE clients)",
    auth: false,
  },
  {
    path: "/api/devices/by-mac/:macAddress/commands",
    method: "GET",
    description: "Get pending commands for device (capture, deploy)",
    auth: false,
  },
  {
    path: "/api/devices/by-mac/:macAddress/deployment",
    method: "GET",
    description: "Get active deployment for device",
    auth: false,
  },

  // Device Groups
  {
    path: "/api/device-groups",
    method: "GET",
    description: "Get all device groups",
    auth: true,
  },
  {
    path: "/api/device-groups/:id",
    method: "GET",
    description: "Get device group by ID",
    auth: true,
  },
  {
    path: "/api/device-groups",
    method: "POST",
    description: "Create new device group",
    auth: true,
    body: '{"name": "Lab Computers", "color": "#3B82F6", "description": "Devices in the lab"}',
  },
  {
    path: "/api/device-groups/:id",
    method: "PUT",
    description: "Update device group",
    auth: true,
    body: '{"name": "Updated Name", "color": "#EF4444"}',
  },
  {
    path: "/api/device-groups/:id",
    method: "DELETE",
    description: "Delete device group",
    auth: true,
  },
  {
    path: "/api/device-groups/:groupId/devices",
    method: "GET",
    description: "Get all devices in a group",
    auth: true,
  },

  // Images
  {
    path: "/api/images",
    method: "GET",
    description: "Get all OS images",
    auth: true,
  },
  {
    path: "/api/images/:id",
    method: "GET",
    description: "Get image by ID",
    auth: true,
  },
  {
    path: "/api/images",
    method: "POST",
    description: "Create new image",
    auth: true,
    body: '{"name": "Ubuntu 22.04", "imagingEngine": "clonezilla"}',
  },
  {
    path: "/api/images/:id",
    method: "PUT",
    description: "Update image details",
    auth: true,
    body: '{"name": "Ubuntu 22.04 LTS", "description": "Updated description"}',
  },
  {
    path: "/api/images/:id",
    method: "DELETE",
    description: "Delete image",
    auth: true,
  },
  {
    path: "/api/images/capture",
    method: "POST",
    description: "Start image capture from device",
    auth: true,
    body: '{"deviceId": "uuid", "sourceDevice": "/dev/sda", "imageName": "My Image", "compression": "gzip"}',
  },

  // Capture Jobs
  {
    path: "/api/capture/schedule",
    method: "POST",
    description: "Schedule a capture job",
    auth: true,
    body: '{"name": "Server Backup", "deviceId": "uuid", "sourceDevice": "/dev/sda"}',
  },
  {
    path: "/api/capture/jobs",
    method: "GET",
    description: "Get all capture jobs",
    auth: true,
  },

  // Deployments
  {
    path: "/api/deployments",
    method: "GET",
    description: "Get all deployments",
    auth: true,
  },
  {
    path: "/api/deployments/active",
    method: "GET",
    description: "Get active deployments only",
    auth: true,
  },
  {
    path: "/api/deployments/scheduled",
    method: "GET",
    description: "Get scheduled deployments",
    auth: true,
  },
  {
    path: "/api/deployments/:id",
    method: "GET",
    description: "Get deployment by ID",
    auth: true,
  },
  {
    path: "/api/deployments",
    method: "POST",
    description: "Create new deployment",
    auth: true,
    body: '{"deviceId": "uuid", "imageId": "uuid", "scheduleType": "instant"}',
  },
  {
    path: "/api/deployments/:id",
    method: "PUT",
    description: "Update deployment",
    auth: true,
    body: '{"status": "completed", "progress": 100}',
  },
  {
    path: "/api/deployments/:id",
    method: "DELETE",
    description: "Delete deployment",
    auth: true,
  },
  {
    path: "/api/deployments/:id/cancel-schedule",
    method: "PATCH",
    description: "Cancel a scheduled deployment",
    auth: true,
  },
  {
    path: "/api/deployments/execute",
    method: "POST",
    description: "Execute deployment (start actual imaging process)",
    auth: true,
    body: '{"deploymentId": "uuid", "imageId": "uuid", "targetDevice": "/dev/sda"}',
  },
  {
    path: "/api/deployments/:deploymentId/task-runs",
    method: "GET",
    description: "Get post-deployment task runs for deployment",
    auth: true,
  },
  {
    path: "/api/deployments/:deploymentId/profiles",
    method: "GET",
    description: "Get post-deployment profile bindings for deployment",
    auth: true,
  },
  {
    path: "/api/deployments/:deploymentId/profiles",
    method: "POST",
    description: "Bind post-deployment profile to deployment",
    auth: true,
    body: '{"profileId": "uuid"}',
  },

  // Multicast Sessions
  {
    path: "/api/multicast/sessions",
    method: "GET",
    description: "Get all multicast sessions",
    auth: true,
  },
  {
    path: "/api/multicast/sessions/:id",
    method: "GET",
    description: "Get multicast session by ID",
    auth: true,
  },
  {
    path: "/api/multicast/sessions",
    method: "POST",
    description: "Create new multicast session",
    auth: true,
    body: '{"imageId": "uuid", "sessionName": "Lab Deploy", "maxClients": 20}',
  },
  {
    path: "/api/multicast/sessions/:id",
    method: "PATCH",
    description: "Update multicast session status",
    auth: true,
    body: '{"status": "active"}',
  },
  {
    path: "/api/multicast/sessions/:id",
    method: "DELETE",
    description: "Delete multicast session",
    auth: true,
  },
  {
    path: "/api/multicast/sessions/:id/participants",
    method: "GET",
    description: "Get participants in multicast session",
    auth: true,
  },
  {
    path: "/api/multicast/sessions/:id/participants",
    method: "POST",
    description: "Add participant to multicast session",
    auth: true,
    body: '{"deviceId": "uuid"}',
  },

  // Templates
  {
    path: "/api/templates",
    method: "GET",
    description: "Get deployment templates",
    auth: true,
  },
  {
    path: "/api/templates/:id",
    method: "GET",
    description: "Get template by ID",
    auth: true,
  },
  {
    path: "/api/templates",
    method: "POST",
    description: "Create template",
    auth: true,
    body: '{"name": "Template Name", "imageId": "uuid"}',
  },
  {
    path: "/api/templates/:id",
    method: "PUT",
    description: "Update template",
    auth: true,
    body: '{"name": "Updated Name", "description": "New description"}',
  },
  {
    path: "/api/templates/:id",
    method: "DELETE",
    description: "Delete template",
    auth: true,
  },
  {
    path: "/api/templates/:id/duplicate",
    method: "POST",
    description: "Duplicate template",
    auth: true,
    body: '{"name": "Template Copy"}',
  },

  // Post-Deployment Profiles
  {
    path: "/api/post-deployment/profiles",
    method: "GET",
    description: "Get post-deployment profiles",
    auth: true,
  },
  {
    path: "/api/post-deployment/profiles/:id",
    method: "GET",
    description: "Get post-deployment profile by ID",
    auth: true,
  },
  {
    path: "/api/post-deployment/profiles",
    method: "POST",
    description: "Create post-deployment profile",
    auth: true,
    body: '{"name": "Profile Name", "configuration": {}}',
  },
  {
    path: "/api/post-deployment/profiles/:id",
    method: "PUT",
    description: "Update post-deployment profile",
    auth: true,
  },
  {
    path: "/api/post-deployment/profiles/:id",
    method: "DELETE",
    description: "Delete post-deployment profile",
    auth: true,
  },
  {
    path: "/api/post-deployment/profiles/:profileId/tasks",
    method: "GET",
    description: "Get tasks for a profile",
    auth: true,
  },
  {
    path: "/api/post-deployment/profiles/:profileId/tasks",
    method: "POST",
    description: "Add task to profile",
    auth: true,
    body: '{"name": "Install Updates", "taskType": "script", "configuration": {}}',
  },

  // Post-Deployment Tasks
  {
    path: "/api/post-deployment/tasks/:id",
    method: "GET",
    description: "Get post-deployment task by ID",
    auth: true,
  },
  {
    path: "/api/post-deployment/tasks/:id",
    method: "PATCH",
    description: "Update post-deployment task",
    auth: true,
  },
  {
    path: "/api/post-deployment/tasks/:id",
    method: "DELETE",
    description: "Delete post-deployment task",
    auth: true,
  },
  {
    path: "/api/task-runs/:id",
    method: "GET",
    description: "Get task run by ID",
    auth: true,
  },
  {
    path: "/api/profile-deployment-bindings/:id",
    method: "PATCH",
    description: "Update profile deployment binding",
    auth: true,
  },

  // Post-Deployment Snapins
  {
    path: "/api/post-deployment/snapins",
    method: "GET",
    description: "Get snapin packages",
    auth: true,
  },
  {
    path: "/api/post-deployment/snapins/:id",
    method: "GET",
    description: "Get snapin by ID",
    auth: true,
  },
  {
    path: "/api/post-deployment/snapins",
    method: "POST",
    description: "Create snapin package",
    auth: true,
    body: '{"name": "Chrome Installer", "packageType": "msi", "silentArgs": "/quiet"}',
  },
  {
    path: "/api/post-deployment/snapins/:id",
    method: "PUT",
    description: "Update snapin package",
    auth: true,
  },
  {
    path: "/api/post-deployment/snapins/:id",
    method: "DELETE",
    description: "Delete snapin package",
    auth: true,
  },

  // Post-Deployment Hostname Patterns
  {
    path: "/api/post-deployment/hostname-patterns",
    method: "GET",
    description: "Get hostname patterns",
    auth: true,
  },
  {
    path: "/api/post-deployment/hostname-patterns/:id",
    method: "GET",
    description: "Get hostname pattern by ID",
    auth: true,
  },
  {
    path: "/api/post-deployment/hostname-patterns",
    method: "POST",
    description: "Create hostname pattern",
    auth: true,
    body: '{"name": "Lab Pattern", "pattern": "LAB-PC-{seq:4}"}',
  },
  {
    path: "/api/post-deployment/hostname-patterns/:id",
    method: "PUT",
    description: "Update hostname pattern",
    auth: true,
  },
  {
    path: "/api/post-deployment/hostname-patterns/:id",
    method: "DELETE",
    description: "Delete hostname pattern",
    auth: true,
  },

  // Post-Deployment Domain Join
  {
    path: "/api/post-deployment/domain-configs",
    method: "GET",
    description: "Get domain join configurations",
    auth: true,
  },
  {
    path: "/api/post-deployment/domain-configs/:id",
    method: "GET",
    description: "Get domain config by ID",
    auth: true,
  },
  {
    path: "/api/post-deployment/domain-configs",
    method: "POST",
    description: "Create domain join configuration",
    auth: true,
    body: '{"name": "Corp Domain", "domain": "corp.local", "ouPath": "OU=Computers"}',
  },
  {
    path: "/api/post-deployment/domain-configs/:id",
    method: "PUT",
    description: "Update domain configuration",
    auth: true,
  },
  {
    path: "/api/post-deployment/domain-configs/:id",
    method: "DELETE",
    description: "Delete domain configuration",
    auth: true,
  },

  // Post-Deployment Product Keys
  {
    path: "/api/post-deployment/product-keys",
    method: "GET",
    description: "Get product keys",
    auth: true,
  },
  {
    path: "/api/post-deployment/product-keys/:id",
    method: "GET",
    description: "Get product key by ID",
    auth: true,
  },
  {
    path: "/api/post-deployment/product-keys",
    method: "POST",
    description: "Create product key",
    auth: true,
    body: '{"name": "Windows 11 Pro", "productType": "windows", "keyType": "mak"}',
  },
  {
    path: "/api/post-deployment/product-keys/:id",
    method: "PUT",
    description: "Update product key",
    auth: true,
  },
  {
    path: "/api/post-deployment/product-keys/:id",
    method: "DELETE",
    description: "Delete product key",
    auth: true,
  },

  // Post-Deployment Custom Scripts
  {
    path: "/api/post-deployment/custom-scripts",
    method: "GET",
    description: "Get custom scripts",
    auth: true,
  },
  {
    path: "/api/post-deployment/custom-scripts/:id",
    method: "GET",
    description: "Get custom script by ID",
    auth: true,
  },
  {
    path: "/api/post-deployment/custom-scripts",
    method: "POST",
    description: "Create custom script",
    auth: true,
    body: '{"name": "Cleanup Script", "scriptType": "powershell", "content": "..."}',
  },
  {
    path: "/api/post-deployment/custom-scripts/:id",
    method: "PUT",
    description: "Update custom script",
    auth: true,
  },
  {
    path: "/api/post-deployment/custom-scripts/:id",
    method: "DELETE",
    description: "Delete custom script",
    auth: true,
  },

  // FOG Integration
  {
    path: "/api/fog/status",
    method: "GET",
    description: "Get FOG server connection status",
    auth: true,
  },
  {
    path: "/api/fog/sync-images",
    method: "POST",
    description: "Sync images from FOG server",
    auth: true,
  },
  {
    path: "/api/fog/sync-hosts",
    method: "POST",
    description: "Sync hosts from FOG server",
    auth: true,
  },
  {
    path: "/api/fog/tasks",
    method: "GET",
    description: "Get FOG tasks",
    auth: true,
  },
  {
    path: "/api/fog/tasks",
    method: "POST",
    description: "Create FOG deployment task",
    auth: true,
    body: '{"hostId": "fog-host-id", "imageId": "fog-image-id", "taskType": "deploy"}',
  },
  {
    path: "/api/fog/tasks/:id",
    method: "DELETE",
    description: "Cancel FOG task",
    auth: true,
  },

  // PXE Monitoring
  {
    path: "/api/pxe/devices",
    method: "GET",
    description: "Get devices detected via PXE traffic monitoring",
    auth: true,
  },
  {
    path: "/api/pxe/devices/:mac",
    method: "GET",
    description: "Get PXE device details by MAC address",
    auth: true,
  },

  // Imaging Operations
  {
    path: "/api/imaging/operations",
    method: "GET",
    description: "Get active imaging operations",
    auth: true,
  },
  {
    path: "/api/imaging/operations/:operationId",
    method: "DELETE",
    description: "Cancel imaging operation",
    auth: true,
  },

  // System
  {
    path: "/api/system/info",
    method: "GET",
    description: "Get system information for imaging",
    auth: true,
  },

  // Network
  {
    path: "/api/network/topology",
    method: "GET",
    description: "Get network topology",
    auth: true,
  },
  {
    path: "/api/network/discovery",
    method: "GET",
    description: "Get network discovery results",
    auth: true,
  },
  {
    path: "/api/network/scan",
    method: "POST",
    description: "Start network scan",
    auth: true,
    body: '{"subnet": "192.168.1.0/24"}',
  },

  // Server Status
  {
    path: "/api/server-status",
    method: "GET",
    description: "Get PXE server status",
    auth: true,
  },
  {
    path: "/api/server-status",
    method: "PUT",
    description: "Update server configuration",
    auth: true,
    body: '{"tftpEnabled": true, "httpEnabled": true}',
  },

  // Activity/Logs
  {
    path: "/api/activity",
    method: "GET",
    description: "Get activity logs",
    auth: true,
  },
  {
    path: "/api/activity",
    method: "POST",
    description: "Create activity log entry",
    auth: true,
    body: '{"type": "info", "message": "Custom log entry"}',
  },

  // Dashboard
  {
    path: "/api/dashboard/stats",
    method: "GET",
    description: "Get dashboard statistics",
    auth: true,
  },

  // RBAC - Roles
  {
    path: "/api/rbac/roles",
    method: "GET",
    description: "Get all roles",
    auth: true,
  },
  {
    path: "/api/rbac/roles/:id",
    method: "GET",
    description: "Get role by ID",
    auth: true,
  },
  {
    path: "/api/rbac/roles",
    method: "POST",
    description: "Create new role",
    auth: true,
    body: '{"name": "operator", "description": "Operator role"}',
  },
  {
    path: "/api/rbac/roles/:id",
    method: "PUT",
    description: "Update role",
    auth: true,
  },
  {
    path: "/api/rbac/roles/:id",
    method: "DELETE",
    description: "Delete role",
    auth: true,
  },

  // RBAC - Permissions
  {
    path: "/api/rbac/permissions",
    method: "GET",
    description: "Get all permissions",
    auth: true,
  },
  {
    path: "/api/rbac/roles/:roleId/permissions",
    method: "GET",
    description: "Get permissions for a role",
    auth: true,
  },
  {
    path: "/api/rbac/roles/:roleId/permissions",
    method: "POST",
    description: "Assign permission to role",
    auth: true,
    body: '{"permissionId": "uuid"}',
  },
  {
    path: "/api/rbac/roles/:roleId/permissions/:permissionId",
    method: "DELETE",
    description: "Remove permission from role",
    auth: true,
  },

  // RBAC - User Roles
  {
    path: "/api/rbac/users/:userId/roles",
    method: "GET",
    description: "Get roles for a user",
    auth: true,
  },
  {
    path: "/api/rbac/users/:userId/roles",
    method: "POST",
    description: "Assign role to user",
    auth: true,
    body: '{"roleId": "uuid"}',
  },
  {
    path: "/api/rbac/users/:userId/roles/:roleId",
    method: "DELETE",
    description: "Remove role from user",
    auth: true,
  },

  // Alerts
  {
    path: "/api/alerts",
    method: "GET",
    description: "Get all alerts",
    auth: true,
  },
  {
    path: "/api/alerts/:id",
    method: "GET",
    description: "Get alert by ID",
    auth: true,
  },
  {
    path: "/api/alerts",
    method: "POST",
    description: "Create alert",
    auth: true,
    body: '{"type": "warning", "message": "Alert message"}',
  },
  {
    path: "/api/alerts/:id/acknowledge",
    method: "POST",
    description: "Acknowledge alert",
    auth: true,
  },
  {
    path: "/api/alerts/:id",
    method: "DELETE",
    description: "Delete alert",
    auth: true,
  },

  // Alert Rules
  {
    path: "/api/alert-rules",
    method: "GET",
    description: "Get alert rules",
    auth: true,
  },
  {
    path: "/api/alert-rules",
    method: "POST",
    description: "Create alert rule",
    auth: true,
    body: '{"name": "Deployment Failed", "condition": {...}, "actions": [...]}',
  },
  {
    path: "/api/alert-rules/:id",
    method: "PUT",
    description: "Update alert rule",
    auth: true,
  },
  {
    path: "/api/alert-rules/:id",
    method: "DELETE",
    description: "Delete alert rule",
    auth: true,
  },

  // Metrics
  {
    path: "/api/metrics",
    method: "GET",
    description: "Get system metrics",
    auth: true,
  },
  {
    path: "/api/metrics",
    method: "POST",
    description: "Record system metrics",
    auth: true,
    body: '{"cpuUsage": 45.2, "memoryUsage": 67.8, "diskUsage": 23.1}',
  },

  // Audit Logs
  {
    path: "/api/audit-logs",
    method: "GET",
    description: "Get audit logs",
    auth: true,
  },
];

const methodColors = {
  GET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  POST: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PUT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  PATCH: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-muted transition-colors"
      data-testid="button-copy-endpoint"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          Copy
        </>
      )}
    </button>
  );
}

export default function ApiDocumentation() {
  const groupedEndpoints = endpoints.reduce(
    (acc, endpoint) => {
      const group = endpoint.path.split("/")[2] || "auth";
      if (!acc[group]) acc[group] = [];
      acc[group].push(endpoint);
      return acc;
    },
    {} as Record<string, ApiEndpoint[]>
  );

  return (
    <>
      <Header
        title="API Documentation"
        description="Backend API endpoints and integration guide"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Base URL</h3>
                <code className="bg-muted p-2 rounded text-sm">
                  http://localhost:5000/api
                </code>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Most endpoints require session-based authentication. Login through the web
                  interface or use the /api/auth/login endpoint (local auth mode) to establish a session.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Request Format</h3>
                <code className="bg-muted p-2 rounded text-sm block">
                  {`Content-Type: application/json
Authorization: Cookie (session-based)`}
                </code>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Authentication Modes</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Bootah supports two authentication modes configured via the AUTH_MODE environment variable:
                </p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  <li><strong>replit</strong> - OAuth-based authentication (default for Replit deployments)</li>
                  <li><strong>local</strong> - Username/password authentication for self-hosted deployments</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* API Endpoints by Category */}
          {Object.entries(groupedEndpoints).map(([group, endpointList]) => (
            <div key={group}>
              <h2 className="text-2xl font-bold capitalize mb-4">{group.replace(/-/g, ' ')}</h2>
              <div className="space-y-4">
                {endpointList.map((endpoint, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={methodColors[endpoint.method]}>
                              {endpoint.method}
                            </Badge>
                            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                              {endpoint.path}
                            </code>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {endpoint.description}
                          </p>
                          {endpoint.auth && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-500 mt-1 inline-block">
                              Requires authentication
                            </span>
                          )}
                        </div>
                        <CopyButton text={endpoint.path} />
                      </div>

                      {endpoint.body && (
                        <div>
                          <h4 className="text-xs font-semibold mb-2">Request Body</h4>
                          <code className="bg-muted p-2 rounded text-xs block overflow-x-auto">
                            {endpoint.body}
                          </code>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Status Codes */}
          <Card>
            <CardHeader>
              <CardTitle>Response Codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">200 OK</span>
                <span className="text-muted-foreground">Successful request</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">201 Created</span>
                <span className="text-muted-foreground">Resource created</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">204 No Content</span>
                <span className="text-muted-foreground">Successful deletion</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">304 Not Modified</span>
                <span className="text-muted-foreground">Cache hit</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">400 Bad Request</span>
                <span className="text-muted-foreground">Invalid request format or validation error</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">401 Unauthorized</span>
                <span className="text-muted-foreground">Authentication required</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">403 Forbidden</span>
                <span className="text-muted-foreground">Insufficient permissions</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">404 Not Found</span>
                <span className="text-muted-foreground">Resource not found</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">409 Conflict</span>
                <span className="text-muted-foreground">Resource conflict (e.g., duplicate entry)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">500 Server Error</span>
                <span className="text-muted-foreground">Internal server error</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
