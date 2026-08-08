import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { generateStructuredApiKey } from "@/lib/api-keys";

export async function GET() {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ apiKeys: [] });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { workspaces: { include: { workspace: { include: { apiKeys: true } } } } },
  });
  const workspace = user?.workspaces?.[0]?.workspace;
  if (!workspace) return NextResponse.json({ apiKeys: [] });

  return NextResponse.json({
    apiKeys: workspace.apiKeys.map((k) => ({
      id: k.id,
      name: k.name,
      scopes: k.scopes,
      keyHint: k.keyHint,
      lastFour: k.lastFour,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { workspaces: { include: { workspace: true } } },
  });
  const workspace = user?.workspaces?.[0]?.workspace;
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const rawName = typeof body?.name === "string" ? body.name.trim() : "";
  const name = rawName.length > 0 ? rawName.slice(0, 100) : `Key ${new Date().toISOString().slice(0, 10)}`;

  const { rawKey, keyHash, keyHint, lastFour } = generateStructuredApiKey({
    tenantId: workspace.tenantId,
  });

  const created = await prisma.apiKey.create({
    data: {
      keyHash,
      keyHint,
      lastFour,
      name,
      workspaceId: workspace.id,
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      name: created.name,
      keyHint: created.keyHint,
      lastFour: created.lastFour,
      rawKey,
    },
    { status: 201 }
  );
}
