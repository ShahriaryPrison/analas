import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await context.params;

    // Check workspace authorization (must be a member of the workspace)
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        members: { some: { user: { email: session.user.email } } },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found or unauthorized" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const eventName = String(body?.eventName ?? "").trim();
    const isArchived = Boolean(body?.isArchived);

    if (!eventName) {
      return NextResponse.json({ error: "Event name is required" }, { status: 400 });
    }

    // Create or update EventSetting
    const eventSetting = await prisma.eventSetting.upsert({
      where: {
        workspaceId_eventName: {
          workspaceId,
          eventName,
        },
      },
      update: {
        isArchived,
      },
      create: {
        workspaceId,
        eventName,
        isArchived,
      },
    });

    return NextResponse.json({ eventSetting });
  } catch (err) {
    console.error("Failed to archive event:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
