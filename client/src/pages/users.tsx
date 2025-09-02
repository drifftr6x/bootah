import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertUserSchema, 
  insertRoleSchema,
  insertPermissionSchema,
  type User, 
  type Role, 
  type Permission,
  type UserWithRoles,
  type RoleWithPermissions
} from "@shared/schema";
import { z } from "zod";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Crown,
  User as UserIcon,
  Key,
  Plus,
  Filter,
  MoreHorizontal,
  Lock,
  Unlock,
  History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UserFormData = z.infer<typeof insertUserSchema>;
type RoleFormData = z.infer<typeof insertRoleSchema>;

const systemRoles = [
  { 
    id: "admin", 
    name: "Administrator", 
    description: "Full system access with all permissions",
    color: "bg-red-500",
    icon: Crown
  },
  { 
    id: "operator", 
    name: "Operator", 
    description: "Can manage deployments and devices",
    color: "bg-blue-500",
    icon: Settings
  },
  { 
    id: "viewer", 
    name: "Viewer", 
    description: "Read-only access to system information",
    color: "bg-green-500",
    icon: Eye
  }
];

const allPermissions = [
  // Users & Roles
  { resource: "users", action: "create", description: "Create new users" },
  { resource: "users", action: "read", description: "View user information" },
  { resource: "users", action: "update", description: "Edit user details" },
  { resource: "users", action: "delete", description: "Delete users" },
  { resource: "roles", action: "create", description: "Create new roles" },
  { resource: "roles", action: "read", description: "View roles" },
  { resource: "roles", action: "update", description: "Edit roles" },
  { resource: "roles", action: "delete", description: "Delete roles" },
  
  // Devices
  { resource: "devices", action: "create", description: "Add new devices" },
  { resource: "devices", action: "read", description: "View devices" },
  { resource: "devices", action: "update", description: "Edit device information" },
  { resource: "devices", action: "delete", description: "Remove devices" },
  
  // Images
  { resource: "images", action: "create", description: "Upload new images" },
  { resource: "images", action: "read", description: "View images" },
  { resource: "images", action: "update", description: "Edit image details" },
  { resource: "images", action: "delete", description: "Delete images" },
  { resource: "images", action: "validate", description: "Validate image integrity" },
  
  // Deployments
  { resource: "deployments", action: "create", description: "Start new deployments" },
  { resource: "deployments", action: "read", description: "View deployments" },
  { resource: "deployments", action: "update", description: "Modify deployments" },
  { resource: "deployments", action: "delete", description: "Cancel deployments" },
  { resource: "deployments", action: "deploy", description: "Execute deployments" },
  
  // Templates
  { resource: "templates", action: "create", description: "Create deployment templates" },
  { resource: "templates", action: "read", description: "View templates" },
  { resource: "templates", action: "update", description: "Edit templates" },
  { resource: "templates", action: "delete", description: "Delete templates" },
  { resource: "templates", action: "execute", description: "Run templates" },
  
  // System
  { resource: "system", action: "monitor", description: "View system monitoring" },
  { resource: "system", action: "configure", description: "Change system settings" },
  { resource: "system", action: "logs", description: "Access system logs" },
];

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Mock queries - replace with real API calls
  const { data: users = [] } = useQuery<UserWithRoles[]>({
    queryKey: ["/api/users"],
    queryFn: () => Promise.resolve([
      {
        id: "user-1",
        username: "admin",
        email: "admin@bootah.local",
        fullName: "System Administrator",
        passwordHash: "hashed",
        isActive: true,
        lastLogin: new Date(),
        profileImage: null,
        department: "IT Operations",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        roles: [
          {
            id: "ur-1",
            userId: "user-1",
            roleId: "role-1",
            assignedAt: new Date(),
            assignedBy: null,
            role: {
              id: "role-1",
              name: "Administrator",
              description: "Full system access",
              isSystemRole: true,
              createdAt: new Date()
            }
          }
        ]
      },
      {
        id: "user-2",
        username: "operator1",
        email: "operator@bootah.local",
        fullName: "John Operator",
        passwordHash: "hashed",
        isActive: true,
        lastLogin: new Date(Date.now() - 3600000),
        profileImage: null,
        department: "IT Support",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
        roles: [
          {
            id: "ur-2",
            userId: "user-2",
            roleId: "role-2",
            assignedAt: new Date(),
            assignedBy: "user-1",
            role: {
              id: "role-2",
              name: "Operator",
              description: "Deployment management",
              isSystemRole: true,
              createdAt: new Date()
            }
          }
        ]
      }
    ]),
  });

  const { data: roles = [] } = useQuery<RoleWithPermissions[]>({
    queryKey: ["/api/roles"],
    queryFn: () => Promise.resolve([
      {
        id: "role-1",
        name: "Administrator",
        description: "Full system access with all permissions",
        isSystemRole: true,
        createdAt: new Date(),
        permissions: allPermissions.map((perm, idx) => ({
          id: `rp-${idx}`,
          roleId: "role-1",
          permissionId: `perm-${idx}`,
          permission: {
            id: `perm-${idx}`,
            name: `${perm.resource}:${perm.action}`,
            resource: perm.resource,
            action: perm.action,
            description: perm.description
          }
        }))
      },
      {
        id: "role-2",
        name: "Operator",
        description: "Can manage deployments and devices",
        isSystemRole: true,
        createdAt: new Date(),
        permissions: allPermissions.filter(perm => 
          !perm.resource.includes("users") && !perm.resource.includes("roles")
        ).map((perm, idx) => ({
          id: `rp-op-${idx}`,
          roleId: "role-2",
          permissionId: `perm-op-${idx}`,
          permission: {
            id: `perm-op-${idx}`,
            name: `${perm.resource}:${perm.action}`,
            resource: perm.resource,
            action: perm.action,
            description: perm.description
          }
        }))
      }
    ]),
  });

  // Forms
  const userForm = useForm<UserFormData & { confirmPassword: string; roleIds: string[] }>({
    resolver: zodResolver(insertUserSchema.extend({
      confirmPassword: z.string(),
      roleIds: z.array(z.string()).optional(),
    }).refine((data) => data.passwordHash === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    })),
    defaultValues: {
      username: "",
      email: "",
      fullName: "",
      passwordHash: "",
      confirmPassword: "",
      isActive: true,
      department: "",
      roleIds: [],
    },
  });

  const roleForm = useForm<RoleFormData & { permissionIds: string[] }>({
    resolver: zodResolver(insertRoleSchema.extend({
      permissionIds: z.array(z.string()),
    })),
    defaultValues: {
      name: "",
      description: "",
      isSystemRole: false,
      permissionIds: [],
    },
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData & { roleIds: string[] }) => {
      console.log("Creating user:", data);
      return Promise.resolve({ id: "new-user", ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created successfully" });
      setIsUserDialogOpen(false);
      userForm.reset();
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: RoleFormData & { permissionIds: string[] }) => {
      console.log("Creating role:", data);
      return Promise.resolve({ id: "new-role", ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role created successfully" });
      setIsRoleDialogOpen(false);
      roleForm.reset();
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      console.log(`${isActive ? 'Activating' : 'Deactivating'} user:`, userId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User status updated" });
    },
  });

  // Handlers
  const handleCreateUser = (data: UserFormData & { confirmPassword: string; roleIds: string[] }) => {
    const { confirmPassword, ...userData } = data;
    createUserMutation.mutate(userData);
  };

  const handleCreateRole = (data: RoleFormData & { permissionIds: string[] }) => {
    createRoleMutation.mutate(data);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    userForm.reset({
      ...user,
      confirmPassword: "",
      roleIds: users.find(u => u.id === user.id)?.roles.map(ur => ur.roleId) || [],
    });
    setIsUserDialogOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    const roleWithPermissions = roles.find(r => r.id === role.id);
    roleForm.reset({
      ...role,
      permissionIds: roleWithPermissions?.permissions.map(rp => rp.permissionId) || [],
    });
    setIsRoleDialogOpen(true);
  };

  const handleToggleUser = (user: User) => {
    toggleUserMutation.mutate({ userId: user.id, isActive: !user.isActive });
  };

  // Utility functions
  const getInitials = (fullName: string) => {
    return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleColor = (roleName: string) => {
    const systemRole = systemRoles.find(sr => sr.name === roleName);
    return systemRole?.color || "bg-gray-500";
  };

  const getUserStatus = (user: User) => {
    if (!user.isActive) return { text: "Inactive", color: "bg-gray-500" };
    
    const hoursSinceLogin = user.lastLogin 
      ? (Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60)
      : Infinity;
    
    if (hoursSinceLogin < 1) return { text: "Online", color: "bg-green-500" };
    if (hoursSinceLogin < 24) return { text: "Recently Active", color: "bg-yellow-500" };
    return { text: "Offline", color: "bg-gray-500" };
  };

  // Filtered data
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || 
      user.roles.some(ur => ur.role.name.toLowerCase() === selectedRole.toLowerCase());
    
    return matchesSearch && matchesRole;
  });

  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) acc[perm.resource] = [];
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, typeof allPermissions>);

  return (
    <div className="p-6" data-testid="users-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and permissions across the system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {users.length} User{users.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            {roles.length} Role{roles.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Search & Filter Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-users"
                  />
                </div>
                
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger data-testid="select-role-filter">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-user">
                      <UserPlus className="h-4 w-4" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingUser ? "Edit User" : "Create New User"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingUser ? "Update user information and roles" : "Add a new user to the system"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...userForm}>
                      <form onSubmit={userForm.handleSubmit(handleCreateUser)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={userForm.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John Doe" {...field} data-testid="input-full-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={userForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input placeholder="johndoe" {...field} data-testid="input-username" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={userForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={userForm.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department</FormLabel>
                                <FormControl>
                                  <Input placeholder="IT Operations" {...field} data-testid="input-department" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={userForm.control}
                            name="passwordHash"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} data-testid="input-password" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={userForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} data-testid="input-confirm-password" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={userForm.control}
                          name="roleIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assign Roles</FormLabel>
                              <div className="grid grid-cols-2 gap-2">
                                {roles.map(role => (
                                  <div key={role.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`role-${role.id}`}
                                      checked={field.value?.includes(role.id)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, role.id]);
                                        } else {
                                          field.onChange(current.filter(id => id !== role.id));
                                        }
                                      }}
                                      data-testid={`checkbox-role-${role.id}`}
                                    />
                                    <label htmlFor={`role-${role.id}`} className="text-sm font-medium">
                                      {role.name}
                                    </label>
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsUserDialogOpen(false);
                              setEditingUser(null);
                              userForm.reset();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createUserMutation.isPending}>
                            {createUserMutation.isPending 
                              ? "Creating..." 
                              : editingUser 
                                ? "Update User" 
                                : "Create User"
                            }
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Users Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => {
              const status = getUserStatus(user);
              
              return (
                <Card key={user.id} className="relative group" data-testid={`user-card-${user.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.profileImage || undefined} />
                        <AvatarFallback className="bg-cyan-100 text-cyan-700">
                          {getInitials(user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{user.fullName}</h3>
                          <div className={`w-2 h-2 rounded-full ${status.color}`} />
                        </div>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Department:</span>
                        <span>{user.department || "Not assigned"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="outline" className={`text-white ${status.color}`}>
                          {status.text}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last Login:</span>
                        <span>{user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : "Never"
                        }</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Roles:</p>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((userRole) => (
                          <Badge 
                            key={userRole.id} 
                            variant="secondary" 
                            className={`text-white text-xs ${getRoleColor(userRole.role.name)}`}
                          >
                            {userRole.role.name}
                          </Badge>
                        ))}
                        {user.roles.length === 0 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            No roles assigned
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        className="flex-1"
                        data-testid={`button-edit-${user.id}`}
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      
                      <Button
                        variant={user.isActive ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleToggleUser(user)}
                        data-testid={`button-toggle-${user.id}`}
                      >
                        {user.isActive ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <Unlock className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || selectedRole !== "all" 
                    ? "No users match your current filters. Try adjusting your search criteria."
                    : "No users have been created yet. Add your first user to get started."
                  }
                </p>
                <Button onClick={() => setIsUserDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First User
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Roles & Permissions
                  </CardTitle>
                  <CardDescription>
                    Manage system roles and their associated permissions
                  </CardDescription>
                </div>
                <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-role">
                      <Plus className="h-4 w-4" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingRole ? "Edit Role" : "Create New Role"}
                      </DialogTitle>
                      <DialogDescription>
                        Configure role details and assign permissions
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...roleForm}>
                      <form onSubmit={roleForm.handleSubmit(handleCreateRole)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={roleForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Custom Role" {...field} data-testid="input-role-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={roleForm.control}
                            name="isSystemRole"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="checkbox-system-role"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>System Role</FormLabel>
                                  <p className="text-xs text-muted-foreground">
                                    System roles cannot be deleted
                                  </p>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={roleForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Describe what this role can do..." 
                                  {...field} 
                                  data-testid="input-role-description" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={roleForm.control}
                          name="permissionIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Permissions</FormLabel>
                              <div className="space-y-4">
                                {Object.entries(groupedPermissions).map(([resource, permissions]) => (
                                  <div key={resource} className="border rounded-lg p-4">
                                    <h4 className="font-semibold capitalize mb-3 flex items-center gap-2">
                                      <Key className="h-4 w-4" />
                                      {resource}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                      {permissions.map((perm) => {
                                        const permId = `${resource}:${perm.action}`;
                                        return (
                                          <div key={permId} className="flex items-center space-x-2">
                                            <Checkbox
                                              id={permId}
                                              checked={field.value?.includes(permId)}
                                              onCheckedChange={(checked) => {
                                                const current = field.value || [];
                                                if (checked) {
                                                  field.onChange([...current, permId]);
                                                } else {
                                                  field.onChange(current.filter(id => id !== permId));
                                                }
                                              }}
                                              data-testid={`checkbox-permission-${permId}`}
                                            />
                                            <label htmlFor={permId} className="text-sm">
                                              <span className="font-medium capitalize">{perm.action}</span>
                                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsRoleDialogOpen(false);
                              setEditingRole(null);
                              roleForm.reset();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createRoleMutation.isPending}>
                            {createRoleMutation.isPending 
                              ? "Creating..." 
                              : editingRole 
                                ? "Update Role" 
                                : "Create Role"
                            }
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role) => (
                  <Card key={role.id} className="border-l-4" style={{
                    borderLeftColor: getRoleColor(role.name).replace('bg-', '#')
                  }} data-testid={`role-card-${role.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${getRoleColor(role.name)} text-white`}>
                            {(() => {
                              const systemRole = systemRoles.find(sr => sr.name === role.name);
                              const IconComponent = systemRole?.icon || Shield;
                              return <IconComponent className="h-4 w-4" />;
                            })()}
                          </div>
                          <div>
                            <h3 className="font-semibold flex items-center gap-2">
                              {role.name}
                              {role.isSystemRole && (
                                <Badge variant="outline" className="text-xs">
                                  System
                                </Badge>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                            data-testid={`button-edit-role-${role.id}`}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          {!role.isSystemRole && (
                            <Button
                              variant="destructive"
                              size="sm"
                              data-testid={`button-delete-role-${role.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Permissions:</span>
                          <span className="font-medium">{role.permissions.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Users with this role:</span>
                          <span className="font-medium">
                            {users.filter(user => user.roles.some(ur => ur.roleId === role.id)).length}
                          </span>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground mb-2">Key Permissions:</p>
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.slice(0, 5).map((rp) => (
                              <Badge key={rp.id} variant="outline" className="text-xs">
                                {rp.permission.action}
                              </Badge>
                            ))}
                            {role.permissions.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{role.permissions.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>
                Track user activities and system changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Audit Logs Coming Soon</h3>
                <p className="text-muted-foreground">
                  Comprehensive audit logging functionality will be available in the next update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}