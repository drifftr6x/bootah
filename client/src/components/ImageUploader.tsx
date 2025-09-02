import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

interface ImageUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
  disabled?: boolean;
}

/**
 * A file upload component specifically for OS images that renders as a button 
 * and provides a modal interface for file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * - Accepts ISO, IMG, VHD, VMDK and other OS image formats
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 5GB for OS images)
 * @param props.onComplete - Callback function called when upload is complete
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 * @param props.disabled - Whether the upload button is disabled
 */
export function ImageUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 5368709120, // 5GB default for OS images
  onComplete,
  buttonClassName,
  children,
  disabled = false,
}: ImageUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: [
          '.iso', '.img', '.vhd', '.vhdx', '.vmdk', '.qcow2', 
          '.raw', '.bin', '.dmg', '.wim', '.gz', '.zip'
        ],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file) => {
          try {
            const response = await apiRequest('/api/images/upload', {
              method: 'POST',
              body: { filename: file.name }
            });
            return {
              method: 'PUT' as const,
              url: response.uploadURL,
            };
          } catch (error) {
            console.error('Failed to get upload parameters:', error);
            throw error;
          }
        },
      })
      .on('upload', () => {
        setIsUploading(true);
      })
      .on('complete', (result) => {
        setIsUploading(false);
        setShowModal(false);
        onComplete?.(result);
      })
      .on('error', () => {
        setIsUploading(false);
      })
  );

  const handleButtonClick = () => {
    console.log('Upload button clicked');
    setShowModal(true);
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

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        note=""
        locale={{
          strings: {
            dropHereOr: 'Select OS image files',
            browse: 'Browse',
            dropHint: 'Select OS image files to upload',
          }
        }}
        metaFields={[
          { id: 'name', name: 'Name', placeholder: 'Image name' },
          { id: 'description', name: 'Description', placeholder: 'Image description' },
          { id: 'osType', name: 'OS Type', placeholder: 'windows, linux, macos' },
          { id: 'version', name: 'Version', placeholder: 'e.g., Windows 11, Ubuntu 22.04' },
        ]}
      />
    </div>
  );
}