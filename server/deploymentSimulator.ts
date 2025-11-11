import type { IStorage } from "./storage";
import type { WebSocket } from "ws";

/**
 * Development/Test-only deployment progress simulator
 * Simulates PXE boot progress for instant deployments
 * Should NOT run in production (real PXE scripts handle progress)
 */

interface ProgressStage {
  progress: number;
  message: string;
  delayMs: number; // Delay before applying this stage
}

const PROGRESS_STAGES: ProgressStage[] = [
  { progress: 10, message: "Initializing PXE boot environment", delayMs: 2000 },
  { progress: 25, message: "Loading image and preparing disk", delayMs: 3000 },
  { progress: 50, message: "Writing image to disk", delayMs: 4000 },
  { progress: 75, message: "Finalizing disk configuration", delayMs: 3000 },
  { progress: 100, message: "Deployment completed successfully", delayMs: 2000 },
];

export class DeploymentSimulator {
  private storage: IStorage;
  private wss: any; // WebSocket.Server
  private intervalMs: number;
  private intervalId?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private activeSimulations: Map<string, number> = new Map(); // deploymentId -> currentStageIndex

  constructor(storage: IStorage, wss: any, intervalMs: number = 2000) {
    this.storage = storage;
    this.wss = wss;
    this.intervalMs = intervalMs;
  }

  /**
   * Start the deployment simulator
   */
  start(): void {
    if (this.isRunning) {
      console.log("[DeploymentSimulator] Already running");
      return;
    }

    console.log("[DeploymentSimulator] Starting deployment progress simulator");
    this.isRunning = true;
    this.intervalId = setInterval(() => this.tick(), this.intervalMs);
  }

  /**
   * Stop the deployment simulator
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log("[DeploymentSimulator] Stopping deployment progress simulator");
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.activeSimulations.clear();
  }

  /**
   * Main tick function - processes all active deployments
   */
  private async tick(): Promise<void> {
    try {
      const deployments = await this.storage.getActiveDeployments();
      
      for (const deployment of deployments) {
        // Skip if not in "deploying" status
        if (deployment.status !== "deploying") {
          continue;
        }

        await this.simulateProgress(deployment.id);
      }
    } catch (error) {
      console.error("[DeploymentSimulator] Error in tick:", error);
    }
  }

  /**
   * Simulate progress for a single deployment
   */
  private async simulateProgress(deploymentId: string): Promise<void> {
    try {
      // Get current stage index (or initialize to 0)
      const currentStageIndex = this.activeSimulations.get(deploymentId) || 0;
      
      if (currentStageIndex >= PROGRESS_STAGES.length) {
        // Already completed this deployment
        return;
      }

      const stage = PROGRESS_STAGES[currentStageIndex];
      
      // Update deployment progress
      await this.storage.updateDeployment(deploymentId, {
        progress: stage.progress,
      });

      // Broadcast progress via WebSocket
      this.broadcastProgress(deploymentId, stage.progress, stage.message);

      // Create activity log for milestone
      const deployment = await this.storage.getDeployment(deploymentId);
      if (deployment) {
        await this.storage.createActivityLog({
          type: "deployment",
          message: `Deployment progress: ${stage.progress}% - ${stage.message}`,
          deploymentId: deployment.id,
          deviceId: deployment.deviceId,
        });
      }

      // If we reached 100%, mark as completed
      if (stage.progress >= 100) {
        await this.completeDeployment(deploymentId);
        this.activeSimulations.delete(deploymentId);
      } else {
        // Advance to next stage
        this.activeSimulations.set(deploymentId, currentStageIndex + 1);
      }
    } catch (error) {
      console.error(`[DeploymentSimulator] Error simulating progress for ${deploymentId}:`, error);
    }
  }

  /**
   * Mark deployment as completed and trigger post-deployment automation
   */
  private async completeDeployment(deploymentId: string): Promise<void> {
    try {
      const deployment = await this.storage.getDeployment(deploymentId);
      if (!deployment) {
        return;
      }

      // Update deployment status to completed
      await this.storage.updateDeployment(deploymentId, {
        status: "completed",
        progress: 100,
      });

      // Update device status to online
      await this.storage.updateDevice(deployment.deviceId, {
        status: "online",
      });

      // Broadcast completion
      this.broadcastProgress(deploymentId, 100, "Deployment completed");

      // Create completion activity log
      const device = await this.storage.getDevice(deployment.deviceId);
      const image = await this.storage.getImage(deployment.imageId);
      
      if (device && image) {
        await this.storage.createActivityLog({
          type: "deployment",
          message: `${device.name} completed ${image.name} deployment`,
          deviceId: device.id,
          deploymentId: deployment.id,
        });
      }

      // Check for post-deployment profile binding
      const bindings = await this.storage.getProfileDeploymentBindings(deploymentId);
      
      if (bindings.length > 0) {
        console.log(`[DeploymentSimulator] Found ${bindings.length} post-deployment profile(s) for deployment ${deploymentId}`);
        
        // Update deployment status to post_processing to trigger executor
        await this.storage.updateDeployment(deploymentId, {
          status: "post_processing",
        });

        // Broadcast post-processing status
        this.broadcastProgress(deploymentId, 100, "Starting post-deployment automation");

        // Update all bindings to "queued" status so executor picks them up
        for (const binding of bindings) {
          await this.storage.updateProfileDeploymentBinding(binding.id, {
            status: "queued",
          });
        }
      }
    } catch (error) {
      console.error(`[DeploymentSimulator] Error completing deployment ${deploymentId}:`, error);
    }
  }

  /**
   * Broadcast progress update via WebSocket
   */
  private broadcastProgress(deploymentId: string, progress: number, message: string): void {
    try {
      const payload = JSON.stringify({
        type: "deployment_progress",
        deploymentId,
        progress,
        message,
      });

      this.wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(payload);
        }
      });
    } catch (error) {
      console.error("[DeploymentSimulator] Error broadcasting progress:", error);
    }
  }
}
