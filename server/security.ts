import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import rateLimit, { type Options } from "express-rate-limit";

const CSRF_TOKEN_HEADER = "x-csrf-token";
const CSRF_COOKIE_NAME = "csrf_token";
const PXE_TOKEN_HEADER = "x-pxe-token";

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(req.method);
  
  if (safeMethod) {
    if (!req.session?.csrfToken) {
      req.session.csrfToken = generateCsrfToken();
    }
    return next();
  }

  const tokenFromHeader = req.headers[CSRF_TOKEN_HEADER] as string;
  const tokenFromSession = req.session?.csrfToken;

  if (!tokenFromHeader || !tokenFromSession) {
    return res.status(403).json({ message: "CSRF token missing" });
  }

  if (!crypto.timingSafeEqual(
    Buffer.from(tokenFromHeader),
    Buffer.from(tokenFromSession)
  )) {
    return res.status(403).json({ message: "CSRF token invalid" });
  }

  next();
}

export function getCsrfToken(req: Request): string {
  if (!req.session?.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  return req.session.csrfToken;
}

const pxeTokenStore = new Map<string, { expiresAt: number; sessionId: string }>();

export function generatePxeToken(sessionId: string): string {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  pxeTokenStore.set(token, { expiresAt, sessionId });
  return token;
}

export function validatePxeToken(token: string, sessionId: string): boolean {
  const stored = pxeTokenStore.get(token);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    pxeTokenStore.delete(token);
    return false;
  }
  return stored.sessionId === sessionId;
}

export function cleanExpiredPxeTokens(): void {
  const now = Date.now();
  const entries = Array.from(pxeTokenStore.entries());
  for (const [token, data] of entries) {
    if (now > data.expiresAt) {
      pxeTokenStore.delete(token);
    }
  }
}

setInterval(cleanExpiredPxeTokens, 60 * 60 * 1000);

export const pxeClientRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: "Too many requests from this IP, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export const pxeHeartbeatRateLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 20,
  message: { message: "Too many heartbeat requests" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
  }
}
