import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Deployment, Device, Image } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Repeat, X, Monitor, HardDrive, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface DeploymentWithDetails {
  id: string;
  deviceId: string;
  imageId: string;
  status: string;
  progress: number;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  scheduleType: string;
  scheduledFor: Date | null;
  recurringPattern: string | null;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdAt: Date;
  device?: Device;
  image?: Image;
}

export default function ScheduledDeployments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deploymentToCancel, setDeploymentToCancel] = useState<string | null>(null);

  const { data: scheduledDeployments, isLoading } = useQuery<DeploymentWithDetails[]>({
    queryKey: ["/api/deployments/scheduled"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const cancelMutation = useMutation({
    mutationFn: async (deploymentId: string) => {
      return apiRequest("PATCH", `/api/deployments/${deploymentId}/cancel-schedule`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments/scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      toast({
        title: "Deployment Cancelled",
        description: "The scheduled deployment has been cancelled successfully.",
      });
      setDeploymentToCancel(null);
    },
    onError: () => {
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel the scheduled deployment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getScheduleTypeIcon = (type: string) => {
    switch (type) {
      case "delayed":
        return <Clock className="w-4 h-4" />;
      case "recurring":
        return <Repeat className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getScheduleTypeBadge = (type: string) => {
    switch (type) {
      case "delayed":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">One-time</Badge>;
      case "recurring":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">Recurring</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-scheduled-deployments">
            Scheduled Deployments
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor upcoming and recurring deployments
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
            <p className="text-muted-foreground">Loading scheduled deployments...</p>
          </div>
        </div>
      ) : !scheduledDeployments || scheduledDeployments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Scheduled Deployments</h3>
              <p className="text-muted-foreground">
                You don't have any scheduled or recurring deployments at the moment.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {scheduledDeployments.map((deployment) => (
            <Card key={deployment.id} data-testid={`deployment-card-${deployment.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getScheduleTypeIcon(deployment.scheduleType)}
                      <CardTitle className="text-xl">
                        {deployment.image?.name || "Unknown Image"}
                      </CardTitle>
                      {getScheduleTypeBadge(deployment.scheduleType)}
                    </div>
                    <CardDescription>
                      Target: {deployment.device?.name || "Unknown Device"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeploymentToCancel(deployment.id)}
                    data-testid={`button-cancel-${deployment.id}`}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Device Info */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Monitor className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-blue-700 dark:text-blue-300">Target Device</h4>
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                      <div>{deployment.device?.name}</div>
                      <div className="text-xs">MAC: {deployment.device?.macAddress}</div>
                      {deployment.device?.ipAddress && (
                        <div className="text-xs">IP: {deployment.device?.ipAddress}</div>
                      )}
                    </div>
                  </div>

                  {/* Image Info */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <HardDrive className="w-4 h-4 text-green-600" />
                      <h4 className="font-medium text-green-700 dark:text-green-300">OS Image</h4>
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 space-y-1">
                      <div>{deployment.image?.name}</div>
                      <div className="text-xs capitalize">Type: {deployment.image?.osType}</div>
                      {deployment.image?.version && (
                        <div className="text-xs">Version: {deployment.image?.version}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Schedule Details */}
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center space-x-2 mb-3">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <h4 className="font-medium text-purple-700 dark:text-purple-300">Schedule Details</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {deployment.scheduledFor && (
                      <div>
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          {deployment.scheduleType === "recurring" ? "First Run:" : "Scheduled For:"}
                        </span>
                        <div className="text-purple-700 dark:text-purple-300">
                          {format(new Date(deployment.scheduledFor), "PPpp")}
                        </div>
                      </div>
                    )}
                    {deployment.nextRunAt && deployment.scheduleType === "recurring" && (
                      <div>
                        <span className="text-purple-600 dark:text-purple-400 font-medium">Next Run:</span>
                        <div className="text-purple-700 dark:text-purple-300">
                          {format(new Date(deployment.nextRunAt), "PPpp")}
                        </div>
                      </div>
                    )}
                    {deployment.lastRunAt && deployment.scheduleType === "recurring" && (
                      <div>
                        <span className="text-purple-600 dark:text-purple-400 font-medium">Last Run:</span>
                        <div className="text-purple-700 dark:text-purple-300">
                          {format(new Date(deployment.lastRunAt), "PPpp")}
                        </div>
                      </div>
                    )}
                    {deployment.recurringPattern && (
                      <div>
                        <span className="text-purple-600 dark:text-purple-400 font-medium">Cron Pattern:</span>
                        <div className="text-purple-700 dark:text-purple-300 font-mono text-xs">
                          {deployment.recurringPattern}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Info */}
                {deployment.status === "scheduled" && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>Note:</strong> This deployment will automatically start at the scheduled time.
                        {deployment.scheduleType === "recurring" && " A new deployment will be created after each run."}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!deploymentToCancel} onOpenChange={(open) => !open && setDeploymentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Scheduled Deployment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this scheduled deployment? This action cannot be undone.
              {scheduledDeployments?.find(d => d.id === deploymentToCancel)?.scheduleType === "recurring" && (
                <span className="block mt-2 font-medium">
                  Note: This will permanently remove the recurring deployment schedule.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-no">No, Keep It</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deploymentToCancel && cancelMutation.mutate(deploymentToCancel)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-cancel-dialog-yes"
            >
              Yes, Cancel Deployment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
