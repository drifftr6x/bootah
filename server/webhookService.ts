import { storage } from "./storage";
import type { WebhookSubscription } from "@shared/schema";
import * as crypto from "crypto";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

async function sendWebhook(subscription: WebhookSubscription, payload: WebhookPayload): Promise<void> {
  const payloadString = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Bootah-Webhook/1.0",
    "X-Webhook-Event": payload.event
  };

  if (subscription.secret) {
    const signature = crypto.createHmac("sha256", subscription.secret)
      .update(payloadString)
      .digest("hex");
    headers["X-Webhook-Signature"] = `sha256=${signature}`;
  }

  if (subscription.headers) {
    Object.assign(headers, subscription.headers);
  }

  try {
    const response = await fetch(subscription.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(10000)
    });

    await storage.createWebhookDelivery({
      subscriptionId: subscription.id,
      event: payload.event,
      payload: payload,
      status: response.ok ? "delivered" : "failed",
      httpStatus: response.status,
      responseBody: await response.text().catch(() => null),
      attempts: 1
    });

    console.log(`[Webhook] ${payload.event} delivered to ${subscription.name}: ${response.status}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await storage.createWebhookDelivery({
      subscriptionId: subscription.id,
      event: payload.event,
      payload: payload,
      status: "failed",
      httpStatus: null,
      responseBody: errorMessage,
      attempts: 1
    });

    console.error(`[Webhook] Failed to deliver ${payload.event} to ${subscription.name}: ${errorMessage}`);
  }
}

export async function triggerWebhook(event: string, data: Record<string, unknown>): Promise<void> {
  try {
    const subscriptions = await storage.getWebhookSubscriptionsByEvent(event);
    
    if (subscriptions.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data
    };

    console.log(`[Webhook] Triggering ${event} for ${subscriptions.length} subscription(s)`);

    await Promise.allSettled(
      subscriptions.map(subscription => sendWebhook(subscription, payload))
    );
  } catch (error) {
    console.error(`[Webhook] Error triggering webhook event ${event}:`, error);
  }
}

export const webhookEvents = {
  DEVICE_DISCOVERED: "device_discovered",
  DEVICE_ONLINE: "device_online",
  DEVICE_OFFLINE: "device_offline",
  DEPLOYMENT_STARTED: "deployment_started",
  DEPLOYMENT_COMPLETED: "deployment_completed",
  DEPLOYMENT_FAILED: "deployment_failed",
  IMAGE_CAPTURE_COMPLETED: "image_capture_completed",
  MULTICAST_SESSION_COMPLETED: "multicast_session_completed"
} as const;
