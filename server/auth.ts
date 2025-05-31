import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import logger from "./logger"; // Import the structured logger
import { storage } from "./storage";
import { hashPassword, comparePasswords } from "./crypto.utils"; // Import from crypto.utils
import { z } from "zod"; // Import Zod
import { fromZodError, type ZodError } from "zod-validation-error"; // Import fromZodError

// For TypeScript type augmentation
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
    }
  }
}

// Helper to get request ID
const getRequestId = (req: Request) => (req as any).id || 'unknown';

// Zod schema for registration, defined once
const registerUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long.").max(30, "Username must be no more than 30 characters long."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character."),
  rememberMe: z.boolean().optional().default(false),
});


/**
 * Sets up authentication and session management for an Express application using Passport.js.
 *
 * Configures session middleware, initializes Passport with a local strategy for username/password authentication, and registers routes for user registration, login, logout, and user info retrieval. Integrates input validation for registration, secure password handling, and structured logging for all authentication events.
 *
 * @param app - The Express application instance to configure authentication for.
 *
 * @remark
 * Session cookies are configured with secure, httpOnly, and sameSite settings. The session duration is extended to 30 days if the `rememberMe` flag is set during registration or login; otherwise, it defaults to 1 day.
 */
export function setupAuth(app: Express) {
  // Configure session settings
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'freshsave-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore, // Assuming storage.sessionStore is compatible
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true, // Make cookie HttpOnly
      maxAge: 24 * 60 * 60 * 1000, // 1 day by default
      sameSite: 'lax', // Mitigate CSRF
    }
  };

  if (process.env.NODE_ENV === 'production') {
    app.set("trust proxy", 1); // trust first proxy if using reverse proxy like Nginx/Heroku
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy for username/password auth
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);

        if (!user) {
          logger.warn({ username }, "Login attempt failed: User not found");
          return done(null, false, { message: "Invalid username or password" });
        }

        if (!user.hashedPassword) { // Check for hashedPassword existence
          logger.error({ username }, "Security Alert: User has no hashedPassword defined.");
          return done(null, false, { message: "Invalid username or password" }); // Generic message to user
        }

        const passwordsMatch = await comparePasswords(password, user.hashedPassword);
        if (!passwordsMatch) {
          logger.warn({ username }, "Login attempt failed: Incorrect password");
          return done(null, false, { message: "Invalid username or password" });
        }

        // Exclude hashedPassword from the user object passed to done
        const { hashedPassword, ...userWithoutPassword } = user;
        logger.info({ userId: userWithoutPassword.id, username }, "User successfully authenticated");
        return done(null, userWithoutPassword);
      } catch (err: any) {
        logger.error({ error: err.message, stack: err.stack, username }, "Error during LocalStrategy authentication");
        return done(err);
      }
    })
  );

  // Configure passport session serialization
  passport.serializeUser((user: Express.User, done) => {
    logger.debug({ userId: user.id }, "Serializing user");
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    logger.debug({ userId: id }, "Deserializing user");
    try {
      const user = await storage.getUser(id); // This should fetch only necessary, non-sensitive fields
      if (!user) {
        logger.warn({ userId: id }, "User not found during deserialization");
        return done(new Error("User not found"));
      }
      // Ensure sensitive data like hashedPassword is not included in the deserialized user object for the session
      const { hashedPassword, ...sessionUser } = user;
      done(null, sessionUser);
    } catch (err: any) {
      logger.error({ userId: id, error: err.message, stack: err.stack }, "Error during deserialization");
      done(err);
    }
  });

  // Register authentication routes
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    const requestId = getRequestId(req);
    logger.info({ requestId, body: req.body }, "Registration attempt started");

    try {
      const validationResult = registerUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error as ZodError);
        logger.warn({ requestId, validationErrors: validationError.details }, "Registration validation failed");
        return res.status(400).json({
          message: "Validation failed. Please check the provided data.",
          details: validationError.details
        });
      }

      const { username, email, password, rememberMe } = validationResult.data;

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        logger.warn({ requestId, username }, "Registration failed: Username already exists");
        return res.status(400).json({ message: "Username already exists. Please choose another." });
      }

      const hashedPassword = await hashPassword(password);

      const newUser = await storage.createUser({
        username,
        email,
        hashedPassword: hashedPassword, // Store the hashed password
      });
      logger.info({ requestId, userId: newUser.id, username }, "User successfully registered");

      // Set session cookie expiration based on "remember me" option
      if (req.session && rememberMe === true) { // Explicitly check for true
        logger.debug({ requestId, userId: newUser.id }, "Setting 'rememberMe' cookie for 30 days");
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      } else if (req.session) {
        logger.debug({ requestId, userId: newUser.id }, "Setting default session cookie duration (1 day)");
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // Default 1 day (or as per sessionSettings)
      }

      req.login(newUser, (err) => {
        if (err) {
          logger.error({ requestId, userId: newUser.id, error: err.message, stack: err.stack }, "Error during login after registration");
          return next(err);
        }
        // Return only non-sensitive user info
        const { hashedPassword: _, ...userResponse } = newUser;
        logger.info({ requestId, userId: userResponse.id }, "User logged in after registration");
        res.status(201).json(userResponse);
      });
    } catch (error: any) {
      logger.error({ requestId, username: req.body.username, error: error.message, stack: error.stack }, "Unhandled error during registration");
      next(error); // Pass to global error handler
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    const requestId = getRequestId(req);
    const { username, rememberMe } = req.body; // Get username for logging
    logger.info({ requestId, username }, "Login attempt started");

    passport.authenticate("local", (err: any, user: Express.User | false | null, info: { message: string } | undefined) => {
      if (err) {
        logger.error({ requestId, username, error: err.message, stack: err.stack }, "Error during passport.authenticate");
        return next(err);
      }
      if (!user) {
        logger.warn({ requestId, username, message: info?.message }, "Login failed: Invalid credentials or user not found");
        return res.status(401).json({ message: info?.message || "Invalid username or password." });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          logger.error({ requestId, userId: user.id, error: loginErr.message, stack: loginErr.stack }, "Error during req.login");
          return next(loginErr);
        }

        if (req.session && rememberMe === true) { // Explicitly check for true
          logger.debug({ requestId, userId: user.id }, "Setting 'rememberMe' cookie for 30 days on login");
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        } else if (req.session) {
          logger.debug({ requestId, userId: user.id }, "Setting default session cookie duration (1 day) on login");
          req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // Default 1 day
        }

        logger.info({ requestId, userId: user.id }, "User logged in successfully");
        res.status(200).json(user); // user object from LocalStrategy's done callback (already without password)
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    const requestId = getRequestId(req);
    const userId = req.user?.id;
    logger.info({ requestId, userId }, "Logout attempt started");

    req.logout((err) => {
      if (err) {
        logger.error({ requestId, userId, error: err.message, stack: err.stack }, "Error during req.logout");
        return next(err);
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          logger.error({ requestId, userId, error: destroyErr.message, stack: destroyErr.stack }, "Error destroying session during logout");
          return next(destroyErr);
        }
        res.clearCookie('connect.sid'); // Default session cookie name, adjust if different
        logger.info({ requestId, userId }, "User logged out successfully, session destroyed, cookie cleared");
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    if (!req.isAuthenticated || !req.isAuthenticated()) { // req.isAuthenticated might not exist if passport error
      logger.debug({ requestId }, "User data requested, but user is not authenticated");
      return res.status(401).json({ message: "Not authenticated. Please log in." });
    }

    logger.debug({ requestId, userId: req.user?.id }, "Returning authenticated user data");
    // req.user should already be sanitized (no password) by deserializeUser
    res.json(req.user);
  });
}
