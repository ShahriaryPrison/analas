import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string; keyId: string }> }
) {
  const { workspaceId, keyId } = await params;
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, user: { email: session.user.email } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const key = await prisma.apiKey.findFirst({ where: { id: keyId, workspaceId } });
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  await prisma.apiKey.delete({ where: { id: keyId } });
  return NextResponse.json({ deleted: true });
}
