import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Upload, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const userFormSchema = insertUserSchema.extend({
  passwordHash: z.string().min(8, "Password must be at least 8 characters").optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function UserManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [csvText, setCsvText] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "User created",
        description: "User has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      return apiRequest(`/api/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "User updated",
        description: "User has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/users/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User deleted",
        description: "User has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/users/${id}/toggle-active`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User status updated",
        description: "User status has been updated successfully",
      });
    },
  });

  const importCsvMutation = useMutation({
    mutationFn: async (csvData: any[]) => {
      return apiRequest("/api/admin/users/import-csv", {
        method: "POST",
        body: JSON.stringify({ csvData }),
      });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsImportDialogOpen(false);
      setCsvText("");
      toast({
        title: "Import complete",
        description: `Imported ${result.success} users. Failed: ${result.failed}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import users",
        variant: "destructive",
      });
    },
  });

  const createForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      email: "",
      fullName: "",
      firstName: "",
      lastName: "",
      department: "",
      jobTitle: "",
      phoneNumber: "",
      isActive: true,
    },
  });

  const editForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema.partial()),
  });

  const handleCreate = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    editForm.reset({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      department: user.department,
      jobTitle: user.jobTitle,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (data: Partial<UserFormData>) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, data });
    }
  };

  const handleDelete = (user: any) => {
    if (confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleToggleActive = (user: any) => {
    toggleActiveMutation.mutate(user.id);
  };

  const handleImportCsv = () => {
    try {
      const lines = csvText.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.trim());
      const csvData = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        return obj;
      });
      importCsvMutation.mutate(csvData);
    } catch (error: any) {
      toast({
        title: "Invalid CSV",
        description: "Please provide valid CSV data",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage users and their access
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsImportDialogOpen(true)}
            variant="outline"
            data-testid="button-import-csv"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            data-testid="button-create-user"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user: any) => (
              <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim()}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.department || "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.isActive ? "default" : "secondary"}
                    data-testid={`badge-status-${user.id}`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActive(user)}
                      data-testid={`button-toggle-${user.id}`}
                    >
                      {user.isActive ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(user)}
                      data-testid={`button-edit-${user.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(user)}
                      data-testid={`button-delete-${user.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username*</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-firstName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-lastName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-department" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-jobTitle" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-phoneNumber" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="passwordHash"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password (optional)</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-edit-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-firstName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-lastName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-department" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-jobTitle" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Users from CSV</DialogTitle>
            <DialogDescription>
              Paste CSV data with columns: username,email,firstName,lastName,department,jobTitle,phoneNumber
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="username,email,firstName,lastName,department,jobTitle,phoneNumber&#10;jdoe,john@example.com,John,Doe,IT,Engineer,555-1234"
              rows={10}
              data-testid="textarea-csv"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportCsv}
              disabled={importCsvMutation.isPending || !csvText.trim()}
              data-testid="button-submit-import"
            >
              {importCsvMutation.isPending ? "Importing..." : "Import Users"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
