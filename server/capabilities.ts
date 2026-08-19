export const CAPABILITY_ENV = {
  hostLocalImaging: "ENABLE_HOST_LOCAL_IMAGING",
  pxeNetworkServices: "ENABLE_PXE_NETWORK_SERVICES",
  schedulerExecution: "ENABLE_SCHEDULER_EXECUTION",
  machineCallbacks: "ENABLE_MACHINE_CALLBACKS",
  multicastExecution: "ENABLE_MULTICAST_EXECUTION",
  fogExecution: "ENABLE_FOG_EXECUTION",
  webhookDelivery: "ENABLE_WEBHOOK_DELIVERY",
  objectProxy: "ENABLE_OBJECT_PROXY",
  demoMode: "ENABLE_DEMO_MODE",
  webSockets: "ENABLE_WEBSOCKETS",
} as const;

export type CapabilityName = keyof typeof CAPABILITY_ENV;
export type Capabilities = Readonly<Record<CapabilityName, boolean>>;

function isExplicitlyEnabled(name: CapabilityName): boolean {
  return process.env[CAPABILITY_ENV[name]] === "true";
}

export function getCapabilities(): Capabilities {
  return Object.freeze({
      hostLocalImaging: isExplicitlyEnabled("hostLocalImaging"),
      pxeNetworkServices: isExplicitlyEnabled("pxeNetworkServices"),
      schedulerExecution: isExplicitlyEnabled("schedulerExecution"),
    machineCallbacks: isExplicitlyEnabled("machineCallbacks"),
    multicastExecution: isExplicitlyEnabled("multicastExecution"),
    fogExecution: isExplicitlyEnabled("fogExecution"),
    webhookDelivery: isExplicitlyEnabled("webhookDelivery"),
    objectProxy: isExplicitlyEnabled("objectProxy"),
    demoMode: isExplicitlyEnabled("demoMode"),
    webSockets: isExplicitlyEnabled("webSockets"),
  });
}

export function validateProductionConfiguration(): void {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) return;

  const errors: string[] = [];
  const sessionSecret = process.env.SESSION_SECRET || "";
  const defaultRole = process.env.DEFAULT_USER_ROLE || "viewer";
  const registrationEnabled = process.env.ALLOW_REGISTRATION === "true";
  const capabilities = getCapabilities();

  if (sessionSecret.length < 32) {
    errors.push("SESSION_SECRET must be set to at least 32 characters");
  }

  if ((process.env.AUTH_MODE || "replit").toLowerCase() === "local"
    && (process.env.BOOTSTRAP_TOKEN || "").length < 32) {
    errors.push("BOOTSTRAP_TOKEN must be set to at least 32 characters for local authentication");
  }

  if (registrationEnabled && defaultRole === "admin") {
    errors.push("ALLOW_REGISTRATION=true cannot be combined with DEFAULT_USER_ROLE=admin");
  }

  if (capabilities.demoMode) {
    errors.push("ENABLE_DEMO_MODE cannot be enabled in production");
  }

  const unsafeCapabilities: CapabilityName[] = [
      "hostLocalImaging",
      "pxeNetworkServices",
      "schedulerExecution",
    "machineCallbacks",
    "multicastExecution",
    "fogExecution",
    "webhookDelivery",
    "objectProxy",
    "webSockets",
  ];
  for (const capability of unsafeCapabilities) {
    if (capabilities[capability]) {
      errors.push(`${CAPABILITY_ENV[capability]} is not available in the Phase 1 production baseline`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Unsafe production configuration:\n- ${errors.join("\n- ")}`);
  }
}

export function capabilityDisabledResponse(capability: CapabilityName) {
  return {
    message: "Capability is disabled in the Phase 1 safe baseline",
    capability,
    enabled: false,
  } as const;
}
