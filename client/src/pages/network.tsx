import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Device } from "@shared/schema";
import { Wifi, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Network() {
  const { data: devices, isLoading, refetch } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 5000, // Refresh every 5 seconds for network discovery
  });

  const onlineDevices = devices?.filter(device => device.status === "online") || [];
  const offlineDevices = devices?.filter(device => device.status === "offline") || [];
  const activeDevices = devices?.filter(device => 
    device.status === "deploying" || device.status === "idle"
  ) || [];

  const handleScan = () => {
    refetch();
  };

  return (
    <>
      <Header 
        title="Network Discovery" 
        description="Discover and monitor network devices for PXE booting" 
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        {/* Network Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online Devices</p>
                  <p className="text-3xl font-bold text-secondary" data-testid="stat-online-devices">
                    {onlineDevices.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <Wifi className="w-6 h-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Devices</p>
                  <p className="text-3xl font-bold text-primary" data-testid="stat-active-devices">
                    {activeDevices.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Wifi className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Offline Devices</p>
                  <p className="text-3xl font-bold text-muted-foreground" data-testid="stat-offline-devices">
                    {offlineDevices.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center">
                  <WifiOff className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Network Scan */}
        <Card className="mb-6">
          <CardHeader className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Network Discovery</h3>
              <Button onClick={handleScan} disabled={isLoading} data-testid="button-scan-network">
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                {isLoading ? "Scanning..." : "Scan Network"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Automatically discover PXE-capable devices on the network. Devices will appear below as they are detected.
            </p>
          </CardContent>
        </Card>

        {/* Discovered Devices */}
        <Card>
          <CardHeader className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Discovered Devices</h3>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ) : !devices || devices.length === 0 ? (
              <div className="p-12 text-center">
                <Wifi className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">No Devices Discovered</h4>
                <p className="text-muted-foreground" data-testid="text-no-discovered-devices">
                  Click "Scan Network" to discover PXE-capable devices on your network.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Device Name</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">MAC Address</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">IP Address</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Manufacturer</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((device, index) => (
                      <tr 
                        key={device.id} 
                        className={`table-row-hover ${index < devices.length - 1 ? 'border-b border-border' : ''}`}
                        data-testid={`row-discovered-device-${device.id}`}
                      >
                        <td className="p-4">
                          <div className="font-medium text-foreground" data-testid={`text-device-name-${device.id}`}>
                            {device.name}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-mono text-sm" data-testid={`text-mac-address-${device.id}`}>
                            {device.macAddress}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-mono text-sm" data-testid={`text-ip-address-${device.id}`}>
                            {device.ipAddress || "-"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm" data-testid={`text-manufacturer-${device.id}`}>
                            {device.manufacturer || "Unknown"}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              device.status === "online" && "bg-secondary/10 text-secondary border-secondary/20",
                              device.status === "deploying" && "bg-primary/10 text-primary border-primary/20",
                              device.status === "offline" && "bg-destructive/10 text-destructive border-destructive/20",
                              device.status === "idle" && "bg-muted text-muted-foreground border-border"
                            )}
                            data-testid={`status-device-${device.id}`}
                          >
                            <span className={cn(
                              "status-indicator mr-1",
                              {
                                "status-online": device.status === "online",
                                "status-deploying": device.status === "deploying", 
                                "status-offline": device.status === "offline",
                                "status-idle": device.status === "idle",
                              }
                            )} />
                            {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground" data-testid={`text-last-seen-${device.id}`}>
                          {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
