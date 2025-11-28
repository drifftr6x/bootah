import { useState, useMemo } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface DeploymentMetrics {
  totalDeployments: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  successRate: number;
  deploymentsByStatus: { status: string; count: number }[];
  deploymentsByOS: { os: string; count: number }[];
  deploymentsByEngine: { engine: string; count: number }[];
  hourlyDeployments: { hour: string; count: number }[];
}

export default function Analytics() {
  const { data: metrics, isLoading } = useQuery<DeploymentMetrics>({
    queryKey: ["/api/analytics/deployments"],
  });

  const statusData = useMemo(() => [
    { name: "Completed", value: metrics?.successCount || 0, fill: "#10b981" },
    { name: "Failed", value: metrics?.failureCount || 0, fill: "#ef4444" },
    { name: "Other", value: (metrics?.totalDeployments || 0) - (metrics?.successCount || 0) - (metrics?.failureCount || 0), fill: "#f59e0b" }
  ], [metrics]);

  if (isLoading) return <div className="p-6">Loading analytics...</div>;

  return (
    <>
      <Header title="Analytics Dashboard" description="Deployment metrics and performance insights" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deployments</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalDeployments || 0}</div>
              <p className="text-xs text-muted-foreground">Across all imaging engines</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics?.successRate || 0).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{metrics?.successCount || 0} successful</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failures</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.failureCount || 0}</div>
              <p className="text-xs text-muted-foreground">Failed deployments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{((metrics?.averageDuration || 0) / 60).toFixed(1)}m</div>
              <p className="text-xs text-muted-foreground">Average deployment time</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deployment Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Deployment Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Deployments by Imaging Engine */}
          <Card>
            <CardHeader>
              <CardTitle>Deployments by Imaging Engine</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics?.deploymentsByEngine || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="engine" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Deployments by OS */}
          <Card>
            <CardHeader>
              <CardTitle>Deployments by Operating System</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics?.deploymentsByOS || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="os" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hourly Deployment Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Hourly Deployment Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics?.hourlyDeployments || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}