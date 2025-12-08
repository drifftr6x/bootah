import type { Express, RequestHandler } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectPg from "connect-pg-simple";
import crypto from "crypto";
import { storage } from "./storage";
import { authenticateUser, hashPassword, validatePassword, createPasswordResetToken, validateResetToken, markTokenAsUsed, updatePassword } from "./localAuth";
import { db } from "./db";
import { users, roles, userRoles } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import { emailService } from "./emailService";

export type AuthMode = "replit" | "local";

export function getAuthMode(): AuthMode {
  const mode = process.env.AUTH_MODE?.toLowerCase();
  if (mode === "local") {
    return "local";
  }
  return "replit";
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
  
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function checkIfSetupRequired(): Promise<boolean> {
  const allUsers = await db.select().from(users).limit(1);
  return allUsers.length === 0;
}

async function assignDefaultRole(userId: string, isFirstUser: boolean): Promise<void> {
  try {
    const userRolesResult = await storage.getUserRoles(userId);
    if (userRolesResult.length > 0) {
      return;
    }

    const allRoles = await storage.getRoles();
    const isDevelopment = process.env.NODE_ENV === "development";
    
    let defaultRoleName: string;
    if (isFirstUser) {
      defaultRoleName = "admin";
    } else {
      const requestedRole = process.env.DEFAULT_USER_ROLE || "viewer";
      const roleExists = allRoles.some(r => r.name === requestedRole);
      
      if (!roleExists) {
        console.error(`[Auth] Invalid DEFAULT_USER_ROLE="${requestedRole}" - role not found. Falling back to "viewer".`);
        defaultRoleName = "viewer";
      } else {
        defaultRoleName = requestedRole;
        
        if (!isDevelopment && (defaultRoleName === "operator" || defaultRoleName === "admin")) {
          console.warn(`[Auth] WARNING: DEFAULT_USER_ROLE="${defaultRoleName}" grants elevated privileges in production!`);
        }
      }
    }
    
    const defaultRole = allRoles.find(r => r.name === defaultRoleName);
    
    if (defaultRole) {
      await storage.assignUserRole({
        userId,
        roleId: defaultRole.id,
        assignedBy: null,
      });
      console.log(`[Auth] Auto-assigned ${defaultRoleName} role to user: ${userId}`);
    }
  } catch (error) {
    console.error("[Auth] Error auto-assigning role:", error);
  }
}

export async function setupLocalAuth(app: Express) {
  console.log("[Auth] Setting up local authentication mode");
  
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, username, password, done) => {
      try {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get("user-agent");
        
        const result = await authenticateUser(username, password, ipAddress, userAgent);
        
        if (!result.success) {
          return done(null, false, { message: result.error || "Authentication failed" });
        }
        
        return done(null, {
          id: result.user.id,
          claims: { sub: result.user.id },
          username: result.user.username,
          email: result.user.email,
          fullName: result.user.fullName,
          requirePasswordChange: result.requirePasswordChange,
        });
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, { id: user.id, claims: user.claims || { sub: user.id } });
  });

  passport.deserializeUser(async (serialized: any, done) => {
    try {
      const user = await storage.getUser(serialized.id);
      if (!user) {
        return done(null, false);
      }
      done(null, { ...serialized, ...user, claims: { sub: user.id } });
    } catch (error) {
      done(error);
    }
  });

  app.get("/api/auth/mode", (req, res) => {
    res.json({ mode: "local", setupRequired: false });
  });

  app.get("/api/auth/config", (req, res) => {
    res.json({ authMode: "local" });
  });

  app.get("/api/auth/setup-required", async (req, res) => {
    const setupRequired = await checkIfSetupRequired();
    res.json({ setupRequired });
  });

  app.post("/api/auth/setup", async (req, res) => {
    try {
      const setupRequired = await checkIfSetupRequired();
      if (!setupRequired) {
        return res.status(400).json({ message: "Setup already completed. Admin user already exists." });
      }

      const { username, email, password, fullName } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      const validation = validatePassword(password);
      if (!validation.valid) {
        return res.status(400).json({ message: "Password does not meet requirements", errors: validation.errors });
      }

      const passwordHash = await hashPassword(password);
      const userId = crypto.randomUUID();

      await db.insert(users).values({
        id: userId,
        username,
        email,
        fullName: fullName || username,
        passwordHash,
        isActive: true,
        accountStatus: "active",
        passwordLastChanged: new Date(),
        passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      await assignDefaultRole(userId, true);

      console.log(`[Auth] Initial admin user created: ${username}`);
      res.json({ success: true, message: "Admin account created successfully" });
    } catch (error: any) {
      console.error("[Auth] Setup error:", error);
      if (error.code === "23505") {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      res.status(500).json({ message: "Failed to create admin account" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
        }
        return res.json({ 
          success: true, 
          user: { id: user.id, username: user.username, email: user.email },
          requirePasswordChange: user.requirePasswordChange 
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const allowRegistration = process.env.ALLOW_REGISTRATION !== "false";
      if (!allowRegistration) {
        return res.status(403).json({ message: "Registration is disabled" });
      }

      const { username, email, password, fullName } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      const validation = validatePassword(password);
      if (!validation.valid) {
        return res.status(400).json({ message: "Password does not meet requirements", errors: validation.errors });
      }

      const existingUser = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.username}) = LOWER(${username}) OR LOWER(${users.email}) = LOWER(${email})`)
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Username or email already exists" });
      }

      const passwordHash = await hashPassword(password);
      const userId = crypto.randomUUID();
      const allUsers = await db.select().from(users).limit(1);
      const isFirstUser = allUsers.length === 0;

      await db.insert(users).values({
        id: userId,
        username,
        email,
        fullName: fullName || username,
        passwordHash,
        isActive: true,
        accountStatus: "active",
        passwordLastChanged: new Date(),
        passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      await assignDefaultRole(userId, isFirstUser);

      console.log(`[Auth] New user registered: ${username}`);
      res.json({ success: true, message: "Account created successfully" });
    } catch (error: any) {
      console.error("[Auth] Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const foundUsers = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`)
        .limit(1);

      if (foundUsers.length === 0) {
        return res.json({ success: true, message: "If an account exists with that email, a reset link has been sent." });
      }

      const user = foundUsers[0];
      const ipAddress = req.ip || req.connection.remoteAddress;
      const resetData = await createPasswordResetToken(user.id, null, ipAddress);

      console.log(`[Auth] Password reset token generated for user: ${user.email}`);

      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email || email,
        resetData.token,
        resetData.oneTimeCode,
        appUrl
      );

      if (!emailSent) {
        console.error("[Auth] Failed to send password reset email");
      }

      const response: any = { 
        success: true, 
        message: "If an account exists with that email, a reset link has been sent.",
      };

      if (process.env.NODE_ENV === "development") {
        response.token = resetData.token;
        response.oneTimeCode = resetData.oneTimeCode;
        response.note = "Token shown in development mode only";
      }

      res.json(response);
    } catch (error) {
      console.error("[Auth] Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      const validation = await validateResetToken(token);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      const result = await updatePassword(validation.userId!, newPassword);
      if (!result.success) {
        return res.status(400).json({ message: "Password does not meet requirements", errors: result.errors });
      }

      await markTokenAsUsed(token);

      console.log(`[Auth] Password reset completed for user: ${validation.userId}`);
      res.json({ success: true, message: "Password has been reset successfully" });
    } catch (error) {
      console.error("[Auth] Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.get("/api/login", (req, res) => {
    res.redirect("/login");
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("[Auth] Logout error:", err);
      }
      res.redirect("/login");
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/password-policy", (req, res) => {
    res.json({
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 90,
    });
  });

  app.get("/api/auth/email-status", (req, res) => {
    const info = emailService.getProviderInfo();
    res.json({
      provider: info.provider,
      configured: info.configured,
      message: info.provider === "console" 
        ? "Email is in console mode - emails are logged but not sent"
        : info.configured 
          ? `Email configured via ${info.provider.toUpperCase()}`
          : `Email provider ${info.provider} is not fully configured`,
    });
  });
}

export const isAuthenticatedLocal: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
