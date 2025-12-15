import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Pencil, Trash2, Send, History, Loader2, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import type { WebhookSubscription, WebhookDelivery } from "@shared/schema";

const WEBHOOK_EVENTS = [
  { id: "device_discovered", label: "Device Discovered", description: "When a new device is detected on the network" },
  { id: "device_online", label: "Device Online", description: "When a device comes online" },
  { id: "device_offline", label: "Device Offline", description: "When a device goes offline" },
  { id: "deployment_started", label: "Deployment Started", description: "When an OS deployment begins" },
  { id: "deployment_completed", label: "Deployment Completed", description: "When an OS deployment finishes successfully" },
  { id: "deployment_failed", label: "Deployment Failed", description: "When an OS deployment fails" },
  { id: "image_capture_completed", label: "Image Capture Completed", description: "When image capture finishes" },
  { id: "multicast_session_completed", label: "Multicast Session Completed", description: "When a multicast session ends" },
];

interface WebhookFormData {
  name: string;
  description: string;
  url: string;
  secret: string;
  events: string[];
  headers: Record<string, string>;
  isEnabled: boolean;
}

function WebhookForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading 
}: { 
  initialData?: WebhookSubscription; 
  onSubmit: (data: WebhookFormData) => void; 
  onCancel: () => void; 
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<WebhookFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    url: initialData?.url || "",
    secret: initialData?.secret || "",
    events: initialData?.events || [],
    headers: (initialData?.headers as Record<string, string>) || {},
    isEnabled: initialData?.isEnabled ?? true,
  });
  const [headersText, setHeadersText] = useState(
    Object.entries(formData.headers).map(([k, v]) => `${k}: ${v}`).join("\n")
  );

  const handleEventToggle = (eventId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      events: checked 
        ? [...prev.events, eventId]
        : prev.events.filter(e => e !== eventId)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const headers: Record<string, string> = {};
    headersText.split("\n").filter(line => line.includes(":")).forEach(line => {
      const [key, ...valueParts] = line.split(":");
      headers[key.trim()] = valueParts.join(":").trim();
    });
    onSubmit({ ...formData, headers });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            data-testid="input-webhook-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="My Webhook"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            data-testid="input-webhook-description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="url">Endpoint URL</Label>
          <Input
            id="url"
            data-testid="input-webhook-url"
            type="url"
            value={formData.url}
            onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://example.com/webhook"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="secret">Secret (for HMAC signing)</Label>
          <Input
            id="secret"
            data-testid="input-webhook-secret"
            type="password"
            value={formData.secret}
            onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
            placeholder="Optional secret key"
          />
        </div>
        <div className="grid gap-2">
          <Label>Events to Subscribe</Label>
          <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
            {WEBHOOK_EVENTS.map(event => (
              <div key={event.id} className="flex items-start space-x-2">
                <Checkbox
                  id={event.id}
                  data-testid={`checkbox-event-${event.id}`}
                  checked={formData.events.includes(event.id)}
                  onCheckedChange={(checked) => handleEventToggle(event.id, !!checked)}
                />
                <div className="grid gap-0.5 leading-none">
                  <label htmlFor={event.id} className="text-sm font-medium cursor-pointer">
                    {event.label}
                  </label>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="headers">Custom Headers (one per line, format: Header-Name: value)</Label>
          <Textarea
            id="headers"
            data-testid="input-webhook-headers"
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
            placeholder="Authorization: Bearer token&#10;X-Custom-Header: value"
            rows={3}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            data-testid="switch-webhook-enabled"
            checked={formData.isEnabled}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
          />
          <Label htmlFor="enabled">Enabled</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-webhook">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || formData.events.length === 0} data-testid="button-save-webhook">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update" : "Create"} Webhook
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeliveryHistoryDialog({ subscriptionId, subscriptionName }: { subscriptionId: string; subscriptionName: string }) {
  const [open, setOpen] = useState(false);

  const { data: deliveries, isLoading } = useQuery<WebhookDelivery[]>({
    queryKey: ["/api/webhooks", subscriptionId, "deliveries"],
    enabled: open,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`button-webhook-history-${subscriptionId}`}>
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delivery History: {subscriptionName}</DialogTitle>
          <DialogDescription>Recent webhook delivery attempts and their status</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : deliveries && deliveries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>HTTP Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id} data-testid={`row-delivery-${delivery.id}`}>
                  <TableCell className="flex items-center gap-2">
                    {getStatusIcon(delivery.status)}
                    <span className="capitalize">{delivery.status}</span>
                  </TableCell>
                  <TableCell>{delivery.event}</TableCell>
                  <TableCell>{delivery.httpStatus || "-"}</TableCell>
                  <TableCell>{delivery.attempts}</TableCell>
                  <TableCell>
                    {delivery.createdAt ? new Date(delivery.createdAt).toLocaleString() : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-4">No delivery history yet</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function WebhooksPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookSubscription | null>(null);
  const [deleteWebhook, setDeleteWebhook] = useState<WebhookSubscription | null>(null);

  const { data: webhooks, isLoading } = useQuery<WebhookSubscription[]>({
    queryKey: ["/api/webhooks"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: WebhookFormData) => {
      return apiRequest("POST", "/api/webhooks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setCreateDialogOpen(false);
      toast({ title: "Webhook created", description: "The webhook subscription has been created successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: WebhookFormData }) => {
      return apiRequest("PUT", `/api/webhooks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setEditingWebhook(null);
      toast({ title: "Webhook updated", description: "The webhook subscription has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setDeleteWebhook(null);
      toast({ title: "Webhook deleted", description: "The webhook subscription has been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/webhooks/${id}/test`, {});
    },
    onSuccess: () => {
      toast({ title: "Test sent", description: "A test webhook has been sent to the endpoint." });
    },
    onError: (error: Error) => {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      return apiRequest("PUT", `/api/webhooks/${id}`, { isEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Webhooks</h1>
          <p className="text-muted-foreground">Configure HTTP callbacks for system events</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-webhook">
              <Plus className="mr-2 h-4 w-4" />
              Create Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>Configure a new webhook subscription for system events</DialogDescription>
            </DialogHeader>
            <WebhookForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setCreateDialogOpen(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="events" data-testid="tab-events">Available Events</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : webhooks && webhooks.length > 0 ? (
            <div className="grid gap-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id} data-testid={`card-webhook-${webhook.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={webhook.isEnabled ?? true}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: webhook.id, isEnabled: checked })}
                          data-testid={`switch-webhook-toggle-${webhook.id}`}
                        />
                        <div>
                          <CardTitle className="text-lg">{webhook.name}</CardTitle>
                          {webhook.description && (
                            <CardDescription>{webhook.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => testMutation.mutate(webhook.id)}
                          disabled={testMutation.isPending}
                          data-testid={`button-test-webhook-${webhook.id}`}
                        >
                          {testMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                        <DeliveryHistoryDialog subscriptionId={webhook.id} subscriptionName={webhook.name} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingWebhook(webhook)}
                          data-testid={`button-edit-webhook-${webhook.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteWebhook(webhook)}
                          data-testid={`button-delete-webhook-${webhook.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">URL:</span>
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">{webhook.url}</code>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">Events:</span>
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="secondary" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Webhooks Configured</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create a webhook to receive HTTP callbacks when system events occur.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-webhook-empty">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Webhook
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Available Events</CardTitle>
              <CardDescription>These events can trigger webhook notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {WEBHOOK_EVENTS.map((event) => (
                    <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                      <TableCell>
                        <code className="bg-muted px-2 py-0.5 rounded text-sm">{event.id}</code>
                      </TableCell>
                      <TableCell>{event.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingWebhook} onOpenChange={(open) => !open && setEditingWebhook(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>Update the webhook subscription configuration</DialogDescription>
          </DialogHeader>
          {editingWebhook && (
            <WebhookForm
              initialData={editingWebhook}
              onSubmit={(data) => updateMutation.mutate({ id: editingWebhook.id, data })}
              onCancel={() => setEditingWebhook(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteWebhook}
        onOpenChange={(open) => !open && setDeleteWebhook(null)}
        title="Delete Webhook"
        description={`Are you sure you want to delete the webhook "${deleteWebhook?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => deleteWebhook && deleteMutation.mutate(deleteWebhook.id)}
        variant="destructive"
      />
    </div>
  );
}
