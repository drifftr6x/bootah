import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertDeploymentTemplateSchema, 
  insertTemplateStepSchema,
  insertTemplateVariableSchema,
  type DeploymentTemplate, 
  type TemplateStep, 
  type TemplateVariable,
  type DeploymentTemplateWithDetails,
  type Image
} from "@shared/schema";
import { z } from "zod";
import { 
  FileText, 
  Plus, 
  Play, 
  Copy, 
  Edit3, 
  Trash2, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  Settings,
  Clock,
  Target,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  PauseCircle,
  StopCircle,
  RotateCw,
  Zap,
  Code,
  Terminal,
  HardDrive,
  Wifi,
  Shield,
  AlertCircle,
  CheckCircle,
  Timer,
  Layers,
  Workflow,
  Archive,
  Share,
  Star,
  Tag
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TemplateFormData = z.infer<typeof insertDeploymentTemplateSchema> & {
  steps: (z.infer<typeof insertTemplateStepSchema> & { parsedConfiguration: any })[];
  variables: z.infer<typeof insertTemplateVariableSchema>[];
};

const templateCategories = [
  { value: "standard", label: "Standard Deployment", icon: HardDrive, color: "bg-blue-500" },
  { value: "custom", label: "Custom Workflow", icon: Workflow, color: "bg-purple-500" },
  { value: "rescue", label: "System Rescue", icon: Shield, color: "bg-red-500" },
  { value: "diagnostic", label: "Diagnostic Tools", icon: Terminal, color: "bg-yellow-500" },
];

const stepTypes = [
  { 
    value: "image_deploy", 
    label: "Deploy Image", 
    icon: HardDrive, 
    description: "Deploy an OS image to target device",
    configSchema: z.object({
      imageId: z.string(),
      verifyChecksum: z.boolean().default(true),
      formatDisk: z.boolean().default(false),
      partitionScheme: z.enum(["gpt", "mbr"]).default("gpt"),
    })
  },
  { 
    value: "script_run", 
    label: "Run Script", 
    icon: Code, 
    description: "Execute custom script or command",
    configSchema: z.object({
      scriptContent: z.string(),
      interpreter: z.enum(["bash", "powershell", "cmd"]).default("bash"),
      workingDirectory: z.string().optional(),
      environmentVars: z.record(z.string()).optional(),
    })
  },
  { 
    value: "reboot", 
    label: "System Reboot", 
    icon: RotateCw, 
    description: "Restart the target system",
    configSchema: z.object({
      waitForOnline: z.boolean().default(true),
      maxWaitMinutes: z.number().default(5),
      shutdownDelay: z.number().default(30),
    })
  },
  { 
    value: "wait", 
    label: "Wait/Pause", 
    icon: Timer, 
    description: "Pause execution for specified time",
    configSchema: z.object({
      duration: z.number(),
      unit: z.enum(["seconds", "minutes", "hours"]).default("minutes"),
      displayMessage: z.string().optional(),
    })
  },
  { 
    value: "network_test", 
    label: "Network Test", 
    icon: Wifi, 
    description: "Test network connectivity",
    configSchema: z.object({
      targets: z.array(z.string()),
      protocol: z.enum(["ping", "tcp", "http"]).default("ping"),
      timeout: z.number().default(30),
      retries: z.number().default(3),
    })
  },
  { 
    value: "custom", 
    label: "Custom Step", 
    icon: Settings, 
    description: "Custom implementation step",
    configSchema: z.object({
      customType: z.string(),
      parameters: z.record(z.any()),
      validation: z.object({
        required: z.boolean().default(true),
        successCriteria: z.string().optional(),
      }).optional(),
    })
  },
];

const variableTypes = [
  { value: "string", label: "Text", icon: FileText },
  { value: "number", label: "Number", icon: Target },
  { value: "boolean", label: "Yes/No", icon: CheckCircle },
  { value: "select", label: "Dropdown", icon: ChevronDown },
  { value: "image", label: "Image Selection", icon: HardDrive },
  { value: "device", label: "Device Selection", icon: Target },
];

export default function TemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("templates");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DeploymentTemplateWithDetails | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

  // Mock queries - replace with real API calls
  const { data: templates = [] } = useQuery<DeploymentTemplateWithDetails[]>({
    queryKey: ["/api/templates"],
    queryFn: () => Promise.resolve([
      {
        id: "template-1",
        name: "Windows 11 Pro Standard",
        description: "Standard Windows 11 Pro deployment with domain join and software installation",
        category: "standard",
        isDefault: true,
        isActive: true,
        estimatedDuration: 45,
        compatibleOSTypes: ["windows"],
        tags: ["windows", "enterprise", "standard"],
        createdBy: "user-1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        steps: [
          {
            id: "step-1",
            templateId: "template-1",
            stepOrder: 1,
            name: "Deploy Windows 11 Image",
            type: "image_deploy",
            configuration: JSON.stringify({
              imageId: "image-1",
              verifyChecksum: true,
              formatDisk: true,
              partitionScheme: "gpt",
            }),
            isOptional: false,
            timeoutMinutes: 30,
            retryCount: 1,
          },
          {
            id: "step-2",
            templateId: "template-1",
            stepOrder: 2,
            name: "System Reboot",
            type: "reboot",
            configuration: JSON.stringify({
              waitForOnline: true,
              maxWaitMinutes: 5,
              shutdownDelay: 30,
            }),
            isOptional: false,
            timeoutMinutes: 10,
            retryCount: 0,
          },
          {
            id: "step-3",
            templateId: "template-1",
            stepOrder: 3,
            name: "Install Corporate Software",
            type: "script_run",
            configuration: JSON.stringify({
              scriptContent: "# Install software packages\nchoco install googlechrome firefox -y\n# Configure domain settings\nAdd-Computer -DomainName $domainName",
              interpreter: "powershell",
              workingDirectory: "C:\\temp",
            }),
            isOptional: true,
            timeoutMinutes: 15,
            retryCount: 2,
          }
        ],
        variables: [
          {
            id: "var-1",
            templateId: "template-1",
            name: "domainName",
            type: "string",
            defaultValue: "corp.local",
            isRequired: true,
            options: [],
            description: "Active Directory domain to join",
          },
          {
            id: "var-2",
            templateId: "template-1",
            name: "installOffice",
            type: "boolean",
            defaultValue: "true",
            isRequired: false,
            options: [],
            description: "Install Microsoft Office suite",
          }
        ],
        creator: {
          id: "user-1",
          username: "admin",
          email: "admin@bootah.local",
          fullName: "System Administrator",
          passwordHash: "hashed",
          isActive: true,
          lastLogin: new Date(),
          profileImage: null,
          department: "IT Operations",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      },
      {
        id: "template-2",
        name: "Ubuntu Server LTS",
        description: "Ubuntu Server with Docker and monitoring tools",
        category: "standard",
        isDefault: false,
        isActive: true,
        estimatedDuration: 20,
        compatibleOSTypes: ["linux"],
        tags: ["ubuntu", "server", "docker"],
        createdBy: "user-2",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
        steps: [
          {
            id: "step-4",
            templateId: "template-2",
            stepOrder: 1,
            name: "Deploy Ubuntu Image",
            type: "image_deploy",
            configuration: JSON.stringify({
              imageId: "image-2",
              verifyChecksum: true,
              formatDisk: true,
              partitionScheme: "gpt",
            }),
            isOptional: false,
            timeoutMinutes: 20,
            retryCount: 1,
          },
          {
            id: "step-5",
            templateId: "template-2",
            stepOrder: 2,
            name: "Install Docker",
            type: "script_run",
            configuration: JSON.stringify({
              scriptContent: "#!/bin/bash\ncurl -fsSL https://get.docker.com -o get-docker.sh\nsudo sh get-docker.sh\nsudo usermod -aG docker $USER",
              interpreter: "bash",
            }),
            isOptional: false,
            timeoutMinutes: 10,
            retryCount: 1,
          }
        ],
        variables: [
          {
            id: "var-3",
            templateId: "template-2",
            name: "hostname",
            type: "string",
            defaultValue: "ubuntu-server",
            isRequired: true,
            options: [],
            description: "Server hostname",
          }
        ],
      }
    ]),
  });

  const { data: images = [] } = useQuery<Image[]>({
    queryKey: ["/api/images"],
    queryFn: () => Promise.resolve([
      {
        id: "image-1",
        name: "Windows 11 Pro",
        filename: "win11-pro.wim",
        size: 5368709120,
        checksum: "sha256:abc123...",
        osType: "windows",
        version: "22H2",
        description: "Windows 11 Professional 22H2",
        category: "Operating System",
        tags: ["windows", "11", "pro"],
        compressionType: "lzx",
        originalSize: 8589934592,
        architecture: "x64",
        isValidated: true,
        validationDate: new Date(),
        downloadCount: 15,
        uploadedAt: new Date(),
      },
      {
        id: "image-2",
        name: "Ubuntu Server 22.04 LTS",
        filename: "ubuntu-22.04-server.iso",
        size: 1073741824,
        checksum: "sha256:def456...",
        osType: "linux",
        version: "22.04",
        description: "Ubuntu Server 22.04 LTS",
        category: "Operating System",
        tags: ["ubuntu", "server", "lts"],
        compressionType: "none",
        originalSize: 1073741824,
        architecture: "x64",
        isValidated: true,
        validationDate: new Date(),
        downloadCount: 8,
        uploadedAt: new Date(),
      }
    ]),
  });

  // Form setup
  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(insertDeploymentTemplateSchema.extend({
      steps: z.array(insertTemplateStepSchema.extend({
        parsedConfiguration: z.any(),
      })),
      variables: z.array(insertTemplateVariableSchema),
    })),
    defaultValues: {
      name: "",
      description: "",
      category: "standard",
      isDefault: false,
      isActive: true,
      estimatedDuration: 30,
      compatibleOSTypes: [],
      tags: [],
      steps: [],
      variables: [],
    },
  });

  const { fields: stepFields, append: appendStep, remove: removeStep, move: moveStep } = useFieldArray({
    control: templateForm.control,
    name: "steps",
  });

  const { fields: variableFields, append: appendVariable, remove: removeVariable } = useFieldArray({
    control: templateForm.control,
    name: "variables",
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      console.log("Creating template:", data);
      return Promise.resolve({ id: "new-template", ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template created successfully" });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      console.log("Duplicating template:", templateId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template duplicated successfully" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      console.log("Deleting template:", templateId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template deleted successfully" });
    },
  });

  // Handlers
  const handleCreateTemplate = (data: TemplateFormData) => {
    createTemplateMutation.mutate(data);
  };

  const handleEditTemplate = (template: DeploymentTemplateWithDetails) => {
    setEditingTemplate(template);
    templateForm.reset({
      ...template,
      steps: template.steps.map(step => ({
        ...step,
        parsedConfiguration: JSON.parse(step.configuration),
      })),
      variables: template.variables,
    });
    setIsTemplateDialogOpen(true);
  };

  const handleDuplicateTemplate = (templateId: string) => {
    duplicateTemplateMutation.mutate(templateId);
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplateMutation.mutate(templateId);
  };

  const handleStepTypeChange = (index: number, newType: string) => {
    const stepType = stepTypes.find(st => st.value === newType);
    if (stepType) {
      // Reset configuration when step type changes
      const defaultConfig = stepType.configSchema.parse({});
      templateForm.setValue(`steps.${index}.type`, newType);
      templateForm.setValue(`steps.${index}.parsedConfiguration`, defaultConfig);
    }
  };

  const addNewStep = () => {
    const newStep = {
      templateId: editingTemplate?.id || "",
      stepOrder: stepFields.length + 1,
      name: "New Step",
      type: "image_deploy",
      configuration: JSON.stringify({ imageId: "", verifyChecksum: true }),
      parsedConfiguration: { imageId: "", verifyChecksum: true },
      isOptional: false,
      timeoutMinutes: 30,
      retryCount: 0,
    };
    appendStep(newStep);
  };

  const addNewVariable = () => {
    const newVariable = {
      templateId: editingTemplate?.id || "",
      name: `variable${variableFields.length + 1}`,
      type: "string",
      defaultValue: "",
      isRequired: true,
      options: [],
      description: "",
    };
    appendVariable(newVariable);
  };

  const toggleTemplateExpansion = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
    }
    setExpandedTemplates(newExpanded);
  };

  // Utility functions
  const getCategoryIcon = (category: string) => {
    const cat = templateCategories.find(c => c.value === category);
    return cat ? cat.icon : FileText;
  };

  const getCategoryColor = (category: string) => {
    const cat = templateCategories.find(c => c.value === category);
    return cat ? cat.color : "bg-gray-500";
  };

  const getStepIcon = (type: string) => {
    const stepType = stepTypes.find(st => st.value === type);
    return stepType ? stepType.icon : Settings;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Filtered data
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6" data-testid="templates-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Deployment Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage reusable deployment workflows
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            {templates.length} Template{templates.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {templates.filter(t => t.isActive).length} Active
          </Badge>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          <TabsTrigger value="executions" data-testid="tab-executions">Execution History</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Search & Filter Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-templates"
                  />
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger data-testid="select-category-filter">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {templateCategories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-create-template">
                      <Plus className="h-4 w-4" />
                      Create Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate ? "Edit Template" : "Create New Template"}
                      </DialogTitle>
                      <DialogDescription>
                        Build a reusable deployment workflow with multiple steps and variables
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...templateForm}>
                      <form onSubmit={templateForm.handleSubmit(handleCreateTemplate)} className="space-y-8">
                        {/* Basic Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Basic Information</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={templateForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Template Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Windows 11 Standard Deployment" {...field} data-testid="input-template-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={templateForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-template-category">
                                        <SelectValue placeholder="Select category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {templateCategories.map(category => (
                                        <SelectItem key={category.value} value={category.value}>
                                          {category.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={templateForm.control}
                              name="estimatedDuration"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Estimated Duration (minutes)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="30" 
                                      {...field} 
                                      onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                      data-testid="input-estimated-duration"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="space-y-2">
                              <FormField
                                control={templateForm.control}
                                name="isDefault"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="checkbox-is-default"
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>Default Template</FormLabel>
                                      <p className="text-xs text-muted-foreground">
                                        Use as default for new deployments
                                      </p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>

                          <FormField
                            control={templateForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Describe what this template does..." 
                                    className="min-h-[100px]"
                                    {...field} 
                                    data-testid="textarea-template-description"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Template Steps */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Deployment Steps</h3>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={addNewStep}
                              className="gap-2"
                              data-testid="button-add-step"
                            >
                              <Plus className="h-4 w-4" />
                              Add Step
                            </Button>
                          </div>

                          <div className="space-y-4">
                            {stepFields.map((field, index) => {
                              const stepType = stepTypes.find(st => st.value === templateForm.watch(`steps.${index}.type`));
                              const StepIcon = stepType ? stepType.icon : Settings;
                              
                              return (
                                <Card key={field.id} className="border-l-4 border-l-cyan-500" data-testid={`step-card-${index}`}>
                                  <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                                            {index + 1}
                                          </Badge>
                                          <StepIcon className="h-5 w-5 text-cyan-500" />
                                        </div>
                                        <FormField
                                          control={templateForm.control}
                                          name={`steps.${index}.name`}
                                          render={({ field: nameField }) => (
                                            <FormItem className="flex-1">
                                              <FormControl>
                                                <Input 
                                                  placeholder="Step name" 
                                                  {...nameField} 
                                                  className="font-medium"
                                                  data-testid={`input-step-name-${index}`}
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {index > 0 && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => moveStep(index, index - 1)}
                                            data-testid={`button-move-step-up-${index}`}
                                          >
                                            <ChevronUp className="h-3 w-3" />
                                          </Button>
                                        )}
                                        {index < stepFields.length - 1 && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => moveStep(index, index + 1)}
                                            data-testid={`button-move-step-down-${index}`}
                                          >
                                            <ChevronDown className="h-3 w-3" />
                                          </Button>
                                        )}
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => removeStep(index)}
                                          data-testid={`button-remove-step-${index}`}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                      <FormField
                                        control={templateForm.control}
                                        name={`steps.${index}.type`}
                                        render={({ field: typeField }) => (
                                          <FormItem>
                                            <FormLabel>Step Type</FormLabel>
                                            <Select 
                                              onValueChange={(value) => handleStepTypeChange(index, value)} 
                                              defaultValue={typeField.value}
                                            >
                                              <FormControl>
                                                <SelectTrigger data-testid={`select-step-type-${index}`}>
                                                  <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                {stepTypes.map(type => (
                                                  <SelectItem key={type.value} value={type.value}>
                                                    <div className="flex items-center gap-2">
                                                      <type.icon className="h-4 w-4" />
                                                      {type.label}
                                                    </div>
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={templateForm.control}
                                        name={`steps.${index}.timeoutMinutes`}
                                        render={({ field: timeoutField }) => (
                                          <FormItem>
                                            <FormLabel>Timeout (minutes)</FormLabel>
                                            <FormControl>
                                              <Input 
                                                type="number" 
                                                placeholder="30" 
                                                {...timeoutField} 
                                                onChange={e => timeoutField.onChange(parseInt(e.target.value) || 0)}
                                                data-testid={`input-step-timeout-${index}`}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={templateForm.control}
                                        name={`steps.${index}.isOptional`}
                                        render={({ field: optionalField }) => (
                                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                              <Checkbox
                                                checked={optionalField.value}
                                                onCheckedChange={optionalField.onChange}
                                                data-testid={`checkbox-step-optional-${index}`}
                                              />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                              <FormLabel>Optional Step</FormLabel>
                                              <p className="text-xs text-muted-foreground">
                                                Continue if this step fails
                                              </p>
                                            </div>
                                          </FormItem>
                                        )}
                                      />
                                    </div>

                                    {/* Step-specific configuration */}
                                    {stepType && (
                                      <div className="p-4 bg-muted rounded-lg">
                                        <h4 className="font-medium mb-3">Step Configuration</h4>
                                        {stepType.value === "image_deploy" && (
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <label className="text-sm font-medium">Image</label>
                                              <Select 
                                                onValueChange={(value) => {
                                                  const currentConfig = templateForm.getValues(`steps.${index}.parsedConfiguration`) || {};
                                                  templateForm.setValue(`steps.${index}.parsedConfiguration`, {
                                                    ...currentConfig,
                                                    imageId: value,
                                                  });
                                                }}
                                              >
                                                <SelectTrigger data-testid={`select-step-image-${index}`}>
                                                  <SelectValue placeholder="Select image" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {images.map(image => (
                                                    <SelectItem key={image.id} value={image.id}>
                                                      {image.name}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="space-y-2">
                                              <div className="flex items-center space-x-2">
                                                <Checkbox 
                                                  id={`verify-checksum-${index}`}
                                                  defaultChecked={true}
                                                  data-testid={`checkbox-verify-checksum-${index}`}
                                                />
                                                <label htmlFor={`verify-checksum-${index}`} className="text-sm">
                                                  Verify checksum
                                                </label>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <Checkbox 
                                                  id={`format-disk-${index}`}
                                                  data-testid={`checkbox-format-disk-${index}`}
                                                />
                                                <label htmlFor={`format-disk-${index}`} className="text-sm">
                                                  Format disk before deployment
                                                </label>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {stepType.value === "script_run" && (
                                          <div className="space-y-4">
                                            <div>
                                              <label className="text-sm font-medium">Script Content</label>
                                              <Textarea 
                                                placeholder="Enter your script here..."
                                                className="font-mono mt-2"
                                                data-testid={`textarea-script-content-${index}`}
                                              />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <label className="text-sm font-medium">Interpreter</label>
                                                <Select defaultValue="bash">
                                                  <SelectTrigger data-testid={`select-script-interpreter-${index}`}>
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="bash">Bash</SelectItem>
                                                    <SelectItem value="powershell">PowerShell</SelectItem>
                                                    <SelectItem value="cmd">Command Prompt</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div>
                                                <label className="text-sm font-medium">Working Directory</label>
                                                <Input 
                                                  placeholder="/tmp or C:\temp"
                                                  data-testid={`input-working-directory-${index}`}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {stepType.value === "wait" && (
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <label className="text-sm font-medium">Duration</label>
                                              <Input 
                                                type="number" 
                                                placeholder="5"
                                                data-testid={`input-wait-duration-${index}`}
                                              />
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium">Unit</label>
                                              <Select defaultValue="minutes">
                                                <SelectTrigger data-testid={`select-wait-unit-${index}`}>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="seconds">Seconds</SelectItem>
                                                  <SelectItem value="minutes">Minutes</SelectItem>
                                                  <SelectItem value="hours">Hours</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            })}

                            {stepFields.length === 0 && (
                              <Card className="border-dashed border-2">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                  <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                                  <h3 className="text-lg font-semibold mb-2">No Steps Added</h3>
                                  <p className="text-muted-foreground text-center mb-4">
                                    Add deployment steps to build your template workflow
                                  </p>
                                  <Button onClick={addNewStep} variant="outline">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add First Step
                                  </Button>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </div>

                        {/* Template Variables */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Template Variables</h3>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={addNewVariable}
                              className="gap-2"
                              data-testid="button-add-variable"
                            >
                              <Plus className="h-4 w-4" />
                              Add Variable
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {variableFields.map((field, index) => (
                              <Card key={field.id} className="p-4" data-testid={`variable-card-${index}`}>
                                <div className="grid grid-cols-4 gap-4">
                                  <FormField
                                    control={templateForm.control}
                                    name={`variables.${index}.name`}
                                    render={({ field: nameField }) => (
                                      <FormItem>
                                        <FormLabel>Variable Name</FormLabel>
                                        <FormControl>
                                          <Input 
                                            placeholder="variableName" 
                                            {...nameField}
                                            data-testid={`input-variable-name-${index}`}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={templateForm.control}
                                    name={`variables.${index}.type`}
                                    render={({ field: typeField }) => (
                                      <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={typeField.onChange} defaultValue={typeField.value}>
                                          <FormControl>
                                            <SelectTrigger data-testid={`select-variable-type-${index}`}>
                                              <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {variableTypes.map(type => (
                                              <SelectItem key={type.value} value={type.value}>
                                                <div className="flex items-center gap-2">
                                                  <type.icon className="h-4 w-4" />
                                                  {type.label}
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={templateForm.control}
                                    name={`variables.${index}.defaultValue`}
                                    render={({ field: defaultField }) => (
                                      <FormItem>
                                        <FormLabel>Default Value</FormLabel>
                                        <FormControl>
                                          <Input 
                                            placeholder="Default value" 
                                            {...defaultField}
                                            data-testid={`input-variable-default-${index}`}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />

                                  <div className="flex items-end gap-2">
                                    <FormField
                                      control={templateForm.control}
                                      name={`variables.${index}.isRequired`}
                                      render={({ field: requiredField }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                          <FormControl>
                                            <Checkbox
                                              checked={requiredField.value}
                                              onCheckedChange={requiredField.onChange}
                                              data-testid={`checkbox-variable-required-${index}`}
                                            />
                                          </FormControl>
                                          <FormLabel>Required</FormLabel>
                                        </FormItem>
                                      )}
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeVariable(index)}
                                      data-testid={`button-remove-variable-${index}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsTemplateDialogOpen(false);
                              setEditingTemplate(null);
                              templateForm.reset();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createTemplateMutation.isPending}>
                            {createTemplateMutation.isPending 
                              ? "Creating..." 
                              : editingTemplate 
                                ? "Update Template" 
                                : "Create Template"
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

          {/* Templates List */}
          <div className="space-y-4">
            {filteredTemplates.map((template) => {
              const CategoryIcon = getCategoryIcon(template.category);
              const isExpanded = expandedTemplates.has(template.id);
              
              return (
                <Card key={template.id} className="group hover:shadow-lg transition-shadow" data-testid={`template-card-${template.id}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${getCategoryColor(template.category)} text-white`}>
                          <CategoryIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-semibold">{template.name}</h3>
                            {template.isDefault && (
                              <Badge variant="secondary" className="gap-1">
                                <Star className="h-3 w-3" />
                                Default
                              </Badge>
                            )}
                            {!template.isActive && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">{template.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              ~{formatDuration(template.estimatedDuration || 0)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Layers className="h-4 w-4" />
                              {template.steps.length} step{template.steps.length !== 1 ? 's' : ''}
                            </div>
                            <div className="flex items-center gap-1">
                              <Settings className="h-4 w-4" />
                              {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleTemplateExpansion(template.id)}
                          data-testid={`button-expand-${template.id}`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-2"
                          data-testid={`button-deploy-${template.id}`}
                        >
                          <Play className="h-4 w-4" />
                          Deploy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          data-testid={`button-edit-template-${template.id}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateTemplate(template.id)}
                          data-testid={`button-duplicate-${template.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!template.isDefault && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {template.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <Tag className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent>
                      <div className="space-y-6">
                        {/* Template Steps */}
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Deployment Steps
                          </h4>
                          <div className="space-y-2">
                            {template.steps.map((step, index) => {
                              const StepIcon = getStepIcon(step.type);
                              return (
                                <div key={step.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                  <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                                    {index + 1}
                                  </Badge>
                                  <StepIcon className="h-4 w-4 text-cyan-500" />
                                  <span className="font-medium">{step.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {stepTypes.find(st => st.value === step.type)?.label || step.type}
                                  </Badge>
                                  {step.isOptional && (
                                    <Badge variant="outline" className="text-xs">
                                      Optional
                                    </Badge>
                                  )}
                                  <span className="text-sm text-muted-foreground ml-auto">
                                    {step.timeoutMinutes}m timeout
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Template Variables */}
                        {template.variables.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Template Variables
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              {template.variables.map((variable) => (
                                <div key={variable.id} className="p-3 bg-muted rounded-lg">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{variable.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {variable.type}
                                    </Badge>
                                    {variable.isRequired && (
                                      <Badge variant="destructive" className="text-xs">
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{variable.description}</p>
                                  {variable.defaultValue && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Default: {variable.defaultValue}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Template Metadata */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Category:</span>
                              <span className="capitalize">{template.category}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Compatible OS:</span>
                              <span className="capitalize">{template.compatibleOSTypes.join(", ") || "Any"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Created:</span>
                              <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Creator:</span>
                              <span>{template.creator?.fullName || "Unknown"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Last Updated:</span>
                              <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge variant={template.isActive ? "default" : "secondary"}>
                                {template.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || selectedCategory !== "all" 
                    ? "No templates match your current filters. Try adjusting your search criteria."
                    : "No deployment templates have been created yet. Create your first template to get started."
                  }
                </p>
                <Button onClick={() => setIsTemplateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="executions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Template Execution History
              </CardTitle>
              <CardDescription>
                Track template deployment executions and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Execution History Coming Soon</h3>
                <p className="text-muted-foreground">
                  Template execution tracking and history will be available in the next update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}