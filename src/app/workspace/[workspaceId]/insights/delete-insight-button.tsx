"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@/components/icons";

export default function DeleteInsightButton({
  workspaceId,
  insightId,
}: {
  workspaceId: string;
  insightId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/workspace/${workspaceId}/insights/${insightId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50">Delete?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold bg-red-500/15 border border-red-500/25 text-red-300 hover:bg-red-500/25 transition disabled:opacity-50"
        >
          <TrashIcon className="w-3 h-3" />
          {loading ? "Deleting…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="rounded-lg px-2.5 py-1 text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Delete insight"
      className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition"
    >
      <TrashIcon className="w-4 h-4" />
    </button>
  );
}
