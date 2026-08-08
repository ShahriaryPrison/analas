import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { generateStructuredApiKey } from "@/lib/api-keys";
import type { ApiScope } from "@/lib/api-auth";

const VALID_SCOPES: ApiScope[] = [
  "events:write",
  "events:read",
  "insights:read",
  "insights:write",
  "dashboards:read",
  "dashboards:write",
  "recordings:read",
];

async function getMembership(workspaceId: string, email: string) {
  return prisma.workspaceMember.findFirst({
    where: { workspaceId, user: { email } },
    include: { workspace: { include: { apiKeys: true } } },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getMembership(workspaceId, session.user.email);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const keys = membership.workspace.apiKeys.map((k) => ({
    id: k.id,
    name: k.name,
    scopes: k.scopes,
    keyHint: k.keyHint,
    lastFour: k.lastFour,
    lastUsedAt: k.lastUsedAt,
    createdAt: k.createdAt,
  }));
  return NextResponse.json({ apiKeys: keys });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getMembership(workspaceId, session.user.email);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const requestedScopes = Array.isArray(body?.scopes) ? body.scopes : null;
  const scopes = requestedScopes
    ? requestedScopes.filter((s: unknown): s is ApiScope => VALID_SCOPES.includes(s as ApiScope))
    : ["events:write"];

  if (requestedScopes && scopes.length === 0) {
    return NextResponse.json({ error: "No valid scopes provided" }, { status: 400 });
  }

  const rawName = typeof body?.name === "string" ? body.name.trim() : "";
  const name = rawName.length > 0 ? rawName.slice(0, 100) : `Key ${new Date().toISOString().slice(0, 10)}`;

  const { rawKey, keyHash, keyHint, lastFour } = generateStructuredApiKey({
    tenantId: membership.workspace.tenantId,
  });

  const created = await prisma.apiKey.create({
    data: {
      keyHash,
      keyHint,
      lastFour,
      name,
      workspaceId,
      scopes,
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      name: created.name,
      scopes: created.scopes,
      keyHint: created.keyHint,
      lastFour: created.lastFour,
      rawKey,
    },
    { status: 201 }
  );
}
