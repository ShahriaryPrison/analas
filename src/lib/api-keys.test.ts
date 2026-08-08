import { describe, it, expect } from "vitest";
import { generateStructuredApiKey, formatMaskedApiKey } from "./api-keys";
import crypto from "node:crypto";

describe("generateStructuredApiKey", () => {
  it("generates a structured secret key with prefix analas_sk_", () => {
    const key = generateStructuredApiKey({ tenantId: "tenant-12345-abcde" });
    expect(key.rawKey.startsWith("analas_sk_tenant_")).toBe(true);
    expect(key.lastFour).toBe(key.rawKey.slice(-4));
    expect(key.keyHint).toContain("••••" + key.lastFour);
    expect(key.keyHash).toBe(crypto.createHash("sha256").update(key.rawKey).digest("hex"));
  });

  it("generates a public token with prefix analas_pub_ when isPublic is true", () => {
    const key = generateStructuredApiKey({ isPublic: true });
    expect(key.rawKey.startsWith("analas_pub_live_")).toBe(true);
  });

  it("handles empty or missing tenantId gracefully by defaulting to live", () => {
    const key = generateStructuredApiKey();
    expect(key.rawKey.startsWith("analas_sk_live_")).toBe(true);
  });
});

describe("formatMaskedApiKey", () => {
  it("returns keyHint when present", () => {
    expect(formatMaskedApiKey({ keyHint: "analas_sk_abc_••••1234" })).toBe("analas_sk_abc_••••1234");
  });

  it("returns formatted fallback when only lastFour is present", () => {
    expect(formatMaskedApiKey({ lastFour: "9a8b" })).toBe("analas_sk_••••••••9a8b");
  });

  it("returns legacy format when no hint or lastFour is present", () => {
    expect(formatMaskedApiKey({})).toBe("analas_pk_•••••••• (Legacy)");
  });
});
