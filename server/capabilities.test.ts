import assert from "node:assert/strict";
import test from "node:test";
import { getCapabilities, validateProductionConfiguration } from "./capabilities";

const SAFETY_ENV_KEYS = [
  "NODE_ENV",
  "AUTH_MODE",
  "SESSION_SECRET",
  "BOOTSTRAP_TOKEN",
  "ALLOW_REGISTRATION",
  "DEFAULT_USER_ROLE",
  "ENABLE_HOST_LOCAL_IMAGING",
  "ENABLE_PXE_NETWORK_SERVICES",
  "ENABLE_SCHEDULER_EXECUTION",
  "ENABLE_MACHINE_CALLBACKS",
  "ENABLE_MULTICAST_EXECUTION",
  "ENABLE_FOG_EXECUTION",
  "ENABLE_WEBHOOK_DELIVERY",
  "ENABLE_OBJECT_PROXY",
  "ENABLE_DEMO_MODE",
  "ENABLE_WEBSOCKETS",
] as const;

function withEnvironment(values: Partial<Record<(typeof SAFETY_ENV_KEYS)[number], string>>, run: () => void) {
  const previous = Object.fromEntries(SAFETY_ENV_KEYS.map(key => [key, process.env[key]]));
  for (const key of SAFETY_ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
  try {
    run();
  } finally {
    for (const key of SAFETY_ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("all dangerous capabilities default to disabled", () => {
  withEnvironment({}, () => {
    assert.deepEqual(getCapabilities(), {
      hostLocalImaging: false,
      pxeNetworkServices: false,
      schedulerExecution: false,
      machineCallbacks: false,
      multicastExecution: false,
      fogExecution: false,
      webhookDelivery: false,
      objectProxy: false,
      demoMode: false,
      webSockets: false,
    });
  });
});

test("safe production configuration is accepted", () => {
  withEnvironment({
    NODE_ENV: "production",
    AUTH_MODE: "local",
    SESSION_SECRET: "s".repeat(32),
    BOOTSTRAP_TOKEN: "b".repeat(32),
    ALLOW_REGISTRATION: "false",
    DEFAULT_USER_ROLE: "viewer",
  }, () => assert.doesNotThrow(validateProductionConfiguration));
});

test("production rejects dangerous capabilities", () => {
  withEnvironment({
    NODE_ENV: "production",
    SESSION_SECRET: "s".repeat(32),
    ENABLE_HOST_LOCAL_IMAGING: "true",
  }, () => assert.throws(validateProductionConfiguration, /ENABLE_HOST_LOCAL_IMAGING/));
});

test("production rejects public registration with an admin default", () => {
  withEnvironment({
    NODE_ENV: "production",
    SESSION_SECRET: "s".repeat(32),
    ALLOW_REGISTRATION: "true",
    DEFAULT_USER_ROLE: "admin",
  }, () => assert.throws(validateProductionConfiguration, /DEFAULT_USER_ROLE=admin/));
});
