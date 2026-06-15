// Retention sweep for session recordings. Protected by a shared secret so it can be
// driven by any external scheduler (cron, CI job, docker sidecar):
//
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//        https://<host>/api/cron/prune-recordings
//
// 1) Deletes recordings older than each workspace plan's dataRetentionDays (rows + chunks).
//    Self-hosted installs get ENTERPRISE retention (3650 days), so they effectively never
//    age-prune — use the per-recording DELETE for manual cleanup there.
// 2) Sweeps orphaned chunk dirs that have no surviving DB row.

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRecordingStore } from "@/lib/recordings/store";
import { getEffectivePlan, type Plan } from "@/lib/billing/plans";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = getRecordingStore();
  let deletedRows = 0;
  let deletedOrphans = 0;

  // ── 1) Age-based prune, honoring each workspace's plan retention ────────────
  const workspaces = await prisma.workspace.findMany({ select: { id: true, plan: true } });
  for (const ws of workspaces) {
    const retentionDays = getEffectivePlan(ws.plan as Plan).dataRetentionDays;
    if (!retentionDays || retentionDays <= 0) continue;
    const cutoff = new Date(Date.now() - retentionDays * DAY_MS);
    const expired = await prisma.sessionRecording.findMany({
      where: { workspaceId: ws.id, createdAt: { lt: cutoff } },
      select: { id: true, storageKey: true },
    });
    for (const r of expired) {
      await store.deleteSession(r.storageKey);
      await prisma.sessionRecording.delete({ where: { id: r.id } });
      deletedRows++;
    }
  }

  // ── 2) Orphan sweep — chunk dirs with no surviving DB row ───────────────────
  // A new session writes its first chunk a few ms before its row is created; the
  // daily cadence of this job makes racing that window a non-issue.
  const keys = await store.listSessionKeys();
  if (keys.length > 0) {
    const sessionIds = keys.map((k) => k.split("/")[1]).filter(Boolean);
    const present = new Set(
      (
        await prisma.sessionRecording.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true },
        })
      ).map((r) => r.id)
    );
    for (const key of keys) {
      const sid = key.split("/")[1];
      if (sid && !present.has(sid)) {
        await store.deleteSession(key);
        deletedOrphans++;
      }
    }
  }

  return NextResponse.json({ status: "ok", deletedRows, deletedOrphans });
}
