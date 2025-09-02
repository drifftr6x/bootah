import { useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Device } from "@shared/schema";
import { Plus, Search, Monitor, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import AddDeviceDialog from "@/components/dialogs/add-device-dialog";
import StartDeploymentDialog from "@/components/dialogs/start-deployment-dialog";
import AdvancedFilters, { type FilterOption, type ActiveFilter } from "@/components/search/advanced-filters";

function getStatusColor(status: string) {
  switch (status) {
    case "online":
      return "bg-secondary/10 text-secondary border-secondary/20";
    case "deploying":
      return "bg-primary/10 text-primary border-primary/20";
    case "offline":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "idle":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function Devices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return apiRequest("DELETE", `/api/devices/${deviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({
        title: "Device Deleted",
        description: "The device has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete device. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter options for devices
  const filterOptions: FilterOption[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "online", label: "Online" },
        { value: "offline", label: "Offline" },
        { value: "deploying", label: "Deploying" },
        { value: "idle", label: "Idle" },
      ],
    },
    {
      key: "manufacturer",
      label: "Manufacturer",
      type: "text",
      placeholder: "e.g., Dell, HP, Lenovo",
    },
    {
      key: "lastSeen",
      label: "Last Seen",
      type: "date",
    },
  ];

  const filteredDevices = devices?.filter(device => {
    // Text search filter
    const matchesSearch = !searchTerm || 
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model?.toLowerCase().includes(searchTerm.toLowerCase());

    // Advanced filters
    const matchesFilters = activeFilters.every(filter => {
      switch (filter.key) {
        case "status":
          return device.status === filter.value;
        case "manufacturer":
          return device.manufacturer?.toLowerCase().includes(filter.value.toLowerCase());
        case "lastSeen":
          if (!device.lastSeen) return false;
          const [fromStr, toStr] = filter.value.split("|");
          const from = new Date(fromStr);
          const to = new Date(toStr);
          const lastSeen = new Date(device.lastSeen);
          return lastSeen >= from && lastSeen <= to;
        default:
          return true;
      }
    });

    return matchesSearch && matchesFilters;
  }) || [];

  return (
    <>
      <Header 
        title="Device Management" 
        description="Manage network devices and monitor their status" 
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        {/* Advanced Search and Actions */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Device Management</h2>
            <Button 
              onClick={() => setShowAddDialog(true)}
              data-testid="button-add-device"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </div>
          
          <AdvancedFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterOptions={filterOptions}
            activeFilters={activeFilters}
            onFilterChange={setActiveFilters}
            placeholder="Search devices by name, MAC, IP, manufacturer..."
          />
        </div>

        {/* Devices Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDevices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Devices Found</h3>
              <p className="text-muted-foreground" data-testid="text-no-devices">
                {searchTerm ? "No devices match your search criteria." : "No devices have been discovered yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map((device) => (
              <Card key={device.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground" data-testid={`text-device-name-${device.id}`}>
                      {device.name}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(device.status)}
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
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">MAC Address:</span>
                      <span className="ml-2 font-mono" data-testid={`text-mac-${device.id}`}>
                        {device.macAddress}
                      </span>
                    </div>
                    {device.ipAddress && (
                      <div>
                        <span className="text-muted-foreground">IP Address:</span>
                        <span className="ml-2 font-mono" data-testid={`text-ip-${device.id}`}>
                          {device.ipAddress}
                        </span>
                      </div>
                    )}
                    {device.manufacturer && (
                      <div>
                        <span className="text-muted-foreground">Manufacturer:</span>
                        <span className="ml-2" data-testid={`text-manufacturer-${device.id}`}>
                          {device.manufacturer}
                        </span>
                      </div>
                    )}
                    {device.model && (
                      <div>
                        <span className="text-muted-foreground">Model:</span>
                        <span className="ml-2" data-testid={`text-model-${device.id}`}>
                          {device.model}
                        </span>
                      </div>
                    )}
                    {device.lastSeen && (
                      <div>
                        <span className="text-muted-foreground">Last Seen:</span>
                        <span className="ml-2" data-testid={`text-last-seen-${device.id}`}>
                          {new Date(device.lastSeen).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end mt-4 space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedDeviceId(device.id);
                        setShowDeployDialog(true);
                      }}
                      disabled={device.status === "deploying" || (device.status !== "online" && device.status !== "idle")}
                      data-testid={`button-deploy-${device.id}`}
                    >
                      Deploy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteDeviceMutation.mutate(device.id)}
                      disabled={deleteDeviceMutation.isPending}
                      data-testid={`button-delete-${device.id}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Device Dialog */}
        <AddDeviceDialog 
          open={showAddDialog} 
          onOpenChange={setShowAddDialog} 
        />
        
        {/* Start Deployment Dialog */}
        <StartDeploymentDialog 
          open={showDeployDialog} 
          onOpenChange={setShowDeployDialog}
          preselectedDeviceId={selectedDeviceId}
        />
      </main>
    </>
  );
}
