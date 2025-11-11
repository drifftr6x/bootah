import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertSnapinPackageSchema } from "@shared/schema";
import type { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Package, AlertCircle } from "lucide-react";

interface SnapinPackage {
  id: string;
  name: string;
  description?: string | null;
  version?: string | null;
  packageType: string;
  supportedOS: string[];
  filePath: string;
  fileSize?: number | null;
  checksum?: string | null;
  installCommand: string;
  uninstallCommand?: string | null;
  installArgs?: string | null;
  requiresReboot?: boolean;
  runAsAdmin?: boolean;
  timeoutMinutes?: number;
  retryCount?: number;
  retryDelaySeconds?: number;
  category?: string | null;
  tags?: string[];
  isActive?: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

type InsertSnapinPackage = z.infer<typeof insertSnapinPackageSchema>;

export default function SnapinsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingSnapin, setEditingSnapin] = useState<SnapinPackage | null>(null);
  const [deleteSnapinId, setDeleteSnapinId] = useState<string | null>(null);

  const { data: snapins, isLoading } = useQuery<SnapinPackage[]>({
    queryKey: ["/api/post-deployment/snapins"],
  });

  const form = useForm<InsertSnapinPackage>({
    resolver: zodResolver(insertSnapinPackageSchema),
    defaultValues: {
      name: "",
      description: "",
      version: "",
      packageType: "msi",
      supportedOS: [],
      filePath: "",
      installCommand: "",
      uninstallCommand: "",
      installArgs: "",
      requiresReboot: false,
      runAsAdmin: true,
      timeoutMinutes: 30,
      retryCount: 2,
      retryDelaySeconds: 60,
      category: "Application",
      tags: [],
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSnapinPackage) => {
      return apiRequest("POST", "/api/post-deployment/snapins", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/snapins"] });
      toast({
        title: "Snapin Created",
        description: "The snapin package has been created successfully.",
      });
      setShowDialog(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create snapin package. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertSnapinPackage }) => {
      return apiRequest("PATCH", `/api/post-deployment/snapins/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/snapins"] });
      toast({
        title: "Snapin Updated",
        description: "The snapin package has been updated successfully.",
      });
      setShowDialog(false);
      setEditingSnapin(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update snapin package. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/post-deployment/snapins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/snapins"] });
      toast({
        title: "Snapin Deleted",
        description: "The snapin package has been deleted successfully.",
      });
      setDeleteSnapinId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete snapin package. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setEditingSnapin(null);
    form.reset({
      name: "",
      description: "",
      version: "",
      packageType: "msi",
      supportedOS: [],
      filePath: "",
      installCommand: "",
      uninstallCommand: "",
      installArgs: "",
      requiresReboot: false,
      runAsAdmin: true,
      timeoutMinutes: 30,
      retryCount: 2,
      retryDelaySeconds: 60,
      category: "Application",
      tags: [],
      isActive: true,
    });
    setShowDialog(true);
  };

  const handleEdit = (snapin: SnapinPackage) => {
    setEditingSnapin(snapin);
    form.reset({
      name: snapin.name,
      description: snapin.description || "",
      version: snapin.version || "",
      packageType: snapin.packageType,
      supportedOS: snapin.supportedOS,
      filePath: snapin.filePath,
      fileSize: snapin.fileSize || undefined,
      checksum: snapin.checksum || "",
      installCommand: snapin.installCommand,
      uninstallCommand: snapin.uninstallCommand || "",
      installArgs: snapin.installArgs || "",
      requiresReboot: snapin.requiresReboot || false,
      runAsAdmin: snapin.runAsAdmin !== false,
      timeoutMinutes: snapin.timeoutMinutes || 30,
      retryCount: snapin.retryCount || 2,
      retryDelaySeconds: snapin.retryDelaySeconds || 60,
      category: snapin.category || "Application",
      tags: snapin.tags || [],
      isActive: snapin.isActive !== false,
    });
    setShowDialog(true);
  };

  const onSubmit = (data: InsertSnapinPackage) => {
    if (editingSnapin) {
      updateMutation.mutate({ id: editingSnapin.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusBadge = (isActive?: boolean) => {
    if (isActive === false) {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
          Inactive
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
        Active
      </Badge>
    );
  };

  const getCategoryBadge = (category?: string | null) => {
    const cat = category || "Application";
    const colors: Record<string, string> = {
      "Application": "bg-blue-500/10 text-blue-400 border-blue-500/20",
      "Driver": "bg-purple-500/10 text-purple-400 border-purple-500/20",
      "Utility": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      "Security": "bg-red-500/10 text-red-400 border-red-500/20",
      "Other": "bg-gray-500/10 text-gray-400 border-gray-500/20",
    };
    return (
      <Badge variant="outline" className={colors[cat] || colors["Other"]}>
        {cat}
      </Badge>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-snapin-packages">
            Snapin Packages
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage software packages that install automatically after OS imaging
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-snapin">
          <Plus className="w-4 h-4 mr-2" />
          Create Snapin
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : !snapins || snapins.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Snapin Packages</h3>
              <p className="text-muted-foreground mb-4">
                Create snapin packages to automate software installation after imaging.
              </p>
              <Button onClick={handleCreate} data-testid="button-create-first-snapin">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Snapin
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table data-testid="table-snapins">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Package Type</TableHead>
                  <TableHead>Run As</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapins.map((snapin) => (
                  <TableRow key={snapin.id} data-testid={`row-snapin-${snapin.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${snapin.id}`}>
                      {snapin.name}
                    </TableCell>
                    <TableCell data-testid={`text-version-${snapin.id}`}>
                      {snapin.version || "—"}
                    </TableCell>
                    <TableCell data-testid={`badge-category-${snapin.id}`}>
                      {getCategoryBadge(snapin.category)}
                    </TableCell>
                    <TableCell data-testid={`text-package-type-${snapin.id}`}>
                      <Badge variant="outline">{snapin.packageType.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell data-testid={`text-run-as-${snapin.id}`}>
                      {snapin.runAsAdmin ? "System" : "User"}
                    </TableCell>
                    <TableCell data-testid={`status-${snapin.id}`}>
                      {getStatusBadge(snapin.isActive)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(snapin)}
                          data-testid={`button-edit-snapin-${snapin.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteSnapinId(snapin.id)}
                          data-testid={`button-delete-snapin-${snapin.id}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-snapin-form">
          <DialogHeader>
            <DialogTitle>
              {editingSnapin ? "Edit Snapin Package" : "Create Snapin Package"}
            </DialogTitle>
            <DialogDescription>
              {editingSnapin
                ? "Update the snapin package configuration"
                : "Add a new software package for post-deployment installation"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Google Chrome" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1.0.0" {...field} data-testid="input-version" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "Application"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Application">Applications</SelectItem>
                          <SelectItem value="Driver">Drivers</SelectItem>
                          <SelectItem value="Utility">Utilities</SelectItem>
                          <SelectItem value="Security">Security</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
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
                      <Textarea
                        placeholder="Brief description of the package"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="packageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-package-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="msi">MSI</SelectItem>
                          <SelectItem value="exe">EXE</SelectItem>
                          <SelectItem value="script">Script</SelectItem>
                          <SelectItem value="deb">DEB</SelectItem>
                          <SelectItem value="rpm">RPM</SelectItem>
                          <SelectItem value="zip">ZIP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="runAsAdmin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Run As *</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "system")}
                        value={field.value ? "system" : "user"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-run-as">
                            <SelectValue placeholder="Select run as" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="supportedOS"
                render={() => (
                  <FormItem>
                    <FormLabel>Required OS *</FormLabel>
                    <FormDescription>Select all compatible operating systems</FormDescription>
                    <div className="flex gap-4 pt-2">
                      {["windows", "linux", "macos"].map((os) => (
                        <FormField
                          key={os}
                          control={form.control}
                          name="supportedOS"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(os)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, os]);
                                    } else {
                                      field.onChange(current.filter((v) => v !== os));
                                    }
                                  }}
                                  data-testid={`checkbox-os-${os}`}
                                />
                              </FormControl>
                              <FormLabel className="font-normal capitalize cursor-pointer">
                                {os === "macos" ? "macOS" : os.charAt(0).toUpperCase() + os.slice(1)}
                              </FormLabel>
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
                name="filePath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Path *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Local path or cloud storage URL"
                        {...field}
                        data-testid="input-file-path"
                      />
                    </FormControl>
                    <FormDescription>
                      Path to the installation package or cloud storage URL
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="installCommand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Install Command *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., msiexec /i package.msi /quiet"
                        {...field}
                        data-testid="input-install-command"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="uninstallCommand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uninstall Command</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., msiexec /x package.msi /quiet"
                        {...field}
                        data-testid="input-uninstall-command"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="timeoutMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timeout (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="30"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
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
                          placeholder="2"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-retry-count"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retryDelaySeconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retry Delay (sec)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="60"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                          data-testid="input-retry-delay"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center gap-6">
                <FormField
                  control={form.control}
                  name="requiresReboot"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-requires-reboot"
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Requires Reboot</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-active"
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Is Active</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingSnapin(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-snapin"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingSnapin
                    ? "Update Snapin"
                    : "Create Snapin"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSnapinId} onOpenChange={(open) => !open && setDeleteSnapinId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Delete Snapin Package?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the snapin package. This action cannot be undone.
              Any deployment profiles using this snapin will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSnapinId && deleteMutation.mutate(deleteSnapinId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Snapin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
