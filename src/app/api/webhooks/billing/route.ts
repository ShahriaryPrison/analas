import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * POST /api/webhooks/billing
 *
 * Receives lifecycle events from Strite.
 * Verified using HMAC SHA-256 signature checking.
 */
export async function POST(req: NextRequest) {
  const timestamp = req.headers.get("x-billing-timestamp");
  const signature = req.headers.get("x-billing-signature");
  const secret = process.env.STRITE_WEBHOOK_SECRET;

  if (!timestamp || !signature || !secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await req.text();

  // Verify HMAC signature
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event;
  const dataObject = body.data?.object;

  if (!event || !dataObject) {
    return NextResponse.json({ error: "Missing required event payload fields" }, { status: 400 });
  }

  const striteApiUrl = process.env.STRITE_API_URL || "https://your-strite-domain.com";
  const striteApiKey = process.env.STRITE_API_KEY;

  try {
    switch (event) {
      case "subscription.activated": {
        const subscriptionId = dataObject.id;
        const customerId = dataObject.customer?.id || dataObject.customer_id;

        if (!subscriptionId || !customerId) {
          return NextResponse.json({ error: "Missing subscription or customer identifiers" }, { status: 400 });
        }

        if (!striteApiKey) {
          console.error("[Strite Webhook] API Key not set, cannot fetch subscription details");
          return NextResponse.json({ error: "Configuration error" }, { status: 500 });
        }

        // Fetch full subscription details to obtain email and price ID
        const subRes = await fetch(`${striteApiUrl.replace(/\/$/, "")}/api/v1/subscriptions/${subscriptionId}`, {
          headers: {
            "Authorization": `Bearer ${striteApiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (!subRes.ok) {
          console.error(`[Strite Webhook] Failed to fetch subscription ${subscriptionId}`);
          return NextResponse.json({ error: "Failed to verify subscription details" }, { status: 500 });
        }

        const subData = await subRes.json();
        const customerEmail = subData.subscription?.customer?.email;
        const priceId = subData.subscription?.price?.id;

        if (!customerEmail || !priceId) {
          return NextResponse.json({ error: "Invalid subscription details received from Strite" }, { status: 400 });
        }

        // Map price ID to Plan enum
        let plan: "PRO" | "BUSINESS" = "PRO";
        if (priceId === "price_2") plan = "BUSINESS";

        // Find all workspaces where this email belongs
        const memberships = await prisma.workspaceMember.findMany({
          where: { user: { email: customerEmail } },
          select: { workspaceId: true },
        });
        const workspaceIds = memberships.map((m) => m.workspaceId);

        // Find the most recent StriteSession for these workspaces
        const sessionRecord = await prisma.striteSession.findFirst({
          where: {
            workspaceId: { in: workspaceIds },
          },
          orderBy: { createdAt: "desc" },
        });

        if (!sessionRecord) {
          console.error(`[Strite Webhook] No matching checkout session found for email ${customerEmail}`);
          return NextResponse.json({ error: "Workspace mapping not found" }, { status: 404 });
        }

        // Upgrade the workspace
        await prisma.workspace.update({
          where: { id: sessionRecord.workspaceId },
          data: {
            plan,
            internalBillingCustomerId: String(customerId),
            internalSubscriptionId: String(subscriptionId),
            billingCycleStart: new Date(),
            currentMonthEvents: 0,
          },
        });

        // Clean up temporary session record
        await prisma.striteSession.delete({
          where: { token: sessionRecord.token },
        });

        break;
      }

      case "subscription.renewed": {
        const subscriptionId = dataObject.id;
        if (!subscriptionId) {
          return NextResponse.json({ error: "Missing subscription ID" }, { status: 400 });
        }

        const workspace = await prisma.workspace.findFirst({
          where: { internalSubscriptionId: String(subscriptionId) },
        });

        if (!workspace) {
          return NextResponse.json({ error: "Workspace not found for subscription" }, { status: 404 });
        }

        await prisma.workspace.update({
          where: { id: workspace.id },
          data: {
            billingCycleStart: new Date(),
            currentMonthEvents: 0, // Reset monthly quota
          },
        });
        break;
      }

      case "subscription.cancelled": {
        const subscriptionId = dataObject.id;
        if (!subscriptionId) {
          return NextResponse.json({ error: "Missing subscription ID" }, { status: 400 });
        }

        const workspace = await prisma.workspace.findFirst({
          where: { internalSubscriptionId: String(subscriptionId) },
        });

        if (!workspace) {
          return NextResponse.json({ error: "Workspace not found for subscription" }, { status: 404 });
        }

        await prisma.workspace.update({
          where: { id: workspace.id },
          data: {
            plan: "FREE",
            internalSubscriptionId: null,
          },
        });
        break;
      }

      default:
        console.warn(`[Strite Webhook] Unhandled event type: ${event}`);
        break;
    }
  } catch (error) {
    console.error("[Strite Webhook Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
