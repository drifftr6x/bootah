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
import { insertProductKeySchema, type ProductKey } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Key, Eye, EyeOff, Download } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const formSchema = insertProductKeySchema.extend({
  productKey: z.string().min(1, "Product key is required").or(z.literal("••••••••")),
  description: z.string().nullable().transform(val => val ?? ""),
  maxActivations: z.number().int().positive().nullable().transform(val => val ?? undefined),
  version: z.string().nullable().transform(val => val ?? ""),
  architecture: z.string().nullable().transform(val => val ?? ""),
  assignmentRules: z.string().nullable().transform(val => val ?? ""),
  expiresAt: z.string().nullable().transform(val => val ?? undefined),
  isActive: z.boolean().nullable().transform(val => val ?? true),
}).omit({
  keyEncrypted: true,
  createdBy: true,
});

type FormData = z.infer<typeof formSchema>;

export default function ProductKeysPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ProductKey | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const { data: productKeys = [], isLoading } = useQuery<ProductKey[]>({
    queryKey: ["/api/post-deployment/product-keys"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      keyType: "mak",
      productName: "",
      productKey: "",
      maxActivations: undefined,
      currentActivations: 0,
      osType: "windows",
      version: "",
      architecture: "x64",
      assignmentRules: "",
      expiresAt: undefined,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", "/api/post-deployment/product-keys", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/product-keys"] });
      toast({ title: "Product key created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create product key", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => 
      apiRequest("PATCH", `/api/post-deployment/product-keys/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/product-keys"] });
      toast({ title: "Product key updated successfully" });
      setIsDialogOpen(false);
      setEditingKey(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update product key", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/post-deployment/product-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/product-keys"] });
      toast({ title: "Product key deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete product key", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (key: ProductKey) => {
    setEditingKey(key);
    setShowKey(false);
    form.reset({
      name: key.name,
      description: key.description ?? "",
      keyType: key.keyType as "mak" | "kms" | "oem" | "retail",
      productName: key.productName,
      productKey: "••••••••",
      maxActivations: key.maxActivations ?? undefined,
      currentActivations: key.currentActivations ?? 0,
      osType: key.osType as "windows" | "linux" | "macos",
      version: key.version ?? "",
      architecture: key.architecture ?? "x64",
      assignmentRules: key.assignmentRules ?? "",
      expiresAt: key.expiresAt ? new Date(key.expiresAt).toISOString().split('T')[0] : undefined,
      isActive: key.isActive === null ? true : key.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingKey(null);
      setShowKey(false);
      form.reset();
    }
  };

  const exportProductKeys = (format: 'csv' | 'json') => {
    if (!productKeys || productKeys.length === 0) {
      toast({ title: "No Data", description: "No product keys to export", variant: "destructive" });
      return;
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      const headers = ["Name", "Product Name", "Key Type", "OS Type", "Version", "Status", "Activations"];
      const rows = productKeys.map(k => [
        k.name,
        k.productName,
        k.keyType,
        k.osType,
        k.version || "-",
        k.isActive ? "Active" : "Inactive",
        k.maxActivations ? `${k.currentActivations || 0}/${k.maxActivations}` : "-"
      ]);
      content = [headers, ...rows].map(row => row.map(f => `"${f}"`).join(",")).join("\n");
      filename = `bootah-product-keys-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = "text/csv";
    } else {
      content = JSON.stringify(productKeys.map(k => ({
        name: k.name,
        productName: k.productName,
        keyType: k.keyType,
        osType: k.osType,
        version: k.version,
        status: k.isActive ? "active" : "inactive",
        currentActivations: k.currentActivations,
        maxActivations: k.maxActivations
      })), null, 2);
      filename = `bootah-product-keys-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `Exported ${productKeys.length} product keys` });
  };

  const onSubmit = (data: FormData) => {
    const payload = { ...data };
    
    if (editingKey) {
      if (payload.productKey === "••••••••") {
        delete (payload as any).productKey;
      }
      updateMutation.mutate({ id: editingKey.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Product Keys</h1>
          <p className="text-muted-foreground">Manage Windows, Office, and software product keys for automatic activation</p>
        </div>
        <div className="flex gap-2">
          {productKeys && productKeys.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportProductKeys('csv')} data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportProductKeys('json')} data-testid="button-export-json">
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
            </div>
          )}
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-product-key">
              <Plus className="h-4 w-4 mr-2" />
              Add Product Key
            </Button>
          </DialogTrigger>
          </Dialog>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingKey ? "Edit Product Key" : "Create Product Key"}</DialogTitle>
              <DialogDescription>
                Configure product keys for automatic software activation after imaging
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Windows 11 Pro MAK Key" data-testid="input-key-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Windows 11 Pro" data-testid="input-product-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Key</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            {...field} 
                            type={showKey ? "text" : "password"} 
                            placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" 
                            data-testid="input-product-key" 
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowKey(!showKey)}
                          data-testid="button-toggle-key"
                        >
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <FormDescription>Product key is encrypted before storage</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="keyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-key-type">
                              <SelectValue placeholder="Select key type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mak">MAK (Multiple Activation)</SelectItem>
                            <SelectItem value="kms">KMS (Key Management)</SelectItem>
                            <SelectItem value="oem">OEM</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="osType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OS Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-os-type">
                              <SelectValue placeholder="Select OS type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="windows">Windows</SelectItem>
                            <SelectItem value="linux">Linux</SelectItem>
                            <SelectItem value="macos">macOS</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="11, 10, 2021, etc." data-testid="input-version" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="architecture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Architecture</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-architecture">
                              <SelectValue placeholder="Select architecture" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="x64">x64</SelectItem>
                            <SelectItem value="x86">x86</SelectItem>
                            <SelectItem value="arm64">ARM64</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="MAK key for corporate workstations" data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxActivations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Activations</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ""} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                            placeholder="500" 
                            data-testid="input-max-activations" 
                          />
                        </FormControl>
                        <FormDescription>For MAK keys only</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiresAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-expires-at" />
                        </FormControl>
                        <FormDescription>Optional</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="assignmentRules"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignment Rules (JSON)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder='{"tags": ["office"], "manufacturer": "Dell"}' className="font-mono text-sm" data-testid="input-assignment-rules" />
                      </FormControl>
                      <FormDescription>Optional: Conditions for auto-assignment</FormDescription>
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
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Enable this product key for deployment
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-key-active"
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
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingKey ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Alert className="mb-6">
        <Key className="h-4 w-4" />
        <AlertDescription>
          Product keys are encrypted using AES-256-GCM encryption. MAK keys track activation counts to prevent over-allocation.
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
      ) : productKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Key className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Product Keys</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add product keys to automatically activate Windows, Office, and other software after imaging
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-key">
              <Plus className="h-4 w-4 mr-2" />
              Add First Product Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {productKeys.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl" data-testid={`text-key-name-${key.id}`}>{key.name}</CardTitle>
                      <Badge variant={key.isActive ? "default" : "secondary"} data-testid={`badge-key-status-${key.id}`}>
                        {key.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-key-type-${key.id}`}>
                        {key.keyType.toUpperCase()}
                      </Badge>
                    </div>
                    {key.description && (
                      <CardDescription className="mt-2" data-testid={`text-key-description-${key.id}`}>
                        {key.description}
                      </CardDescription>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Product:</span>{" "}
                        <span className="font-medium" data-testid={`text-product-name-${key.id}`}>{key.productName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">OS:</span>{" "}
                        <span className="font-medium capitalize" data-testid={`text-key-os-${key.id}`}>{key.osType}</span>
                      </div>
                      {key.version && (
                        <div>
                          <span className="text-muted-foreground">Version:</span>{" "}
                          <span className="font-medium" data-testid={`text-key-version-${key.id}`}>{key.version}</span>
                        </div>
                      )}
                      {key.maxActivations && (
                        <div>
                          <span className="text-muted-foreground">Activations:</span>{" "}
                          <span className="font-medium" data-testid={`text-key-activations-${key.id}`}>
                            {key.currentActivations} / {key.maxActivations}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(key)}
                      data-testid={`button-edit-key-${key.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteId(key.id)}
                      data-testid={`button-delete-key-${key.id}`}
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
              This will permanently delete this product key. This action cannot be undone.
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
