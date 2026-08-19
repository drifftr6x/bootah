import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./static";
import { validateEncryption } from "./encryption";
import { validateProductionConfiguration } from "./capabilities";

validateEncryption();
validateProductionConfiguration();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  const { httpServer, cleanup } = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = app.get("env") === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error";

      console.error("Unhandled request error:", err);
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
      if (process.env.NODE_ENV === "development") {
      const { setupVite } = await import("./vite");
      await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  httpServer.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    log(`${signal} received, starting graceful shutdown`);
    
    // Stop accepting new connections
    httpServer.close(() => {
      log('HTTP server closed');
    });
    
    // Cleanup all services
    await cleanup();
    
    // Give active requests time to complete
    setTimeout(() => {
      log('Graceful shutdown complete');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})();
