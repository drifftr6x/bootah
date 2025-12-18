import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MulticastSession, MulticastParticipant, Image, Device } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Users, Play, XCircle, Trash2, Plus, Clock, CheckCircle, AlertCircle, Monitor } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import CreateMulticastSessionDialog from "@/components/dialogs/create-multicast-session-dialog";
import { Progress } from "@/components/ui/progress";

interface SessionWithDetails extends MulticastSession {
  image?: Image;
  participants?: (MulticastParticipant & { device?: Device })[];
}

export default function MulticastSessions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [sessionToStart, setSessionToStart] = useState<string | null>(null);
  const [sessionToCancel, setSessionToCancel] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: sessions, isLoading } = useQuery<MulticastSession[]>({
    queryKey: ["/api/multicast/sessions"],
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Fetch images for displaying session details
  const { data: images } = useQuery<Image[]>({
    queryKey: ["/api/images"],
  });

  const { data: devices } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  const startSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", `/api/multicast/sessions/${sessionId}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/multicast/sessions"] });
      toast({
        title: "UDP Multicast Started",
        description: "Multicast transmission has begun. Streaming image data to all participants.",
      });
      setSessionToStart(null);
    },
    onError: (error: any) => {
      toast({
        title: "Start Failed",
        description: error?.message || "Failed to start multicast transmission. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", `/api/multicast/sessions/${sessionId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/multicast/sessions"] });
      toast({
        title: "Transmission Cancelled",
        description: "Multicast UDP transmission has been stopped.",
      });
      setSessionToCancel(null);
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error?.message || "Failed to cancel multicast transmission. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("DELETE", `/api/multicast/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/multicast/sessions"] });
      toast({
        title: "Session Deleted",
        description: "Multicast session has been deleted successfully.",
      });
      setSessionToDelete(null);
    },
    onError: () => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete multicast session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "active":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "cancelled":
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "waiting":
        return <Clock className="w-4 h-4" />;
      case "active":
        return <Play className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "failed":
        return <AlertCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Radio className="w-4 h-4" />;
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "0 Bytes";
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatThroughput = (bytesPerSecond: number | null) => {
    if (!bytesPerSecond) return "0 Mbps";
    const mbps = (bytesPerSecond * 8) / (1024 * 1024);
    return mbps.toFixed(2) + ' Mbps';
  };

  const sessionsWithDetails: SessionWithDetails[] = sessions?.map(session => ({
    ...session,
    image: images?.find(img => img.id === session.imageId),
  })) || [];

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-multicast-sessions">
            Multicast Deployment Sessions
          </h1>
          <p className="text-muted-foreground mt-2">
            Deploy OS images to multiple devices simultaneously using multicast technology
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-session">
          <Plus className="w-4 h-4 mr-2" />
          Create Session
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Radio className="w-12 h-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
            <p className="text-muted-foreground">Loading multicast sessions...</p>
          </div>
        </div>
      ) : !sessionsWithDetails || sessionsWithDetails.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Radio className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Multicast Sessions</h3>
              <p className="text-muted-foreground mb-4">
                Create a multicast session to deploy images to multiple devices at once.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-session">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Session
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {sessionsWithDetails.map((session) => (
            <Card key={session.id} data-testid={`session-card-${session.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(session.status)}
                      <CardTitle className="text-xl">
                        {session.name}
                      </CardTitle>
                      <Badge variant="outline" className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      Image: {session.image?.name || "Unknown Image"} • Address: {session.multicastAddress}:{session.port}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {session.status === "waiting" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setSessionToStart(session.id)}
                        data-testid={`button-start-${session.id}`}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start
                      </Button>
                    )}
                    {session.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSessionToCancel(session.id)}
                        data-testid={`button-cancel-${session.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                    {(session.status === "completed" || session.status === "failed" || session.status === "cancelled") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSessionToDelete(session.id)}
                        data-testid={`button-delete-${session.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Session Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center space-x-2 mb-1">
                        <Users className="w-4 h-4 text-purple-600" />
                        <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300">Clients</h4>
                      </div>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {session.clientCount} / {session.maxClients}
                      </p>
                    </div>

                    {session.bytesSent !== null && session.bytesSent > 0 && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center space-x-2 mb-1">
                          <Radio className="w-4 h-4 text-blue-600" />
                          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">Transmitted</h4>
                        </div>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {formatBytes(session.bytesSent)}
                        </p>
                      </div>
                    )}

                    {session.throughput !== null && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center space-x-2 mb-1">
                          <Radio className="w-4 h-4 text-green-600" />
                          <h4 className="text-sm font-medium text-green-700 dark:text-green-300">Throughput</h4>
                        </div>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {formatThroughput(session.throughput)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar for Active Sessions */}
                  {session.status === "active" && session.image && session.bytesSent !== null && session.bytesSent > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Deployment Progress</span>
                        <span className="font-medium">
                          {Math.round((session.bytesSent / session.image.size) * 100)}%
                        </span>
                      </div>
                      <Progress value={(session.bytesSent / session.image.size) * 100} />
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="text-sm text-muted-foreground space-y-1">
                    {session.createdAt && (
                      <div>Created: {format(new Date(session.createdAt), "PPpp")}</div>
                    )}
                    {session.startedAt && (
                      <div>Started: {format(new Date(session.startedAt), "PPpp")}</div>
                    )}
                    {session.completedAt && (
                      <div>Completed: {format(new Date(session.completedAt), "PPpp")}</div>
                    )}
                  </div>

                  {session.description && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm">{session.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Session Dialog */}
      <CreateMulticastSessionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Start Confirmation Dialog */}
      <AlertDialog open={!!sessionToStart} onOpenChange={(open) => !open && setSessionToStart(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Multicast Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will begin the multicast deployment to all registered devices. Make sure all target devices are ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => sessionToStart && startSessionMutation.mutate(sessionToStart)}>
              Start Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!sessionToCancel} onOpenChange={(open) => !open && setSessionToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Multicast Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the active multicast deployment. All devices will stop receiving data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => sessionToCancel && cancelSessionMutation.mutate(sessionToCancel)}>
              Cancel Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multicast Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the multicast session and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => sessionToDelete && deleteSessionMutation.mutate(sessionToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
