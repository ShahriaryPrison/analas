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
