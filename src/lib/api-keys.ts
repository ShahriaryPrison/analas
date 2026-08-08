import crypto from "node:crypto";

export interface GeneratedApiKey {
  rawKey: string;
  keyHash: string;
  keyHint: string;
  lastFour: string;
}

/**
 * Generates a structured, human-identifiable API key.
 * Format: analas_sk_<tenantHint>_<randomHex32>
 * Example: analas_sk_c8a412_9f2e3d4a5b6c7d8e9f0a1b2c3d4e5f6a
 */
export function generateStructuredApiKey(options?: {
  tenantId?: string;
  isPublic?: boolean;
}): GeneratedApiKey {
  const isPublic = options?.isPublic ?? false;
  const prefix = isPublic ? "analas_pub" : "analas_sk";

  let hint = "live";
  if (options?.tenantId) {
    const sanitized = options.tenantId.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (sanitized.length >= 4) {
      hint = sanitized.slice(0, 6);
    }
  }

  const randomHex = crypto.randomBytes(16).toString("hex");
  const rawKey = `${prefix}_${hint}_${randomHex}`;
  const lastFour = rawKey.slice(-4);
  const keyHint = `${prefix}_${hint}_••••${lastFour}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  return {
    rawKey,
    keyHash,
    keyHint,
    lastFour,
  };
}

/**
 * Formats a key for safe display in UI tables and lists.
 * Gracefully handles legacy keys that predate keyHint and lastFour columns.
 */
export function formatMaskedApiKey(key: {
  keyHint?: string | null;
  lastFour?: string | null;
}): string {
  if (key.keyHint) {
    return key.keyHint;
  }
  if (key.lastFour) {
    return `analas_sk_••••••••${key.lastFour}`;
  }
  return "analas_pk_•••••••• (Legacy)";
}
