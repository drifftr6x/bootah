import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { DashboardStats } from "@shared/schema";
import { Monitor, Zap, CheckCircle, HardDrive } from "lucide-react";

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Devices Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Devices</p>
              <p className="text-3xl font-bold text-foreground" data-testid="stat-total-devices">
                {stats.totalDevices}
              </p>
              <p className="text-xs text-secondary">Managed devices</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Active Deployments Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Deployments</p>
              <p className="text-3xl font-bold text-foreground" data-testid="stat-active-deployments">
                {stats.activeDeployments}
              </p>
              <p className="text-xs text-secondary">Currently running</p>
            </div>
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Success Rate Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-3xl font-bold text-foreground" data-testid="stat-success-rate">
                {stats.successRate}%
              </p>
              <p className="text-xs text-secondary">Last 30 days</p>
            </div>
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Images Available Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Images Available</p>
              <p className="text-3xl font-bold text-foreground" data-testid="stat-images-count">
                {stats.imagesCount}
              </p>
              <p className="text-xs text-secondary" data-testid="stat-total-size">
                {formatBytes(stats.totalImageSize)} total
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
