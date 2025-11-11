import crypto from "crypto";

if (!process.env.ENCRYPTION_KEY) {
  throw new Error(
    "ENCRYPTION_KEY environment variable is required for secure credential storage. " +
    "Generate a 64-character hex key using: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

if (ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    `ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Current length: ${ENCRYPTION_KEY.length}`
  );
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const tag = cipher.getAuthTag();
  
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }
  
  const [ivHex, tagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

export function maskSecret(secret: string): string {
  return "••••••••";
}

export function validateEncryption(): void {
  const testValue = "test-encryption-validation";
  try {
    const encrypted = encrypt(testValue);
    const decrypted = decrypt(encrypted);
    if (decrypted !== testValue) {
      throw new Error("Encryption validation failed: decrypted value does not match original");
    }
    console.log("[Encryption] Validation successful - encrypt/decrypt working correctly");
  } catch (error) {
    throw new Error(`Encryption validation failed: ${error}`);
  }
}
