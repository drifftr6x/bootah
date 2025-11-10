import type { IStorage } from "./storage";
import parser from "cron-parser";

export class DeploymentScheduler {
  private storage: IStorage;
  private checkInterval: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private readonly CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Start the scheduler to check for deployments that need to be triggered
   */
  start() {
    if (this.checkInterval) {
      console.log("[Scheduler] Already running");
      return;
    }

    console.log("[Scheduler] Starting deployment scheduler...");
    
    // Run immediately and then on interval
    this.checkScheduledDeployments();
    
    this.checkInterval = setInterval(() => {
      this.checkScheduledDeployments();
    }, this.CHECK_INTERVAL_MS);

    console.log(`[Scheduler] Checking for scheduled deployments every ${this.CHECK_INTERVAL_MS / 1000} seconds`);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log("[Scheduler] Deployment scheduler stopped");
    }
  }

  /**
   * Check for scheduled deployments that are ready to execute
   */
  private async checkScheduledDeployments() {
    // Prevent concurrent execution
    if (this.isProcessing) {
      console.log("[Scheduler] Already processing, skipping this check");
      return;
    }

    this.isProcessing = true;

    try {
      const scheduledDeployments = await this.storage.getScheduledDeployments();
      const now = new Date();

      for (const deployment of scheduledDeployments) {
        const nextRunTime = deployment.nextRunAt || deployment.scheduledFor;
        
        if (!nextRunTime) {
          console.warn(`[Scheduler] Scheduled deployment ${deployment.id} has no nextRunAt or scheduledFor time`);
          continue;
        }

        const runTime = new Date(nextRunTime);
        
        // Check if it's time to execute this deployment
        if (runTime <= now) {
          await this.executeScheduledDeployment(deployment.id);
        }
      }
    } catch (error) {
      console.error("[Scheduler] Error checking scheduled deployments:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a scheduled deployment
   */
  private async executeScheduledDeployment(deploymentId: string) {
    try {
      const deployment = await this.storage.getDeployment(deploymentId);
      
      if (!deployment) {
        console.error(`[Scheduler] Deployment ${deploymentId} not found`);
        return;
      }

      // Verify it's still scheduled (might have been cancelled)
      if (deployment.status !== "scheduled") {
        console.log(`[Scheduler] Deployment ${deploymentId} is no longer scheduled (status: ${deployment.status})`);
        return;
      }

      console.log(`[Scheduler] Executing scheduled deployment ${deploymentId} for device ${deployment.device?.name}`);

      // Update deployment to deploying status
      await this.storage.updateDeployment(deploymentId, {
        status: "deploying",
        startedAt: new Date(),
      });

      // Update device status
      await this.storage.updateDevice(deployment.deviceId, {
        status: "deploying"
      });

      // Log the deployment execution
      await this.storage.createActivityLog({
        type: "deployment",
        message: `Scheduled deployment started: ${deployment.device?.name} - ${deployment.image?.name}`,
        deviceId: deployment.deviceId,
        deploymentId: deploymentId,
      });

      // Handle recurring deployments
      if (deployment.scheduleType === "recurring" && deployment.recurringPattern) {
        await this.scheduleNextRecurrence(deploymentId, deployment.recurringPattern);
      }

      // Note: The actual PXE imaging process will be triggered by the device on boot
      // The deployment status will be updated by the Clonezilla scripts via the API

    } catch (error) {
      console.error(`[Scheduler] Error executing deployment ${deploymentId}:`, error);
      
      // Mark deployment as failed
      await this.storage.updateDeployment(deploymentId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown scheduler error",
      });

      await this.storage.createActivityLog({
        type: "error",
        message: `Failed to execute scheduled deployment: ${error instanceof Error ? error.message : "Unknown error"}`,
        deploymentId: deploymentId,
      });
    }
  }

  /**
   * Calculate and schedule the next recurrence for a recurring deployment
   */
  private async scheduleNextRecurrence(deploymentId: string, cronPattern: string) {
    try {
      // Parse the cron pattern to get the next occurrence
      const interval = parser.parseExpression(cronPattern);
      const nextRun = interval.next().toDate();

      console.log(`[Scheduler] Next recurrence for deployment ${deploymentId} scheduled at ${nextRun.toISOString()}`);

      // Create a new deployment for the next occurrence
      const currentDeployment = await this.storage.getDeployment(deploymentId);
      
      if (!currentDeployment) {
        console.error(`[Scheduler] Cannot create next recurrence: deployment ${deploymentId} not found`);
        return;
      }

      // Create a new scheduled deployment based on the current one
      const newDeployment = await this.storage.createDeployment({
        deviceId: currentDeployment.deviceId,
        imageId: currentDeployment.imageId,
        scheduleType: "recurring",
        scheduledFor: nextRun,
        recurringPattern: cronPattern,
        nextRunAt: nextRun,
        status: "scheduled",
        createdBy: currentDeployment.createdBy,
      });

      await this.storage.createActivityLog({
        type: "info",
        message: `Next recurring deployment scheduled for ${nextRun.toLocaleString()}`,
        deviceId: currentDeployment.deviceId,
        deploymentId: newDeployment.id,
      });

    } catch (error) {
      console.error(`[Scheduler] Error scheduling next recurrence for ${deploymentId}:`, error);
      
      await this.storage.createActivityLog({
        type: "error",
        message: `Failed to schedule next recurrence: ${error instanceof Error ? error.message : "Invalid cron pattern"}`,
        deploymentId: deploymentId,
      });
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.checkInterval !== null,
      isProcessing: this.isProcessing,
      checkIntervalMs: this.CHECK_INTERVAL_MS,
    };
  }
}
