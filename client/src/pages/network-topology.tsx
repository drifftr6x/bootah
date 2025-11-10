import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  BackgroundVariant,
  ReactFlowProvider
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TopologyData, NetworkSegment, DeviceConnection } from "@shared/schema";
import { Activity, Network, Server, Monitor, Camera, RotateCw, ZoomIn, ZoomOut, Maximize2, Save, Link as LinkIcon } from "lucide-react";

interface DeviceNodeData {
  label: string;
  status: string;
  ipAddress?: string;
  macAddress: string;
  manufacturer?: string;
  deploymentProgress?: number;
  deploymentStatus?: string;
}

const statusColors: Record<string, string> = {
  online: "#10b981",
  offline: "#6b7280",
  deploying: "#f59e0b",
  idle: "#3b82f6"
};

const deviceIcons: Record<string, JSX.Element> = {
  online: <Monitor className="h-6 w-6" />,
  offline: <Server className="h-6 w-6 opacity-50" />,
  deploying: <Activity className="h-6 w-6 animate-pulse" />,
  idle: <Monitor className="h-6 w-6" />
};

function DeviceNode({ data }: { data: DeviceNodeData }) {
  const color = statusColors[data.status] || statusColors.offline;
  
  return (
    <div
      className="px-4 py-3 rounded-lg border-2 shadow-lg bg-white dark:bg-gray-800 min-w-[180px]"
      style={{ borderColor: color }}
      data-testid={`node-device-${data.macAddress}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div style={{ color }}>{deviceIcons[data.status]}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
            {data.label}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {data.ipAddress || "No IP"}
          </div>
        </div>
      </div>
      
      {data.deploymentStatus === "deploying" && data.deploymentProgress !== undefined && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-gray-400">Deploying</span>
            <span className="text-gray-600 dark:text-gray-400">{Math.round(data.deploymentProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all"
              style={{ width: `${data.deploymentProgress}%` }}
            />
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-1 mt-2">
        <Badge
          variant={data.status === "online" ? "default" : "secondary"}
          className="text-xs"
        >
          {data.status}
        </Badge>
        {data.manufacturer && (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {data.manufacturer}
          </span>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  device: DeviceNode
};

function NetworkTopologyInner() {
  const { toast } = useToast();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { data: topology, isLoading, refetch } = useQuery<TopologyData>({
    queryKey: ["/api/topology"],
    refetchInterval: 5000
  });

  useEffect(() => {
    if (!topology) return;

    const deviceNodes: Node[] = topology.nodes.map((device, index) => ({
      id: device.id,
      type: "device",
      position: { 
        x: (index % 5) * 250 + 100, 
        y: Math.floor(index / 5) * 200 + 100 
      },
      data: {
        label: device.name,
        status: device.status,
        ipAddress: device.ipAddress || undefined,
        macAddress: device.macAddress,
        manufacturer: device.manufacturer || undefined,
        deploymentProgress: device.activeDeployment?.progress,
        deploymentStatus: device.activeDeployment?.status
      } as DeviceNodeData
    }));

    const connectionEdges: Edge[] = topology.edges.map(connection => ({
      id: connection.id,
      source: connection.sourceDeviceId || "",
      target: connection.targetDeviceId || "",
      type: "smoothstep",
      animated: connection.isActive || false,
      style: { 
        stroke: connection.isActive ? "#3b82f6" : "#9ca3af",
        strokeWidth: 2
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: connection.isActive ? "#3b82f6" : "#9ca3af"
      },
      label: connection.bandwidth ? `${connection.bandwidth} Mbps` : undefined,
      labelStyle: { fontSize: 10, fill: "#6b7280" }
    }));

    setNodes(deviceNodes);
    setEdges(connectionEdges);
  }, [topology, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const createSnapshotMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await fetch("/api/topology/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to create snapshot");
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Snapshot Created",
        description: "Network topology snapshot saved successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/topology/snapshots"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create topology snapshot",
        variant: "destructive"
      });
    }
  });

  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshotDescription, setSnapshotDescription] = useState("");

  const handleCreateSnapshot = () => {
    if (!snapshotName) {
      toast({
        title: "Validation Error",
        description: "Please enter a snapshot name",
        variant: "destructive"
      });
      return;
    }

    createSnapshotMutation.mutate({
      name: snapshotName,
      description: snapshotDescription
    });
    
    setSnapshotDialogOpen(false);
    setSnapshotName("");
    setSnapshotDescription("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading network topology...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Network className="h-6 w-6" />
              Network Topology
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Real-time visualization of your PXE network infrastructure
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              data-testid="button-refresh-topology"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Dialog open={snapshotDialogOpen} onOpenChange={setSnapshotDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-create-snapshot">
                  <Camera className="h-4 w-4 mr-2" />
                  Save Snapshot
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Topology Snapshot</DialogTitle>
                  <DialogDescription>
                    Save the current network topology state for future reference
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="snapshot-name">Snapshot Name</Label>
                    <Input
                      id="snapshot-name"
                      placeholder="e.g., Pre-deployment baseline"
                      value={snapshotName}
                      onChange={(e) => setSnapshotName(e.target.value)}
                      data-testid="input-snapshot-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="snapshot-description">Description (Optional)</Label>
                    <Textarea
                      id="snapshot-description"
                      placeholder="Add notes about this topology state..."
                      value={snapshotDescription}
                      onChange={(e) => setSnapshotDescription(e.target.value)}
                      data-testid="input-snapshot-description"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSnapshotDialogOpen(false)}
                    data-testid="button-cancel-snapshot"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateSnapshot}
                    disabled={createSnapshotMutation.isPending}
                    data-testid="button-save-snapshot"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {createSnapshotMutation.isPending ? "Saving..." : "Save Snapshot"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Offline</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Deploying</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Idle</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <LinkIcon className="h-3 w-3 text-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {topology?.edges.filter(e => e.isActive).length || 0} Active Connections
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          
          {selectedNode && (
            <Panel position="top-right">
              <Card className="w-80">
                <CardHeader>
                  <CardTitle className="text-lg">Device Details</CardTitle>
                  <CardDescription>
                    {(selectedNode.data as DeviceNodeData).macAddress}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="font-medium">{(selectedNode.data as DeviceNodeData).label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">IP Address:</span>
                    <span className="font-medium">
                      {(selectedNode.data as DeviceNodeData).ipAddress || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge variant={(selectedNode.data as DeviceNodeData).status === "online" ? "default" : "secondary"}>
                      {(selectedNode.data as DeviceNodeData).status}
                    </Badge>
                  </div>
                  {(selectedNode.data as DeviceNodeData).manufacturer && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Manufacturer:</span>
                      <span className="font-medium">
                        {(selectedNode.data as DeviceNodeData).manufacturer}
                      </span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedNode(null)}
                    data-testid="button-close-details"
                  >
                    Close
                  </Button>
                </CardContent>
              </Card>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

export default function NetworkTopology() {
  return (
    <ReactFlowProvider>
      <NetworkTopologyInner />
    </ReactFlowProvider>
  );
}
