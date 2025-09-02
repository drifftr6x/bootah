import { useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import type { Device, DeploymentWithDetails } from "@shared/schema";
import { Monitor, HardDrive, Network, Search, Filter, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Workstations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 5000,
  });

  const { data: deployments } = useQuery<DeploymentWithDetails[]>({
    queryKey: ["/api/deployments"],
  });

  // Filter devices based on search and status
  const filteredDevices = devices?.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || device.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      online: { variant: "default" as const, color: "bg-green-500" },
      offline: { variant: "secondary" as const, color: "bg-gray-500" },
      deploying: { variant: "default" as const, color: "bg-blue-500" },
      idle: { variant: "outline" as const, color: "bg-yellow-500" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1" data-testid={`badge-status-${status}`}>
        <div className={cn("w-2 h-2 rounded-full", config.color)} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getLastDeployment = (deviceId: string) => {
    return deployments?.find(d => d.deviceId === deviceId && d.status === "completed");
  };

  const formatLastSeen = (lastSeen: Date | string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (isLoading) {
    return (
      <>
        <Header 
          title="Workstations" 
          description="Manage and track all discovered and deployed workstations" 
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Workstations" 
        description="Manage and track all discovered and deployed workstations" 
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name, MAC address, IP, or manufacturer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-workstations"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === "all" ? "default" : "outline"}
                    onClick={() => setStatusFilter("all")}
                    data-testid="button-filter-all"
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === "online" ? "default" : "outline"}
                    onClick={() => setStatusFilter("online")}
                    data-testid="button-filter-online"
                  >
                    Online
                  </Button>
                  <Button
                    variant={statusFilter === "deploying" ? "default" : "outline"}
                    onClick={() => setStatusFilter("deploying")}
                    data-testid="button-filter-deploying"
                  >
                    Deploying
                  </Button>
                  <Button
                    variant={statusFilter === "offline" ? "default" : "outline"}
                    onClick={() => setStatusFilter("offline")}
                    data-testid="button-filter-offline"
                  >
                    Offline
                  </Button>
                </div>
                <Button variant="outline" data-testid="button-export-workstations">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Monitor className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Workstations</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-total-workstations">
                      {devices?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <Network className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Online</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-online-workstations">
                      {devices?.filter(d => d.status === "online").length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <HardDrive className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Deploying</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-deploying-workstations">
                      {devices?.filter(d => d.status === "deploying").length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <Filter className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Captured</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-captured-workstations">
                      {deployments?.filter(d => d.status === "completed").length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workstations List */}
          <Card>
            <CardHeader className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Workstation Registry ({filteredDevices.length} of {devices?.length || 0})
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              {filteredDevices.length === 0 ? (
                <div className="p-12 text-center">
                  <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No workstations found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Try adjusting your search criteria" : "Start by scanning the network to discover workstations"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredDevices.map((device) => {
                    const lastDeployment = getLastDeployment(device.id);
                    
                    return (
                      <div key={device.id} className="p-6 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Monitor className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-foreground" data-testid={`workstation-name-${device.id}`}>
                                  {device.name}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {device.manufacturer} {device.model}
                                </p>
                              </div>
                              {getStatusBadge(device.status)}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">MAC Address</p>
                                <p className="font-mono text-foreground" data-testid={`mac-address-${device.id}`}>
                                  {device.macAddress}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">IP Address</p>
                                <p className="font-mono text-foreground" data-testid={`ip-address-${device.id}`}>
                                  {device.ipAddress || "Not assigned"}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Last Seen</p>
                                <p className="text-foreground" data-testid={`last-seen-${device.id}`}>
                                  {formatLastSeen(device.lastSeen || new Date())}
                                </p>
                              </div>
                            </div>

                            {lastDeployment && (
                              <>
                                <Separator />
                                <div>
                                  <p className="text-muted-foreground text-sm mb-1">Last Deployment</p>
                                  <p className="text-sm text-foreground" data-testid={`last-deployment-${device.id}`}>
                                    {lastDeployment.image.name} - Completed {formatLastSeen(lastDeployment.completedAt || lastDeployment.startedAt || new Date())}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}