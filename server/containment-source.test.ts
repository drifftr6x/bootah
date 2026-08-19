import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("the control plane retains Phase 1 containment guards", async () => {
  const routes = await readFile(new URL("./routes.ts", import.meta.url), "utf8");
  const imaging = await readFile(new URL("./imaging-engine.ts", import.meta.url), "utf8");

  assert.match(routes, /capabilityDisabledResponse\("hostLocalImaging"\)/);
  assert.match(routes, /capabilityDisabledResponse\("machineCallbacks"\)/);
  assert.match(routes, /capabilityDisabledResponse\("objectProxy"\)/);
  assert.match(routes, /new WebSocketServer\(\{ noServer: true \}\)/);
  assert.match(imaging, /assertHostLocalImagingEnabled\(\)/);
});

test("production UI does not start the WebSocket hook", async () => {
  const app = await readFile(new URL("../client/src/App.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /useWebSocket\(/);
});
