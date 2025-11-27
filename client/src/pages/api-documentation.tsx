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
  // Auth
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

  // Devices
  {
    path: "/api/devices",
    method: "GET",
    description: "Get all discovered devices",
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

  // Images
  {
    path: "/api/images",
    method: "GET",
    description: "Get all OS images",
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
    method: "DELETE",
    description: "Delete image",
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
    path: "/api/deployments",
    method: "POST",
    description: "Start new deployment",
    auth: true,
    body: '{"deviceId": "uuid", "imageId": "uuid"}',
  },
  {
    path: "/api/deployments/:id/cancel",
    method: "POST",
    description: "Cancel deployment",
    auth: true,
  },

  // Scheduled Deployments
  {
    path: "/api/scheduled-deployments",
    method: "GET",
    description: "Get scheduled deployments",
    auth: true,
  },
  {
    path: "/api/scheduled-deployments",
    method: "POST",
    description: "Create scheduled deployment",
    auth: true,
    body: '{"deviceId": "uuid", "imageId": "uuid", "scheduledTime": "2025-12-31T10:00:00Z"}',
  },
  {
    path: "/api/scheduled-deployments/:id",
    method: "DELETE",
    description: "Delete scheduled deployment",
    auth: true,
  },

  // Multicast Sessions
  {
    path: "/api/multicast-sessions",
    method: "GET",
    description: "Get multicast sessions",
    auth: true,
  },
  {
    path: "/api/multicast-sessions",
    method: "POST",
    description: "Create multicast session",
    auth: true,
    body: '{"imageId": "uuid", "deviceIds": ["uuid1", "uuid2"]}',
  },
  {
    path: "/api/multicast-sessions/:id/cancel",
    method: "POST",
    description: "Cancel multicast session",
    auth: true,
  },

  // Templates
  {
    path: "/api/templates",
    method: "GET",
    description: "Get deployment templates",
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
  },
  {
    path: "/api/templates/:id",
    method: "DELETE",
    description: "Delete template",
    auth: true,
  },

  // Post-Deployment
  {
    path: "/api/post-deployment/profiles",
    method: "GET",
    description: "Get post-deployment profiles",
    auth: true,
  },
  {
    path: "/api/post-deployment/profiles",
    method: "POST",
    description: "Create profile",
    auth: true,
    body: '{"name": "Profile Name", "configuration": {}}',
  },
  {
    path: "/api/post-deployment/snapins",
    method: "GET",
    description: "Get snapins",
    auth: true,
  },
  {
    path: "/api/post-deployment/snapins",
    method: "POST",
    description: "Create snapin",
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
  },

  // Activity/Logs
  {
    path: "/api/activity",
    method: "GET",
    description: "Get activity logs",
    auth: true,
  },
  {
    path: "/api/dashboard/stats",
    method: "GET",
    description: "Get dashboard statistics",
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
                  All endpoints require session-based authentication. Login through the web
                  interface to establish a session.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Request Format</h3>
                <code className="bg-muted p-2 rounded text-sm block">
                  {`Content-Type: application/json
Authorization: Cookie (session-based)`}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* API Endpoints by Category */}
          {Object.entries(groupedEndpoints).map(([group, endpointList]) => (
            <div key={group}>
              <h2 className="text-2xl font-bold capitalize mb-4">{group}</h2>
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
                              🔒 Requires authentication
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
                <span className="font-semibold">304 Not Modified</span>
                <span className="text-muted-foreground">Cache hit</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">400 Bad Request</span>
                <span className="text-muted-foreground">Invalid request format</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">401 Unauthorized</span>
                <span className="text-muted-foreground">Authentication required</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">404 Not Found</span>
                <span className="text-muted-foreground">Resource not found</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">500 Server Error</span>
                <span className="text-muted-foreground">Server error occurred</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
