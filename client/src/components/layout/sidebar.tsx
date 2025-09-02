import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { ServerStatus } from "@shared/schema";
import {
  LayoutDashboard,
  Monitor,
  HardDrive,
  Zap,
  Wifi,
  Laptop,
  Activity,
  Settings,
  FileText,
  HelpCircle,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Device Management", href: "/devices", icon: Monitor },
  { name: "Image Library", href: "/images", icon: HardDrive },
  { name: "Deployments", href: "/deployments", icon: Zap },
  { name: "Network Discovery", href: "/network", icon: Wifi },
  { name: "Workstations", href: "/workstations", icon: Laptop },
  { name: "Monitoring", href: "/monitoring", icon: Activity },
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
  
  const { data: serverStatus } = useQuery<ServerStatus>({
    queryKey: ["/api/server-status"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-lg">B</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground">Bootah64x</h1>
            <p className="text-xs text-muted-foreground">v2.1.0</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 sidebar-scrollbar overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href}>
              <a
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </a>
            </Link>
          );
        })}
      </nav>
      
      {/* Server Status */}
      <div className="p-4 border-t border-sidebar-border">
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
      </div>
    </div>
  );
}
