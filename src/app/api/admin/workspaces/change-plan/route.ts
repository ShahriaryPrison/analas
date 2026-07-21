import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { isAdmin } from "@/lib/auth-admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getAppSession();
    if (!session || !isAdmin(session.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbAdmin = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!dbAdmin || !dbAdmin.emailVerified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const workspaceId = String(body?.workspaceId ?? "").trim();
    const plan = String(body?.plan ?? "").toUpperCase().trim();
    const expirationType = String(body?.expirationType ?? "indefinite").trim();
    const customDate = String(body?.customDate ?? "").trim();

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    const validPlans = ["FREE", "PRO", "BUSINESS", "ENTERPRISE"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan specified" }, { status: 400 });
    }

    let currentPeriodEnd: Date | null = null;
    if (plan !== "FREE") {
      if (expirationType === "1m") {
        currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      } else if (expirationType === "3m") {
        currentPeriodEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      } else if (expirationType === "6m") {
        currentPeriodEnd = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
      } else if (expirationType === "1y") {
        currentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      } else if (expirationType === "custom") {
        if (!customDate) {
          return NextResponse.json({ error: "Custom expiration date is required" }, { status: 400 });
        }
        const parsedDate = new Date(customDate);
        if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
          return NextResponse.json({ error: "Custom date must be a valid future date" }, { status: 400 });
        }
        currentPeriodEnd = parsedDate;
      }
    }

    // Update workspace plan in postgres
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        plan: plan as any,
        currentPeriodEnd,
      },
    });

    return NextResponse.json({ success: true, plan, currentPeriodEnd });
  } catch (err) {
    console.error("Change workspace plan route failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
