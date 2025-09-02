import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import type { ServerStatus } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ServiceStatus {
  name: string;
  key: keyof Pick<ServerStatus, 'pxeServerStatus' | 'tftpServerStatus' | 'httpServerStatus' | 'dhcpProxyStatus'>;
  endpoint: string;
}

const services: ServiceStatus[] = [
  { name: "PXE Server", key: "pxeServerStatus", endpoint: "192.168.1.100:67" },
  { name: "TFTP Server", key: "tftpServerStatus", endpoint: "192.168.1.100:69" },
  { name: "HTTP Server", key: "httpServerStatus", endpoint: "192.168.1.100:80" },
  { name: "DHCP Proxy", key: "dhcpProxyStatus", endpoint: "Listening" },
];

export default function NetworkStatus() {
  const { data: serverStatus, isLoading } = useQuery<ServerStatus>({
    queryKey: ["/api/server-status"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Network Status</h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Network Status</h3>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {services.map((service) => {
          const isOnline = serverStatus?.[service.key] ?? false;
          
          return (
            <div key={service.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span 
                  className={cn(
                    "status-indicator",
                    isOnline ? "status-online" : "status-offline"
                  )}
                />
                <span className="text-sm text-foreground" data-testid={`text-service-${service.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  {service.name}
                </span>
              </div>
              <span className="text-sm text-secondary" data-testid={`text-endpoint-${service.name.toLowerCase().replace(/\s+/g, "-")}`}>
                {service.endpoint}
              </span>
            </div>
          );
        })}
        
        {serverStatus && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Network Traffic</span>
              <span className="text-sm text-foreground" data-testid="text-network-traffic">
                {serverStatus.networkTraffic.toFixed(1)} MB/s
              </span>
            </div>
            <Progress 
              value={Math.min((serverStatus.networkTraffic / 10) * 100, 100)} 
              className="h-2"
              data-testid="progress-network-utilization"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
