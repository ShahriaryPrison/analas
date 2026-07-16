export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const striteApiUrl = process.env.STRITE_API_URL || "https://your-strite-domain.com";
  const striteApiKey = process.env.STRITE_API_KEY;

  if (!striteApiKey) {
    console.error("[Cron Sync Error] STRITE_API_KEY is not configured");
    return NextResponse.json({ error: "Billing service not configured on server" }, { status: 500 });
  }

  // Fetch all workspaces that are marked as on a paid plan
  const workspaces = await prisma.workspace.findMany({
    where: {
      plan: {
        not: "FREE",
      },
    },
    select: {
      id: true,
      plan: true,
      internalSubscriptionId: true,
    },
  });

  console.log(`[Cron Sync] Found ${workspaces.length} paid workspaces to reconcile.`);
  let updatedCount = 0;
  let downgradedCount = 0;

  for (const ws of workspaces) {
    // 1) If there is no internal subscription ID on a paid plan, downgrade it immediately
    if (!ws.internalSubscriptionId) {
      console.warn(`[Cron Sync] Workspace ${ws.id} is marked as ${ws.plan} but has no internal subscription ID. Downgrading to FREE.`);
      await prisma.workspace.update({
        where: { id: ws.id },
        data: {
          plan: "FREE",
          internalSubscriptionId: null,
          currentPeriodEnd: null,
        },
      });
      downgradedCount++;
      continue;
    }

    try {
      // 2) Query Strite API for subscription status
      const subRes = await fetch(`${striteApiUrl.replace(/\/$/, "")}/api/v1/subscriptions/${ws.internalSubscriptionId}`, {
        headers: {
          "Authorization": `Bearer ${striteApiKey}`,
          "Content-Type": "application/json",
        },
      });

      // If the subscription doesn't exist on Strite (404), downgrade it
      if (subRes.status === 404) {
        console.warn(`[Cron Sync] Subscription ${ws.internalSubscriptionId} not found on Strite for workspace ${ws.id}. Downgrading to FREE.`);
        await prisma.workspace.update({
          where: { id: ws.id },
          data: {
            plan: "FREE",
            internalSubscriptionId: null,
            currentPeriodEnd: null,
          },
        });
        downgradedCount++;
        continue;
      }

      if (!subRes.ok) {
        console.error(`[Cron Sync Error] Failed to fetch subscription ${ws.internalSubscriptionId} for workspace ${ws.id}. Status: ${subRes.status}`);
        continue;
      }

      const subData = await subRes.json();
      const subscription = subData.subscription;

      if (!subscription) {
        console.error(`[Cron Sync Error] Invalid subscription payload for ${ws.internalSubscriptionId}`);
        continue;
      }

      const status = subscription.status; // active | trialing | past_due | cancelled
      const currentPeriodEndStr = subscription.current_period_end; // ISO string e.g. "2026-07-01T00:00:00+00:00"

      // 3) Reconcile state
      if (status === "cancelled" || status === "expired" || status === "unpaid") {
        console.log(`[Cron Sync] Subscription ${ws.internalSubscriptionId} for workspace ${ws.id} is ${status}. Downgrading to FREE.`);
        await prisma.workspace.update({
          where: { id: ws.id },
          data: {
            plan: "FREE",
            internalSubscriptionId: null,
            currentPeriodEnd: null,
          },
        });
        downgradedCount++;
      } else {
        // Active or trialing subscription — sync the period end date
        if (currentPeriodEndStr) {
          const currentPeriodEnd = new Date(currentPeriodEndStr);
          console.log(`[Cron Sync] Syncing subscription ${ws.internalSubscriptionId} for workspace ${ws.id}. Period end: ${currentPeriodEnd.toISOString()}`);
          await prisma.workspace.update({
            where: { id: ws.id },
            data: {
              currentPeriodEnd,
            },
          });
          updatedCount++;
        } else {
          // Fallback if Strite API does not return period end but subscription is active
          const currentPeriodEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
          console.warn(`[Cron Sync] Active subscription ${ws.internalSubscriptionId} did not return current_period_end. Setting fallback period end: ${currentPeriodEnd.toISOString()}`);
          await prisma.workspace.update({
            where: { id: ws.id },
            data: {
              currentPeriodEnd,
            },
          });
          updatedCount++;
        }
      }
    } catch (err) {
      console.error(`[Cron Sync Exception] Error reconciling workspace ${ws.id}:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    reconciled: workspaces.length,
    updated: updatedCount,
    downgraded: downgradedCount,
  });
}
