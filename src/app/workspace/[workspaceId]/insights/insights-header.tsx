import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import DashboardSelector from "./dashboard-selector";

type Dashboard = {
  id: string;
  name: string;
  isPublic: boolean;
};

type Props = {
  workspaceId: string;
  dashboards: Dashboard[];
  activeDashboard: Dashboard;
  plan: any;
};

export default function InsightsHeader({
  workspaceId,
  dashboards,
  activeDashboard,
  plan,
}: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-white tracking-tight">Insights</h1>
          <span className="text-white/25 text-xl font-light">/</span>
          <DashboardSelector
            workspaceId={workspaceId}
            dashboards={dashboards}
            activeDashboard={activeDashboard}
            plan={plan}
          />
        </div>
        <p className="text-sm text-white/40 font-medium">Track your product&apos;s pulse with real-time analytics.</p>
      </div>
      <Link
        href={`/workspace/${workspaceId}/insights/new?dashboardId=${activeDashboard.id}`}
        className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-emerald-300 transition-all shadow-lg shadow-white/5 active:scale-95 shrink-0"
      >
        <PlusIcon className="w-4 h-4" />
        New insight
      </Link>
    </div>
  );
}
