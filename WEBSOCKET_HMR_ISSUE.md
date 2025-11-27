# WebSocket/Vite HMR Connection Issue

## Status: BLOCKING - Frontend Not Fully Accessible

## Problem Description

The application frontend is experiencing WebSocket connection failures during development due to Vite's Hot Module Replacement (HMR) configuration in the Replit environment.

### Error Observed
```
SyntaxError: Failed to construct 'WebSocket': The URL 'wss://localhost:undefined/?token=...' is invalid.
```

The port is undefined, making the WebSocket URL invalid: `wss://localhost:undefined/...`

### Root Cause

Vite's HMR configuration in `server/vite.ts` (lines 22-27) is set to:
```typescript
hmr: { server },
allowedHosts: true as const,
```

In the Replit development environment, this does NOT properly resolve the host and port for the WebSocket connection. The client receives `undefined` for the port, resulting in an invalid URL.

### Why It Matters

- The frontend cannot establish real-time WebSocket connections for live updates
- Hot module reloading doesn't work properly during development
- Users see browser console errors even though the application backend is running

## Solution Required

### Option 1: Update Vite HMR Configuration (RECOMMENDED)

The file `server/vite.ts` needs to be updated to explicitly configure HMR for Replit:

```typescript
export async function setupVite(app: Express, server: Server) {
  // Get Replit environment variables
  const isReplit = process.env.REPL_ID !== undefined;
  const replUrl = isReplit 
    ? `${process.env.REPL_OWNER}-${process.env.REPL_SLUG}.replit.dev`
    : 'localhost';
  const port = process.env.PORT || '5000';

  const serverOptions = {
    middlewareMode: true,
    hmr: process.env.NODE_ENV === 'production' 
      ? false 
      : {
          protocol: 'wss',
          host: replUrl,
          port: 443,
        },
    allowedHosts: true as const,
  };
  // ... rest of configuration
}
```

### Option 2: Disable HMR in Development

If Option 1 doesn't work, disable HMR entirely:

```typescript
hmr: process.env.NODE_ENV === 'production' ? false : {
  host: 'localhost',
  port: 5000,
  protocol: 'wss',
}
```

## What's Already Completed

✅ **FOG Integration Backend Complete:**
- Templates now store FOG-specific parameters (`imagingEngine`, `fogImageId`, `fogTaskType`, `fogShutdown`)
- Post-deployment task triggering infrastructure in place
- Scheduled FOG deployments foundation ready
- Database schema updated with `fogDeploymentMappings` table
- Storage methods implemented for FOG deployment mapping CRUD operations
- Application backend compiles and runs successfully

✅ **Database Schema Applied:**
- All FOG-related tables created via `npm run db:push`
- New columns added to `deployment_templates` for FOG parameters
- `fogDeploymentMappings` table ready for use

✅ **Client-Side WebSocket Fix (Partial):**
- Fixed the useWebSocket hook to use `window.location.host` directly
- Resolves client-side application WebSocket connections to the backend
- However, Vite HMR errors persist (separate from app WebSocket)

## Impact

**Current State:** Backend is fully functional. Frontend loads but displays WebSocket errors in console.

**Blocking Issue:** The Vite HMR WebSocket error prevents proper frontend development experience and may cause issues with live reload functionality.

**Not Blocking:** The application's actual functionality should work - the errors are from Vite's development tooling, not the application code itself.

## Files That Need Changes

- `server/vite.ts` - Update HMR configuration (currently protected from editing)

## How to Apply the Fix

Since `server/vite.ts` is protected, the fix must be applied by:

1. A developer with proper permissions, or
2. The Replit system administrator, or
3. Through the Replit configuration system if available

Once `server/vite.ts` is updated with proper HMR configuration for the Replit environment, all WebSocket errors should resolve.

## Testing After Fix

After applying the fix:

1. Restart the application workflow
2. Open browser console (F12)
3. Verify no WebSocket connection errors
4. Test real-time features (deployments, activity logs should update in real-time)
5. Verify hot module reloading works when code changes

## References

- Vite HMR Documentation: https://vitejs.dev/config/server-options.html#server-hmr
- Replit Environment Variables: `REPL_ID`, `REPL_OWNER`, `REPL_SLUG`, `PORT`
