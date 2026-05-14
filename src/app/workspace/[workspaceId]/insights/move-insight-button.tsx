"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";

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
      className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
      title={`Move ${direction === "up" ? "Left" : "Right"}`}
    >
      {direction === "up" ? <ArrowLeftIcon className="w-3.5 h-3.5" /> : <ArrowRightIcon className="w-3.5 h-3.5" />}
    </button>
  );
}
