import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertDeploymentSchema, type InsertDeployment, type Device, type Image, type PostDeploymentProfile } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Loader2, Monitor, HardDrive, PlayCircle, AlertCircle, Calendar, Clock, Repeat, CheckCircle2, Settings, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { validateCronPattern, getNextCronOccurrences, formatScheduledTime, formatRelativeTime } from "@/lib/scheduling";

interface StartDeploymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedDeviceId?: string;
  preselectedImageId?: string;
}

const cronPresets = [
  { label: "Daily at 2 AM", value: "0 2 * * *", description: "Every day at 2:00 AM" },
  { label: "Weekdays at 9 AM", value: "0 9 * * 1-5", description: "Monday-Friday at 9:00 AM" },
  { label: "Weekly (Sunday 2 AM)", value: "0 2 * * 0", description: "Every Sunday at 2:00 AM" },
  { label: "Monthly (1st, 2 AM)", value: "0 2 1 * *", description: "1st of every month at 2:00 AM" },
];

const extendedDeploymentSchema = insertDeploymentSchema
  .refine((data: InsertDeployment) => {
    return data.deviceId && data.deviceId.length > 0;
  }, {
    message: "Please select a device",
    path: ["deviceId"],
  })
  .refine((data: InsertDeployment) => {
    return data.imageId && data.imageId.length > 0;
  }, {
    message: "Please select an image",
    path: ["imageId"],
  })
  .refine((data: InsertDeployment) => {
    if (data.scheduleType === "delayed" || data.scheduleType === "recurring") {
      return !!data.scheduledFor;
    }
    return true;
  }, {
    message: "Scheduled date/time is required for delayed and recurring deployments",
    path: ["scheduledFor"],
  })
  .refine((data: InsertDeployment) => {
    if (data.scheduleType === "delayed" && data.scheduledFor) {
      const scheduledDate = new Date(data.scheduledFor);
      return scheduledDate > new Date();
    }
    return true;
  }, {
    message: "Scheduled time must be in the future",
    path: ["scheduledFor"],
  })
  .refine((data: InsertDeployment) => {
    if (data.scheduleType === "recurring") {
      return !!data.recurringPattern;
    }
    return true;
  }, {
    message: "Cron pattern is required for recurring deployments",
    path: ["recurringPattern"],
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
  const [cronNextRuns, setCronNextRuns] = useState<Date[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [imagingEngine, setImagingEngine] = useState<string>("clonezilla");
  
  const form = useForm<InsertDeployment>({
    resolver: zodResolver(extendedDeploymentSchema),
    defaultValues: {
      deviceId: preselectedDeviceId || "",
      imageId: preselectedImageId || "",
      status: "pending",
      progress: 0,
      errorMessage: null,
      bootMode: "bios",
      scheduleType: "instant",
      scheduledFor: null,
      recurringPattern: null,
    },
  });

  const scheduleType = form.watch("scheduleType");
  const recurringPattern = form.watch("recurringPattern");
  const scheduledFor = form.watch("scheduledFor");
  
  // Calculate next runs when cron pattern changes
  useEffect(() => {
    if (scheduleType === "recurring" && recurringPattern) {
      const validation = validateCronPattern(recurringPattern);
      if (validation.valid) {
        const nextRuns = getNextCronOccurrences(recurringPattern, 3);
        setCronNextRuns(nextRuns);
      } else {
        setCronNextRuns([]);
      }
    }
  }, [recurringPattern, scheduleType]);

  // Fetch devices and images
  const { data: devices, isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    enabled: open,
  });

  const { data: images, isLoading: imagesLoading } = useQuery<Image[]>({
    queryKey: ["/api/images"],
    enabled: open,
  });

  const { data: profiles, isLoading: profilesLoading } = useQuery<PostDeploymentProfile[]>({
    queryKey: ["/api/post-deployment/profiles"],
    enabled: open,
  });

  // Filter available devices (online or idle, not currently deploying)
  const availableDevices = devices?.filter(device => {
    const status = device.status?.toLowerCase();
    return status === "online" || status === "idle";
  }) || [];

  const selectedDevice = devices?.find(d => d.id === form.watch("deviceId"));
  const selectedImage = images?.find(i => i.id === form.watch("imageId"));

  const startDeploymentMutation = useMutation({
    mutationFn: async (data: InsertDeployment) => {
      const deploymentPayload = { ...data, imagingEngine };
      const deployment: any = await apiRequest("POST", "/api/deployments", deploymentPayload);
      
      // Create profile binding if a profile was selected
      let bindingError = null;
      if (selectedProfileId && deployment?.id) {
        try {
          await apiRequest("POST", `/api/deployments/${deployment.id}/profiles`, {
            profileId: selectedProfileId,
          });
        } catch (error) {
          // Store binding error but don't fail the entire deployment
          bindingError = error;
        }
      }
      
      return { deployment, bindingError };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deployments/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deployments/scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      const isScheduled = scheduleType !== "instant";
      const attachedAutomation = selectedProfileId && !result.bindingError;
      
      // Show success toast for deployment
      toast({
        title: isScheduled ? "Deployment Scheduled" : "Deployment Started",
        description: isScheduled 
          ? `Deployment of ${selectedImage?.name} to ${selectedDevice?.name} has been scheduled${attachedAutomation ? ' with post-deployment automation' : ''}.`
          : `PXE deployment of ${selectedImage?.name} to ${selectedDevice?.name} has been initiated${attachedAutomation ? ' with post-deployment automation' : ''}.`,
      });
      
      // Show warning if binding failed
      if (result.bindingError) {
        toast({
          title: "Automation Attachment Failed",
          description: "Deployment created successfully, but post-deployment automation could not be attached at this time.",
          variant: "destructive",
        });
      }
      
      form.reset();
      setSelectedProfileId(null);
      setImagingEngine("clonezilla");
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

            {/* Post-Deployment Profile Selection */}
            {selectedDevice && selectedImage && (
              <div className="space-y-3">
                <Label data-testid="label-profile">
                  <Settings className="w-4 h-4 inline mr-2" />
                  Post-Deployment Automation (Optional)
                </Label>
                <Select onValueChange={(value) => setSelectedProfileId(value === "none" ? null : value)} value={selectedProfileId || "none"}>
                  <SelectTrigger data-testid="select-profile">
                    <SelectValue placeholder="No automation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex items-center space-x-2">
                        <span>No automation</span>
                      </div>
                    </SelectItem>
                    {profilesLoading ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading profiles...
                        </div>
                      </SelectItem>
                    ) : profiles && profiles.length > 0 ? (
                      profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          <div className="flex items-center space-x-2">
                            <Settings className="w-4 h-4" />
                            <span>{profile.name}</span>
                            {profile.description && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({profile.description})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : null}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Automatically run scripts, install software, join domain, or configure settings after OS deployment completes
                </p>
                
                {/* Selected Profile Info */}
                {selectedProfileId && profiles && (
                  (() => {
                    const selectedProfile = profiles.find(p => p.id === selectedProfileId);
                    if (selectedProfile) {
                      return (
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center space-x-3">
                            <Settings className="w-5 h-5 text-purple-600" />
                            <div className="flex-1">
                              <h4 className="font-medium text-purple-700 dark:text-purple-300">
                                {selectedProfile.name}
                              </h4>
                              {selectedProfile.description && (
                                <div className="text-sm text-purple-600 dark:text-purple-400">
                                  {selectedProfile.description}
                                </div>
                              )}
                              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                Execution: {selectedProfile.executionOrder === "sequential" ? "Sequential (one after another)" : "Parallel (all at once)"}
                                {selectedProfile.haltOnFailure && " • Stops on first error"}
                              </div>
                            </div>
                            <Badge 
                              variant="outline" 
                              className="bg-purple-500/10 text-purple-400 border-purple-500/20"
                            >
                              Automated
                            </Badge>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
              </div>
            )}

            {/* Imaging Engine Selection */}
            <div>
              <Label data-testid="label-imaging-engine">
                <Zap className="w-4 h-4 inline mr-2" />
                Imaging Engine
              </Label>
              <div className="mt-2">
                <Select onValueChange={setImagingEngine} value={imagingEngine}>
                    <FormControl>
                      <SelectTrigger data-testid="select-imaging-engine">
                        <SelectValue placeholder="Select imaging engine" />
                      </SelectTrigger>
                    </FormControl>
                  <SelectContent>
                    <SelectItem value="clonezilla">
                      <div className="flex items-center space-x-2">
                        <span>Clonezilla (Default)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="fog">
                      <div className="flex items-center space-x-2">
                        <span>FOG Project</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="multicast">
                      <div className="flex items-center space-x-2">
                        <span>Multicast</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Choose the imaging backend for this deployment
              </p>
            </div>

            {/* Imaging Engine Info Box */}
            {imagingEngine && (
              <div className={`p-4 rounded-lg border ${
                imagingEngine === "clonezilla" ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" :
                imagingEngine === "fog" ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" :
                "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800"
              }`}>
                <div className="flex items-start space-x-3">
                  <Zap className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    imagingEngine === "clonezilla" ? "text-orange-600" :
                    imagingEngine === "fog" ? "text-blue-600" :
                    "text-cyan-600"
                  }`} />
                  <div className="flex-1">
                    <h4 className={`font-medium ${
                      imagingEngine === "clonezilla" ? "text-orange-700 dark:text-orange-300" :
                      imagingEngine === "fog" ? "text-blue-700 dark:text-blue-300" :
                      "text-cyan-700 dark:text-cyan-300"
                    }`}>
                      {imagingEngine === "clonezilla" ? "Clonezilla Deployment" :
                       imagingEngine === "fog" ? "FOG Project Deployment" :
                       "Multicast Deployment"}
                    </h4>
                    <div className={`text-sm mt-1 ${
                      imagingEngine === "clonezilla" ? "text-orange-600 dark:text-orange-400" :
                      imagingEngine === "fog" ? "text-blue-600 dark:text-blue-400" :
                      "text-cyan-600 dark:text-cyan-400"
                    }`}>
                      {imagingEngine === "clonezilla" && "Single device imaging via Clonezilla. Fast, reliable, supports compression." }
                      {imagingEngine === "fog" && "Deploy via FOG Project. Supports multiple concurrent deployments and advanced scheduling." }
                      {imagingEngine === "multicast" && "Deploy to multiple devices simultaneously. Efficient for large-scale rollouts." }
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={imagingEngine === "clonezilla" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                               imagingEngine === "fog" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                               "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"}
                  >
                    {imagingEngine === "clonezilla" ? "Standard" :
                     imagingEngine === "fog" ? "Advanced" :
                     "Batch"}
                  </Badge>
                </div>
              </div>
            )}

            {/* Boot Mode Selection */}
            <FormField
              control={form.control}
              name="bootMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-boot-mode">Boot Mode</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value || "bios"}
                      className="grid grid-cols-3 gap-4"
                      data-testid="radio-group-boot-mode"
                    >
                      <div>
                        <RadioGroupItem value="bios" id="bios" className="peer sr-only" />
                        <Label
                          htmlFor="bios"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          data-testid="radio-bios"
                        >
                          <HardDrive className="mb-3 h-6 w-6" />
                          <div className="text-sm font-medium">Legacy BIOS</div>
                          <div className="text-xs text-muted-foreground text-center mt-1">
                            MBR, maximum compatibility
                          </div>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="uefi" id="uefi" className="peer sr-only" />
                        <Label
                          htmlFor="uefi"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          data-testid="radio-uefi"
                        >
                          <Monitor className="mb-3 h-6 w-6" />
                          <div className="text-sm font-medium">UEFI</div>
                          <div className="text-xs text-muted-foreground text-center mt-1">
                            GPT, modern systems
                          </div>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="uefi-secure" id="uefi-secure" className="peer sr-only" />
                        <Label
                          htmlFor="uefi-secure"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          data-testid="radio-uefi-secure"
                        >
                          <CheckCircle2 className="mb-3 h-6 w-6" />
                          <div className="text-sm font-medium">UEFI Secure</div>
                          <div className="text-xs text-muted-foreground text-center mt-1">
                            Enhanced security
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Select the boot mode for this deployment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Schedule Type Selection */}
            <FormField
              control={form.control}
              name="scheduleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-schedule-type">Deployment Schedule</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-3 gap-4"
                      data-testid="radio-group-schedule-type"
                    >
                      <div>
                        <RadioGroupItem value="instant" id="instant" className="peer sr-only" />
                        <Label
                          htmlFor="instant"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          data-testid="radio-instant"
                        >
                          <PlayCircle className="mb-3 h-6 w-6" />
                          <div className="text-sm font-medium">Instant</div>
                          <div className="text-xs text-muted-foreground text-center mt-1">
                            Start immediately
                          </div>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="delayed" id="delayed" className="peer sr-only" />
                        <Label
                          htmlFor="delayed"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          data-testid="radio-delayed"
                        >
                          <Clock className="mb-3 h-6 w-6" />
                          <div className="text-sm font-medium">Delayed</div>
                          <div className="text-xs text-muted-foreground text-center mt-1">
                            Schedule once
                          </div>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="recurring" id="recurring" className="peer sr-only" />
                        <Label
                          htmlFor="recurring"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          data-testid="radio-recurring"
                        >
                          <Repeat className="mb-3 h-6 w-6" />
                          <div className="text-sm font-medium">Recurring</div>
                          <div className="text-xs text-muted-foreground text-center mt-1">
                            Repeat automatically
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scheduled Date/Time - Show for delayed and recurring */}
            {(scheduleType === "delayed" || scheduleType === "recurring") && (
              <FormField
                control={form.control}
                name="scheduledFor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-scheduled-for">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      {scheduleType === "recurring" ? "First Run Date & Time" : "Scheduled Date & Time"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                        onChange={(e) => {
                          const value = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(value);
                        }}
                        data-testid="input-scheduled-for"
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      {scheduleType === "recurring" 
                        ? "Set when the first deployment should run"
                        : "Set when the deployment should start"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Cron Pattern - Show for recurring only */}
            {scheduleType === "recurring" && (
              <>
                {/* Cron Preset Cards */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Quick Presets
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {cronPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          form.setValue("recurringPattern", preset.value);
                          setSelectedPreset(preset.value);
                        }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border-2 text-left transition-colors",
                          selectedPreset === preset.value
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50 hover:bg-accent"
                        )}
                        data-testid={`preset-${preset.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">{preset.label}</div>
                          <div className="text-xs text-muted-foreground">{preset.description}</div>
                        </div>
                        {selectedPreset === preset.value && (
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="recurringPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-recurring-pattern">
                        <Repeat className="w-4 h-4 inline mr-2" />
                        Custom Cron Pattern (Advanced)
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="0 2 * * 0 (Every Sunday at 2 AM)"
                          data-testid="input-recurring-pattern"
                          className="font-mono"
                          onBlur={() => {
                            if (field.value) {
                              const validation = validateCronPattern(field.value);
                              if (!validation.valid) {
                                form.setError("recurringPattern", {
                                  type: "manual",
                                  message: validation.error || "Invalid cron pattern",
                                });
                              } else {
                                form.clearErrors("recurringPattern");
                              }
                              // Clear selected preset if custom pattern entered
                              if (field.value && !cronPresets.find(p => p.value === field.value)) {
                                setSelectedPreset(null);
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {cronNextRuns.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center text-sm font-medium text-foreground">
                              <Calendar className="w-3 h-3 mr-1" />
                              Next Scheduled Runs:
                            </div>
                            <ul className="text-xs text-muted-foreground space-y-0.5 ml-4">
                              {cronNextRuns.map((date, index) => (
                                <li key={index}>
                                  • {formatScheduledTime(date)} ({formatRelativeTime(date)})
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <>
                            Cron format: minute hour day month weekday
                            <br />
                            Examples: "0 2 * * *" (daily at 2 AM), "0 0 * * 0" (weekly on Sunday)
                          </>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
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

            {/* Next Run Summary - Show for scheduled deployments */}
            {(scheduleType === "delayed" || scheduleType === "recurring") && scheduledFor && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Next run:</strong>{" "}
                    {formatScheduledTime(scheduledFor)} ({formatRelativeTime(scheduledFor)})
                    {scheduleType === "recurring" && cronNextRuns.length > 0 && (
                      <span className="text-xs block mt-1 text-blue-600 dark:text-blue-400">
                        Recurring: {cronNextRuns.length} scheduled executions calculated
                      </span>
                    )}
                  </div>
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
                {scheduleType === "instant" ? (
                  <>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Start Deployment
                  </>
                ) : scheduleType === "delayed" ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Schedule Deployment
                  </>
                ) : (
                  <>
                    <Repeat className="w-4 h-4 mr-2" />
                    Schedule Recurring
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}