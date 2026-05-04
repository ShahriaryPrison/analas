import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import crypto from "node:crypto";

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
    createdAt: k.createdAt,
  }));
  return NextResponse.json({ apiKeys: keys });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getMembership(workspaceId, session.user.email);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const rawKey = `analas_pk_${crypto.randomUUID()}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const created = await prisma.apiKey.create({
    data: {
      keyHash,
      name: `Key ${new Date().toISOString().slice(0, 10)}`,
      workspaceId,
    },
  });

  return NextResponse.json({ id: created.id, name: created.name, rawKey }, { status: 201 });
}
