import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { PLAN_LIMITS } from "@/lib/billing/plans";

export async function POST(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: { some: { user: { email: session.user.email } } },
    },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const plan = body?.plan as "PRO" | "BUSINESS";

  const planConfig = PLAN_LIMITS[plan];
  if (!planConfig || !planConfig.priceId) {
    return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
  }

  const priceId = planConfig.priceId;
  const striteApiUrl = process.env.STRITE_API_URL || "https://your-strite-domain.com";
  const striteApiKey = process.env.STRITE_API_KEY;

  if (!striteApiKey) {
    return NextResponse.json({ error: "Billing service not configured on server" }, { status: 500 });
  }

  const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

  try {
    const response = await fetch(`${striteApiUrl.replace(/\/$/, "")}/api/v1/checkout-sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${striteApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_id: priceId,
        customer_email: session.user.email,
        customer_name: session.user.name || "Customer",
        success_url: `${appUrl}/workspace/${workspaceId}/settings?billing_success=true`,
        cancel_url: `${appUrl}/workspace/${workspaceId}/settings?billing_cancelled=true`,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Strite checkout error]:", errText);
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    const data = await response.json();
    if (!data.token || !data.checkout_url) {
      return NextResponse.json({ error: "Invalid response from Strite" }, { status: 500 });
    }

    // Save temporary session mapping to workspace
    await prisma.striteSession.create({
      data: {
        token: data.token,
        workspaceId: workspace.id,
      },
    });

    return NextResponse.json({ checkout_url: data.checkout_url });
  } catch (error) {
    console.error("[Strite checkout exception]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
