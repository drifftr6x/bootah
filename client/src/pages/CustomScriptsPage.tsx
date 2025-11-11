import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomScriptSchema, type CustomScript } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, FileCode } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const formSchema = insertCustomScriptSchema.extend({
  description: z.string().nullable().transform(val => val ?? ""),
  parameters: z.string().nullable().transform(val => val ?? ""),
  environmentVars: z.string().nullable().transform(val => val ?? ""),
  isActive: z.boolean().nullable().transform(val => val ?? true),
  supportedOS: z.array(z.string()).min(1, "At least one OS must be selected"),
});

type FormData = z.infer<typeof formSchema>;

export default function CustomScriptsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<CustomScript | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: scripts = [], isLoading } = useQuery<CustomScript[]>({
    queryKey: ["/api/post-deployment/custom-scripts"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      scriptContent: "",
      scriptType: "powershell",
      executionPhase: "post_image",
      supportedOS: [],
      runAsAdmin: true,
      timeoutMinutes: 10,
      retryCount: 1,
      parameters: "",
      environmentVars: "",
      isActive: true,
      createdBy: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", "/api/post-deployment/custom-scripts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/custom-scripts"] });
      toast({ title: "Custom script created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create script", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => 
      apiRequest("PATCH", `/api/post-deployment/custom-scripts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/custom-scripts"] });
      toast({ title: "Custom script updated successfully" });
      setIsDialogOpen(false);
      setEditingScript(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update script", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/post-deployment/custom-scripts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/custom-scripts"] });
      toast({ title: "Custom script deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete script", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (script: CustomScript) => {
    setEditingScript(script);
    form.reset({
      name: script.name,
      description: script.description ?? "",
      scriptContent: script.scriptContent,
      scriptType: script.scriptType as "bash" | "powershell" | "python" | "batch",
      executionPhase: script.executionPhase as "pre_image" | "post_image" | "post_snapin" | "post_domain",
      supportedOS: script.supportedOS,
      runAsAdmin: script.runAsAdmin ?? true,
      timeoutMinutes: script.timeoutMinutes ?? 10,
      retryCount: script.retryCount ?? 1,
      parameters: script.parameters ?? "",
      environmentVars: script.environmentVars ?? "",
      isActive: script.isActive === null ? true : script.isActive,
      createdBy: undefined,
    });
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingScript(null);
      form.reset();
    }
  };

  const onSubmit = (data: FormData) => {
    if (editingScript) {
      updateMutation.mutate({ id: editingScript.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Custom Scripts</h1>
          <p className="text-muted-foreground">Manage custom scripts for advanced post-deployment automation</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-script">
              <Plus className="h-4 w-4 mr-2" />
              Add Script
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingScript ? "Edit Custom Script" : "Create Custom Script"}</DialogTitle>
              <DialogDescription>
                Configure custom scripts to run during deployment workflow
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Script Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Install Custom Drivers" data-testid="input-script-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Installs manufacturer-specific drivers" data-testid="input-script-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="scriptType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Script Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-script-type">
                              <SelectValue placeholder="Select script type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="powershell">PowerShell</SelectItem>
                            <SelectItem value="bash">Bash</SelectItem>
                            <SelectItem value="batch">Batch</SelectItem>
                            <SelectItem value="python">Python</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="executionPhase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Execution Phase</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-execution-phase">
                              <SelectValue placeholder="Select phase" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pre_image">Pre-Image</SelectItem>
                            <SelectItem value="post_image">Post-Image</SelectItem>
                            <SelectItem value="post_snapin">Post-Snapin</SelectItem>
                            <SelectItem value="post_domain">Post-Domain</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="scriptContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Script Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Write-Host 'Installing drivers...'&#10;# Your script here" 
                          className="font-mono text-sm min-h-[200px]" 
                          data-testid="input-script-content" 
                        />
                      </FormControl>
                      <FormDescription>Full script code to execute</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supportedOS"
                  render={() => (
                    <FormItem>
                      <FormLabel>Supported Operating Systems</FormLabel>
                      <div className="space-y-2">
                        {["windows", "linux", "macos"].map((os) => (
                          <FormField
                            key={os}
                            control={form.control}
                            name="supportedOS"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(os)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      const updated = checked
                                        ? [...current, os]
                                        : current.filter((v) => v !== os);
                                      field.onChange(updated);
                                    }}
                                    data-testid={`checkbox-os-${os}`}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal capitalize">{os}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="timeoutMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timeout (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? 10} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))} 
                            data-testid="input-timeout" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="retryCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retry Count</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? 1} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))} 
                            data-testid="input-retry-count" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="parameters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parameters (JSON)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder='{"driverPath": "C:\\Drivers", "silent": true}' className="font-mono text-sm" data-testid="input-parameters" />
                      </FormControl>
                      <FormDescription>Optional: Script parameters as JSON</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="environmentVars"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Environment Variables (JSON)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder='{"CUSTOM_VAR": "value", "DEBUG": "true"}' className="font-mono text-sm" data-testid="input-environment-vars" />
                      </FormControl>
                      <FormDescription>Optional: Environment variables as JSON</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="runAsAdmin"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Run as Administrator</FormLabel>
                        <FormDescription>
                          Execute with elevated privileges
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                          data-testid="switch-run-as-admin"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Script</FormLabel>
                        <FormDescription>
                          Enable this script for deployment
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-script-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingScript ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Alert className="mb-6">
        <FileCode className="h-4 w-4" />
        <AlertDescription>
          Custom scripts enable advanced automation during deployment. Supports PowerShell, Bash, Batch, and Python.
          Scripts can run at different phases: pre-image, post-image, post-snapin, or post-domain.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-2/3 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : scripts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileCode className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Custom Scripts</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create custom scripts to run during deployment for advanced automation
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-script">
              <Plus className="h-4 w-4 mr-2" />
              Add First Script
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scripts.map((script) => (
            <Card key={script.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl" data-testid={`text-script-name-${script.id}`}>{script.name}</CardTitle>
                      <Badge variant={script.isActive ? "default" : "secondary"} data-testid={`badge-script-status-${script.id}`}>
                        {script.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-script-type-${script.id}`}>
                        {script.scriptType}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-execution-phase-${script.id}`}>
                        {script.executionPhase.replace("_", "-")}
                      </Badge>
                    </div>
                    {script.description && (
                      <CardDescription className="mt-2" data-testid={`text-script-description-${script.id}`}>
                        {script.description}
                      </CardDescription>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Supported OS:</span>{" "}
                        <span className="font-medium" data-testid={`text-script-os-${script.id}`}>
                          {script.supportedOS.map((os) => os.charAt(0).toUpperCase() + os.slice(1)).join(", ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Timeout:</span>{" "}
                        <span className="font-medium" data-testid={`text-script-timeout-${script.id}`}>
                          {script.timeoutMinutes} min
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Run as Admin:</span>{" "}
                        <span className="font-medium" data-testid={`text-script-admin-${script.id}`}>
                          {script.runAsAdmin ? "Yes" : "No"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Retry Count:</span>{" "}
                        <span className="font-medium" data-testid={`text-script-retry-${script.id}`}>
                          {script.retryCount}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(script)}
                      data-testid={`button-edit-script-${script.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteId(script.id)}
                      data-testid={`button-delete-script-${script.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this custom script. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
