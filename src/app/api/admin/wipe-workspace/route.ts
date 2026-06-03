import { prisma } from "@/lib/prisma";
import { clickhouse } from "@/lib/clickhouse";
import { getAppSession } from "@/lib/session";
import { isAdmin } from "@/lib/auth-admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getAppSession();
    if (!session || !isAdmin(session.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const workspaceId = String(body?.workspaceId ?? "").trim();

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    // Fetch the workspace to get tenantId
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // 1. Wipe events from ClickHouse using prepared query parameters
    try {
      await clickhouse.exec({
        query: `ALTER TABLE events DELETE WHERE tenant_id = {tenantId:String}`,
        query_params: { tenantId: workspace.tenantId }
      });
    } catch (chErr) {
      console.error("ClickHouse deletion mutation failed:", chErr);
      return NextResponse.json({ error: "Failed to purge database data" }, { status: 500 });
    }

    // 2. Reset month event counters in PostgreSQL
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { currentMonthEvents: 0 },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Wipe workspace route failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
