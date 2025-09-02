import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DeploymentWithDetails } from "@shared/schema";
import { Zap, StopCircle, Plus } from "lucide-react";
import { useState } from "react";
import StartDeploymentDialog from "@/components/dialogs/start-deployment-dialog";

function getStatusColor(status: string) {
  switch (status) {
    case "deploying":
      return "bg-secondary/10 text-secondary border-secondary/20";
    case "completed":
      return "bg-secondary/10 text-secondary border-secondary/20";
    case "failed":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "pending":
      return "bg-muted text-muted-foreground border-border";
    case "cancelled":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function formatDuration(startedAt: string, completedAt?: string | null): string {
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor((diffMs % 60000) / 1000);
  
  if (diffMins > 0) {
    return `${diffMins}m ${diffSecs}s`;
  }
  return `${diffSecs}s`;
}

export default function Deployments() {
  const [showNewDeploymentDialog, setShowNewDeploymentDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deployments, isLoading } = useQuery<DeploymentWithDetails[]>({
    queryKey: ["/api/deployments"],
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
  });

  const stopDeploymentMutation = useMutation({
    mutationFn: async (deploymentId: string) => {
      return apiRequest("DELETE", `/api/deployments/${deploymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({
        title: "Deployment Stopped",
        description: "The deployment has been cancelled successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to stop deployment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const activeDeployments = deployments?.filter(d => 
    d.status === "deploying" || d.status === "pending"
  ) || [];

  const completedDeployments = deployments?.filter(d => 
    d.status === "completed" || d.status === "failed" || d.status === "cancelled"
  ) || [];

  return (
    <>
      <Header 
        title="Deployments" 
        description="Monitor and manage OS deployment operations" 
      />
      
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex justify-end">
          <Button 
            onClick={() => setShowNewDeploymentDialog(true)}
            data-testid="button-new-deployment"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Deployment
          </Button>
        </div>
        {/* Active Deployments */}
        <Card>
          <CardHeader className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Active Deployments</h3>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ) : activeDeployments.length === 0 ? (
              <div className="p-12 text-center">
                <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">No Active Deployments</h4>
                <p className="text-muted-foreground" data-testid="text-no-active-deployments">
                  All deployments are complete or there are no ongoing operations.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Device</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Image</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Progress</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Duration</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDeployments.map((deployment, index) => (
                      <tr 
                        key={deployment.id} 
                        className={`table-row-hover ${index < activeDeployments.length - 1 ? 'border-b border-border' : ''}`}
                        data-testid={`row-active-deployment-${deployment.id}`}
                      >
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-foreground">
                              {deployment.device.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {deployment.device.macAddress}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">
                            {deployment.image.name}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={deployment.progress || 0} 
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground">
                              {deployment.progress || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(deployment.status)}
                          >
                            <span className={`status-indicator ${
                              deployment.status === "deploying" ? "status-deploying" : "status-idle"
                            } mr-1`} />
                            {deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {deployment.startedAt && formatDuration(deployment.startedAt, deployment.completedAt)}
                        </td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => stopDeploymentMutation.mutate(deployment.id)}
                            disabled={stopDeploymentMutation.isPending}
                            data-testid={`button-stop-active-${deployment.id}`}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <StopCircle className="w-4 h-4 mr-1" />
                            {stopDeploymentMutation.isPending ? "Stopping..." : "Stop"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deployment History */}
        <Card>
          <CardHeader className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Deployment History</h3>
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
            ) : completedDeployments.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground" data-testid="text-no-deployment-history">
                  No deployment history available.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Device</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Image</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Started</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Duration</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedDeployments.map((deployment, index) => (
                      <tr 
                        key={deployment.id} 
                        className={`table-row-hover ${index < completedDeployments.length - 1 ? 'border-b border-border' : ''}`}
                        data-testid={`row-history-deployment-${deployment.id}`}
                      >
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-foreground">
                              {deployment.device.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {deployment.device.macAddress}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">
                            {deployment.image.name}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(deployment.status)}
                          >
                            <span className={`status-indicator ${
                              deployment.status === "completed" ? "status-online" : 
                              deployment.status === "failed" ? "status-offline" : "status-idle"
                            } mr-1`} />
                            {deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {deployment.startedAt && new Date(deployment.startedAt).toLocaleString()}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {deployment.startedAt && formatDuration(deployment.startedAt, deployment.completedAt)}
                        </td>
                        <td className="p-4 text-sm text-destructive">
                          {deployment.errorMessage || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Start Deployment Dialog */}
        <StartDeploymentDialog 
          open={showNewDeploymentDialog} 
          onOpenChange={setShowNewDeploymentDialog} 
        />
      </main>
    </>
  );
}
