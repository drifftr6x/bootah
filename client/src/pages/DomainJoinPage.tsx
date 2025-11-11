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
import { insertDomainJoinConfigSchema, type DomainJoinConfig, type InsertDomainJoinConfig } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Server, Eye, EyeOff } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const formSchema = insertDomainJoinConfigSchema.extend({
  username: z.string().min(1, "Username is required").or(z.literal("••••••••")),
  password: z.string().min(1, "Password is required").or(z.literal("••••••••")),
  supportedOS: z.array(z.string()).min(1, "At least one OS must be selected"),
  description: z.string().nullable().transform(val => val ?? ""),
  domainController: z.string().nullable().transform(val => val ?? ""),
  organizationalUnit: z.string().nullable().transform(val => val ?? ""),
  windowsConfig: z.string().nullable().transform(val => val ?? ""),
  linuxConfig: z.string().nullable().transform(val => val ?? ""),
  isActive: z.boolean().nullable().transform(val => val ?? true),
}).omit({
  usernameEncrypted: true,
  passwordEncrypted: true,
  createdBy: true,
});

type FormData = z.infer<typeof formSchema>;

export default function DomainJoinPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DomainJoinConfig | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { data: configs = [], isLoading } = useQuery<DomainJoinConfig[]>({
    queryKey: ["/api/post-deployment/domain-join"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      domainType: "active_directory",
      domainName: "",
      domainController: "",
      organizationalUnit: "",
      username: "",
      password: "",
      supportedOS: [],
      windowsConfig: "",
      linuxConfig: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", "/api/post-deployment/domain-join", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/domain-join"] });
      toast({ title: "Domain join configuration created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create configuration", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => 
      apiRequest("PATCH", `/api/post-deployment/domain-join/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/domain-join"] });
      toast({ title: "Domain join configuration updated successfully" });
      setIsDialogOpen(false);
      setEditingConfig(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update configuration", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/post-deployment/domain-join/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/domain-join"] });
      toast({ title: "Domain join configuration deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete configuration", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (config: DomainJoinConfig) => {
    setEditingConfig(config);
    setShowPassword(false);
    form.reset({
      name: config.name,
      description: config.description ?? "",
      domainType: config.domainType as "active_directory" | "ldap" | "freeipa",
      domainName: config.domainName,
      domainController: config.domainController ?? "",
      organizationalUnit: config.organizationalUnit ?? "",
      username: "••••••••",
      password: "••••••••",
      supportedOS: config.supportedOS,
      windowsConfig: config.windowsConfig ?? "",
      linuxConfig: config.linuxConfig ?? "",
      isActive: config.isActive === null ? true : config.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingConfig(null);
      setShowPassword(false);
      form.reset();
    }
  };

  const onSubmit = (data: FormData) => {
    const payload = { ...data };
    
    if (editingConfig) {
      if (payload.username === "••••••••") {
        delete (payload as any).username;
      }
      if (payload.password === "••••••••") {
        delete (payload as any).password;
      }
      updateMutation.mutate({ id: editingConfig.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Domain Join Configuration</h1>
          <p className="text-muted-foreground">Configure Active Directory and LDAP domain join settings for automatic domain enrollment</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-domain-config">
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingConfig ? "Edit Domain Join Configuration" : "Create Domain Join Configuration"}</DialogTitle>
              <DialogDescription>
                Configure domain join settings for automatic enrollment after imaging
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Configuration Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Corp Domain Join" data-testid="input-domain-name" />
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
                        <Textarea {...field} placeholder="Domain join configuration for corporate workstations" data-testid="input-domain-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="domainType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-domain-type">
                            <SelectValue placeholder="Select domain type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active_directory">Active Directory</SelectItem>
                          <SelectItem value="ldap">LDAP</SelectItem>
                          <SelectItem value="freeipa">FreeIPA</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="domainName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="corp.example.com" data-testid="input-domain-domain-name" />
                      </FormControl>
                      <FormDescription>Fully qualified domain name</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="domainController"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain Controller</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="dc1.corp.example.com or 192.168.1.10" data-testid="input-domain-controller" />
                      </FormControl>
                      <FormDescription>Optional: Server address or hostname</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organizationalUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organizational Unit</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="OU=Workstations,DC=corp,DC=example,DC=com" data-testid="input-domain-ou" />
                      </FormControl>
                      <FormDescription>Optional: LDAP path for Windows domain join</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Account Username</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="domain_join_svc" data-testid="input-domain-username" />
                      </FormControl>
                      <FormDescription>Account with domain join privileges</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Account Password</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            data-testid="input-domain-password" 
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <FormDescription>Password is encrypted before storage</FormDescription>
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
                        {["windows", "linux"].map((os) => (
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

                <FormField
                  control={form.control}
                  name="windowsConfig"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Windows Configuration (JSON)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder='{"netjoin_options": "/SAVECRED"}' className="font-mono text-sm" data-testid="input-windows-config" />
                      </FormControl>
                      <FormDescription>Optional: Additional netjoin parameters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linuxConfig"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linux Configuration (JSON)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder='{"method": "sssd", "create_home": true}' className="font-mono text-sm" data-testid="input-linux-config" />
                      </FormControl>
                      <FormDescription>Optional: SSSD/Winbind configuration</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Configuration</FormLabel>
                        <FormDescription>
                          Enable this domain join configuration
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-domain-active"
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
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingConfig ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Alert className="mb-6">
        <Server className="h-4 w-4" />
        <AlertDescription>
          Domain join configurations allow automatic enrollment of imaged devices into Active Directory, LDAP, or FreeIPA domains. 
          Credentials are encrypted using AES-256-GCM encryption before storage.
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
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Server className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Domain Join Configurations</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create a domain join configuration to automatically enroll devices into your domain after imaging
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-domain-config">
              <Plus className="h-4 w-4 mr-2" />
              Add First Configuration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl" data-testid={`text-domain-name-${config.id}`}>{config.name}</CardTitle>
                      <Badge variant={config.isActive ? "default" : "secondary"} data-testid={`badge-domain-status-${config.id}`}>
                        {config.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-domain-type-${config.id}`}>
                        {config.domainType === "active_directory" ? "Active Directory" : 
                         config.domainType === "ldap" ? "LDAP" : "FreeIPA"}
                      </Badge>
                    </div>
                    {config.description && (
                      <CardDescription className="mt-2" data-testid={`text-domain-description-${config.id}`}>
                        {config.description}
                      </CardDescription>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Domain:</span>{" "}
                        <span className="font-medium" data-testid={`text-domain-value-${config.id}`}>{config.domainName}</span>
                      </div>
                      {config.domainController && (
                        <div>
                          <span className="text-muted-foreground">Controller:</span>{" "}
                          <span className="font-medium" data-testid={`text-domain-controller-${config.id}`}>{config.domainController}</span>
                        </div>
                      )}
                      {config.organizationalUnit && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">OU:</span>{" "}
                          <span className="font-mono text-xs" data-testid={`text-domain-ou-${config.id}`}>{config.organizationalUnit}</span>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Supported OS:</span>{" "}
                        <span className="font-medium" data-testid={`text-domain-os-${config.id}`}>
                          {config.supportedOS.map((os) => os.charAt(0).toUpperCase() + os.slice(1)).join(", ")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(config)}
                      data-testid={`button-edit-domain-${config.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteId(config.id)}
                      data-testid={`button-delete-domain-${config.id}`}
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
              This will permanently delete this domain join configuration. This action cannot be undone.
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
