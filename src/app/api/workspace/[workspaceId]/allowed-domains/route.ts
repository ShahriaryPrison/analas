import { requireAdminAccess } from "@/lib/workspace-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;

  // 1. Authorize admin access
  try {
    await requireAdminAccess(workspaceId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  try {
    const { allowedDomains } = (await req.json()) as { allowedDomains: string[] };

    if (!Array.isArray(allowedDomains)) {
      return NextResponse.json({ error: "Invalid allowedDomains format" }, { status: 400 });
    }

    // Clean domains (trim whitespaces, remove protocol prefixes if users accidentally type http://)
    const cleaned = allowedDomains
      .map((d) =>
        d
          .trim()
          .toLowerCase()
          .replace(/^(https?:\/\/)?(www\.)?/, "") // remove http://, https://, and www.
          .split("/")[0] // keep only the hostname
      )
      .filter((d) => d.length > 0);

    // 3. Update database
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { allowedDomains: cleaned },
    });

    return NextResponse.json({ status: "ok", allowedDomains: cleaned });
  } catch (err) {
    return NextResponse.json({ error: "Failed to parse request body" }, { status: 400 });
  }
}
