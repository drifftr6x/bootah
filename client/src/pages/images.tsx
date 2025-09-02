import { useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Image } from "@shared/schema";
import { Plus, Search, HardDrive, Trash2, Download } from "lucide-react";
import AddImageDialog from "@/components/dialogs/add-image-dialog";
import StartDeploymentDialog from "@/components/dialogs/start-deployment-dialog";

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

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

export default function Images() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: images, isLoading } = useQuery<Image[]>({
    queryKey: ["/api/images"],
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      return apiRequest("DELETE", `/api/images/${imageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      toast({
        title: "Image Deleted",
        description: "The OS image has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredImages = images?.filter(image =>
    image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.osType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.version?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <>
      <Header 
        title="Image Library" 
        description="Manage OS images for PXE deployment" 
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        {/* Search and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-images"
            />
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            data-testid="button-upload-image"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Image
          </Button>
        </div>

        {/* Images Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-40 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredImages.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <HardDrive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Images Found</h3>
              <p className="text-muted-foreground" data-testid="text-no-images">
                {searchTerm ? "No images match your search criteria." : "No OS images have been uploaded yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImages.map((image) => (
              <Card key={image.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1" data-testid={`text-image-name-${image.id}`}>
                        {image.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={getOSColor(image.osType)}
                          data-testid={`badge-os-type-${image.id}`}
                        >
                          {image.osType.charAt(0).toUpperCase() + image.osType.slice(1)}
                        </Badge>
                        {image.version && (
                          <Badge variant="outline" data-testid={`badge-version-${image.id}`}>
                            {image.version}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Filename:</span>
                      <span className="ml-2 font-mono" data-testid={`text-filename-${image.id}`}>
                        {image.filename}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <span className="ml-2" data-testid={`text-size-${image.id}`}>
                        {formatBytes(image.size)}
                      </span>
                    </div>
                    {image.description && (
                      <div>
                        <span className="text-muted-foreground">Description:</span>
                        <p className="mt-1 text-foreground" data-testid={`text-description-${image.id}`}>
                          {image.description}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Uploaded:</span>
                      <span className="ml-2" data-testid={`text-uploaded-${image.id}`}>
                        {image.uploadedAt ? new Date(image.uploadedAt).toLocaleDateString() : "Unknown"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4 space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedImageId(image.id);
                        setShowDeployDialog(true);
                      }}
                      data-testid={`button-deploy-image-${image.id}`}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Deploy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteImageMutation.mutate(image.id)}
                      disabled={deleteImageMutation.isPending}
                      data-testid={`button-delete-image-${image.id}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Image Dialog */}
        <AddImageDialog 
          open={showAddDialog} 
          onOpenChange={setShowAddDialog} 
        />
        
        {/* Start Deployment Dialog */}
        <StartDeploymentDialog 
          open={showDeployDialog} 
          onOpenChange={setShowDeployDialog}
          preselectedImageId={selectedImageId}
        />
      </main>
    </>
  );
}
