import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Upload, X, CheckCircle } from "lucide-react";

interface ImageUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: any) => void;
  buttonClassName?: string;
  children: ReactNode;
  disabled?: boolean;
}

export function ImageUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  disabled,
}: ImageUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    setShowModal(true);
    setUploadComplete(false);
    setSelectedFiles([]);
    setUploadProgress(0);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size is ${maxFileSize / 1024 / 1024}MB`);
        return false;
      }
      return true;
    }).slice(0, maxNumberOfFiles);
    
    setSelectedFiles(validFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Get upload parameters
        const { url } = await onGetUploadParameters();
        
        // Upload the file
        const response = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        // Update progress
        const progress = ((i + 1) / selectedFiles.length) * 100;
        setUploadProgress(progress);
      }

      setUploadComplete(true);
      
      // Call completion callback
      if (onComplete) {
        onComplete({
          successful: selectedFiles.map(file => ({
            uploadURL: url,
            name: file.name,
            type: file.type,
            size: file.size,
          }))
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setShowModal(false);
      setSelectedFiles([]);
      setUploadProgress(0);
      setUploadComplete(false);
    }
  };

  return (
    <div>
      <Button 
        onClick={handleButtonClick}
        className={buttonClassName}
        disabled={disabled || isUploading}
        data-testid="button-upload-image"
        type="button"
      >
        {isUploading ? 'Uploading...' : children}
      </Button>

      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload OS Images
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {!uploadComplete ? (
              <>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        disabled={isUploading}
                        data-testid="button-select-files"
                      >
                        Select OS Image Files
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".iso,.img,.wim,.vhd,.vmdk"
                        multiple={maxNumberOfFiles > 1}
                        onChange={handleFileSelect}
                        className="hidden"
                        data-testid="input-file-select"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Select up to {maxNumberOfFiles} file(s), max {maxFileSize / 1024 / 1024}MB each
                    </p>
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Selected files:</h4>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                      </div>
                    ))}
                  </div>
                )}

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={isUploading}
                    data-testid="button-cancel-upload"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={selectedFiles.length === 0 || isUploading}
                    data-testid="button-start-upload"
                  >
                    Upload {selectedFiles.length} file(s)
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-2 text-lg font-medium">Upload Complete!</h3>
                <p className="text-gray-500">Your files have been uploaded successfully.</p>
                <Button
                  onClick={handleClose}
                  className="mt-4"
                  data-testid="button-close-success"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}