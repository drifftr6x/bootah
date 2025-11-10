import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertMulticastSessionSchema, type InsertMulticastSession, type Image } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Loader2, HardDrive, Radio, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { z } from "zod";

interface CreateMulticastSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedImageId?: string;
}

const extendedMulticastSessionSchema = insertMulticastSessionSchema
  .omit({ multicastAddress: true, createdBy: true })
  .extend({
    name: z.string().min(1, "Session name is required").max(100, "Session name too long"),
    imageId: z.string().min(1, "Please select an image"),
    maxClients: z.coerce.number().min(1, "At least 1 client required").max(50, "Maximum 50 clients allowed"),
    port: z.coerce.number().min(1024, "Port must be >= 1024").max(65535, "Port must be <= 65535"),
  });

type ExtendedMulticastSession = z.infer<typeof extendedMulticastSessionSchema>;

function getOSColor(osType: string) {
  switch (osType.toLowerCase()) {
    case "windows":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "linux":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "macos":
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

export default function CreateMulticastSessionDialog({ 
  open, 
  onOpenChange,
  preselectedImageId
}: CreateMulticastSessionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<ExtendedMulticastSession>({
    resolver: zodResolver(extendedMulticastSessionSchema),
    defaultValues: {
      name: "",
      imageId: preselectedImageId || "",
      maxClients: 10,
      port: 9000,
      status: "waiting",
      description: null,
    },
  });

  // Fetch images
  const { data: images, isLoading: imagesLoading } = useQuery<Image[]>({
    queryKey: ["/api/images"],
    enabled: open,
  });

  const selectedImage = images?.find(i => i.id === form.watch("imageId"));

  const createSessionMutation = useMutation({
    mutationFn: async (data: ExtendedMulticastSession) => {
      return apiRequest("POST", "/api/multicast/sessions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/multicast/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Multicast Session Created",
        description: `Session "${form.watch("name")}" is ready. Add devices to begin deployment.`,
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Session",
        description: error.message || "Failed to create multicast session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExtendedMulticastSession) => {
    createSessionMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-create-multicast">Create Multicast Session</DialogTitle>
          <DialogDescription>
            Create a new multicast session to deploy an image to multiple devices simultaneously.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Session Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-session-name">Session Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Windows 11 Lab Deployment" 
                      data-testid="input-session-name"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this multicast session
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Selection */}
            <FormField
              control={form.control}
              name="imageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-image">OS Image</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-image">
                        <SelectValue placeholder="Select an OS image to deploy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {imagesLoading ? (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading images...
                          </div>
                        </SelectItem>
                      ) : !images || images.length === 0 ? (
                        <SelectItem value="no-images" disabled>
                          No images available
                        </SelectItem>
                      ) : (
                        images.map((image) => (
                          <SelectItem key={image.id} value={image.id}>
                            <div className="flex items-center space-x-2">
                              <HardDrive className="w-4 h-4" />
                              <span>{image.name}</span>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs", getOSColor(image.osType))}
                              >
                                {image.osType}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the OS image to deploy via multicast
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Image Info */}
            {selectedImage && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center space-x-3">
                  <HardDrive className="w-5 h-5 text-purple-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-purple-700 dark:text-purple-300">
                      {selectedImage.name}
                    </h4>
                    <div className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
                      <div>OS: {selectedImage.osType} {selectedImage.version}</div>
                      <div>Size: {formatBytes(selectedImage.size)}</div>
                      {selectedImage.description && (
                        <div className="mt-1 text-xs">{selectedImage.description}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Session Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxClients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-max-clients">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>Max Clients</span>
                      </div>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="50" 
                        data-testid="input-max-clients"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of devices (1-50)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-port">
                      <div className="flex items-center space-x-2">
                        <Radio className="w-4 h-4" />
                        <span>Multicast Port</span>
                      </div>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1024" 
                        max="65535" 
                        data-testid="input-port"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      UDP port (1024-65535)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createSessionMutation.isPending}
                data-testid="button-create-session"
              >
                {createSessionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 mr-2" />
                    Create Session
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
