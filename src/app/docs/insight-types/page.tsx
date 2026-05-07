import Link from "next/link";
import { INSIGHT_TYPES } from "@/lib/insight-types";

const GITHUB_URL = "https://github.com/MoShirv/analas";

export default function InsightTypesDocsPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-12">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-xs text-white/40 hover:text-white/70 transition">
            ← Back to dashboard
          </Link>
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            View on GitHub
          </Link>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold">Contributing an insight type</h1>
          <p className="text-white/60 leading-relaxed">
            Insight types are defined in{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm font-mono text-emerald-300">
              src/lib/insight-types.ts
            </code>{" "}
            as plain objects. Adding a new type takes three steps.
          </p>
        </div>

        {/* Step 1 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">1. Register the type</h2>
          <p className="text-sm text-white/60">
            Add an entry to the <code className="text-emerald-300 font-mono text-xs">INSIGHT_TYPES</code> array.
            Each entry must satisfy the <code className="text-emerald-300 font-mono text-xs">InsightTypeDef</code> interface:
          </p>
          <pre className="rounded-xl bg-slate-950 border border-white/10 p-5 text-sm font-mono text-white/80 overflow-x-auto whitespace-pre">{`interface InsightTypeDef {
  id: string;           // unique key, e.g. "funnel"
  label: string;        // shown in the type selector
  description: string;  // one-sentence explanation
  icon: string;         // emoji or single character
  configFields: {
    key: string;        // stored in queryConfig JSON
    label: string;
    placeholder: string;
  }[];
}`}</pre>
          <p className="text-sm text-white/60">Example:</p>
          <pre className="rounded-xl bg-slate-950 border border-white/10 p-5 text-sm font-mono text-white/80 overflow-x-auto whitespace-pre">{`{
  id: "funnel",
  label: "Funnel",
  description: "Conversion rate between two events.",
  icon: "⬇",
  configFields: [
    { key: "fromEvent", label: "From event", placeholder: "page_view" },
    { key: "toEvent",   label: "To event",   placeholder: "user_signup" },
  ],
}`}</pre>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <strong>Pro Tip:</strong> The insight creation modal is completely dynamic! Any fields you define in <code className="font-mono text-xs text-emerald-300 bg-emerald-400/10 px-1 rounded">configFields</code> will automatically generate input boxes in the UI, and their values will be saved to the database without any extra code.
          </div>
        </section>

        {/* Step 2 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">2. Add the data query</h2>
          <p className="text-sm text-white/60">
            Open{" "}
            <code className="text-emerald-300 font-mono text-xs">
              src/app/api/workspace/[workspaceId]/insights/[insightId]/data/route.ts
            </code>{" "}
            and add a branch for your type id. The route receives the insight&apos;s{" "}
            <code className="text-emerald-300 font-mono text-xs">queryConfig</code> (the values from your{" "}
            <code className="text-emerald-300 font-mono text-xs">configFields</code>) and the workspace&apos;s{" "}
            <code className="text-emerald-300 font-mono text-xs">tenantId</code>. Return:
          </p>
          <pre className="rounded-xl bg-slate-950 border border-white/10 p-5 text-sm font-mono text-white/80 overflow-x-auto whitespace-pre">{`// Required shape
{ total: number; rows: { day: string; count: number }[] }

// rows can be empty for non-time-series types`}</pre>
        </section>

        {/* Step 3 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">3. Render the card</h2>
          <p className="text-sm text-white/60">
            Open{" "}
            <code className="text-emerald-300 font-mono text-xs">
              src/app/workspace/[workspaceId]/insights/insight-card.tsx
            </code>{" "}
            and add a render branch inside the card body:
          </p>
          <pre className="rounded-xl bg-slate-950 border border-white/10 p-5 text-sm font-mono text-white/80 overflow-x-auto whitespace-pre">{`{insight.type === "funnel" && (
  <FunnelRenderer data={data} />
)}`}</pre>
          <p className="text-sm text-white/60">
            The card handles loading skeletons and error states for you — just focus on the visual.
          </p>
        </section>

        {/* Existing types */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Built-in types</h2>
          <div className="grid gap-3">
            {INSIGHT_TYPES.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-start gap-3">
                <span className="text-xl font-mono mt-0.5">{t.icon}</span>
                <div>
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-xs text-white/50 mt-0.5">{t.description}</div>
                  <div className="mt-1.5 flex gap-1.5 flex-wrap">
                    {t.configFields.map((f) => (
                      <code key={f.key} className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-mono text-white/60">
                        {f.key}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
