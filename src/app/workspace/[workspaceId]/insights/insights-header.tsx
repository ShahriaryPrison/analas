"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import CreateInsightModal from "./create-insight-modal";

type Props = {
  workspaceId: string;
  topEvents: string[];
};

export default function InsightsHeader({ workspaceId, topEvents }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-sm text-white/50 mt-0.5">Track event metrics for your workspace.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300 transition"
        >
          <PlusIcon className="w-4 h-4" />
          New insight
        </button>
      </div>

      {open && (
        <CreateInsightModal
          workspaceId={workspaceId}
          topEvents={topEvents}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
