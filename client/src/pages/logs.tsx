import { useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import type { ActivityLog } from "@shared/schema";
import { Search, FileText, Download, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function getLogTypeColor(type: string) {
  switch (type) {
    case "deployment":
      return "bg-primary/10 text-primary border-primary/20";
    case "discovery":
      return "bg-secondary/10 text-secondary border-secondary/20";
    case "info":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "error":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getLogIcon(type: string) {
  switch (type) {
    case "deployment":
      return "📦";
    case "discovery":
      return "🔍";
    case "info":
      return "ℹ️";
    case "error":
      return "❌";
    default:
      return "📝";
  }
}

export default function Logs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: logs, isLoading, refetch } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const filteredLogs = logs?.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || log.type === filterType;
    return matchesSearch && matchesType;
  }) || [];

  const handleExportLogs = () => {
    if (!logs) return;
    
    const csvContent = [
      ["Timestamp", "Type", "Message", "Device ID", "Deployment ID"].join(","),
      ...logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.type,
        `"${log.message.replace(/"/g, '""')}"`, // Escape quotes in CSV
        log.deviceId || "",
        log.deploymentId || "",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bootah64x-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header 
        title="Logs & History" 
        description="View system logs and deployment audit trails" 
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        {/* Search and Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-logs"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40" data-testid="select-filter-type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deployment">Deployment</SelectItem>
                <SelectItem value="discovery">Discovery</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              data-testid="button-refresh-logs"
            >
              <Filter className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportLogs}
              disabled={!logs || logs.length === 0}
              data-testid="button-export-logs"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">System Logs</h3>
              <div className="text-sm text-muted-foreground" data-testid="text-log-count">
                {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">No Logs Found</h4>
                <p className="text-muted-foreground" data-testid="text-no-logs">
                  {searchTerm || filterType !== "all" 
                    ? "No logs match your search or filter criteria." 
                    : "No system logs are available yet."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Timestamp</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Message</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Device</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Time Ago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, index) => (
                      <tr 
                        key={log.id} 
                        className={`table-row-hover ${index < filteredLogs.length - 1 ? 'border-b border-border' : ''}`}
                        data-testid={`row-log-${log.id}`}
                      >
                        <td className="p-4">
                          <div className="text-sm font-mono text-muted-foreground" data-testid={`text-timestamp-${log.id}`}>
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant="outline" 
                            className={getLogTypeColor(log.type)}
                            data-testid={`badge-log-type-${log.id}`}
                          >
                            <span className="mr-1">{getLogIcon(log.type)}</span>
                            {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground max-w-md" data-testid={`text-message-${log.id}`}>
                            {log.message}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-muted-foreground" data-testid={`text-device-${log.id}`}>
                            {log.deviceId ? `Device: ${log.deviceId.slice(0, 8)}...` : "-"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-muted-foreground" data-testid={`text-time-ago-${log.id}`}>
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground" data-testid="stat-total-logs">
                  {logs?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Logs</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary" data-testid="stat-deployment-logs">
                  {logs?.filter(log => log.type === "deployment").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Deployment Logs</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary" data-testid="stat-discovery-logs">
                  {logs?.filter(log => log.type === "discovery").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Discovery Logs</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive" data-testid="stat-error-logs">
                  {logs?.filter(log => log.type === "error").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Error Logs</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
