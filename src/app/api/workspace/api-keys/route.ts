import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import crypto from "node:crypto";

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
    apiKeys: workspace.apiKeys.map((k) => ({ id: k.id, name: k.name, createdAt: k.createdAt })),
  });
}

export async function POST() {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { workspaces: { include: { workspace: true } } },
  });
  const workspace = user?.workspaces?.[0]?.workspace;
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const rawKey = `analas_pk_${crypto.randomUUID()}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const created = await prisma.apiKey.create({
    data: { keyHash, name: `Key ${new Date().toISOString().slice(0, 10)}`, workspaceId: workspace.id },
  });

  return NextResponse.json({ id: created.id, name: created.name, rawKey }, { status: 201 });
}
