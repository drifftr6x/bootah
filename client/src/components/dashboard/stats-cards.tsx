import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { DashboardStats } from "@shared/schema";
import { Cpu, Zap, Shield, Database, TrendingUp, Activity } from "lucide-react";
import { useEffect, useState } from "react";

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (!bytes || bytes === 0 || !Number.isFinite(bytes)) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  const safeValue = Number.isFinite(value) ? value : 0;
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(easeOutCubic * safeValue);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationFrame);
  }, [safeValue, duration]);
  
  return <span>{displayValue}</span>;
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
      <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Devices</p>
              <p className="text-3xl font-bold text-foreground transition-all duration-300" data-testid="stat-total-devices">
                <AnimatedCounter value={stats.totalDevices} />
              </p>
              <div className="flex items-center space-x-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <p className="text-xs text-green-600 dark:text-green-400">Managed devices</p>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Cpu className="w-6 h-6 text-primary group-hover:animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Active Deployments Card */}
      <Card className="group hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-300 hover:-translate-y-1">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Deployments</p>
              <p className="text-3xl font-bold text-foreground transition-all duration-300" data-testid="stat-active-deployments">
                <AnimatedCounter value={stats.activeDeployments} />
              </p>
              <div className="flex items-center space-x-1 mt-1">
                <Activity className="w-3 h-3 text-orange-500 animate-pulse" />
                <p className="text-xs text-orange-600 dark:text-orange-400">Currently running</p>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-500/5 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-6 h-6 text-orange-500 group-hover:animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Success Rate Card */}
      <Card className="group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-1">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-3xl font-bold text-foreground transition-all duration-300" data-testid="stat-success-rate">
                <AnimatedCounter value={stats.successRate} />%
              </p>
              <div className="flex items-center space-x-1 mt-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Last 30 days</p>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Shield className="w-6 h-6 text-emerald-500 group-hover:animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Images Available Card */}
      <Card className="group hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Images Available</p>
              <p className="text-3xl font-bold text-foreground transition-all duration-300" data-testid="stat-images-count">
                <AnimatedCounter value={stats.imagesCount} />
              </p>
              <div className="flex items-center space-x-1 mt-1">
                <Activity className="w-3 h-3 text-blue-500" />
                <p className="text-xs text-blue-600 dark:text-blue-400" data-testid="stat-total-size">
                  {formatBytes(stats.totalImageSize)} total
                </p>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Database className="w-6 h-6 text-blue-500 group-hover:animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
