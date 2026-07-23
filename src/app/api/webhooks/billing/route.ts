import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { PLAN_LIMITS, Plan } from "@/lib/billing/plans";

// Shape of the subset of the Strite webhook payload this handler reads.
// Strite's payload varies per event type; only the fields actually accessed
// below are declared, all optional since presence depends on the event.
interface StriteWebhookPayload {
  event?: string;
  data?: {
    object?: {
      id?: string;
      subscription_id?: string;
      customer_id?: string;
      customer?: { id?: string; email?: string };
      customer_email?: string;
      price_id?: string;
      price?: { id?: string };
      client_reference_id?: string;
      current_period_end?: number | string;
    };
  };
}

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

  let body: StriteWebhookPayload;
  try {
    body = JSON.parse(rawBody) as StriteWebhookPayload;
  } catch (err) {
    console.error("[Strite Webhook Error] Invalid JSON received:", rawBody, err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event;
  const dataObject = body.data?.object;

  if (!event || !dataObject) {
    console.error("[Strite Webhook Error] Missing required event payload fields. Event:", event, "Payload:", rawBody);
    return NextResponse.json({ error: "Missing required event payload fields" }, { status: 400 });
  }

  const striteApiUrl = process.env.STRITE_API_URL || "https://your-strite-domain.com";
  const striteApiKey = process.env.STRITE_API_KEY;

  try {
    switch (event) {
      case "subscription.activated": {
        const subscriptionId = dataObject.subscription_id || dataObject.id;
        const customerId = dataObject.customer_id || dataObject.customer?.id || "";
        
        let customerEmail = dataObject.customer_email || dataObject.customer?.email;
        let priceId = dataObject.price_id || dataObject.price?.id;

        if (!subscriptionId) {
          console.error("[Strite Webhook Error] Missing subscription_id identifier. dataObject:", dataObject);
          return NextResponse.json({ error: "Missing subscription_id identifier" }, { status: 400 });
        }

        // Fallback to Strite API call if email or price ID is missing from payload
        if (!customerEmail || !priceId) {
          if (!striteApiKey) {
            console.error("[Strite Webhook] API Key not set, cannot fetch fallback subscription details");
            return NextResponse.json({ error: "Configuration error" }, { status: 500 });
          }

          const subRes = await fetch(`${striteApiUrl.replace(/\/$/, "")}/api/v1/subscriptions/${subscriptionId}`, {
            headers: {
              "Authorization": `Bearer ${striteApiKey}`,
              "Content-Type": "application/json",
            },
          });

          if (subRes.ok) {
            const subData = await subRes.json();
            customerEmail = customerEmail || subData.subscription?.customer?.email;
            priceId = priceId || subData.subscription?.price?.id;
          }
        }

        if (!customerEmail || !priceId) {
          console.error("[Strite Webhook Error] Invalid subscription details. email:", customerEmail, "priceId:", priceId);
          return NextResponse.json({ error: "Invalid subscription details" }, { status: 400 });
        }

        // Map price ID to Plan enum dynamically (supporting both "price_X" and raw integer X)
        let plan: Plan = "FREE";
        const cleanIncomingId = String(priceId).replace(/^price_/, "");
        for (const [planKey, config] of Object.entries(PLAN_LIMITS)) {
          if (config.priceId) {
            const cleanConfigId = String(config.priceId).replace(/^price_/, "");
            if (cleanConfigId === cleanIncomingId) {
              plan = planKey as Plan;
              break;
            }
          }
        }

        if (plan === "FREE") {
          console.error("[Strite Webhook Error] Unrecognized price ID:", priceId);
          return NextResponse.json({ error: "Unrecognized price ID" }, { status: 400 });
        }

        const clientReferenceId = dataObject.client_reference_id;
        
        let targetWorkspaceId: string | null = null;

        if (clientReferenceId) {
          targetWorkspaceId = clientReferenceId;
        } else {
          // Fallback for older sessions without client_reference_id
          const memberships = await prisma.workspaceMember.findMany({
            where: { user: { email: customerEmail } },
            select: { workspaceId: true },
          });
          const workspaceIds = memberships.map((m) => m.workspaceId);

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
          
          targetWorkspaceId = sessionRecord.workspaceId;
        }

        const workspace = await prisma.workspace.findUnique({
          where: { id: targetWorkspaceId },
        });

        if (!workspace) {
          console.error(`[Strite Webhook] Workspace not found for id ${targetWorkspaceId}`);
          return NextResponse.json({ error: "Workspace mapping not found" }, { status: 404 });
        }

        let currentPeriodEnd: Date | null = null;
        if (dataObject.current_period_end) {
          currentPeriodEnd = new Date(Number(dataObject.current_period_end) * 1000);
        } else {
          currentPeriodEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
        }

        // Upgrade the workspace
        await prisma.workspace.update({
          where: { id: targetWorkspaceId },
          data: {
            plan,
            internalBillingCustomerId: customerId ? String(customerId) : null,
            internalSubscriptionId: String(subscriptionId),
            billingCycleStart: new Date(),
            currentPeriodEnd,
            currentMonthEvents: 0,
            currentMonthRecordings: 0,
          },
        });

        // Clean up any temporary session records for this workspace
        await prisma.striteSession.deleteMany({
          where: { workspaceId: targetWorkspaceId },
        });

        break;
      }

      case "subscription.renewed": {
        const subscriptionId = dataObject.subscription_id || dataObject.id;
        if (!subscriptionId) {
          console.error("[Strite Webhook Error] Missing subscription ID in renewed. dataObject:", dataObject);
          return NextResponse.json({ error: "Missing subscription ID" }, { status: 400 });
        }

        const workspace = await prisma.workspace.findFirst({
          where: { internalSubscriptionId: String(subscriptionId) },
        });

        if (!workspace) {
          console.error("[Strite Webhook Error] Workspace not found for renewed subscription:", subscriptionId);
          return NextResponse.json({ error: "Workspace not found for subscription" }, { status: 404 });
        }

        let currentPeriodEnd: Date | null = null;
        if (dataObject.current_period_end) {
          currentPeriodEnd = new Date(Number(dataObject.current_period_end) * 1000);
        } else {
          currentPeriodEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
        }

        await prisma.workspace.update({
          where: { id: workspace.id },
          data: {
            billingCycleStart: new Date(),
            currentPeriodEnd,
            currentMonthEvents: 0, // Reset monthly quota
            currentMonthRecordings: 0,
          },
        });
        break;
      }

      case "subscription.cancelled": {
        const subscriptionId = dataObject.subscription_id || dataObject.id;
        if (!subscriptionId) {
          console.error("[Strite Webhook Error] Missing subscription ID in cancelled. dataObject:", dataObject);
          return NextResponse.json({ error: "Missing subscription ID" }, { status: 400 });
        }

        const workspace = await prisma.workspace.findFirst({
          where: { internalSubscriptionId: String(subscriptionId) },
        });

        if (!workspace) {
          console.error("[Strite Webhook Error] Workspace not found for cancelled subscription:", subscriptionId);
          return NextResponse.json({ error: "Workspace not found for subscription" }, { status: 404 });
        }

        await prisma.workspace.update({
          where: { id: workspace.id },
          data: {
            plan: "FREE",
            internalSubscriptionId: null,
            currentPeriodEnd: null,
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
