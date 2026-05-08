"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ZapIcon, BarChart2Icon, SlidersIcon } from "@/components/icons";

type Props = { workspaceId: string };

const NAV = [
  { label: "Captures", segment: "captures", Icon: ZapIcon },
  { label: "Insights", segment: "insights", Icon: BarChart2Icon },
  { label: "Settings", segment: "settings", Icon: SlidersIcon },
];

export default function WorkspaceNav({ workspaceId }: Props) {
  const pathname = usePathname();

  return (
    <ul className="space-y-0.5">
      {NAV.map(({ label, segment, Icon }) => {
        const href = `/workspace/${workspaceId}/${segment}`;
        const active = pathname.startsWith(href);
        return (
          <li key={segment}>
            <Link
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                active
                  ? "bg-emerald-500/10 text-emerald-300 font-medium"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  active ? "text-emerald-400" : "text-white/30"
                }`}
              />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function WorkspaceMobileNav({ workspaceId }: Props) {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-white/6 pb-safe">
      <ul className="flex items-center justify-around px-2 py-2">
        {NAV.map(({ label, segment, Icon }) => {
          const href = `/workspace/${workspaceId}/${segment}`;
          const active = pathname.startsWith(href);
          return (
            <li key={segment} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 transition-colors ${
                  active ? "text-emerald-400" : "text-white/40 hover:text-white/70"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    active ? "text-emerald-400" : "text-white/40"
                  }`}
                />
                <span className={`text-[10px] font-medium ${active ? "text-emerald-300" : ""}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
