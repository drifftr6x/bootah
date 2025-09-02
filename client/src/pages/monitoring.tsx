import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert as UIAlert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertAlertRuleSchema, type Alert as AlertType, type AlertRule, type SystemMetrics } from "@shared/schema";
import { z } from "zod";
import { 
  Activity, 
  AlertTriangle, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Network, 
  Thermometer,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  BellRing
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AlertRuleFormData = z.infer<typeof insertAlertRuleSchema>;

const severityColors = {
  info: "bg-blue-500",
  warning: "bg-yellow-500", 
  error: "bg-orange-500",
  critical: "bg-red-500"
};

const metricIcons = {
  cpu: Cpu,
  memory: MemoryStick,
  disk: HardDrive,
  network: Network,
  temperature: Thermometer
};

// Mock data generator for system metrics
const generateMockMetrics = (): SystemMetrics => ({
  id: "latest",
  timestamp: new Date(),
  cpuUsage: Math.random() * 100,
  memoryUsage: Math.random() * 100,
  memoryTotal: 16 * 1024 * 1024 * 1024, // 16GB
  memoryUsed: Math.random() * 16 * 1024 * 1024 * 1024,
  diskUsage: Math.random() * 100,
  diskTotal: 1000 * 1024 * 1024 * 1024, // 1TB
  diskUsed: Math.random() * 1000 * 1024 * 1024 * 1024,
  networkThroughputIn: Math.random() * 100,
  networkThroughputOut: Math.random() * 50,
  activeConnections: Math.floor(Math.random() * 50),
  temperature: 35 + Math.random() * 20 // 35-55°C
});

export default function MonitoringPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");

  // Mock queries - replace with real API calls later
  const { data: latestMetrics } = useQuery<SystemMetrics>({
    queryKey: ["/api/system-metrics/latest"],
    queryFn: () => Promise.resolve(generateMockMetrics()),
    refetchInterval: 2000,
  });

  const { data: alerts = [] } = useQuery<AlertType[]>({
    queryKey: ["/api/alerts"],
    queryFn: () => Promise.resolve([]),
  });

  const { data: alertRules = [] } = useQuery<AlertRule[]>({
    queryKey: ["/api/alert-rules"],
    queryFn: () => Promise.resolve([]),
  });

  // Form for creating alert rules
  const form = useForm<AlertRuleFormData>({
    resolver: zodResolver(insertAlertRuleSchema),
    defaultValues: {
      name: "",
      metric: "cpu",
      condition: "greater_than",
      threshold: 80,
      severity: "warning",
      isEnabled: true,
    },
  });

  const handleCreateAlertRule = (data: AlertRuleFormData) => {
    console.log("Creating alert rule:", data);
    toast({ title: "Alert rule created successfully" });
    form.reset();
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getStatusColor = (value: number, metric: string) => {
    if (metric === "cpu" || metric === "memory" || metric === "disk") {
      if (value >= 90) return "text-red-500";
      if (value >= 75) return "text-yellow-500";
      return "text-green-500";
    }
    return "text-cyan-400";
  };

  return (
    <div className="p-6" data-testid="monitoring-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            System Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time system health and performance monitoring
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" data-testid="tab-overview">System Overview</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts & Notifications</TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules">Alert Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Real-time System Metrics */}
          {latestMetrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card data-testid="metric-cpu">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                  <Cpu className="h-4 w-4 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getStatusColor(latestMetrics.cpuUsage, 'cpu')}`}>
                    {latestMetrics.cpuUsage.toFixed(1)}%
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-cyan-400 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${latestMetrics.cpuUsage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="metric-memory">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                  <MemoryStick className="h-4 w-4 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getStatusColor(latestMetrics.memoryUsage, 'memory')}`}>
                    {latestMetrics.memoryUsage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(latestMetrics.memoryUsed)} / {formatBytes(latestMetrics.memoryTotal)}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-cyan-400 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${latestMetrics.memoryUsage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="metric-disk">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
                  <HardDrive className="h-4 w-4 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getStatusColor(latestMetrics.diskUsage, 'disk')}`}>
                    {latestMetrics.diskUsage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(latestMetrics.diskUsed)} / {formatBytes(latestMetrics.diskTotal)}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-cyan-400 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${latestMetrics.diskUsage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="metric-network">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Network Activity</CardTitle>
                  <Network className="h-4 w-4 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-cyan-400">
                    {latestMetrics.activeConnections || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ↓ {(latestMetrics.networkThroughputIn || 0).toFixed(1)} MB/s
                    ↑ {(latestMetrics.networkThroughputOut || 0).toFixed(1)} MB/s
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                System Status
              </CardTitle>
              <CardDescription>
                Overall system health and monitoring status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">Monitoring Service</span>
                  <Badge variant="default" className="bg-green-500">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">Alert System</span>
                  <Badge variant="default" className="bg-green-500">Operational</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">Data Collection</span>
                  <Badge variant="default" className="bg-green-500">Running</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">System Temperature</span>
                  <span className="text-sm text-muted-foreground">
                    {latestMetrics?.temperature?.toFixed(1)}°C
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
              <p className="text-muted-foreground text-center">
                Your system is running smoothly. All monitored metrics are within normal ranges.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          {/* Create Alert Rule Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Alert Rule
              </CardTitle>
              <CardDescription>
                Set up automated alerts based on system metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateAlertRule)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rule Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="High CPU Usage Alert" 
                              {...field} 
                              data-testid="input-rule-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="metric"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Metric</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-metric">
                                <SelectValue placeholder="Select metric" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cpu">CPU Usage (%)</SelectItem>
                              <SelectItem value="memory">Memory Usage (%)</SelectItem>
                              <SelectItem value="disk">Disk Usage (%)</SelectItem>
                              <SelectItem value="network">Network Activity</SelectItem>
                              <SelectItem value="temperature">Temperature (°C)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-condition">
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="greater_than">Greater than</SelectItem>
                              <SelectItem value="less_than">Less than</SelectItem>
                              <SelectItem value="equals">Equals</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="threshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Threshold</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="80" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-threshold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Severity</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-severity">
                                <SelectValue placeholder="Select severity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="info">Info</SelectItem>
                              <SelectItem value="warning">Warning</SelectItem>
                              <SelectItem value="error">Error</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    data-testid="button-create-rule"
                  >
                    Create Alert Rule
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Existing Alert Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Alert Rules</CardTitle>
              <CardDescription>
                Manage your automated alert configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Alert Rules</h3>
                <p className="text-muted-foreground">
                  Create your first alert rule to start monitoring system metrics.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}