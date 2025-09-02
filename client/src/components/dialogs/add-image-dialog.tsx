import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertImageSchema, type InsertImage } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Loader2, Upload, FileImage, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const osTypes = [
  { value: "windows", label: "Windows" },
  { value: "linux", label: "Linux" },
  { value: "macos", label: "macOS" },
];

const extendedImageSchema = insertImageSchema.extend({
  name: insertImageSchema.shape.name.min(3, "Image name must be at least 3 characters"),
  osType: insertImageSchema.shape.osType.min(1, "Please select an OS type"),
});

export default function AddImageDialog({ open, onOpenChange }: AddImageDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const form = useForm<InsertImage>({
    resolver: zodResolver(extendedImageSchema),
    defaultValues: {
      name: "",
      filename: "",
      osType: "",
      size: 0,
      version: "",
      description: "",
    },
  });

  const createImageMutation = useMutation({
    mutationFn: async (data: InsertImage) => {
      return apiRequest("POST", "/api/images", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Image Added",
        description: "The OS image has been added to the library successfully.",
      });
      form.reset();
      setSelectedFile(null);
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add image. Please check the file and try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    if (!file) return;
    
    const validTypes = ['.iso', '.wim', '.vhd', '.vhdx', '.img'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(fileExtension)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a valid image file (.iso, .wim, .vhd, .vhdx, .img)",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
    
    // Auto-populate form fields based on filename
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
    form.setValue('name', nameWithoutExt);
    form.setValue('filename', file.name);
    form.setValue('size', file.size); // Store in bytes
    
    // Try to guess the OS type from filename
    const filename = file.name.toLowerCase();
    if (filename.includes('win') || filename.includes('windows')) {
      form.setValue('osType', 'windows');
    } else if (filename.includes('ubuntu') || filename.includes('linux') || filename.includes('centos') || filename.includes('rhel')) {
      form.setValue('osType', 'linux');
    } else if (filename.includes('mac')) {
      form.setValue('osType', 'macos');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const onSubmit = (data: InsertImage) => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select an image file to upload.",
        variant: "destructive",
      });
      return;
    }

    createImageMutation.mutate({
      ...data,
      // Clean up optional fields
      version: data.version || null,
      description: data.description || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">Add OS Image</DialogTitle>
          <DialogDescription>
            Upload an OS image file (.iso, .wim, .vhd, .vhdx, .img) to the image library.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* File Upload Area */}
            <div className="space-y-2">
              <Label>Image File</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-border",
                  selectedFile && "border-green-500 bg-green-50 dark:bg-green-900/20"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                data-testid="file-upload-area"
              >
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileImage className="w-8 h-8 mx-auto text-green-600" />
                    <p className="text-sm font-medium text-green-600">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024 * 1024)).toFixed(2)} GB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      data-testid="button-remove-file"
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Drop your image file here, or{" "}
                      <label className="text-primary cursor-pointer hover:underline">
                        browse
                        <input
                          type="file"
                          className="hidden"
                          accept=".iso,.wim,.vhd,.vhdx,.img"
                          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                          data-testid="input-file-select"
                        />
                      </label>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports .iso, .wim, .vhd, .vhdx, .img files
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-image-name">Image Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Windows 11 Pro x64"
                        {...field}
                        data-testid="input-image-name"
                      />
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
                    <FormLabel data-testid="label-version">Version</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="22H2, 20.04.5, etc."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-version"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="osType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-os-type">OS Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-os-type">
                        <SelectValue placeholder="Select OS type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {osTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-description">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enterprise image with Office 365, drivers pre-installed..."
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-description"
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description of what's included in this image
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedFile && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Note: This will create a database entry for the image. In a production environment, 
                    the file would be uploaded to your configured storage location.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createImageMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createImageMutation.isPending || !selectedFile}
                data-testid="button-add-image"
              >
                {createImageMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Add Image
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}