import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { hashPassword, comparePasswords } from "./crypto.utils"; // Import from crypto.utils

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

// Password hashing functions (hashPassword, comparePasswords) are now imported from crypto.utils.ts

export function setupAuth(app: Express) {
  // Configure session settings
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'freshsave-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true, // Make cookie HttpOnly
      maxAge: 24 * 60 * 60 * 1000, // 1 day by default
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy for username/password auth
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        if (!user.hashedPassword) { // Check for hashedPassword existence
          console.error(`User ${username} has no hashedPassword defined.`);
          return done(null, false, { message: "Invalid username or password" });
        }

        if (!(await comparePasswords(password, user.hashedPassword))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Exclude hashedPassword from the user object passed to done
        const { hashedPassword, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Configure passport session serialization
  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    console.log("Deserializing user:", id);
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(new Error("User not found"));
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Register authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password, rememberMe } = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      
      // Create user
      const user = await storage.createUser({
        username,
        email,
        hashedPassword: hashedPassword,
      });

      // Set session cookie expiration based on "remember me" option
      if (req.session && rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          username: user.username,
          email: user.email,
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    const { rememberMe } = req.body;
    
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // Set session cookie expiration based on "remember me" option
        if (req.session && rememberMe) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }
        
        console.log("Logged in user:", user);
        res.status(200).json({
          id: user.id,
          username: user.username,
          email: user.email,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log("Logging out user:", req.user);
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("User is not authenticated");
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    console.log("Returning authenticated user:", req.user);
    res.json(req.user);
  });
}