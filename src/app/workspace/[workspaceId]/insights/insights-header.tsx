import Link from "next/link";
import { PlusIcon } from "@/components/icons";

type Props = {
  workspaceId: string;
};

export default function InsightsHeader({ workspaceId }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Insights</h1>
        <p className="text-sm text-white/40 mt-1 font-medium">Track your product's pulse with real-time analytics.</p>
      </div>
      <Link
        href={`/workspace/${workspaceId}/insights/new`}
        className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-emerald-300 transition-all shadow-lg shadow-white/5 active:scale-95"
      >
        <PlusIcon className="w-4 h-4" />
        New insight
      </Link>
    </div>
  );
}
