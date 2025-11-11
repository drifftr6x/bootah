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
import { insertPostDeploymentProfileSchema, type PostDeploymentProfile } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Layers, Play, ListOrdered } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const formSchema = insertPostDeploymentProfileSchema.extend({
  description: z.string().nullable().transform(val => val ?? ""),
  executionOrder: z.string().nullable().transform(val => val ?? "sequential"),
  isActive: z.boolean().nullable().transform(val => val ?? true),
  haltOnFailure: z.boolean().nullable().transform(val => val ?? false),
}).omit({
  createdBy: true,
});

type FormData = z.infer<typeof formSchema>;

export default function PostDeploymentProfilesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PostDeploymentProfile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: profiles = [], isLoading } = useQuery<PostDeploymentProfile[]>({
    queryKey: ["/api/post-deployment/profiles"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      executionOrder: "sequential",
      haltOnFailure: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", "/api/post-deployment/profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/profiles"] });
      toast({ title: "Post-deployment profile created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create profile", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => 
      apiRequest("PATCH", `/api/post-deployment/profiles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/profiles"] });
      toast({ title: "Post-deployment profile updated successfully" });
      setIsDialogOpen(false);
      setEditingProfile(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/post-deployment/profiles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/post-deployment/profiles"] });
      toast({ title: "Post-deployment profile deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete profile", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (profile: PostDeploymentProfile) => {
    setEditingProfile(profile);
    form.reset({
      name: profile.name,
      description: profile.description ?? "",
      isActive: profile.isActive === null ? true : profile.isActive,
      executionOrder: profile.executionOrder ?? "sequential",
      haltOnFailure: profile.haltOnFailure === null ? false : profile.haltOnFailure,
    });
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingProfile(null);
      form.reset();
    }
  };

  const onSubmit = (data: FormData) => {
    if (editingProfile) {
      updateMutation.mutate({ id: editingProfile.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Post-Deployment Profiles</h1>
          <p className="text-muted-foreground">Create reusable automation workflows combining snapins, scripts, domain join, and more</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-profile">
              <Plus className="h-4 w-4 mr-2" />
              Create Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProfile ? "Edit Post-Deployment Profile" : "Create Post-Deployment Profile"}</DialogTitle>
              <DialogDescription>
                Configure a reusable automation workflow for post-imaging tasks
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Standard Workstation Setup" data-testid="input-profile-name" />
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
                        <Textarea {...field} placeholder="Complete workstation setup with domain join, software installation, and configuration" data-testid="input-profile-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="executionOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Execution Order</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-execution-order">
                            <SelectValue placeholder="Select execution order" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sequential">Sequential (one task at a time)</SelectItem>
                          <SelectItem value="parallel">Parallel (run tasks simultaneously)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>How tasks should be executed within this profile</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="haltOnFailure"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Halt on Failure</FormLabel>
                        <FormDescription>
                          Stop all remaining tasks if one task fails
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          data-testid="switch-halt-on-failure"
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
                        <FormLabel className="text-base">Active Profile</FormLabel>
                        <FormDescription>
                          Enable this profile for deployment
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                          data-testid="switch-profile-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {editingProfile && (
                  <Alert>
                    <ListOrdered className="h-4 w-4" />
                    <AlertDescription>
                      After saving, you can manage tasks for this profile from the profile card below.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingProfile ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Alert className="mb-6">
        <Layers className="h-4 w-4" />
        <AlertDescription>
          Post-deployment profiles combine multiple automation tasks into reusable workflows. 
          After creating a profile, click "Manage Tasks" to add snapins, scripts, domain join, and other tasks.
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
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Layers className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Post-Deployment Profiles</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create a profile to automate post-imaging tasks like software installation, domain join, and configuration
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-profile">
              <Plus className="h-4 w-4 mr-2" />
              Create First Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl" data-testid={`text-profile-name-${profile.id}`}>{profile.name}</CardTitle>
                      <Badge variant={profile.isActive ? "default" : "secondary"} data-testid={`badge-profile-status-${profile.id}`}>
                        {profile.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-execution-order-${profile.id}`}>
                        {profile.executionOrder === "sequential" ? "Sequential" : "Parallel"}
                      </Badge>
                      {profile.haltOnFailure && (
                        <Badge variant="destructive" data-testid={`badge-halt-on-failure-${profile.id}`}>
                          Halt on Failure
                        </Badge>
                      )}
                    </div>
                    {profile.description && (
                      <CardDescription className="mt-2" data-testid={`text-profile-description-${profile.id}`}>
                        {profile.description}
                      </CardDescription>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <div>
                        <span>Created:</span>{" "}
                        <span className="font-medium" data-testid={`text-profile-created-${profile.id}`}>
                          {new Date(profile.createdAt!).toLocaleDateString()}
                        </span>
                      </div>
                      {profile.updatedAt && (
                        <div>
                          <span>Updated:</span>{" "}
                          <span className="font-medium" data-testid={`text-profile-updated-${profile.id}`}>
                            {new Date(profile.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-manage-tasks-${profile.id}`}
                    >
                      <ListOrdered className="h-4 w-4 mr-2" />
                      Manage Tasks
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(profile)}
                      data-testid={`button-edit-profile-${profile.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteId(profile.id)}
                      data-testid={`button-delete-profile-${profile.id}`}
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
              This will permanently delete this post-deployment profile and all associated tasks. This action cannot be undone.
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
