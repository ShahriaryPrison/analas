"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MoveInsightButton({
  workspaceId,
  insightId,
  direction,
}: {
  workspaceId: string;
  insightId: string;
  direction: "up" | "down";
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function move() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspace/${workspaceId}/insights/${insightId}/move`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.swapped) {
          router.refresh();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={move}
      disabled={loading}
      className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition disabled:opacity-50"
      title={`Move ${direction}`}
    >
      {direction === "up" ? "⬅️" : "➡️"}
    </button>
  );
}
