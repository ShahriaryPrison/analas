"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { ArrowLeftIcon, LogOutIcon, SlidersIcon } from "@/components/icons";

export default function WorkspaceSidebarFooter() {
  return (
    <div className="space-y-0.5">
      <Link
        href="/settings"
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all w-full"
      >
        <SlidersIcon className="w-4 h-4 shrink-0" />
        Account Settings
      </Link>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all w-full"
      >
        <ArrowLeftIcon className="w-4 h-4 shrink-0" />
        All workspaces
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all w-full"
      >
        <LogOutIcon className="w-4 h-4 shrink-0" />
        Sign out
      </button>
    </div>
  );
}
