import { getAppSession } from "@/lib/session";
import { queryJson } from "@/lib/clickhouse";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId } = await context.params;
  const { searchParams } = new URL(req.url);
  const eventName = searchParams.get("event");

  if (!eventName) return NextResponse.json([]);

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: { some: { user: { email: session.user.email } } },
    },
  });

  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    // Extract unique keys from the JSON properties string for this specific event
    const rows = await queryJson<{ key: string }>(
      `SELECT DISTINCT arrayJoin(JSONKeys(properties)) as key
       FROM events
       WHERE tenant_id = {tenantId:String} 
         AND event = {event:String}
         AND ts >= now() - INTERVAL 7 DAY
       LIMIT 50`,
      { tenantId: workspace.tenantId, event: eventName }
    );

    return NextResponse.json(rows.map(r => r.key));
  } catch (err) {
    console.error("Property discovery failed", err);
    return NextResponse.json([]);
  }
}
