import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { ServerStatus } from "@shared/schema";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Monitor,
  HardDrive,
  Camera,
  Zap,
  Calendar,
  Wifi,
  Laptop,
  Activity,
  Settings,
  FileText,
  HelpCircle,
  Users,
  Workflow,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Device Management", href: "/devices", icon: Monitor },
  { name: "Image Library", href: "/images", icon: HardDrive },
  { name: "Image Capture", href: "/capture", icon: Camera },
  { name: "Deployments", href: "/deployments", icon: Zap },
  { name: "Scheduled", href: "/scheduled", icon: Calendar },
  { name: "Templates", href: "/templates", icon: Workflow },
  { name: "Network Discovery", href: "/network", icon: Wifi },
  { name: "Workstations", href: "/workstations", icon: Laptop },
  { name: "Monitoring", href: "/monitoring", icon: Activity },
  { name: "Security Center", href: "/security", icon: Shield },
  { name: "User Management", href: "/users", icon: Users },
  { name: "Configuration", href: "/configuration", icon: Settings },
  { name: "Logs & History", href: "/logs", icon: FileText },
  { name: "Help & Support", href: "/help", icon: HelpCircle },
];

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

export default function Sidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { data: serverStatus } = useQuery<ServerStatus>({
    queryKey: ["/api/server-status"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  return (
    <div className={cn(
      "bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo/Brand */}
      <div className={cn(
        "border-b border-sidebar-border flex items-center",
        isCollapsed ? "p-3 justify-center" : "p-6"
      )}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-sidebar-primary-foreground font-bold text-lg">B</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <h1 className="text-xl font-bold text-sidebar-foreground">Bootah64x</h1>
              <p className="text-xs text-muted-foreground">v2.1.0</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(true)}
            className="ml-2 p-1 h-6 w-6 text-muted-foreground hover:text-sidebar-foreground"
            data-testid="button-collapse-sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {/* Navigation */}
      <nav className={cn(
        "flex-1 space-y-2 sidebar-scrollbar overflow-y-auto",
        isCollapsed ? "p-2" : "p-4"
      )}>
        {isCollapsed && (
          <div className="mb-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(false)}
              className="p-1 h-8 w-8 text-muted-foreground hover:text-sidebar-foreground"
              data-testid="button-expand-sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
        {navigation.map((item) => {
          const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href}>
              <a
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors",
                  isCollapsed 
                    ? "justify-center p-2 h-10 w-10 mx-auto" 
                    : "space-x-3 px-3 py-2",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={cn("w-5 h-5", isCollapsed ? "flex-shrink-0" : "")} />
                {!isCollapsed && <span>{item.name}</span>}
              </a>
            </Link>
          );
        })}
      </nav>
      
      {/* Server Status */}
      <div className={cn(
        "border-t border-sidebar-border",
        isCollapsed ? "p-2" : "p-4"
      )}>
        {isCollapsed ? (
          <div className="flex justify-center">
            <span 
              className={cn(
                "status-indicator",
                serverStatus?.pxeServerStatus ? "status-online" : "status-offline"
              )}
              title={`PXE Server: ${serverStatus?.pxeServerStatus ? "ONLINE" : "OFFLINE"}`}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span 
                  className={cn(
                    "status-indicator",
                    serverStatus?.pxeServerStatus ? "status-online" : "status-offline"
                  )}
                />
                <span className="text-sm text-muted-foreground">PXE Server</span>
              </div>
              <span 
                className={cn(
                  "text-xs font-medium",
                  serverStatus?.pxeServerStatus ? "text-secondary" : "text-destructive"
                )}
                data-testid="server-status"
              >
                {serverStatus?.pxeServerStatus ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
            {serverStatus && (
              <div className="mt-2 text-xs text-muted-foreground">
                <div data-testid="server-ip">{serverStatus.serverIp}:67</div>
                <div data-testid="server-uptime">
                  Uptime: {formatUptime(serverStatus.uptime || 0)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
