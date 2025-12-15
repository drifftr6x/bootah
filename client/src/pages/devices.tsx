import { useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Device } from "@shared/schema";
import { Plus, Search, Monitor, Trash2, Download, Network, Power, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import AddDeviceDialog from "@/components/dialogs/add-device-dialog";
import StartDeploymentDialog from "@/components/dialogs/start-deployment-dialog";
import AdvancedFilters, { type FilterOption, type ActiveFilter } from "@/components/search/advanced-filters";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [wolDeviceId, setWolDeviceId] = useState<string | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const selectAllDevices = () => {
    if (filteredDevices.length === selectedDevices.size) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(filteredDevices.map(d => d.id)));
    }
  };

  const clearSelection = () => setSelectedDevices(new Set());

  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operationType, deviceIds }: { operationType: string; deviceIds: string[] }) => {
      return apiRequest("POST", "/api/bulk-operations", { operationType, deviceIds });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      clearSelection();
      toast({
        title: "Bulk Operation Started",
        description: `${variables.operationType} operation started for ${variables.deviceIds.length} device(s).`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start bulk operation.",
        variant: "destructive",
      });
    },
  });

  const handleBulkWake = () => {
    bulkOperationMutation.mutate({ operationType: "wake", deviceIds: Array.from(selectedDevices) });
  };

  const handleBulkDelete = () => {
    bulkOperationMutation.mutate({ operationType: "delete", deviceIds: Array.from(selectedDevices) });
    setShowBulkDeleteDialog(false);
  };

  const exportDevices = () => {
    if (!devices || devices.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no devices to export.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV headers
    const headers = [
      "Name",
      "MAC Address", 
      "IP Address",
      "Status",
      "Manufacturer",
      "Model",
      "Last Seen"
    ];

    // Convert devices to CSV rows
    const csvRows = devices.map(device => [
      device.name,
      device.macAddress,
      device.ipAddress || "Not assigned",
      device.status,
      device.manufacturer || "Unknown",
      device.model || "Unknown",
      device.lastSeen ? new Date(device.lastSeen).toLocaleString() : "Never"
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `bootah64x-devices-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Complete",
      description: `Exported ${devices.length} devices to CSV file.`,
    });
  };

  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const wolMutation = useMutation({
    mutationFn: (deviceId: string) =>
      apiRequest("POST", `/api/devices/${deviceId}/wake`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Wake-on-LAN packet sent",
      });
      setWolDeviceId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send WoL packet",
        variant: "destructive",
      });
      setWolDeviceId(null);
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      console.log("[DELETE] Attempting to delete device:", deviceId);
      const result = await apiRequest("DELETE", `/api/devices/${deviceId}`);
      console.log("[DELETE] Delete successful");
      return result;
    },
    onSuccess: () => {
      console.log("[DELETE] onSuccess called");
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      setShowDeleteDialog(false);
      setDeviceToDelete(null);
      toast({
        title: "Device Deleted",
        description: "The device has been removed successfully.",
      });
    },
    onError: (error) => {
      console.error("[DELETE] onError called:", error);
      setShowDeleteDialog(false);
      setDeviceToDelete(null);
      toast({
        title: "Error",
        description: "Failed to delete device. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (device: Device) => {
    setDeviceToDelete(device);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    console.log("[DELETE] handleConfirmDelete called with device:", deviceToDelete);
    if (deviceToDelete) {
      console.log("[DELETE] Calling mutation with ID:", deviceToDelete.id);
      deleteDeviceMutation.mutate(deviceToDelete.id);
    } else {
      console.warn("[DELETE] No device to delete!");
    }
  };

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
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Device Management</h2>
              {filteredDevices.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllDevices}
                  data-testid="button-select-all"
                >
                  {selectedDevices.size === filteredDevices.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={exportDevices}
                disabled={!devices || devices.length === 0}
                data-testid="button-export-devices"
              >
                <Download className="w-4 h-4 mr-2" />
                Export List
              </Button>
              <Button 
                onClick={() => setShowAddDialog(true)}
                data-testid="button-add-device"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            </div>
          </div>
          
          <AdvancedFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterOptions={filterOptions}
            activeFilters={activeFilters}
            onFilterChange={setActiveFilters}
            placeholder="Search devices by name, MAC, IP, manufacturer..."
          />

          {selectedDevices.size > 0 && (
            <div className="flex items-center justify-between bg-muted/50 border rounded-lg p-3" data-testid="bulk-actions-toolbar">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" data-testid="text-selected-count">
                  {selectedDevices.size} device(s) selected
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection} data-testid="button-clear-selection">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleBulkWake}
                  disabled={bulkOperationMutation.isPending}
                  data-testid="button-bulk-wake"
                >
                  {bulkOperationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Power className="h-4 w-4 mr-1" />}
                  Wake All
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setShowBulkDeleteDialog(true)}
                  disabled={bulkOperationMutation.isPending}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete All
                </Button>
              </div>
            </div>
          )}
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
              <Card key={device.id} className={cn("hover:shadow-lg transition-shadow", selectedDevices.has(device.id) && "ring-2 ring-primary")}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedDevices.has(device.id)}
                        onCheckedChange={() => toggleDeviceSelection(device.id)}
                        data-testid={`checkbox-device-${device.id}`}
                      />
                      <h3 className="font-semibold text-foreground" data-testid={`text-device-name-${device.id}`}>
                        {device.name}
                      </h3>
                    </div>
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
                      onClick={() => wolMutation.mutate(device.id)}
                      disabled={wolMutation.isPending || device.status === "online"}
                      title="Send wake-on-LAN packet"
                      data-testid={`button-wake-${device.id}`}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteClick(device)}
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

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleConfirmDelete}
          title="Delete Device"
          description={`Are you sure you want to delete "${deviceToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />

        {/* Bulk Delete Confirmation Dialog */}
        <ConfirmDialog
          open={showBulkDeleteDialog}
          onOpenChange={setShowBulkDeleteDialog}
          onConfirm={handleBulkDelete}
          title="Delete Multiple Devices"
          description={`Are you sure you want to delete ${selectedDevices.size} device(s)? This action cannot be undone.`}
          confirmText="Delete All"
          cancelText="Cancel"
          variant="destructive"
        />
      </main>
    </>
  );
}
