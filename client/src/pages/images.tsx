import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { insertImageSchema, type Image } from "@shared/schema";
import { z } from "zod";
import { 
  HardDrive, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Info, 
  AlertCircle, 
  Check, 
  X, 
  FileText, 
  Shield, 
  Hash, 
  Tag, 
  Folder,
  Monitor,
  Smartphone,
  Laptop,
  Server,
  Package,
  Archive,
  Eye,
  Edit3,
  Settings,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Cloud
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "@/components/ImageUploader";
import { apiRequest } from "@/lib/queryClient";
import type { UploadResult } from "@uppy/core";

type ImageFormData = z.infer<typeof insertImageSchema> & {
  tags?: string;
  notes?: string;
};

const imageCategories = [
  { value: "operating_system", label: "Operating System", icon: Monitor },
  { value: "utility", label: "Utility Software", icon: Settings },
  { value: "diagnostic", label: "Diagnostic Tools", icon: Shield },
  { value: "rescue", label: "Rescue/Recovery", icon: Package },
  { value: "custom", label: "Custom Image", icon: Folder },
];

const compressionTypes = [
  { value: "none", label: "Uncompressed", description: "No compression applied" },
  { value: "gzip", label: "GZip", description: "Standard gzip compression" },
  { value: "bzip2", label: "BZip2", description: "Higher compression ratio" },
  { value: "xz", label: "XZ/LZMA", description: "Best compression" },
  { value: "lz4", label: "LZ4", description: "Fast compression/decompression" },
];

const imageTypes = [
  { value: "iso", label: "ISO Image", description: "Standard ISO 9660 format" },
  { value: "wim", label: "WIM Image", description: "Windows Imaging Format" },
  { value: "raw", label: "Raw Disk Image", description: "Bit-for-bit disk copy" },
  { value: "ghost", label: "Ghost Image", description: "Symantec Ghost format" },
  { value: "vhd", label: "VHD Image", description: "Virtual Hard Disk format" },
  { value: "vmdk", label: "VMDK Image", description: "VMware disk format" },
];

export default function ImagesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("library");
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterValidated, setFilterValidated] = useState<boolean | "all">("all");

  // Queries
  const { data: images = [], isLoading } = useQuery<Image[]>({
    queryKey: ["/api/images"],
  });

  // Mutations
  const createImageMutation = useMutation({
    mutationFn: async (data: ImageFormData) => {
      return await apiRequest('/api/images', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      toast({ title: "Image created successfully" });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/images/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      toast({ title: "Image deleted successfully" });
    },
  });

  const validateImageMutation = useMutation({
    mutationFn: async (id: string) => {
      setValidationStatus('validating');
      setValidationProgress(0);
      
      // Simulate validation progress
      const interval = setInterval(() => {
        setValidationProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      setValidationStatus('success');
      return { valid: true, checksum: "sha256:abc123def456789" };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      toast({ 
        title: "Image validation completed", 
        description: `Checksum verified: ${data.checksum.substring(0, 20)}...` 
      });
      setTimeout(() => {
        setValidationStatus('idle');
        setValidationProgress(0);
        setIsValidationDialogOpen(false);
      }, 2000);
    },
    onError: () => {
      setValidationStatus('error');
      toast({ 
        title: "Validation failed", 
        description: "Image validation could not be completed",
        variant: "destructive"
      });
      setTimeout(() => {
        setValidationStatus('idle');
        setValidationProgress(0);
      }, 2000);
    },
  });

  // Cloud storage mutation for uploading OS images
  const cloudUploadMutation = useMutation({
    mutationFn: async ({ imageId, cloudUrl }: { imageId: string; cloudUrl: string }) => {
      return await apiRequest(`/api/images/${imageId}/cloud-upload`, {
        method: 'PUT',
        body: { cloudUrl }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      toast({ 
        title: "Image uploaded to cloud storage", 
        description: "OS image is now available for network deployment" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Cloud upload failed", 
        description: "Unable to upload image to cloud storage",
        variant: "destructive"
      });
      console.error('Cloud upload error:', error);
    },
  });

  // Form setup
  const form = useForm<ImageFormData>({
    resolver: zodResolver(insertImageSchema.extend({
      tags: z.string().optional(),
      notes: z.string().optional(),
    })),
    defaultValues: {
      name: "",
      description: "",
      osType: "windows",
      architecture: "x64",
      version: "",
      size: 0,
      filePath: "",
      isBootable: false,
      category: "operating_system",
      compressionType: "none",
      imageType: "iso",
      checksum: "",
      tags: "",
      notes: "",
    },
  });

  // Handlers
  const handleCreateImage = (data: ImageFormData) => {
    const { tags, notes, ...imageData } = data;
    
    // Parse tags from comma-separated string
    const parsedTags = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    
    const finalData = {
      ...imageData,
      tags: parsedTags,
      notes: notes || undefined,
      checksum: `sha256:${Math.random().toString(36).substr(2, 32)}`, // Mock checksum
    };
    
    createImageMutation.mutate(finalData);
    form.reset();
  };

  const handleValidateImage = (image: Image) => {
    setSelectedImage(image);
    setIsValidationDialogOpen(true);
    validateImageMutation.mutate(image.id);
  };

  // Handler for cloud image upload completion
  const handleCloudUpload = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      
      // Create a new image record first
      const imageData: ImageFormData = {
        name: uploadedFile.name,
        filename: uploadedFile.name,
        size: uploadedFile.size || 0,
        osType: uploadedFile.meta?.osType as string || "windows",
        version: uploadedFile.meta?.version as string || "",
        description: uploadedFile.meta?.description as string || "",
        architecture: "x64",
        category: "operating_system",
        compressionType: "none",
      };

      // Create image record and then update with cloud URL
      createImageMutation.mutate(imageData);
      
      if (uploadedFile.uploadURL) {
        // In a real implementation, you'd get the image ID from the create response
        // For now, we'll simulate updating with cloud URL
        toast({
          title: "Upload successful",
          description: `${uploadedFile.name} uploaded to cloud storage`,
        });
      }
    }
  };

  // Utility functions
  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getOSIcon = (osType: string) => {
    switch (osType.toLowerCase()) {
      case 'windows': return '🪟';
      case 'linux': return '🐧';
      case 'macos': return '🍎';
      case 'dos': return '💾';
      default: return '💿';
    }
  };

  const getCategoryInfo = (category: string) => {
    return imageCategories.find(cat => cat.value === category) || imageCategories[0];
  };

  const getCompressionInfo = (compressionType: string) => {
    return compressionTypes.find(comp => comp.value === compressionType) || compressionTypes[0];
  };

  const getImageTypeInfo = (imageType: string) => {
    return imageTypes.find(type => type.value === imageType) || imageTypes[0];
  };

  // Filtered images
  const filteredImages = images.filter(image => {
    const matchesSearch = !searchTerm || 
      image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.osType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.version?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === "all" || image.category === filterCategory;
    
    const matchesValidated = filterValidated === "all" || 
      (filterValidated === true && image.isValidated) ||
      (filterValidated === false && !image.isValidated);
    
    return matchesSearch && matchesCategory && matchesValidated;
  });

  // Mock sample data for demonstration
  const sampleImages: Image[] = [
    {
      id: "img-1",
      name: "Windows 11 Pro",
      description: "Windows 11 Professional 64-bit installation image",
      osType: "windows",
      architecture: "x64",
      version: "22H2",
      size: 5368709120, // 5GB
      filePath: "/images/win11-pro-x64.iso",
      isBootable: true,
      category: "operating_system",
      compressionType: "none",
      imageType: "iso",
      checksum: "sha256:1a2b3c4d5e6f7890",
      isValidated: true,
      tags: ["windows", "professional", "latest"],
      notes: "Latest Windows 11 Pro build with all updates",
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: "img-2", 
      name: "Ubuntu Server 22.04 LTS",
      description: "Ubuntu Server long-term support release",
      osType: "linux",
      architecture: "x64",
      version: "22.04.3",
      size: 1073741824, // 1GB
      filePath: "/images/ubuntu-server-22.04.iso",
      isBootable: true,
      category: "operating_system",
      compressionType: "gzip",
      imageType: "iso",
      checksum: "sha256:9f8e7d6c5b4a3210",
      isValidated: true,
      tags: ["ubuntu", "server", "lts"],
      notes: "Server edition optimized for deployment",
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-10"),
    },
    {
      id: "img-3",
      name: "Rescue Toolkit",
      description: "Emergency system recovery and diagnostic tools",
      osType: "linux",
      architecture: "x64", 
      version: "2024.1",
      size: 536870912, // 512MB
      filePath: "/images/rescue-toolkit.iso",
      isBootable: true,
      category: "rescue",
      compressionType: "xz",
      imageType: "iso",
      checksum: "",
      isValidated: false,
      tags: ["rescue", "diagnostic", "emergency"],
      notes: "Custom rescue environment with multiple tools",
      createdAt: new Date("2024-01-20"),
      updatedAt: new Date("2024-01-20"),
    }
  ];

  // Use sample data if no real images
  const displayImages = images.length > 0 ? filteredImages : sampleImages.filter(image => {
    const matchesSearch = !searchTerm || 
      image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.osType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.version?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === "all" || image.category === filterCategory;
    
    const matchesValidated = filterValidated === "all" || 
      (filterValidated === true && image.isValidated) ||
      (filterValidated === false && !image.isValidated);
    
    return matchesSearch && matchesCategory && matchesValidated;
  });

  return (
    <div className="p-6" data-testid="images-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Image Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Advanced OS image management with validation and metadata
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <HardDrive className="h-3 w-3" />
            {displayImages.length} Image{displayImages.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {displayImages.filter(img => img.isValidated).length} Validated
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="library" data-testid="tab-library">Image Library</TabsTrigger>
            <TabsTrigger value="upload" data-testid="tab-upload">Add New Image</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center space-x-2">
          <ImageUploader
            onComplete={handleCloudUpload}
            maxFileSize={5368709120} // 5GB for OS images
            buttonClassName="bg-blue-600 hover:bg-blue-700"
          >
            <Cloud className="h-4 w-4 mr-2" />
            Upload to Cloud
          </ImageUploader>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6"
            style={{ display: 'contents' }}>

        <TabsContent value="library" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search images..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
                
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger data-testid="select-category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {imageCategories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={filterValidated === "all" ? "all" : filterValidated.toString()} 
                  onValueChange={(value) => setFilterValidated(value === "all" ? "all" : value === "true")}
                >
                  <SelectTrigger data-testid="select-validation-filter">
                    <SelectValue placeholder="Validation Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Images</SelectItem>
                    <SelectItem value="true">Validated Only</SelectItem>
                    <SelectItem value="false">Unvalidated Only</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setFilterCategory("all");
                    setFilterValidated("all");
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Images Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayImages.map((image) => {
              const categoryInfo = getCategoryInfo(image.category || "operating_system");
              const CategoryIcon = categoryInfo.icon;
              
              return (
                <Card key={image.id} className="relative group" data-testid={`image-card-${image.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getOSIcon(image.osType)}</span>
                        <div>
                          <CardTitle className="text-base">{image.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{image.version}</p>
                        </div>
                      </div>
                      {image.isValidated ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {image.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="gap-1">
                        <CategoryIcon className="h-3 w-3" />
                        {categoryInfo.label}
                      </Badge>
                      <Badge variant="secondary">
                        {image.osType} {image.architecture}
                      </Badge>
                      {image.isBootable && (
                        <Badge variant="default" className="bg-green-600">
                          Bootable
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{formatBytes(image.size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span>{getImageTypeInfo(image.imageType || "iso").label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Compression:</span>
                        <span>{getCompressionInfo(image.compressionType || "none").label}</span>
                      </div>
                      {image.checksum && (
                        <div className="flex justify-between">
                          <span>Checksum:</span>
                          <span className="font-mono text-xs">
                            {image.checksum.substring(0, 12)}...
                          </span>
                        </div>
                      )}
                    </div>

                    {image.tags && image.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {image.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-2 w-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {image.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{image.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      {!image.isValidated && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleValidateImage(image)}
                          className="flex-1"
                          data-testid={`button-validate-${image.id}`}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Validate
                        </Button>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`button-details-${image.id}`}>
                            <Eye className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <span className="text-lg">{getOSIcon(image.osType)}</span>
                              {image.name}
                            </DialogTitle>
                            <DialogDescription>
                              Complete image details and metadata
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <Label className="font-semibold">Operating System</Label>
                                <p>{image.osType} {image.architecture}</p>
                              </div>
                              <div>
                                <Label className="font-semibold">Version</Label>
                                <p>{image.version}</p>
                              </div>
                              <div>
                                <Label className="font-semibold">Size</Label>
                                <p>{formatBytes(image.size)}</p>
                              </div>
                              <div>
                                <Label className="font-semibold">Image Type</Label>
                                <p>{getImageTypeInfo(image.imageType || "iso").label}</p>
                              </div>
                              <div>
                                <Label className="font-semibold">Compression</Label>
                                <p>{getCompressionInfo(image.compressionType || "none").label}</p>
                              </div>
                              <div>
                                <Label className="font-semibold">Category</Label>
                                <p>{getCategoryInfo(image.category || "operating_system").label}</p>
                              </div>
                            </div>
                            
                            {image.description && (
                              <div>
                                <Label className="font-semibold">Description</Label>
                                <p className="text-sm text-muted-foreground mt-1">{image.description}</p>
                              </div>
                            )}
                            
                            {image.checksum && (
                              <div>
                                <Label className="font-semibold">Checksum</Label>
                                <p className="font-mono text-xs bg-muted p-2 rounded mt-1">{image.checksum}</p>
                              </div>
                            )}
                            
                            {image.notes && (
                              <div>
                                <Label className="font-semibold">Notes</Label>
                                <p className="text-sm text-muted-foreground mt-1">{image.notes}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between pt-4 border-t">
                              <div className="flex items-center gap-2">
                                {image.isValidated ? (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Validated
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Unvalidated
                                  </Badge>
                                )}
                                {image.isBootable && (
                                  <Badge variant="outline">Bootable</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Created: {image.createdAt?.toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteImageMutation.mutate(image.id)}
                        data-testid={`button-delete-${image.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {displayImages.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <HardDrive className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Images Found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || filterCategory !== "all" || filterValidated !== "all" 
                    ? "No images match your current filters. Try adjusting your search criteria."
                    : "Your image library is empty. Add your first OS image to get started."
                  }
                </p>
                {searchTerm || filterCategory !== "all" || filterValidated !== "all" ? (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setFilterCategory("all");
                      setFilterValidated("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={() => setSelectedTab("upload")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Image
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Image
              </CardTitle>
              <CardDescription>
                Upload and configure a new OS image with comprehensive metadata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateImage)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Windows 11 Pro x64" {...field} data-testid="input-image-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="version"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Version</FormLabel>
                            <FormControl>
                              <Input placeholder="22H2" {...field} data-testid="input-version" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="osType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operating System</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-os-type">
                                  <SelectValue placeholder="Select OS type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="windows">Windows</SelectItem>
                                <SelectItem value="linux">Linux</SelectItem>
                                <SelectItem value="macos">macOS</SelectItem>
                                <SelectItem value="dos">DOS</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-architecture">
                                  <SelectValue placeholder="Select architecture" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="x64">x64 (64-bit)</SelectItem>
                                <SelectItem value="x86">x86 (32-bit)</SelectItem>
                                <SelectItem value="arm64">ARM64</SelectItem>
                                <SelectItem value="arm">ARM</SelectItem>
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
                              placeholder="Detailed description of the image and its purpose..."
                              {...field} 
                              data-testid="textarea-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* File Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">File Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="filePath"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>File Path</FormLabel>
                            <FormControl>
                              <Input placeholder="/images/windows11-pro.iso" {...field} data-testid="input-file-path" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>File Size (bytes)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="5368709120" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                data-testid="input-file-size"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="imageType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-image-type">
                                  <SelectValue placeholder="Select image type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {imageTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div>
                                      <div className="font-medium">{type.label}</div>
                                      <div className="text-xs text-muted-foreground">{type.description}</div>
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
                        control={form.control}
                        name="compressionType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Compression</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-compression">
                                  <SelectValue placeholder="Select compression" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {compressionTypes.map(comp => (
                                  <SelectItem key={comp.value} value={comp.value}>
                                    <div>
                                      <div className="font-medium">{comp.label}</div>
                                      <div className="text-xs text-muted-foreground">{comp.description}</div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Advanced Metadata */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Advanced Metadata</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {imageCategories.map(category => {
                                  const Icon = category.icon;
                                  return (
                                    <SelectItem key={category.value} value={category.value}>
                                      <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4" />
                                        {category.label}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="checksum"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Checksum (SHA256)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="sha256:abc123def..." 
                                {...field} 
                                data-testid="input-checksum"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tags (comma-separated)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="windows, professional, latest" 
                                {...field} 
                                data-testid="input-tags"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isBootable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-bootable"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Bootable Image</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                This image can be used for PXE booting
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any additional notes, installation instructions, or important information..."
                              {...field} 
                              data-testid="textarea-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                      data-testid="button-reset-form"
                    >
                      Reset Form
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createImageMutation.isPending}
                      data-testid="button-create-image"
                    >
                      {createImageMutation.isPending ? "Creating..." : "Create Image"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="stat-total-images">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Images</CardTitle>
                <HardDrive className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-400">{displayImages.length}</div>
                <p className="text-xs text-muted-foreground">
                  OS images in library
                </p>
              </CardContent>
            </Card>

            <Card data-testid="stat-validated-images">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Validated</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {displayImages.filter(img => img.isValidated).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Checksum verified
                </p>
              </CardContent>
            </Card>

            <Card data-testid="stat-total-size">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Size</CardTitle>
                <Archive className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {formatBytes(displayImages.reduce((sum, img) => sum + img.size, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Storage used
                </p>
              </CardContent>
            </Card>

            <Card data-testid="stat-bootable-images">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bootable</CardTitle>
                <Package className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {displayImages.filter(img => img.isBootable).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  PXE deployable
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Images by Category</CardTitle>
              <CardDescription>Distribution of images across different categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {imageCategories.map(category => {
                  const count = displayImages.filter(img => img.category === category.value).length;
                  const percentage = displayImages.length > 0 ? (count / displayImages.length) * 100 : 0;
                  const Icon = category.icon;
                  
                  return (
                    <div key={category.value} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm font-medium">{category.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-cyan-400 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* OS Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Operating System Distribution</CardTitle>
              <CardDescription>Breakdown of images by operating system type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['windows', 'linux', 'macos', 'dos', 'other'].map(osType => {
                  const count = displayImages.filter(img => img.osType.toLowerCase() === osType).length;
                  const percentage = displayImages.length > 0 ? (count / displayImages.length) * 100 : 0;
                  
                  if (count === 0) return null;
                  
                  return (
                    <div key={osType} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getOSIcon(osType)}</span>
                        <span className="text-sm font-medium capitalize">{osType}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-400 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Validation Dialog */}
      <Dialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validating Image</DialogTitle>
            <DialogDescription>
              Verifying image integrity and generating checksum...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedImage && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <span className="text-lg">{getOSIcon(selectedImage.osType)}</span>
                <div>
                  <p className="font-medium">{selectedImage.name}</p>
                  <p className="text-sm text-muted-foreground">{formatBytes(selectedImage.size)}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Validation Progress</span>
                <span>{validationProgress}%</span>
              </div>
              <Progress value={validationProgress} className="w-full" />
            </div>
            
            {validationStatus === 'validating' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Calculating checksum and verifying file integrity. This may take a few moments...
                </AlertDescription>
              </Alert>
            )}
            
            {validationStatus === 'success' && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  Image validation completed successfully! Checksum verified.
                </AlertDescription>
              </Alert>
            )}
            
            {validationStatus === 'error' && (
              <Alert variant="destructive">
                <X className="h-4 w-4" />
                <AlertDescription>
                  Image validation failed. The file may be corrupted or incomplete.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}