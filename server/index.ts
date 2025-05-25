import express, { type Request, Response, NextFunction, type Express } from "express";
import http from 'http'; // Import http
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth"; // Import setupAuth
import { setupVite, serveStatic, log } from "./vite";

export async function createApp(): Promise<{ app: Express, server: http.Server }> {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Request logging middleware (simplified for brevity in refactor diff)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        const duration = Date.now() - start;
        log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      }
    });
    next();
  });
  
  // Setup Passport and auth routes first
  setupAuth(app); // This will configure passport strategies and /api/login, /api/register, etc.

  // Then register other application routes (which might include protected routes)
  const server = await registerRoutes(app); // registerRoutes likely creates/returns an http.Server and adds other routes

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error("Unhandled error in middleware:", err); 
  });

  // Vite/static serving setup should typically come after all routes are defined
  if (process.env.NODE_ENV === "development") {
    if (process.env.NODE_ENV !== 'test') await setupVite(app, server); // Avoid Vite in test
  } else {
    serveStatic(app);
  }
  return { app, server };
}

// Main application execution
async function main() {
  try {
    const { server } = await createApp(); 

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    log(`Error starting server: ${error}`, "express");
    console.error(error);
  }
}

// Start server only if not in test environment 
if (process.env.NODE_ENV !== 'test') {
  main();
}
