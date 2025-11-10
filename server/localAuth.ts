import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "./db";
import { users, passwordHistory, passwordResetTokens, loginHistory } from "../shared/schema";
import { eq, and, desc, lt, sql } from "drizzle-orm";

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const PASSWORD_HISTORY_LENGTH = 5;
const PASSWORD_EXPIRY_DAYS = 90;
const RESET_TOKEN_EXPIRY_HOURS = 24;

// Password Policy Configuration
export const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventReuse: true,
  historyLength: PASSWORD_HISTORY_LENGTH,
  expiryDays: PASSWORD_EXPIRY_DAYS,
};

/**
 * Validate password against policy
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Check if password was used recently (prevent reuse)
 */
export async function isPasswordReused(userId: string, newPassword: string): Promise<boolean> {
  if (!PASSWORD_POLICY.preventReuse) {
    return false;
  }

  // Check against current password first
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length > 0 && user[0].passwordHash) {
    if (await verifyPassword(newPassword, user[0].passwordHash)) {
      return true; // Password is the same as current
    }
  }

  // Check password history
  const history = await db
    .select()
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId))
    .orderBy(desc(passwordHistory.createdAt))
    .limit(PASSWORD_POLICY.historyLength);

  for (const entry of history) {
    if (await verifyPassword(newPassword, entry.passwordHash)) {
      return true;
    }
  }

  return false;
}

/**
 * Store password in history
 */
export async function addPasswordToHistory(userId: string, passwordHash: string): Promise<void> {
  await db.insert(passwordHistory).values({
    userId,
    passwordHash,
  });

  // Keep only the last N passwords
  const allHistory = await db
    .select()
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId))
    .orderBy(desc(passwordHistory.createdAt));

  if (allHistory.length > PASSWORD_POLICY.historyLength) {
    const toDelete = allHistory.slice(PASSWORD_POLICY.historyLength);
    for (const entry of toDelete) {
      await db.delete(passwordHistory).where(eq(passwordHistory.id, entry.id));
    }
  }
}

/**
 * Hash token or code using SHA-256
 */
function hashToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Generate password reset token
 */
export function generateResetToken(): { 
  token: string; 
  tokenHash: string;
  oneTimeCode: string;
  oneTimeCodeHash: string;
} {
  const token = crypto.randomBytes(32).toString("hex");
  const oneTimeCode = crypto.randomInt(100000, 999999).toString();
  
  return { 
    token,
    tokenHash: hashToken(token),
    oneTimeCode,
    oneTimeCodeHash: hashToken(oneTimeCode),
  };
}

/**
 * Create password reset token for user
 */
export async function createPasswordResetToken(
  userId: string,
  createdBy: string | null,
  ipAddress?: string
): Promise<{ token: string; oneTimeCode: string; expiresAt: Date }> {
  const { token, tokenHash, oneTimeCode, oneTimeCodeHash } = generateResetToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

  // Invalidate any existing reset tokens for this user
  await db
    .update(passwordResetTokens)
    .set({ isUsed: true })
    .where(and(
      eq(passwordResetTokens.userId, userId),
      eq(passwordResetTokens.isUsed, false)
    ));

  // Create new token (store hashed values)
  await db.insert(passwordResetTokens).values({
    userId,
    token: tokenHash,  // Store hash, not plaintext
    oneTimeCode: oneTimeCodeHash,  // Store hash, not plaintext
    expiresAt,
    createdBy,
    ipAddress,
  });

  // Return plaintext values to caller (only time they're visible)
  return { token, oneTimeCode, expiresAt };
}

/**
 * Validate and consume password reset token
 */
export async function validateResetToken(token: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const tokenHash = hashToken(token);
  
  const resetToken = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, tokenHash))
    .limit(1);

  if (resetToken.length === 0) {
    return { valid: false, error: "Invalid reset token" };
  }

  const tokenData = resetToken[0];

  if (tokenData.isUsed) {
    return { valid: false, error: "Reset token has already been used" };
  }

  if (new Date() > tokenData.expiresAt) {
    return { valid: false, error: "Reset token has expired" };
  }

  return { valid: true, userId: tokenData.userId };
}

/**
 * Mark reset token as used
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db
    .update(passwordResetTokens)
    .set({ isUsed: true, usedAt: new Date() })
    .where(eq(passwordResetTokens.token, tokenHash));
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId: string): Promise<boolean> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    return false;
  }

  const userData = user[0];

  // Check manual lock
  if (userData.isLocked) {
    // Check if lockout period has expired
    if (userData.lockedUntil && new Date() > userData.lockedUntil) {
      await unlockAccount(userId);
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Lock user account
 */
export async function lockAccount(userId: string, durationMinutes?: number): Promise<void> {
  const lockedUntil = durationMinutes
    ? new Date(Date.now() + durationMinutes * 60 * 1000)
    : null;

  await db
    .update(users)
    .set({
      isLocked: true,
      lockedUntil,
      accountStatus: "locked",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Unlock user account
 */
export async function unlockAccount(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      isLocked: false,
      lockedUntil: null,
      accountStatus: "active",
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Record failed login attempt
 */
export async function recordFailedLogin(
  userId: string | null,
  username: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Record in login history
  await db.insert(loginHistory).values({
    userId,
    username,
    success: false,
    failureReason: reason,
    ipAddress,
    userAgent,
    method: "local",
  });

  // If user exists, increment failed attempts
  if (userId) {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length > 0) {
      const userData = user[0];
      const newAttempts = (userData.failedLoginAttempts || 0) + 1;

      await db
        .update(users)
        .set({
          failedLoginAttempts: newAttempts,
          lastFailedLogin: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Lock account if max attempts exceeded
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        await lockAccount(userId, LOCKOUT_DURATION_MINUTES);
      }
    }
  }
}

/**
 * Record successful login
 */
export async function recordSuccessfulLogin(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Record in login history
  await db.insert(loginHistory).values({
    userId,
    success: true,
    ipAddress,
    userAgent,
    method: "local",
  });

  // Reset failed attempts and update last login
  await db
    .update(users)
    .set({
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      lastLogin: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Check if password is expired
 */
export async function isPasswordExpired(userId: string): Promise<boolean> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    return false;
  }

  const userData = user[0];

  // Check if force password change is enabled
  if (userData.forcePasswordChange) {
    return true;
  }

  // Check password expiry date
  if (userData.passwordExpiresAt && new Date() > userData.passwordExpiresAt) {
    return true;
  }

  return false;
}

/**
 * Update user password
 */
export async function updatePassword(
  userId: string,
  newPassword: string,
  skipPolicyCheck: boolean = false
): Promise<{ success: boolean; errors?: string[] }> {
  // Validate password policy
  if (!skipPolicyCheck) {
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Check password reuse
    if (await isPasswordReused(userId, newPassword)) {
      return {
        success: false,
        errors: [`Password cannot be one of your last ${PASSWORD_POLICY.historyLength} passwords`],
      };
    }
  }

  // Hash password
  const passwordHash = await hashPassword(newPassword);

  // Store old password in history
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length > 0 && user[0].passwordHash) {
    await addPasswordToHistory(userId, user[0].passwordHash);
  }

  // Calculate expiry date
  const passwordExpiresAt = new Date();
  passwordExpiresAt.setDate(passwordExpiresAt.getDate() + PASSWORD_EXPIRY_DAYS);

  // Update password
  await db
    .update(users)
    .set({
      passwordHash,
      passwordLastChanged: new Date(),
      passwordExpiresAt,
      forcePasswordChange: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { success: true };
}

/**
 * Authenticate user with username and password
 */
export async function authenticateUser(
  username: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  success: boolean;
  user?: any;
  error?: string;
  requirePasswordChange?: boolean;
}> {
  // Find user by username or email
  const foundUsers = await db
    .select()
    .from(users)
    .where(
      sql`LOWER(${users.username}) = LOWER(${username}) OR LOWER(${users.email}) = LOWER(${username})`
    )
    .limit(1);

  if (foundUsers.length === 0) {
    await recordFailedLogin(null, username, "invalid_credentials", ipAddress, userAgent);
    return { success: false, error: "Invalid username or password" };
  }

  const user = foundUsers[0];

  // Check if account is active
  if (!user.isActive || user.accountStatus === "disabled") {
    await recordFailedLogin(user.id, username, "account_disabled", ipAddress, userAgent);
    return { success: false, error: "Account is disabled" };
  }

  // Check if account is locked
  if (await isAccountLocked(user.id)) {
    await recordFailedLogin(user.id, username, "account_locked", ipAddress, userAgent);
    return { success: false, error: "Account is locked due to too many failed login attempts" };
  }

  // Verify password
  if (!user.passwordHash) {
    await recordFailedLogin(user.id, username, "no_password", ipAddress, userAgent);
    return { success: false, error: "Account not configured for password authentication" };
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    await recordFailedLogin(user.id, username, "invalid_credentials", ipAddress, userAgent);
    return { success: false, error: "Invalid username or password" };
  }

  // Check if password is expired
  const passwordExpired = await isPasswordExpired(user.id);

  // Record successful login
  await recordSuccessfulLogin(user.id, ipAddress, userAgent);

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      department: user.department,
      jobTitle: user.jobTitle,
    },
    requirePasswordChange: passwordExpired,
  };
}
