import { useQuery } from "@tanstack/react-query";
import type { ProfileDeploymentBinding, TaskRun, PostDeploymentTask } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2, Clock, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostDeploymentProgressProps {
  deploymentId: string;
}

function getBindingStatusColor(status: string) {
  switch (status) {
    case "running":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    case "completed":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "failed":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "pending":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
  }
}

function getTaskStatusIcon(status: string) {
  switch (status) {
    case "running":
      return Loader2;
    case "completed":
      return CheckCircle2;
    case "failed":
      return XCircle;
    case "pending":
      return Clock;
    default:
      return Clock;
  }
}

export default function PostDeploymentProgress({ deploymentId }: PostDeploymentProgressProps) {
  const { data: bindings } = useQuery<ProfileDeploymentBinding[]>({
    queryKey: [`/api/deployments/${deploymentId}/profiles`],
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
  });

  const binding = bindings?.[0];

  // Don't show anything if no binding exists
  if (!binding) {
    return null;
  }

  const { data: taskRuns } = useQuery<TaskRun[]>({
    queryKey: [`/api/post-deployment/bindings/${binding.id}/task-runs`],
    enabled: !!binding.id,
    refetchInterval: binding.status === "running" ? 1000 : 5000, // Fast polling when running
  });

  const completedTasks = taskRuns?.filter(t => t.status === "completed").length || 0;
  const totalTasks = taskRuns?.length || 0;
  const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
            Post-Deployment Automation
          </span>
        </div>
        <Badge 
          variant="outline" 
          className={getBindingStatusColor(binding.status)}
        >
          {binding.status.charAt(0).toUpperCase() + binding.status.slice(1)}
        </Badge>
      </div>

      {/* Overall Progress */}
      {totalTasks > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-purple-600 dark:text-purple-400">
              Overall Progress
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400">
              {completedTasks}/{totalTasks} tasks
            </span>
          </div>
          <Progress 
            value={overallProgress} 
            className="h-1.5"
          />
        </div>
      )}

      {/* Task List */}
      {taskRuns && taskRuns.length > 0 && (
        <div className="space-y-1.5">
          {taskRuns.map((taskRun) => {
            const Icon = getTaskStatusIcon(taskRun.status);
            return (
              <div 
                key={taskRun.id} 
                className="flex items-center space-x-2 text-xs"
              >
                <Icon 
                  className={cn(
                    "w-3 h-3 flex-shrink-0",
                    taskRun.status === "running" && "animate-spin text-orange-600",
                    taskRun.status === "completed" && "text-emerald-600",
                    taskRun.status === "failed" && "text-red-600",
                    taskRun.status === "pending" && "text-blue-600"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "truncate",
                      taskRun.status === "completed" && "text-emerald-700 dark:text-emerald-400",
                      taskRun.status === "failed" && "text-red-700 dark:text-red-400",
                      taskRun.status === "running" && "text-orange-700 dark:text-orange-400",
                      taskRun.status === "pending" && "text-purple-600 dark:text-purple-400"
                    )}>
                      {taskRun.taskType}
                    </span>
                    {taskRun.status === "running" && taskRun.progress !== null && (
                      <span className="text-orange-600 dark:text-orange-400 ml-2">
                        {taskRun.progress}%
                      </span>
                    )}
                  </div>
                  {taskRun.status === "running" && taskRun.progress !== null && (
                    <Progress 
                      value={taskRun.progress} 
                      className="h-1 mt-1"
                    />
                  )}
                  {taskRun.status === "failed" && taskRun.errorMessage && (
                    <div className="text-red-600 dark:text-red-400 mt-0.5">
                      {taskRun.errorMessage}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
