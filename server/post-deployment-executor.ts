import type { IStorage } from "./storage";
import type { 
  PostDeploymentTask, 
  ProfileDeploymentBinding,
  TaskRun,
  InsertTaskRun,
  SnapinPackage,
  HostnamePattern,
  DomainJoinConfig,
  ProductKey,
  CustomScript
} from "@shared/schema";

interface TaskConfig {
  snapinId?: string;
  patternId?: string;
  configId?: string;
  scriptId?: string;
  keyId?: string;
}

interface ResolvedTaskConfig {
  task: PostDeploymentTask;
  config: SnapinPackage | HostnamePattern | DomainJoinConfig | ProductKey | CustomScript | null;
}

export class PostDeploymentExecutor {
  private storage: IStorage;
  private broadcastUpdate?: (event: string, data: any) => void;

  constructor(storage: IStorage, broadcastUpdate?: (event: string, data: any) => void) {
    this.storage = storage;
    this.broadcastUpdate = broadcastUpdate;
  }

  async executeProfile(deploymentId: string, profileId: string, bindingId: string): Promise<void> {
    console.log(`[PostDeploymentExecutor] Starting execution for deployment ${deploymentId}, profile ${profileId}, binding ${bindingId}`);

    try {
      const profile = await this.storage.getPostDeploymentProfile(profileId);
      if (!profile) {
        throw new Error(`Profile ${profileId} not found`);
      }

      const tasks = await this.storage.getPostDeploymentTasks(profileId);
      if (tasks.length === 0) {
        console.log(`[PostDeploymentExecutor] No tasks found for profile ${profileId}`);
        await this.completeBinding(bindingId, "completed");
        return;
      }

      await this.updateBinding(bindingId, { status: "running", startedAt: new Date() });
      
      const resolvedTasks = await this.resolveTaskConfigs(tasks);
      
      try {
        if (profile.executionOrder === "sequential") {
          await this.executeSequential(deploymentId, bindingId, resolvedTasks, profile.haltOnFailure ?? false);
        } else {
          await this.executeParallel(deploymentId, bindingId, resolvedTasks, profile.haltOnFailure ?? false);
        }

        await this.completeBinding(bindingId, "completed");
        console.log(`[PostDeploymentExecutor] Profile execution completed successfully`);
      } catch (error) {
        console.error(`[PostDeploymentExecutor] Profile execution failed:`, error);
        await this.completeBinding(bindingId, "failed");
        throw error;
      }
    } catch (error) {
      console.error(`[PostDeploymentExecutor] Fatal error:`, error);
      throw error;
    }
  }

  private async updateBinding(id: string, data: Partial<ProfileDeploymentBinding>): Promise<void> {
    await this.storage.updateProfileDeploymentBinding(id, data);
    this.broadcast("binding:updated", { bindingId: id, ...data });
  }

  private async completeBinding(id: string, status: "completed" | "failed"): Promise<void> {
    await this.storage.updateProfileDeploymentBinding(id, {
      status,
      completedAt: new Date(),
    });
    this.broadcast("binding:completed", { bindingId: id, status });
  }

  private async resolveTaskConfigs(tasks: PostDeploymentTask[]): Promise<ResolvedTaskConfig[]> {
    const resolved: ResolvedTaskConfig[] = [];

    for (const task of tasks) {
      let config: SnapinPackage | HostnamePattern | DomainJoinConfig | ProductKey | CustomScript | null = null;

      try {
        const taskConfig: TaskConfig = JSON.parse(task.config);

        switch (task.taskType) {
          case "snapin":
            if (taskConfig.snapinId) {
              config = await this.storage.getSnapinPackage(taskConfig.snapinId) ?? null;
            }
            break;
          case "hostname":
            if (taskConfig.patternId) {
              config = await this.storage.getHostnamePattern(taskConfig.patternId) ?? null;
            }
            break;
          case "domain_join":
            if (taskConfig.configId) {
              config = await this.storage.getDomainJoinConfig(taskConfig.configId) ?? null;
            }
            break;
          case "product_key":
            if (taskConfig.keyId) {
              config = await this.storage.getProductKey(taskConfig.keyId) ?? null;
            }
            break;
          case "script":
            if (taskConfig.scriptId) {
              config = await this.storage.getCustomScript(taskConfig.scriptId) ?? null;
            }
            break;
        }
      } catch (error) {
        console.error(`[PostDeploymentExecutor] Failed to parse or resolve config for task ${task.id}:`, error);
      }

      resolved.push({ task, config });
    }

    return resolved;
  }

  private async executeSequential(
    deploymentId: string,
    bindingId: string,
    tasks: ResolvedTaskConfig[],
    haltOnFailure: boolean
  ): Promise<void> {
    const sortedTasks = tasks.sort((a, b) => a.task.stepOrder - b.task.stepOrder);

    for (const { task, config } of sortedTasks) {
      try {
        await this.executeTask(deploymentId, task, config);
      } catch (error) {
        console.error(`[PostDeploymentExecutor] Task ${task.id} failed:`, error);
        if (haltOnFailure) {
          console.log(`[PostDeploymentExecutor] Halting execution due to task failure`);
          throw error;
        }
      }
    }
  }

  private async executeParallel(
    deploymentId: string,
    bindingId: string,
    tasks: ResolvedTaskConfig[],
    haltOnFailure: boolean
  ): Promise<void> {
    const taskGroups = this.groupTasksByStepOrder(tasks);

    for (const group of taskGroups) {
      const promises = group.map(({ task, config }) =>
        this.executeTask(deploymentId, task, config).catch(error => {
          console.error(`[PostDeploymentExecutor] Task ${task.id} failed:`, error);
          if (haltOnFailure) {
            throw error;
          }
          return null;
        })
      );

      const results = await Promise.allSettled(promises);
      
      if (haltOnFailure) {
        const failed = results.find(r => r.status === "rejected");
        if (failed) {
          throw new Error(`Task execution failed in parallel group`);
        }
      }
    }
  }

  private groupTasksByStepOrder(tasks: ResolvedTaskConfig[]): ResolvedTaskConfig[][] {
    const groups = new Map<number, ResolvedTaskConfig[]>();

    for (const taskConfig of tasks) {
      const stepOrder = taskConfig.task.stepOrder;
      if (!groups.has(stepOrder)) {
        groups.set(stepOrder, []);
      }
      groups.get(stepOrder)!.push(taskConfig);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([, group]) => group);
  }

  private async executeTask(
    deploymentId: string,
    task: PostDeploymentTask,
    config: SnapinPackage | HostnamePattern | DomainJoinConfig | ProductKey | CustomScript | null
  ): Promise<void> {
    const taskRun = await this.createTaskRun(deploymentId, task);

    try {
      await this.updateTaskRun(taskRun.id, {
        status: "running",
        startedAt: new Date(),
        progress: 0,
      });

      await this.simulateTaskExecution(task, config, taskRun.id);

      await this.updateTaskRun(taskRun.id, {
        status: "completed",
        completedAt: new Date(),
        progress: 100,
        executionLog: `${task.taskType} task completed successfully`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const currentAttempt = taskRun.attempt ?? 1;
      const maxAttempts = taskRun.maxAttempts ?? 2;
      
      if (currentAttempt < maxAttempts) {
        console.log(`[PostDeploymentExecutor] Retrying task ${task.id}, attempt ${currentAttempt + 1}/${maxAttempts}`);
        await this.updateTaskRun(taskRun.id, {
          attempt: currentAttempt + 1,
          errorMessage,
        });

        await new Promise(resolve => setTimeout(resolve, 2000 * currentAttempt));
        return this.executeTask(deploymentId, task, config);
      }

      await this.updateTaskRun(taskRun.id, {
        status: "failed",
        completedAt: new Date(),
        errorMessage,
        executionLog: `Task failed after ${maxAttempts} attempts: ${errorMessage}`,
      });

      throw error;
    }
  }

  private async simulateTaskExecution(
    task: PostDeploymentTask,
    config: any,
    taskRunId: string
  ): Promise<void> {
    console.log(`[PostDeploymentExecutor] Simulating execution of ${task.taskType} task: ${task.name}`);
    
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const progress = (i / steps) * 100;
      await this.updateTaskRun(taskRunId, { progress });
    }

    console.log(`[PostDeploymentExecutor] Task ${task.name} completed`);
  }

  private async createTaskRun(deploymentId: string, task: PostDeploymentTask): Promise<TaskRun> {
    const taskRun: InsertTaskRun = {
      deploymentId,
      taskId: task.id,
      taskType: task.taskType,
      status: "pending",
      progress: 0,
      attempt: 1,
      maxAttempts: task.retryCount ?? 2,
    };

    return await this.storage.createTaskRun(taskRun);
  }

  private async updateTaskRun(id: string, data: Partial<TaskRun>): Promise<void> {
    await this.storage.updateTaskRun(id, data);
    this.broadcast("taskrun:updated", { taskRunId: id, ...data });
  }

  private broadcast(event: string, data: any): void {
    if (this.broadcastUpdate) {
      this.broadcastUpdate(event, data);
    }
  }
}
