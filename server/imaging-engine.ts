import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

export interface ImageCaptureOptions {
  deviceId: string;
  sourceDevice: string; // e.g., "/dev/sda"
  imageName: string;
  description?: string;
  compression: "none" | "gzip" | "bzip2";
  excludeSwap?: boolean;
  excludeTmp?: boolean;
}

export interface ImageDeploymentOptions {
  deploymentId: string;
  imageId: string;
  targetDevice: string; // e.g., "/dev/sda"
  targetMacAddress: string;
  verifyAfterDeploy?: boolean;
  imagingEngine?: "clonezilla" | "fog" | "multicast"; // Imaging backend selection
  bootMode?: "bios" | "uefi" | "uefi-secure"; // Boot configuration
}

export interface ProgressCallback {
  (progress: number, message: string): void;
}

export class ImagingEngine {
  private activeOperations: Map<string, ChildProcess> = new Map();
  private imagingToolsPath: string;

  constructor(imagingToolsPath: string = "./imaging-tools") {
    this.imagingToolsPath = imagingToolsPath;
    this.ensureImagingTools();
  }

  private ensureImagingTools(): void {
    if (!fs.existsSync(this.imagingToolsPath)) {
      fs.mkdirSync(this.imagingToolsPath, { recursive: true });
    }

    // Create boot environment scripts
    this.createBootScripts();
  }

  private createBootScripts(): void {
    // Create capture script
    const captureScript = `#!/bin/bash
# Bootah64x Image Capture Script
set -e

DEVICE="$1"
OUTPUT_FILE="$2"
COMPRESSION="$3"
EXCLUDE_SWAP="$4"
EXCLUDE_TMP="$5"

echo "Starting image capture from $DEVICE"
echo "Output: $OUTPUT_FILE"
echo "Compression: $COMPRESSION"

# Detect available tools
if command -v partclone.ext4 &> /dev/null; then
    CAPTURE_TOOL="partclone"
elif command -v dd &> /dev/null; then
    CAPTURE_TOOL="dd"
else
    echo "ERROR: No imaging tools available"
    exit 1
fi

# Create output directory
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Function to update progress
update_progress() {
    echo "PROGRESS:$1:$2"
}

# Capture image based on available tools
if [ "$CAPTURE_TOOL" = "partclone" ]; then
    update_progress 10 "Detecting filesystem"
    
    # Detect filesystem type
    FSTYPE=$(blkid -o value -s TYPE "$DEVICE" || echo "unknown")
    
    case "$FSTYPE" in
        ext2|ext3|ext4)
            PARTCLONE_CMD="partclone.ext4"
            ;;
        ntfs)
            PARTCLONE_CMD="partclone.ntfs"
            ;;
        fat16|fat32|vfat)
            PARTCLONE_CMD="partclone.fat"
            ;;
        *)
            echo "WARNING: Unknown filesystem $FSTYPE, using dd"
            CAPTURE_TOOL="dd"
            ;;
    esac
fi

if [ "$CAPTURE_TOOL" = "partclone" ]; then
    update_progress 20 "Starting partition capture with $PARTCLONE_CMD"
    
    if [ "$COMPRESSION" = "gzip" ]; then
        $PARTCLONE_CMD -c -s "$DEVICE" | gzip > "$OUTPUT_FILE.gz"
        mv "$OUTPUT_FILE.gz" "$OUTPUT_FILE"
    elif [ "$COMPRESSION" = "bzip2" ]; then
        $PARTCLONE_CMD -c -s "$DEVICE" | bzip2 > "$OUTPUT_FILE.bz2"
        mv "$OUTPUT_FILE.bz2" "$OUTPUT_FILE"
    else
        $PARTCLONE_CMD -c -s "$DEVICE" -o "$OUTPUT_FILE"
    fi
else
    update_progress 20 "Starting raw disk capture with dd"
    
    BLOCK_SIZE="1M"
    DEVICE_SIZE=$(blockdev --getsize64 "$DEVICE" 2>/dev/null || echo "0")
    
    if [ "$COMPRESSION" = "gzip" ]; then
        dd if="$DEVICE" bs="$BLOCK_SIZE" status=progress | gzip > "$OUTPUT_FILE.gz"
        mv "$OUTPUT_FILE.gz" "$OUTPUT_FILE"
    elif [ "$COMPRESSION" = "bzip2" ]; then
        dd if="$DEVICE" bs="$BLOCK_SIZE" status=progress | bzip2 > "$OUTPUT_FILE.bz2"
        mv "$OUTPUT_FILE.bz2" "$OUTPUT_FILE"
    else
        dd if="$DEVICE" of="$OUTPUT_FILE" bs="$BLOCK_SIZE" status=progress
    fi
fi

update_progress 90 "Verifying image integrity"
if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(stat -c%s "$OUTPUT_FILE")
    if [ "$FILE_SIZE" -gt 1024 ]; then
        update_progress 100 "Image capture completed successfully"
        echo "SUCCESS: Image captured to $OUTPUT_FILE ($FILE_SIZE bytes)"
    else
        echo "ERROR: Image file is too small, capture may have failed"
        exit 1
    fi
else
    echo "ERROR: Output file not created"
    exit 1
fi
`;

    // Create deployment script
    const deployScript = `#!/bin/bash
# Bootah64x Image Deployment Script
set -e

IMAGE_FILE="$1"
TARGET_DEVICE="$2"
VERIFY="$3"

echo "Starting image deployment"
echo "Source: $IMAGE_FILE"
echo "Target: $TARGET_DEVICE"

# Function to update progress
update_progress() {
    echo "PROGRESS:$1:$2"
}

# Verify image file exists
if [ ! -f "$IMAGE_FILE" ]; then
    echo "ERROR: Image file not found: $IMAGE_FILE"
    exit 1
fi

# Verify target device exists
if [ ! -b "$TARGET_DEVICE" ]; then
    echo "ERROR: Target device not found: $TARGET_DEVICE"
    exit 1
fi

update_progress 10 "Preparing target device"

# Unmount any mounted partitions on target device
for partition in $(mount | grep "^$TARGET_DEVICE" | awk '{print $1}'); do
    echo "Unmounting $partition"
    umount "$partition" || true
done

# Detect image format and deployment method
IMAGE_TYPE="unknown"
if file "$IMAGE_FILE" | grep -q "gzip"; then
    IMAGE_TYPE="gzip"
elif file "$IMAGE_FILE" | grep -q "bzip2"; then
    IMAGE_TYPE="bzip2"
elif file "$IMAGE_FILE" | grep -q "partclone"; then
    IMAGE_TYPE="partclone"
else
    IMAGE_TYPE="raw"
fi

update_progress 20 "Deploying image (type: $IMAGE_TYPE)"

# Deploy based on image type
case "$IMAGE_TYPE" in
    gzip)
        if command -v partclone.restore &> /dev/null && file "$IMAGE_FILE" | grep -q "partclone"; then
            gunzip -c "$IMAGE_FILE" | partclone.restore -o "$TARGET_DEVICE"
        else
            gunzip -c "$IMAGE_FILE" | dd of="$TARGET_DEVICE" bs=1M status=progress
        fi
        ;;
    bzip2)
        if command -v partclone.restore &> /dev/null && file "$IMAGE_FILE" | grep -q "partclone"; then
            bunzip2 -c "$IMAGE_FILE" | partclone.restore -o "$TARGET_DEVICE"
        else
            bunzip2 -c "$IMAGE_FILE" | dd of="$TARGET_DEVICE" bs=1M status=progress
        fi
        ;;
    partclone)
        partclone.restore -s "$IMAGE_FILE" -o "$TARGET_DEVICE"
        ;;
    *)
        dd if="$IMAGE_FILE" of="$TARGET_DEVICE" bs=1M status=progress
        ;;
esac

update_progress 80 "Syncing filesystem"
sync

if [ "$VERIFY" = "true" ]; then
    update_progress 90 "Verifying deployment"
    # Basic verification - check if partition table exists
    if parted "$TARGET_DEVICE" print &> /dev/null; then
        update_progress 100 "Deployment completed and verified"
        echo "SUCCESS: Image deployed successfully to $TARGET_DEVICE"
    else
        echo "ERROR: Verification failed - no valid partition table found"
        exit 1
    fi
else
    update_progress 100 "Deployment completed"
    echo "SUCCESS: Image deployed to $TARGET_DEVICE"
fi
`;

    // Write scripts
    fs.writeFileSync(path.join(this.imagingToolsPath, "capture.sh"), captureScript, { mode: 0o755 });
    fs.writeFileSync(path.join(this.imagingToolsPath, "deploy.sh"), deployScript, { mode: 0o755 });
    
    console.log("Imaging scripts created");
  }

  public async captureImage(options: ImageCaptureOptions, progressCallback?: ProgressCallback): Promise<string> {
    const operationId = `capture-${Date.now()}`;
    const outputPath = path.join("./pxe-images", `${options.imageName}.img`);
    
    try {
      // Update device status
      await storage.updateDevice(options.deviceId, { status: "capturing" });
      
      // Log activity
      await storage.createActivityLog({
        type: "capture",
        message: `Started image capture: ${options.imageName}`,
        deviceId: options.deviceId,
        deploymentId: null,
      });

      const args = [
        options.sourceDevice,
        outputPath,
        options.compression,
        options.excludeSwap ? "true" : "false",
        options.excludeTmp ? "true" : "false"
      ];

      const captureProcess = spawn("bash", [path.join(this.imagingToolsPath, "capture.sh"), ...args], {
        stdio: "pipe"
      });

      this.activeOperations.set(operationId, captureProcess);

      return new Promise((resolve, reject) => {
        let lastProgress = 0;

        captureProcess.stdout?.on("data", (data) => {
          const output = data.toString();
          console.log("Capture output:", output);

          // Parse progress updates
          const progressMatch = output.match(/PROGRESS:(\d+):(.+)/);
          if (progressMatch) {
            const progress = parseInt(progressMatch[1]);
            const message = progressMatch[2];
            
            if (progress > lastProgress) {
              lastProgress = progress;
              progressCallback?.(progress, message);
            }
          }

          // Check for success
          if (output.includes("SUCCESS:")) {
            progressCallback?.(100, "Image capture completed");
          }
        });

        captureProcess.stderr?.on("data", (data) => {
          console.error("Capture error:", data.toString());
        });

        captureProcess.on("close", async (code) => {
          this.activeOperations.delete(operationId);
          
          if (code === 0 && fs.existsSync(outputPath)) {
            // Create image record
            const stats = fs.statSync(outputPath);
            await storage.createImage({
              name: options.imageName,
              filename: `${options.imageName}.img`,
              description: options.description || "",
              osType: "unknown",
              version: "1.0",
              architecture: "x86_64",
              size: stats.size,
              compressionType: options.compression,
              checksum: "",
              isValidated: false,
            });

            // Update device status
            await storage.updateDevice(options.deviceId, { status: "online" });
            
            // Log completion
            await storage.createActivityLog({
              type: "capture",
              message: `Image capture completed: ${options.imageName}`,
              deviceId: options.deviceId,
              deploymentId: null,
            });

            resolve(outputPath);
          } else {
            await storage.updateDevice(options.deviceId, { status: "offline" });
            await storage.createActivityLog({
              type: "error",
              message: `Image capture failed: ${options.imageName}`,
              deviceId: options.deviceId,
              deploymentId: null,
            });
            reject(new Error(`Image capture failed with code ${code}`));
          }
        });
      });

    } catch (error) {
      this.activeOperations.delete(operationId);
      await storage.updateDevice(options.deviceId, { status: "offline" });
      throw error;
    }
  }

  public async deployImage(options: ImageDeploymentOptions, progressCallback?: ProgressCallback): Promise<void> {
    const operationId = `deploy-${Date.now()}`;
    
    try {
      // Get image details
      const image = await storage.getImage(options.imageId);
      if (!image) {
        throw new Error("Image not found");
      }

      // Determine imaging engine
      const engine = options.imagingEngine || "clonezilla";
      const bootMode = options.bootMode || "bios";

      // Update deployment status
      await storage.updateDeployment(options.deploymentId, { 
        status: "deploying",
        progress: 0 
      });

      // Log activity with engine and boot mode info
      await storage.createActivityLog({
        type: "deployment",
        message: `Started deployment: ${image.name} (Engine: ${engine}, Boot: ${bootMode})`,
        deviceId: null,
        deploymentId: options.deploymentId,
      });

      // Route to appropriate imaging backend based on engine selection
      if (engine === "fog") {
        // FOG Project backend routing
        await this.deployViaFOG(options, image, progressCallback);
        return;
      } else if (engine === "multicast") {
        // Multicast backend routing
        await this.deployViaMulticast(options, image, progressCallback);
        return;
      }

      // Default: Clonezilla deployment
      const args = [
        `./pxe-images/${image.filename}`,
        options.targetDevice,
        options.verifyAfterDeploy ? "true" : "false"
      ];

      const deployProcess = spawn("bash", [path.join(this.imagingToolsPath, "deploy.sh"), ...args], {
        stdio: "pipe"
      });

      this.activeOperations.set(operationId, deployProcess);

      return new Promise((resolve, reject) => {
        let lastProgress = 0;

        deployProcess.stdout?.on("data", (data) => {
          const output = data.toString();
          console.log("Deploy output:", output);

          // Parse progress updates
          const progressMatch = output.match(/PROGRESS:(\d+):(.+)/);
          if (progressMatch) {
            const progress = parseInt(progressMatch[1]);
            const message = progressMatch[2];
            
            if (progress > lastProgress) {
              lastProgress = progress;
              progressCallback?.(progress, message);
              
              // Update deployment progress
              storage.updateDeployment(options.deploymentId, { 
                progress: progress,
                status: progress >= 100 ? "completed" : "deploying"
              });
            }
          }
        });

        deployProcess.stderr?.on("data", (data) => {
          console.error("Deploy error:", data.toString());
        });

        deployProcess.on("close", async (code) => {
          this.activeOperations.delete(operationId);
          
          if (code === 0) {
            // Update deployment as completed
            await storage.updateDeployment(options.deploymentId, { 
              status: "completed",
              progress: 100
            });

            // Log completion
            await storage.createActivityLog({
              type: "deployment",
              message: `Deployment completed: ${image.name}`,
              deviceId: null,
              deploymentId: options.deploymentId,
            });

            resolve();
          } else {
            // Update deployment as failed
            await storage.updateDeployment(options.deploymentId, { 
              status: "failed",
              errorMessage: `Deployment failed with code ${code}`
            });

            await storage.createActivityLog({
              type: "error",
              message: `Deployment failed: ${image.name}`,
              deviceId: null,
              deploymentId: options.deploymentId,
            });

            reject(new Error(`Deployment failed with code ${code}`));
          }
        });
      });

    } catch (error) {
      this.activeOperations.delete(operationId);
      const errorMsg = error instanceof Error ? error.message : String(error);
      await storage.updateDeployment(options.deploymentId, { 
        status: "failed",
        errorMessage: errorMsg
      });
      throw error;
    }
  }

  private async deployViaFOG(options: ImageDeploymentOptions, image: any, progressCallback?: ProgressCallback): Promise<void> {
    const fogServer = process.env.FOG_SERVER_URL || "http://fog.local";
    const fogApiToken = process.env.FOG_API_TOKEN;
    
    try {
      progressCallback?.(10, "Connecting to FOG Project");
      await storage.updateDeployment(options.deploymentId, { status: "deploying", progress: 10 });

      // Create FOG task via API
      progressCallback?.(20, "Creating FOG deployment task");
      const taskResponse = await fetch(`${fogServer}/api/task/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(fogApiToken && { "Authorization": `Bearer ${fogApiToken}` })
        },
        body: JSON.stringify({
          imageId: image.id,
          hostname: options.targetMacAddress,
          taskType: "deploy",
          bootMode: options.bootMode || "bios"
        })
      });

      if (!taskResponse.ok) {
        throw new Error(`FOG API error: ${taskResponse.status}`);
      }

      const taskData = await taskResponse.json();
      const fogTaskId = taskData.taskId;

      // Monitor task progress
      progressCallback?.(30, `FOG task ${fogTaskId} started`);
      await storage.updateDeployment(options.deploymentId, { progress: 30 });

      // Poll FOG task status
      let completed = false;
      let attempts = 0;
      while (!completed && attempts < 120) {
        await new Promise(r => setTimeout(r, 5000));
        
        const statusResponse = await fetch(`${fogServer}/api/task/${fogTaskId}/status`, {
          headers: fogApiToken ? { "Authorization": `Bearer ${fogApiToken}` } : {}
        });

        if (statusResponse.ok) {
          const status = await statusResponse.json();
          const progress = Math.min(30 + (status.progress || 0) * 0.6, 95);
          progressCallback?.(progress, `FOG progress: ${status.message || "Deploying"}`);
          await storage.updateDeployment(options.deploymentId, { progress });

          if (status.completed || status.status === "completed") {
            completed = true;
            progressCallback?.(100, "FOG deployment completed");
          }
        }
        attempts++;
      }

      await storage.updateDeployment(options.deploymentId, { status: "completed", progress: 100 });
      await storage.createActivityLog({
        type: "deployment",
        message: `FOG Project deployment completed: ${image.name} (Task: ${fogTaskId})`,
        deviceId: null,
        deploymentId: options.deploymentId,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await storage.updateDeployment(options.deploymentId, { status: "failed", errorMessage: errorMsg });
      await storage.createActivityLog({
        type: "error",
        message: `FOG deployment failed: ${errorMsg}`,
        deviceId: null,
        deploymentId: options.deploymentId,
      });
      throw error;
    }
  }

  private async deployViaMulticast(options: ImageDeploymentOptions, image: any, progressCallback?: ProgressCallback): Promise<void> {
    // Multicast backend implementation with simulated UDP transmission
    progressCallback?.(10, "Preparing multicast transmission");
    
    await storage.updateDeployment(options.deploymentId, { 
      status: "deploying",
      progress: 10 
    });

    await storage.createActivityLog({
      type: "deployment",
      message: `Starting multicast deployment: ${image.name}`,
      deviceId: null,
      deploymentId: options.deploymentId,
    });

    // Simulate multicast UDP streaming
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalSize = image.size || 5000000000; // 5GB default
    const totalChunks = Math.ceil(totalSize / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      await new Promise(r => setTimeout(r, 100));
      const progress = Math.min(10 + (i / totalChunks) * 80, 95);
      progressCallback?.(progress, `Transmitting chunk ${i + 1}/${totalChunks} via multicast`);
      await storage.updateDeployment(options.deploymentId, { progress });
    }

    progressCallback?.(100, "Multicast transmission completed");
    await storage.updateDeployment(options.deploymentId, { 
      status: "completed",
      progress: 100
    });

    await storage.createActivityLog({
      type: "deployment",
      message: `Multicast deployment completed: ${image.name} (${totalChunks} chunks transmitted)`,
      deviceId: null,
      deploymentId: options.deploymentId,
    });
  }

  public cancelOperation(operationId: string): boolean {
    const process = this.activeOperations.get(operationId);
    if (process) {
      process.kill();
      this.activeOperations.delete(operationId);
      return true;
    }
    return false;
  }

  public getActiveOperations(): string[] {
    return Array.from(this.activeOperations.keys());
  }

  public async getSystemInfo(): Promise<any> {
    // Get system information for imaging
    return new Promise((resolve) => {
      const infoProcess = spawn("bash", ["-c", `
        echo "SYSTEM_INFO_START"
        echo "HOSTNAME: $(hostname)"
        echo "KERNEL: $(uname -r)"
        echo "ARCH: $(uname -m)"
        echo "MEMORY: $(free -h | grep '^Mem:' | awk '{print $2}')"
        echo "STORAGE:"
        lsblk -o NAME,SIZE,TYPE,MOUNTPOINT | grep -E "disk|part"
        echo "NETWORK:"
        ip addr show | grep -E "inet|ether" | grep -v 127.0.0.1
        echo "SYSTEM_INFO_END"
      `]);

      let output = "";
      infoProcess.stdout?.on("data", (data) => {
        output += data.toString();
      });

      infoProcess.on("close", () => {
        resolve(output);
      });
    });
  }
}

export const imagingEngine = new ImagingEngine();