import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { Device } from "@shared/schema";
import { Wifi, Monitor, Server, Router, Cable, Database, Cpu, Network, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkNode {
  id: string;
  type: 'server' | 'router' | 'device';
  name: string;
  status: 'online' | 'offline' | 'deploying';
  x: number;
  y: number;
}

export default function NetworkTopology() {
  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Network Topology</h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="min-h-[400px] bg-muted/50 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground">Loading network topology...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create network nodes
  const serverNode: NetworkNode = {
    id: 'server',
    type: 'server',
    name: 'Bootah64x Server',
    status: 'online',
    x: 50,
    y: 20
  };

  const routerNode: NetworkNode = {
    id: 'router',
    type: 'router',
    name: 'Network Router',
    status: 'online',
    x: 50,
    y: 50
  };

  const deviceNodes: NetworkNode[] = (devices || []).map((device, index) => ({
    id: device.id,
    type: 'device',
    name: device.name,
    status: device.status === 'online' ? 'online' : device.status === 'deploying' ? 'deploying' : 'offline',
    x: 20 + (index % 3) * 30,
    y: 70  // Moved up to leave space for bottom bar
  }));

  const allNodes = [serverNode, routerNode, ...deviceNodes];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10';
      case 'deploying':
        return 'text-orange-500 border-orange-500/50 bg-orange-500/10';
      case 'offline':
        return 'text-red-500 border-red-500/50 bg-red-500/10';
      default:
        return 'text-gray-500 border-gray-500/50 bg-gray-500/10';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'server':
        return Database;
      case 'router':
        return Network;
      case 'device':
        return Cpu;
      default:
        return Cpu;
    }
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Network Topology</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">Deploying</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-sm text-muted-foreground">Offline</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative min-h-[400px] h-auto bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border border-border overflow-hidden pb-16">
          
          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            
            {/* Server to Router */}
            <line
              x1={`${serverNode.x}%`}
              y1={`${serverNode.y + 5}%`}
              x2={`${routerNode.x}%`}
              y2={`${routerNode.y - 5}%`}
              stroke="url(#connectionGradient)"
              strokeWidth="2"
              className="animate-pulse"
            />
            
            {/* Router to Devices */}
            {deviceNodes.map((device) => (
              <line
                key={device.id}
                x1={`${routerNode.x}%`}
                y1={`${routerNode.y + 5}%`}
                x2={`${device.x}%`}
                y2={`${device.y - 5}%`}
                stroke="url(#connectionGradient)"
                strokeWidth="1.5"
                strokeOpacity={device.status === 'online' || device.status === 'deploying' ? 1 : 0.3}
                className={cn(
                  device.status === 'online' || device.status === 'deploying' ? "animate-pulse" : ""
                )}
              />
            ))}
            
            {/* Data Flow Animation */}
            {deviceNodes.filter(d => d.status === 'deploying').map((device) => (
              <circle
                key={`flow-${device.id}`}
                r="3"
                fill="#f59e0b"
                className="animate-ping"
              >
                <animateMotion
                  dur="2s"
                  repeatCount="indefinite"
                  path={`M ${routerNode.x * 3.2} ${routerNode.y * 3.2} L ${device.x * 3.2} ${device.y * 3.2}`}
                />
              </circle>
            ))}
          </svg>

          {/* Network Nodes */}
          {allNodes.map((node) => {
            const Icon = getIcon(node.type);
            return (
              <div
                key={node.id}
                className={cn(
                  "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500",
                  "flex flex-col items-center space-y-2"
                )}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                <div
                  className={cn(
                    "relative w-16 h-16 rounded-xl border-2 flex items-center justify-center",
                    "transition-all duration-300 hover:scale-110",
                    getStatusColor(node.status)
                  )}
                  data-testid={`node-${node.type}-${node.id}`}
                >
                  <Icon className="w-8 h-8" />
                  
                  {/* Status Indicator */}
                  <div
                    className={cn(
                      "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background",
                      node.status === 'online' ? "bg-emerald-500" : 
                      node.status === 'deploying' ? "bg-orange-500 animate-pulse" : 
                      "bg-red-500"
                    )}
                  />
                  
                  {/* Activity Ring for Online/Deploying Devices */}
                  {(node.status === 'online' || node.status === 'deploying') && (
                    <div className="absolute inset-0 rounded-xl border-2 border-cyan-500/30 animate-ping" />
                  )}
                </div>
                
                <div className="text-center">
                  <div className="text-xs font-medium text-foreground max-w-20 truncate">
                    {node.name}
                  </div>
                  <div className={cn(
                    "text-xs capitalize",
                    node.status === 'online' ? "text-emerald-600 dark:text-emerald-400" :
                    node.status === 'deploying' ? "text-orange-600 dark:text-orange-400" :
                    "text-red-600 dark:text-red-400"
                  )}>
                    {node.status}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Network Activity Indicators */}
          <div className="absolute bottom-3 left-3 right-3 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Network className="w-4 h-4 text-cyan-500" />
                <span className="text-sm text-muted-foreground">
                  {deviceNodes.filter(d => d.status === 'online').length} Active
                </span>
              </div>
              {deviceNodes.some(d => d.status === 'deploying') && (
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span className="text-sm text-orange-600 dark:text-orange-400">
                    {deviceNodes.filter(d => d.status === 'deploying').length} Deploying
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}