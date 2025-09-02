import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Camera, Play, Square, Monitor, HardDrive, Settings, Clock, CheckCircle, XCircle } from "lucide-react";
import type { Device } from "@shared/schema";

interface CaptureJob {
  id: string;
  name: string;
  description: string;
  deviceId?: string;
  deviceName?: string;
  sourceDevice: string;
  compression: "none" | "gzip" | "bzip2";
  excludeSwap: boolean;
  excludeTmp: boolean;
  status: "scheduled" | "waiting" | "capturing" | "completed" | "failed";
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export default function CapturePage() {
  const [selectedJob, setSelectedJob] = useState<CaptureJob | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [captureForm, setCaptureForm] = useState({
    name: "",
    description: "",
    deviceId: "",
    sourceDevice: "/dev/sda",
    compression: "gzip" as const,
    excludeSwap: true,
    excludeTmp: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch devices for selection
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"]
  });

  // Fetch capture jobs (mock for now - would be real API)
  const { data: captureJobs = [] } = useQuery<CaptureJob[]>({
    queryKey: ["/api/capture/jobs"],
    queryFn: async () => {
      // Mock data - in real implementation this would be an API call
      return [
        {
          id: "cap-1",
          name: "Workstation Template",
          description: "Standard Windows 11 workstation image",
          deviceId: "87e4c7a2-7763-40e1-b022-9d07e75d742f",
          deviceName: "WS-001",
          sourceDevice: "/dev/sda",
          compression: "gzip",
          excludeSwap: true,
          excludeTmp: true,
          status: "scheduled",
          progress: 0,
          createdAt: new Date().toISOString()
        },
        {
          id: "cap-2", 
          name: "Server Base Image",
          description: "Ubuntu 22.04 LTS server configuration",
          deviceName: "PXE-Client-001",
          sourceDevice: "/dev/sda",
          compression: "bzip2",
          excludeSwap: true,
          excludeTmp: false,
          status: "capturing",
          progress: 67,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          startedAt: new Date(Date.now() - 1800000).toISOString()
        }
      ];
    }
  });

  // Schedule capture job mutation
  const scheduleCaptureMutation = useMutation({
    mutationFn: async (data: typeof captureForm) => {
      return await apiRequest("POST", "/api/capture/schedule", data);
    },
    onSuccess: () => {
      toast({
        title: "Capture Scheduled",
        description: "The capture job has been scheduled successfully."
      });
      setShowScheduleDialog(false);
      setCaptureForm({
        name: "",
        description: "",
        deviceId: "",
        sourceDevice: "/dev/sda",
        compression: "gzip",
        excludeSwap: true,
        excludeTmp: true
      });
      queryClient.invalidateQueries({ queryKey: ["/api/capture/jobs"] });
    },
    onError: () => {
      toast({
        title: "Schedule Failed", 
        description: "Failed to schedule capture job.",
        variant: "destructive"
      });
    }
  });

  // Start immediate capture mutation
  const startCaptureMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return await apiRequest("POST", "/api/images/capture", {
        deviceId,
        sourceDevice: "/dev/sda",
        imageName: `Capture-${Date.now()}`,
        description: "Immediate capture",
        compression: "gzip"
      });
    },
    onSuccess: () => {
      toast({
        title: "Capture Started",
        description: "Image capture has begun."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/capture/jobs"] });
    },
    onError: () => {
      toast({
        title: "Capture Failed",
        description: "Failed to start image capture.", 
        variant: "destructive"
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-500";
      case "waiting": return "bg-yellow-500";
      case "capturing": return "bg-green-500";
      case "completed": return "bg-emerald-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled": return Clock;
      case "waiting": return Clock;
      case "capturing": return Camera;
      case "completed": return CheckCircle;
      case "failed": return XCircle;
      default: return Camera;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Image Capture</h1>
          <p className="text-muted-foreground">Capture system images from network devices</p>
        </div>
        <div className="space-x-2">
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-schedule-capture">
                <Clock className="h-4 w-4 mr-2" />
                Schedule Capture
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Image Capture</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="capture-name">Image Name</Label>
                  <Input
                    id="capture-name"
                    data-testid="input-capture-name"
                    value={captureForm.name}
                    onChange={(e) => setCaptureForm({...captureForm, name: e.target.value})}
                    placeholder="Windows 11 Workstation Template"
                  />
                </div>
                <div>
                  <Label htmlFor="capture-description">Description</Label>
                  <Textarea
                    id="capture-description"
                    data-testid="input-capture-description"
                    value={captureForm.description}
                    onChange={(e) => setCaptureForm({...captureForm, description: e.target.value})}
                    placeholder="Standard workstation configuration with Office and security software"
                  />
                </div>
                <div>
                  <Label>Target Device (Optional)</Label>
                  <Select value={captureForm.deviceId} onValueChange={(value) => setCaptureForm({...captureForm, deviceId: value})}>
                    <SelectTrigger data-testid="select-device">
                      <SelectValue placeholder="Select device or leave blank for any PXE client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any PXE Client</SelectItem>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name} ({device.macAddress})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Source Device</Label>
                  <Input
                    data-testid="input-source-device"
                    value={captureForm.sourceDevice}
                    onChange={(e) => setCaptureForm({...captureForm, sourceDevice: e.target.value})}
                    placeholder="/dev/sda"
                  />
                </div>
                <div>
                  <Label>Compression</Label>
                  <Select value={captureForm.compression} onValueChange={(value: any) => setCaptureForm({...captureForm, compression: value})}>
                    <SelectTrigger data-testid="select-compression">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Compression</SelectItem>
                      <SelectItem value="gzip">GZip (Recommended)</SelectItem>
                      <SelectItem value="bzip2">BZip2 (High Compression)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      data-testid="checkbox-exclude-swap"
                      checked={captureForm.excludeSwap}
                      onChange={(e) => setCaptureForm({...captureForm, excludeSwap: e.target.checked})}
                    />
                    <span>Exclude Swap Partitions</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      data-testid="checkbox-exclude-tmp"
                      checked={captureForm.excludeTmp}
                      onChange={(e) => setCaptureForm({...captureForm, excludeTmp: e.target.checked})}
                    />
                    <span>Exclude Temp Files</span>
                  </label>
                </div>
                <Button 
                  data-testid="button-confirm-schedule"
                  onClick={() => scheduleCaptureMutation.mutate(captureForm)}
                  disabled={!captureForm.name || scheduleCaptureMutation.isPending}
                  className="w-full"
                >
                  {scheduleCaptureMutation.isPending ? "Scheduling..." : "Schedule Capture"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Online Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.filter(d => d.status === 'online').length}</div>
            <p className="text-xs text-muted-foreground">Available for capture</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active Captures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{captureJobs.filter(j => j.status === 'capturing').length}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Scheduled Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{captureJobs.filter(j => j.status === 'scheduled').length}</div>
            <p className="text-xs text-muted-foreground">Waiting to execute</p>
          </CardContent>
        </Card>
      </div>

      {/* Capture Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Capture Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {captureJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No capture jobs found</p>
                <p className="text-sm">Schedule a capture job or start an immediate capture</p>
              </div>
            ) : (
              captureJobs.map((job) => {
                const StatusIcon = getStatusIcon(job.status);
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedJob(job)}
                    data-testid={`capture-job-${job.id}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${getStatusColor(job.status)}/10`}>
                        <StatusIcon className={`h-4 w-4 ${getStatusColor(job.status).replace('bg-', 'text-')}`} />
                      </div>
                      <div>
                        <h3 className="font-medium">{job.name}</h3>
                        <p className="text-sm text-muted-foreground">{job.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                          <span>Device: {job.deviceName || "Any PXE Client"}</span>
                          <span>Source: {job.sourceDevice}</span>
                          <span>Compression: {job.compression}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                      {job.status === "capturing" && (
                        <div className="mt-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{width: `${job.progress}%`}}
                            ></div>
                          </div>
                          <span className="text-xs text-muted-foreground">{job.progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Online Devices Ready for Immediate Capture */}
      <Card>
        <CardHeader>
          <CardTitle>Immediate Capture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {devices.filter(d => d.status === 'online').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No online devices found</p>
                <p className="text-sm">Boot a device via PXE to begin capture</p>
              </div>
            ) : (
              devices.filter(d => d.status === 'online').map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`device-${device.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-green-500/10">
                      <HardDrive className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">{device.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {device.ipAddress} • {device.macAddress} • x86_64
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    data-testid={`button-capture-${device.id}`}
                    onClick={() => startCaptureMutation.mutate(device.id)}
                    disabled={startCaptureMutation.isPending}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Capture
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}