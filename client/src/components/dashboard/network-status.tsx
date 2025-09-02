import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import type { ServerStatus } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Activity } from "lucide-react";

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
            <div key={service.name} className="flex items-center justify-between p-3 rounded-lg transition-all duration-300 hover:bg-muted/50">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {isOnline ? (
                    <Wifi className={cn(
                      "w-5 h-5 text-emerald-500 transition-all duration-500",
                      "animate-pulse"
                    )} />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-500" />
                  )}
                  {isOnline && (
                    <div className="absolute inset-0 w-5 h-5 bg-emerald-500/20 rounded-full animate-ping" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground" data-testid={`text-service-${service.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    {service.name}
                  </span>
                  <div className={cn(
                    "text-xs transition-all duration-300",
                    isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {isOnline ? "Connected" : "Disconnected"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm text-secondary" data-testid={`text-endpoint-${service.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  {service.endpoint}
                </span>
                {isOnline && (
                  <div className="flex items-center justify-end mt-1 space-x-1">
                    <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Active</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {serverStatus && (
          <div className="mt-6 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg transition-all duration-500 hover:shadow-lg hover:shadow-cyan-500/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-500 animate-pulse" />
                <span className="text-sm font-medium text-foreground">Network Traffic</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-cyan-500" data-testid="text-network-traffic">
                  {(serverStatus.networkTraffic || 0).toFixed(1)} MB/s
                </span>
                <div className="text-xs text-muted-foreground">Real-time</div>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={Math.min(((serverStatus.networkTraffic || 0) / 10) * 100, 100)} 
                className="h-3 bg-slate-200 dark:bg-slate-800"
                data-testid="progress-network-utilization"
              />
              <div className="absolute inset-0 h-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full animate-pulse" 
                   style={{ width: `${Math.min(((serverStatus.networkTraffic || 0) / 10) * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0 MB/s</span>
              <span>10 MB/s</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
