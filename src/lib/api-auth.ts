import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export type ApiScope =
  | "events:write"
  | "events:read"
  | "insights:read"
  | "insights:write"
  | "dashboards:read"
  | "dashboards:write"
  | "recordings:read";

export type ResolvedApiKey = {
  tenantId: string;
  workspaceId: string;
  plan: string;
  allowedDomains: string[];
  apiKeyId?: string;
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const keyCache = new Map<string, ResolvedApiKey & { expiresAt: number }>();

const RATE_LIMIT_DEFAULT = 300;
const rateMap = new Map<string, { ts: number; count: number }>();
const lastTouchMap = new Map<string, number>();

export function touchApiKeyUsage(keyId: string) {
  const now = Date.now();
  const lastTouch = lastTouchMap.get(keyId) ?? 0;
  // Throttle DB updates to once per 60 seconds per key
  if (now - lastTouch > 60_000) {
    lastTouchMap.set(keyId, now);
    prisma.apiKey
      .update({
        where: { id: keyId },
        data: { lastUsedAt: new Date(now) },
      })
      .catch(() => {
        // Non-blocking background touch error
      });
  }
}

async function downgradeIfExpired(ws: {
  id: string;
  plan: string;
  currentPeriodEnd: Date | null;
}): Promise<string> {
  if (ws.plan !== "FREE" && ws.currentPeriodEnd && new Date() > ws.currentPeriodEnd) {
    await prisma.workspace.update({
      where: { id: ws.id },
      data: { plan: "FREE", internalSubscriptionId: null, currentPeriodEnd: null },
    });
    return "FREE";
  }
  return ws.plan;
}

async function lookupKey(rawKey: string, keyHash: string): Promise<ResolvedApiKey | NextResponse> {
  if (rawKey.startsWith("analas_pub_")) {
    const ws = await prisma.workspace.findUnique({
      where: { publicToken: rawKey },
      select: { id: true, tenantId: true, plan: true, allowedDomains: true, currentPeriodEnd: true },
    });
    if (!ws) return NextResponse.json({ error: "Invalid client token" }, { status: 401 });
    const plan = await downgradeIfExpired(ws);
    return { tenantId: ws.tenantId, workspaceId: ws.id, plan, allowedDomains: ws.allowedDomains };
  }

  const api = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      workspace: {
        select: { id: true, tenantId: true, plan: true, allowedDomains: true, currentPeriodEnd: true },
      },
    },
  });
  if (!api) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  const scopes = api.scopes as ApiScope[];
  const ws = api.workspace;
  const plan = await downgradeIfExpired(ws);
  return {
    apiKeyId: api.id,
    tenantId: ws.tenantId,
    workspaceId: ws.id,
    plan,
    allowedDomains: ws.allowedDomains,
    _scopes: scopes,
  } as ResolvedApiKey & { _scopes: ApiScope[] };
}

/**
 * Resolves and authorizes an API key (or public token) from the Authorization header.
 * Public tokens (analas_pub_...) are implicitly scoped to "events:write" only, matching
 * their existing capture-only usage — they never carry a `scopes` row to check against.
 */
export async function resolveApiKey(
  req: Request,
  opts: { scope: ApiScope; rateLimit?: number }
): Promise<ResolvedApiKey | NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer "))
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });

  const rawKey = auth.replace(/^Bearer\s+/i, "").trim();
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const isPublicToken = rawKey.startsWith("analas_pub_");
  const cacheKey = keyHash;

  let resolved: ResolvedApiKey & { _scopes?: ApiScope[] };
  const cached = keyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    resolved = cached;
  } else {
    const result = await lookupKey(rawKey, keyHash);
    if (result instanceof NextResponse) return result;
    resolved = result as ResolvedApiKey & { _scopes?: ApiScope[] };
    keyCache.set(cacheKey, { ...resolved, expiresAt: Date.now() + CACHE_TTL });
  }

  const scopes = isPublicToken ? (["events:write"] as ApiScope[]) : resolved._scopes ?? [];
  if (!scopes.includes(opts.scope)) {
    return NextResponse.json(
      { error: `This API key is not authorized for scope '${opts.scope}'` },
      { status: 403 }
    );
  }

  // Touch lastUsedAt asynchronously in the background for private server keys
  if (resolved.apiKeyId) {
    touchApiKeyUsage(resolved.apiKeyId);
  }

  // ── Origin/Domain verification (only enforced when the workspace has configured it) ──
  if (resolved.allowedDomains.length > 0) {
    const originHeader = req.headers.get("origin") || req.headers.get("referer") || "";
    if (originHeader) {
      const cleanOrigin = (urlStr: string): string => {
        try {
          return new URL(urlStr).hostname.toLowerCase();
        } catch {
          return urlStr
            .trim()
            .toLowerCase()
            .replace(/^(https?:\/\/)?(www\.)?/, "")
            .split("/")[0]
            .split(":")[0];
        }
      };
      const clientDomain = cleanOrigin(originHeader);
      const isAllowed = resolved.allowedDomains.some(
        (domain) => clientDomain === domain || clientDomain.endsWith("." + domain)
      );
      if (!isAllowed) {
        return NextResponse.json({ error: `Forbidden: Unauthorized origin '${clientDomain}'` }, { status: 403 });
      }
    }
  }

  const rateLimit = opts.rateLimit ?? RATE_LIMIT_DEFAULT;
  const now = Date.now();
  const entry = rateMap.get(keyHash);
  if (!entry || now - entry.ts > 60_000) {
    rateMap.set(keyHash, { ts: now, count: 1 });
  } else {
    entry.count++;
    if (entry.count > rateLimit) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    rateMap.set(keyHash, entry);
  }

  return { tenantId: resolved.tenantId, workspaceId: resolved.workspaceId, plan: resolved.plan, allowedDomains: resolved.allowedDomains, apiKeyId: resolved.apiKeyId };
}
