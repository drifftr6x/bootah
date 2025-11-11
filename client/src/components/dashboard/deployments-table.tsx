import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DeploymentWithDetails } from "@shared/schema";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Activity, Clock, Zap, Shield, AlertTriangle, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import PostDeploymentProgress from "@/components/deployments/post-deployment-progress";

function getStatusColor(status: string) {
  switch (status) {
    case "deploying":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    case "completed":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "failed":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "pending":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "deploying":
      return Settings;
    case "completed":
      return Shield;
    case "failed":
      return AlertTriangle;
    case "pending":
      return Clock;
    default:
      return Clock;
  }
}

function AnimatedProgress({ value, isDeploying }: { value: number; isDeploying: boolean }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    const duration = 500;
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = displayValue + (value - displayValue) * easeOutCubic;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationFrame);
  }, [value, displayValue]);
  
  return (
    <div className="flex items-center space-x-2 w-full">
      <div className="relative flex-1">
        <Progress 
          value={displayValue} 
          className={cn(
            "h-2 transition-all duration-300",
            isDeploying && "animate-pulse"
          )}
        />
        {isDeploying && (
          <div 
            className="absolute top-0 left-0 h-2 bg-gradient-to-r from-orange-500/40 to-yellow-500/40 rounded-full animate-pulse transition-all duration-500"
            style={{ width: `${Math.min(displayValue, 100)}%` }}
          />
        )}
      </div>
      <span className={cn(
        "text-sm font-medium min-w-[3rem] text-right transition-all duration-300",
        isDeploying ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
      )}>
        {Math.round(displayValue)}%
      </span>
    </div>
  );
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
                  <>
                    <tr 
                      key={deployment.id} 
                      className="table-row-hover border-b border-border"
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
                      <AnimatedProgress 
                        value={deployment.progress || 0}
                        isDeploying={deployment.status === "deploying"}
                      />
                    </td>
                    <td className="p-4">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          getStatusColor(deployment.status),
                          "transition-all duration-300",
                          deployment.status === "deploying" && "animate-pulse"
                        )}
                        data-testid={`status-${deployment.id}`}
                      >
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const Icon = getStatusIcon(deployment.status);
                            return (
                              <Icon className={cn(
                                "w-3 h-3",
                                deployment.status === "deploying" && "animate-spin"
                              )} />
                            );
                          })()}
                          <span>
                            {deployment.status === "deploying" && deployment.progress && deployment.progress > 90 
                              ? "Finalizing" 
                              : deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)
                            }
                          </span>
                        </div>
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className={cn(
                          "text-sm transition-all duration-300",
                          deployment.status === "deploying" ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                        )} data-testid={`text-eta-${deployment.id}`}>
                          {formatETA(deployment.progress || 0)}
                        </span>
                      </div>
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
                  {/* Post-Deployment Progress Row */}
                  {(deployment.status === "post_processing" || deployment.status === "completed") && (
                    <tr 
                      key={`${deployment.id}-automation`}
                      className={`${index < deployments.length - 1 ? 'border-b border-border' : ''}`}
                    >
                      <td colSpan={6} className="px-4 pb-4">
                        <PostDeploymentProgress deploymentId={deployment.id} />
                      </td>
                    </tr>
                  )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
