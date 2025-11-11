import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertHostnamePatternSchema } from "@shared/schema";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Hash, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface HostnamePattern {
  id: string;
  name: string;
  description?: string | null;
  pattern: string;
  startingCounter?: number | null;
  currentCounter?: number | null;
  prefix?: string | null;
  suffix?: string | null;
  isActive?: boolean;
  createdBy?: string | null;
  createdAt?: string;
}

type InsertHostnamePattern = z.infer<typeof insertHostnamePatternSchema>;

export default function HostnamePatternsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingPattern, setEditingPattern] = useState<HostnamePattern | null>(null);
  const [deletePatternId, setDeletePatternId] = useState<string | null>(null);

  const { data: patterns, isLoading } = useQuery<HostnamePattern[]>({
    queryKey: ["/api/post-deployment/hostname-patterns"],
  });

  const form = useForm<InsertHostnamePattern>({
    resolver: zodResolver(insertHostnamePatternSchema),
    defaultValues: {
      name: "",
      description: "",
      pattern: "",
      startingCounter: 1,
      currentCounter: 1,
      prefix: "",
      suffix: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertHostnamePattern) => {
      return apiRequest("POST", "/api/post-deployment/hostname-patterns", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/hostname-patterns"] });
      toast({
        title: "Pattern Created",
        description: "The hostname pattern has been created successfully.",
      });
      setShowDialog(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create hostname pattern. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertHostnamePattern }) => {
      return apiRequest("PATCH", `/api/post-deployment/hostname-patterns/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/hostname-patterns"] });
      toast({
        title: "Pattern Updated",
        description: "The hostname pattern has been updated successfully.",
      });
      setShowDialog(false);
      setEditingPattern(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update hostname pattern. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/post-deployment/hostname-patterns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/hostname-patterns"] });
      toast({
        title: "Pattern Deleted",
        description: "The hostname pattern has been deleted successfully.",
      });
      setDeletePatternId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete hostname pattern. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setEditingPattern(null);
    form.reset({
      name: "",
      description: "",
      pattern: "",
      startingCounter: 1,
      currentCounter: 1,
      prefix: "",
      suffix: "",
      isActive: true,
    });
    setShowDialog(true);
  };

  const handleEdit = (pattern: HostnamePattern) => {
    setEditingPattern(pattern);
    form.reset({
      name: pattern.name,
      description: pattern.description || "",
      pattern: pattern.pattern,
      startingCounter: pattern.startingCounter ?? undefined,
      currentCounter: pattern.currentCounter ?? undefined,
      prefix: pattern.prefix || "",
      suffix: pattern.suffix || "",
      isActive: pattern.isActive !== false,
    });
    setShowDialog(true);
  };

  const onSubmit = (data: InsertHostnamePattern) => {
    if (editingPattern) {
      updateMutation.mutate({ id: editingPattern.id, data });
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

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-hostname-patterns">
            Hostname Patterns
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage automatic hostname generation patterns for devices
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-pattern">
          <Plus className="w-4 h-4 mr-2" />
          Create Pattern
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
      ) : !patterns || patterns.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Hash className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Hostname Patterns</h3>
              <p className="text-muted-foreground mb-4">
                Create hostname patterns to automatically name devices during deployment.
              </p>
              <Button onClick={handleCreate} data-testid="button-create-first-pattern">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Pattern
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table data-testid="table-patterns">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Pattern Template</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Counter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patterns.map((pattern) => (
                  <TableRow key={pattern.id} data-testid={`row-pattern-${pattern.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${pattern.id}`}>
                      {pattern.name}
                    </TableCell>
                    <TableCell data-testid={`text-pattern-${pattern.id}`}>
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {pattern.prefix || ""}{pattern.pattern}{pattern.suffix || ""}
                      </code>
                    </TableCell>
                    <TableCell data-testid={`text-description-${pattern.id}`}>
                      {pattern.description || "—"}
                    </TableCell>
                    <TableCell data-testid={`text-counter-${pattern.id}`}>
                      <Badge variant="outline" className="font-mono">
                        {pattern.currentCounter ?? 1}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`status-${pattern.id}`}>
                      {getStatusBadge(pattern.isActive)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(pattern)}
                          data-testid={`button-edit-pattern-${pattern.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletePatternId(pattern.id)}
                          data-testid={`button-delete-pattern-${pattern.id}`}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-pattern-form">
          <DialogHeader>
            <DialogTitle>
              {editingPattern ? "Edit Hostname Pattern" : "Create Hostname Pattern"}
            </DialogTitle>
            <DialogDescription>
              {editingPattern
                ? "Update the hostname pattern configuration"
                : "Add a new hostname pattern for automatic device naming"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Available Pattern Tokens</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1 text-sm font-mono">
                    <div><strong>{"{###}"}</strong> - Sequential 3-digit number (001, 002, etc.)</div>
                    <div><strong>{"{####}"}</strong> - Sequential 4-digit number</div>
                    <div><strong>{"{YYYY}"}</strong> - Current year (2025)</div>
                    <div><strong>{"{MM}"}</strong> - Current month (01-12)</div>
                    <div><strong>{"{DD}"}</strong> - Current day (01-31)</div>
                    <div><strong>{"{MAC}"}</strong> - Last 4 chars of MAC address</div>
                  </div>
                </AlertDescription>
              </Alert>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dell Lab Computers" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for this hostname pattern
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pattern Template *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., DELL-LAB-{###}" 
                        {...field} 
                        className="font-mono"
                        data-testid="input-pattern" 
                      />
                    </FormControl>
                    <FormDescription>
                      Use tokens like {"{###}"}, {"{YYYY}"}, {"{MM}"} to create dynamic patterns
                    </FormDescription>
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
                      <Textarea 
                        placeholder="Description of when to use this pattern..." 
                        {...field} 
                        value={field.value ?? ""}
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
                  name="prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prefix</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., PC-" 
                          {...field} 
                          value={field.value ?? ""}
                          className="font-mono"
                          data-testid="input-prefix" 
                        />
                      </FormControl>
                      <FormDescription>
                        Optional text before pattern
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="suffix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suffix</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., -WIN" 
                          {...field} 
                          value={field.value ?? ""}
                          className="font-mono"
                          data-testid="input-suffix" 
                        />
                      </FormControl>
                      <FormDescription>
                        Optional text after pattern
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startingCounter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting Counter</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="1" 
                          {...field} 
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-starting-counter" 
                        />
                      </FormControl>
                      <FormDescription>
                        Initial counter value (default: 1)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentCounter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Counter</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="1" 
                          {...field} 
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          readOnly={editingPattern !== null}
                          disabled={editingPattern !== null}
                          data-testid="input-current-counter" 
                        />
                      </FormControl>
                      <FormDescription>
                        {editingPattern ? "Current counter (read-only)" : "Current counter value"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Enable this pattern for use in deployments
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        data-testid="switch-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingPattern
                    ? "Update Pattern"
                    : "Create Pattern"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletePatternId !== null} onOpenChange={() => setDeletePatternId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this hostname pattern. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePatternId && deleteMutation.mutate(deletePatternId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
