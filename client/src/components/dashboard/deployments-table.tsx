import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DeploymentWithDetails } from "@shared/schema";
import { Link } from "wouter";

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
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function formatETA(progress: number): string {
  if (progress >= 100) return "Complete";
  
  // Simple ETA calculation based on progress
  const remainingPercent = 100 - progress;
  const estimatedMinutes = Math.ceil(remainingPercent / 10); // Rough estimate
  
  if (estimatedMinutes < 1) return "< 1m";
  if (estimatedMinutes < 60) return `${estimatedMinutes}m`;
  
  const hours = Math.floor(estimatedMinutes / 60);
  const minutes = estimatedMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default function DeploymentsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: deployments, isLoading } = useQuery<DeploymentWithDetails[]>({
    queryKey: ["/api/deployments/active"],
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

  const handleStopDeployment = (deploymentId: string) => {
    stopDeploymentMutation.mutate(deploymentId);
  };

  return (
    <Card>
      <CardHeader className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Active Deployments</h3>
          <Link href="/deployments">
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="button-view-all-deployments"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              View All
            </Button>
          </Link>
        </div>
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
        ) : !deployments || deployments.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground" data-testid="text-no-deployments">
              No active deployments
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
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">ETA</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((deployment, index) => (
                  <tr 
                    key={deployment.id} 
                    className={`table-row-hover ${index < deployments.length - 1 ? 'border-b border-border' : ''}`}
                    data-testid={`row-deployment-${deployment.id}`}
                  >
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-foreground" data-testid={`text-device-name-${deployment.id}`}>
                          {deployment.device.name}
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-mac-address-${deployment.id}`}>
                          {deployment.device.macAddress}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-foreground" data-testid={`text-image-name-${deployment.id}`}>
                        {deployment.image.name}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={deployment.progress || 0} 
                          className="flex-1"
                          data-testid={`progress-deployment-${deployment.id}`}
                        />
                        <span className="text-sm text-muted-foreground" data-testid={`text-progress-${deployment.id}`}>
                          {deployment.progress || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(deployment.status)}
                        data-testid={`status-${deployment.id}`}
                      >
                        <span className={`status-indicator ${
                          deployment.status === "deploying" ? "status-deploying" : 
                          deployment.status === "completed" ? "status-online" :
                          deployment.status === "failed" ? "status-offline" : "status-idle"
                        } mr-1`} />
                        {deployment.status === "deploying" && deployment.progress && deployment.progress > 90 
                          ? "Finalizing" 
                          : deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)
                        }
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground" data-testid={`text-eta-${deployment.id}`}>
                      {formatETA(deployment.progress || 0)}
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStopDeployment(deployment.id)}
                        disabled={stopDeploymentMutation.isPending}
                        data-testid={`button-stop-deployment-${deployment.id}`}
                        className="text-destructive hover:text-destructive/80 text-sm"
                      >
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
  );
}
