import express, { type Request, Response, NextFunction, type Express } from "express";
import http from 'http'; // Import http
import logger from './logger'; // Import the structured logger
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth"; // Import setupAuth
import { setupVite, serveStatic } from "./vite"; /**
 * Initializes and configures an Express application and HTTP server with structured logging, authentication, routing, error handling, and environment-specific static asset serving.
 *
 * @returns An object containing the configured Express app and HTTP server.
 *
 * @remark Each request is assigned a unique request ID for traceable logging. Error responses expose detailed messages only in development or for trusted operational errors in production.
 */

export async function createApp(): Promise<{ app: Express, server: http.Server }> {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Request logging middleware (simplified for brevity in refactor diff)
  app.use((req, res, next) => {
    const start = Date.now();
    // Add request ID (simple example, could use a library like express-request-id)
    const requestId = Math.random().toString(36).substring(2, 15);
    // @ts-ignore
    req.id = requestId; // Attach to request for downstream logging

    logger.info({
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    }, `Incoming request to ${req.method} ${req.originalUrl}`);

    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.info({
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
      }, `Finished request to ${req.method} ${req.originalUrl} with status ${res.statusCode} in ${duration}ms`);
    });
    next();
  });
  
  // Setup Passport and auth routes first
  setupAuth(app); // This will configure passport strategies and /api/login, /api/register, etc.

  // Then register other application routes (which might include protected routes)
  const server = await registerRoutes(app); // registerRoutes likely creates/returns an http.Server and adds other routes

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    // @ts-ignore
    const requestId = req.id;

    let responseMessage = "Internal Server Error. Please try again later.";
    if (!isProduction && err.message) {
        responseMessage = err.message; // Show detailed message in dev
    }
    // For specific operational errors we trust, we might allow their messages in prod
    if (status < 500 && err.message) {
        responseMessage = err.message;
    }

    logger.error({
        requestId,
        status,
        message: err.message, // Log original error message
        path: req.path,
        method: req.method,
        stack: err.stack,
        // details: err.details // If we add a details field to our custom errors
    }, `Unhandled error: ${err.message}`);
    
    res.status(status).json({ message: responseMessage });
  });

  // Vite/static serving setup should typically come after all routes are defined
  if (process.env.NODE_ENV === "development") {
    if (process.env.NODE_ENV !== 'test') await setupVite(app, server); // Avoid Vite in test
  } else {
    serveStatic(app);
  }
  return { app, server };
}

/**
 * Initializes the application and starts the HTTP server on port 5000.
 *
 * Logs a startup success message when the server begins listening, or logs a fatal error if server initialization fails.
 */
async function main() {
  try {
    const { server } = await createApp(); 

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      logger.info(`Server listening on port ${port}`);
    });
  } catch (error: any) {
    logger.fatal({ err: error, stack: error.stack }, "Failed to start server");
    // console.error(error); // Replaced by logger.fatal
  }
}

// Start server only if not in test environment 
if (process.env.NODE_ENV !== 'test') {
  main();
}
