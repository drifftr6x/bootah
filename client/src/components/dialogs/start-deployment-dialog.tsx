import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertDeploymentSchema, type InsertDeployment, type Device, type Image } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Loader2, Monitor, HardDrive, PlayCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StartDeploymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedDeviceId?: string;
  preselectedImageId?: string;
}

const extendedDeploymentSchema = insertDeploymentSchema.extend({
  deviceId: insertDeploymentSchema.shape.deviceId.min(1, "Please select a device"),
  imageId: insertDeploymentSchema.shape.imageId.min(1, "Please select an image"),
});

function getDeviceStatusColor(status: string) {
  switch (status) {
    case "online":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "offline":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "deploying":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getOSColor(osType: string) {
  switch (osType.toLowerCase()) {
    case "windows":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "linux":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "macos":
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

export default function StartDeploymentDialog({ 
  open, 
  onOpenChange, 
  preselectedDeviceId, 
  preselectedImageId 
}: StartDeploymentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<InsertDeployment>({
    resolver: zodResolver(extendedDeploymentSchema),
    defaultValues: {
      deviceId: preselectedDeviceId || "",
      imageId: preselectedImageId || "",
      status: "pending",
      progress: 0,
      errorMessage: null,
    },
  });

  // Fetch devices and images
  const { data: devices, isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    enabled: open,
  });

  const { data: images, isLoading: imagesLoading } = useQuery<Image[]>({
    queryKey: ["/api/images"],
    enabled: open,
  });

  // Filter available devices (online or idle, not currently deploying)
  const availableDevices = devices?.filter(device => 
    device.status === "online" || device.status === "idle"
  ) || [];

  const selectedDevice = devices?.find(d => d.id === form.watch("deviceId"));
  const selectedImage = images?.find(i => i.id === form.watch("imageId"));

  const startDeploymentMutation = useMutation({
    mutationFn: async (data: InsertDeployment) => {
      return apiRequest("POST", "/api/deployments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deployments/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Deployment Started",
        description: `PXE deployment of ${selectedImage?.name} to ${selectedDevice?.name} has been initiated.`,
      });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Deployment Failed",
        description: "Failed to start deployment. Please check the device and image selections.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDeployment) => {
    startDeploymentMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">Start PXE Deployment</DialogTitle>
          <DialogDescription>
            Select a target device and OS image to begin PXE network deployment.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Device Selection */}
            <FormField
              control={form.control}
              name="deviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-device">Target Device</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-device">
                        <SelectValue placeholder="Select a device for deployment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {devicesLoading ? (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading devices...
                          </div>
                        </SelectItem>
                      ) : availableDevices.length === 0 ? (
                        <SelectItem value="no-devices" disabled>
                          No available devices (must be online)
                        </SelectItem>
                      ) : (
                        availableDevices.map((device) => (
                          <SelectItem key={device.id} value={device.id}>
                            <div className="flex items-center space-x-2">
                              <Monitor className="w-4 h-4" />
                              <span>{device.name}</span>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs", getDeviceStatusColor(device.status))}
                              >
                                {device.status}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Device must be online and available for deployment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Device Info */}
            {selectedDevice && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-3">
                  <Monitor className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-700 dark:text-blue-300">
                      {selectedDevice.name}
                    </h4>
                    <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                      <div>MAC: {selectedDevice.macAddress}</div>
                      {selectedDevice.ipAddress && (
                        <div>IP: {selectedDevice.ipAddress}</div>
                      )}
                      {selectedDevice.manufacturer && (
                        <div>
                          {selectedDevice.manufacturer} {selectedDevice.model || ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getDeviceStatusColor(selectedDevice.status)}
                  >
                    {selectedDevice.status.charAt(0).toUpperCase() + selectedDevice.status.slice(1)}
                  </Badge>
                </div>
              </div>
            )}

            {/* Image Selection */}
            <FormField
              control={form.control}
              name="imageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-image">OS Image</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-image">
                        <SelectValue placeholder="Select an OS image to deploy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {imagesLoading ? (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading images...
                          </div>
                        </SelectItem>
                      ) : !images || images.length === 0 ? (
                        <SelectItem value="no-images" disabled>
                          No OS images available
                        </SelectItem>
                      ) : (
                        images.map((image) => (
                          <SelectItem key={image.id} value={image.id}>
                            <div className="flex items-center space-x-2">
                              <HardDrive className="w-4 h-4" />
                              <span>{image.name}</span>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs", getOSColor(image.osType))}
                              >
                                {image.osType}
                              </Badge>
                              {image.version && (
                                <span className="text-xs text-muted-foreground">
                                  v{image.version}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the OS image to deploy to the target device
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Image Info */}
            {selectedImage && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-3">
                  <HardDrive className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-700 dark:text-green-300">
                      {selectedImage.name}
                    </h4>
                    <div className="text-sm text-green-600 dark:text-green-400 space-y-1">
                      <div>Size: {formatBytes(selectedImage.size)}</div>
                      <div>File: {selectedImage.filename}</div>
                      {selectedImage.version && (
                        <div>Version: {selectedImage.version}</div>
                      )}
                      {selectedImage.description && (
                        <div className="text-green-600 dark:text-green-400 mt-1">
                          {selectedImage.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getOSColor(selectedImage.osType)}
                  >
                    {selectedImage.osType.charAt(0).toUpperCase() + selectedImage.osType.slice(1)}
                  </Badge>
                </div>
              </div>
            )}

            {/* Deployment Warning */}
            {selectedDevice && selectedImage && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>Warning:</strong> This will completely wipe the target device and install {selectedImage.name}. 
                    All existing data on {selectedDevice.name} will be permanently lost.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={startDeploymentMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={startDeploymentMutation.isPending || !selectedDevice || !selectedImage}
                data-testid="button-start-deployment"
                className="bg-green-600 hover:bg-green-700"
              >
                {startDeploymentMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Deployment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}