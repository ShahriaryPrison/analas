"use client";

import { useState } from "react";
import { CopyIcon, CheckIcon } from "@/components/icons";

export default function CopyEventName({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      title={`Copy "${name}"`}
      className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition shrink-0"
    >
      {copied ? <CheckIcon className="w-3 h-3 text-emerald-400" /> : <CopyIcon className="w-3 h-3" />}
    </button>
  );
}
