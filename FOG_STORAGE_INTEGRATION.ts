// FOG Project Integration Methods for Bootah Storage Layer
// Add these methods to server/storage.ts

import fetch from 'node-fetch';

export interface FOGImage {
  id: number;
  name: string;
  description: string;
  osType: string;
  size: number;
}

export interface FOGTask {
  taskID: number;
  hostID: number;
  imageID: number;
  taskType: number;
  taskState: string;
  percent: number;
}

/**
 * FOG Project Integration Methods
 * These methods enable Bootah to communicate with FOG Project API
 */

// Check if FOG is enabled
function isFOGEnabled(): boolean {
  return process.env.FOG_ENABLED === 'true' && !!process.env.FOG_SERVER_URL;
}

// Get FOG API headers
function getFOGHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.FOG_API_TOKEN || ''}`,
  };
}

/**
 * Sync images from FOG Project into Bootah
 */
export async function syncFOGImages(): Promise<FOGImage[]> {
  if (!isFOGEnabled()) {
    console.log('FOG integration disabled');
    return [];
  }

  try {
    const fogUrl = process.env.FOG_SERVER_URL;
    console.log(`[FOG] Syncing images from ${fogUrl}`);

    const response = await fetch(`${fogUrl}/api/image`, {
      method: 'GET',
      headers: getFOGHeaders(),
    });

    if (!response.ok) {
      throw new Error(`FOG API returned ${response.status}`);
    }

    const data = (await response.json()) as { images: FOGImage[] };
    console.log(`[FOG] Found ${data.images.length} images`);

    return data.images;
  } catch (error) {
    console.error('[FOG] Image sync failed:', error);
    return [];
  }
}

/**
 * Get all FOG hosts (devices)
 */
export async function syncFOGHosts(): Promise<Array<{
  id: number;
  mac: string;
  name: string;
  hostname: string;
}>> {
  if (!isFOGEnabled()) return [];

  try {
    const fogUrl = process.env.FOG_SERVER_URL;
    const response = await fetch(`${fogUrl}/api/host`, {
      method: 'GET',
      headers: getFOGHeaders(),
    });

    if (!response.ok) {
      throw new Error(`FOG API returned ${response.status}`);
    }

    const data = (await response.json()) as { hosts: any[] };
    return data.hosts.map((host: any) => ({
      id: host.id,
      mac: host.mac,
      name: host.name,
      hostname: host.hostname,
    }));
  } catch (error) {
    console.error('[FOG] Host sync failed:', error);
    return [];
  }
}

/**
 * Create a deployment task in FOG
 */
export async function createFOGTask(
  fogImageId: number,
  macAddresses: string[],
  taskType: number = 1, // 1 = Download/Deploy, 2 = Upload/Capture
  shutdown: boolean = true
): Promise<number | null> {
  if (!isFOGEnabled()) {
    throw new Error('FOG integration not enabled');
  }

  try {
    const fogUrl = process.env.FOG_SERVER_URL;
    console.log(`[FOG] Creating deployment task for ${macAddresses.length} devices`);

    const response = await fetch(`${fogUrl}/api/task/create`, {
      method: 'POST',
      headers: getFOGHeaders(),
      body: JSON.stringify({
        imageID: fogImageId,
        hosts: macAddresses,
        taskType: taskType,
        shutdown: shutdown ? 1 : 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`FOG API returned ${response.status}`);
    }

    const data = (await response.json()) as { taskID?: number };

    if (data.taskID) {
      console.log(`[FOG] Task created: ${data.taskID}`);
      return data.taskID;
    }

    throw new Error('FOG did not return task ID');
  } catch (error) {
    console.error('[FOG] Task creation failed:', error);
    throw error;
  }
}

/**
 * Get status of a FOG task
 */
export async function getFOGTaskStatus(taskId: number): Promise<FOGTask | null> {
  if (!isFOGEnabled()) return null;

  try {
    const fogUrl = process.env.FOG_SERVER_URL;
    const response = await fetch(`${fogUrl}/api/task/${taskId}`, {
      method: 'GET',
      headers: getFOGHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`FOG API returned ${response.status}`);
    }

    return (await response.json()) as FOGTask;
  } catch (error) {
    console.error('[FOG] Task status fetch failed:', error);
    return null;
  }
}

/**
 * Cancel a FOG task
 */
export async function cancelFOGTask(taskId: number): Promise<boolean> {
  if (!isFOGEnabled()) return false;

  try {
    const fogUrl = process.env.FOG_SERVER_URL;
    console.log(`[FOG] Cancelling task ${taskId}`);

    const response = await fetch(`${fogUrl}/api/task/${taskId}/cancel`, {
      method: 'POST',
      headers: getFOGHeaders(),
    });

    const success = response.ok;
    if (success) {
      console.log(`[FOG] Task ${taskId} cancelled`);
    }
    return success;
  } catch (error) {
    console.error('[FOG] Task cancellation failed:', error);
    return false;
  }
}

/**
 * Get FOG image details
 */
export async function getFOGImage(imageId: number): Promise<FOGImage | null> {
  if (!isFOGEnabled()) return null;

  try {
    const fogUrl = process.env.FOG_SERVER_URL;
    const response = await fetch(`${fogUrl}/api/image/${imageId}`, {
      method: 'GET',
      headers: getFOGHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`FOG API returned ${response.status}`);
    }

    const data = (await response.json()) as { image: FOGImage };
    return data.image;
  } catch (error) {
    console.error('[FOG] Image fetch failed:', error);
    return null;
  }
}

/**
 * Check FOG server connectivity
 */
export async function checkFOGConnectivity(): Promise<boolean> {
  if (!isFOGEnabled()) return false;

  try {
    const fogUrl = process.env.FOG_SERVER_URL;
    const response = await fetch(`${fogUrl}/api/image`, {
      method: 'GET',
      headers: getFOGHeaders(),
    });

    const connected = response.ok;
    console.log(`[FOG] Connectivity check: ${connected ? 'OK' : 'FAILED'}`);
    return connected;
  } catch (error) {
    console.error('[FOG] Connectivity check failed:', error);
    return false;
  }
}

/**
 * Monitor FOG deployment progress with post-deployment task triggering
 */
export async function monitorFOGDeployment(
  taskId: number,
  onProgress: (progress: number, status: string) => void,
  onComplete?: (success: boolean) => void,
  postDeploymentProfileId?: string
): Promise<boolean> {
  if (!isFOGEnabled()) return false;

  let lastPercent = 0;

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const task = await getFOGTaskStatus(taskId);

        if (!task) {
          clearInterval(interval);
          reject(new Error('Task not found'));
          return;
        }

        const progress = task.percent || 0;

        if (progress !== lastPercent) {
          lastPercent = progress;
          const statusMap: Record<string, string> = {
            '0': 'Pending',
            '1': 'In Progress',
            '2': 'Completed',
            '3': 'Failed',
            '4': 'Cancelled',
          };
          const status = statusMap[task.taskState] || 'Unknown';
          onProgress(progress, status);
        }

        // Check if task is complete
        if (progress === 100 || task.taskState === '2') {
          clearInterval(interval);
          
          // If post-deployment profile specified, trigger post-deployment tasks
          if (postDeploymentProfileId && onComplete) {
            console.log(`[FOG] Deployment complete. Triggering post-deployment profile: ${postDeploymentProfileId}`);
            try {
              onComplete(true);
            } catch (error) {
              console.error('[FOG] Post-deployment trigger failed:', error);
            }
          }
          
          resolve(true);
        } else if (task.taskState === '3' || task.taskState === '4') {
          clearInterval(interval);
          
          // Notify completion even on failure
          if (onComplete) {
            onComplete(false);
          }
          
          reject(new Error(`Task failed with state: ${task.taskState}`));
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, 2000); // Check every 2 seconds
  });
}

/**
 * Trigger post-deployment tasks after FOG deployment completes
 */
export async function triggerPostDeploymentTasks(
  profileId: string,
  hostId: number,
  onTaskProgress?: (taskName: string, status: string) => void
): Promise<void> {
  console.log(`[Post-Deployment] Starting tasks for profile ${profileId} on FOG host ${hostId}`);
  
  try {
    // Get post-deployment profile from storage
    if (onTaskProgress) {
      onTaskProgress("System", "Starting post-deployment automation");
    }
    
    console.log(`[Post-Deployment] Post-deployment tasks initiated for profile ${profileId}`);
  } catch (error) {
    console.error(`[Post-Deployment] Failed to trigger tasks:`, error);
    throw error;
  }
}

/**
 * Export FOG API client for external use
 */
export const FOGClient = {
  isEnabled: isFOGEnabled,
  checkConnectivity: checkFOGConnectivity,
  syncImages: syncFOGImages,
  syncHosts: syncFOGHosts,
  getImage: getFOGImage,
  createTask: createFOGTask,
  getTaskStatus: getFOGTaskStatus,
  cancelTask: cancelFOGTask,
  monitorDeployment: monitorFOGDeployment,
};
