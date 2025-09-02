import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DeploymentWithDetails } from "@shared/schema";

interface HeaderProps {
  title: string;
  description: string;
}

export default function Header({ title, description }: HeaderProps) {
  const queryClient = useQueryClient();
  
  const { data: activeDeployments } = useQuery<DeploymentWithDetails[]>({
    queryKey: ["/api/deployments/active"],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" data-testid="page-title">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground" data-testid="page-description">
            {description}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            data-testid="button-refresh"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
          
          {/* Status Indicator */}
          {activeDeployments && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-secondary/10 border border-secondary/20 rounded-full">
              <span className="status-indicator status-online deployment-pulse" />
              <span 
                className="text-sm text-secondary font-medium"
                data-testid="text-active-deployments"
              >
                {activeDeployments.length} Active
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
