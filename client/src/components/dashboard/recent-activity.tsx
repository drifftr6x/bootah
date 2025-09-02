import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { ActivityLog } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

function getActivityColor(type: string) {
  switch (type) {
    case "deployment":
      return "bg-secondary";
    case "discovery":
      return "bg-primary";
    case "info":
      return "bg-secondary";
    case "error":
      return "bg-destructive";
    default:
      return "bg-muted-foreground";
  }
}

export default function RecentActivity() {
  const { data: activityLogs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  return (
    <Card>
      <CardHeader className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-start space-x-3">
                <div className="w-2 h-2 bg-muted rounded-full mt-2" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : !activityLogs || activityLogs.length === 0 ? (
          <p className="text-muted-foreground text-center" data-testid="text-no-activity">
            No recent activity
          </p>
        ) : (
          <div className="space-y-4">
            {activityLogs.slice(0, 6).map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start space-x-3"
                data-testid={`activity-${activity.id}`}
              >
                <div className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(activity.type)}`} />
                <div className="flex-1">
                  <p className="text-sm text-foreground" data-testid={`text-activity-message-${activity.id}`}>
                    {activity.message}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-activity-time-${activity.id}`}>
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
