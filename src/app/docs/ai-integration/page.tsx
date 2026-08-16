import Link from "next/link";

const GITHUB_URL = "https://github.com/ShahriaryPrison/analas";

type Endpoint = {
  method: string;
  path: string;
  scope: string;
  desc: string;
  body?: string;
  response: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/events",
    scope: "events:read",
    desc: "List the most frequent event names captured for your workspace.",
    response: `{ "events": ["page_view", "checkout_completed", "signup"] }`,
  },
  {
    method: "POST",
    path: "/api/v1/insights/query",
    scope: "insights:read",
    desc: "Run an ad-hoc query with no saved Insight — the core \"did metric X change\" primitive.",
    body: `{ "type": "trend", "queryConfig": { "eventName": "checkout_completed", "timeFrame": 14 } }`,
    response: `{ "total": 842, "rows": [{ "day": "2026-07-21", "count": 61 }] }`,
  },
  {
    method: "GET",
    path: "/api/v1/insights/:insightId",
    scope: "insights:read",
    desc: "Fetch a saved insight's metadata (name, type, queryConfig).",
    response: `{ "insight": { "id": "...", "name": "...", "type": "trend", "queryConfig": {...} } }`,
  },
  {
    method: "GET",
    path: "/api/v1/insights/:insightId/data",
    scope: "insights:read",
    desc: "Run a saved insight and return its current data.",
    response: `{ "total": 842, "rows": [...] }`,
  },
  {
    method: "POST",
    path: "/api/v1/insights",
    scope: "insights:write",
    desc: "Create a new insight. Omit dashboardId to use (or auto-create) the workspace's first dashboard.",
    body: `{ "name": "Signups / day", "type": "trend", "queryConfig": { "eventName": "signup", "timeFrame": 30 }, "dashboardId": "optional" }`,
    response: `{ "insight": { "id": "...", "name": "...", "type": "trend" } }`,
  },
  {
    method: "GET",
    path: "/api/v1/dashboards",
    scope: "dashboards:read",
    desc: "List dashboards in your workspace, each with its insights.",
    response: `{ "dashboards": [{ "id": "...", "name": "...", "insights": [...] }] }`,
  },
  {
    method: "GET",
    path: "/api/v1/dashboards/:dashboardId",
    scope: "dashboards:read",
    desc: "Fetch a single dashboard with its insights, ordered by position.",
    response: `{ "dashboard": { "id": "...", "name": "...", "insights": [...] } }`,
  },
  {
    method: "POST",
    path: "/api/v1/dashboards",
    scope: "dashboards:write",
    desc: "Create a new dashboard.",
    body: `{ "name": "Agent-built dashboard" }`,
    response: `{ "dashboard": { "id": "...", "name": "..." } }`,
  },
  {
    method: "GET",
    path: "/api/v1/recordings",
    scope: "recordings:read",
    desc: "Cursor-paginated list of session recordings. Filter with ?pagePath= or ?distinctId=.",
    response: `{ "total": 120, "rows": [...], "nextCursor": "..." }`,
  },
  {
    method: "GET",
    path: "/api/v1/recordings/:sessionId/stream",
    scope: "recordings:read",
    desc: "Stream a single recording's raw NDJSON event log.",
    response: `application/x-ndjson body`,
  },
];

function MethodBadge({ method }: { method: string }) {
  const color = method === "GET" ? "bg-cyan-500/15 text-cyan-300" : "bg-emerald-500/15 text-emerald-300";
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${color}`}>{method}</span>;
}

export default function AiIntegrationDocsPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-12">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-xs text-white/40 hover:text-white/70 transition">
            ← Back to dashboard
          </Link>
          <div className="flex items-center gap-4">
            <a href="/llms.txt" className="text-xs text-white/40 hover:text-white/70 transition">
              llms.txt
            </a>
            <Link
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition"
            >
              View on GitHub
            </Link>
          </div>
        </div>

        {/* Intro */}
        <section className="space-y-4 border-b border-white/10 pb-12">
          <span className="rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-fuchsia-400">
            AI integration
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">
            Using Analas as an AI agent
          </h1>
          <p className="text-white/60 leading-relaxed text-sm">
            Everything a human can do in the Analas dashboard — query event counts, read insight results, browse
            session recordings, and build dashboards — is also reachable with a scoped API key, with no browser
            session involved. This page is written for an agent (or the person configuring one) to read directly.
          </p>
        </section>

        {/* Getting a key */}
        <section className="space-y-4 border-b border-white/10 pb-12">
          <h2 className="text-xl font-bold text-white">1. Get a scoped API key</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            In <strong>Workspace Settings → API Keys</strong>, create a key with a descriptive name (e.g. <em>&quot;Claude Ingest Agent&quot;</em> or <em>&quot;CI Verification Worker&quot;</em>) and select only the scopes it needs.
            Scopes are additive and immutable after creation — revoke and recreate a key to change its scopes.
          </p>
          <pre className="rounded-xl bg-slate-950 border border-white/10 p-5 text-xs font-mono text-white/80 overflow-x-auto whitespace-pre">{`events:write        # capture events (default scope)
events:read         # list top event names
insights:read       # read saved insights, run ad-hoc queries
insights:write      # create insights
dashboards:read     # list/read dashboards
dashboards:write    # create dashboards
recordings:read     # list and stream session recordings`}</pre>
          <div className="rounded-xl bg-slate-950 border border-white/10 p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-fuchsia-400">Structured Key Format &amp; Workspace Identification</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Keys are structured as <code className="text-emerald-300 font-mono text-xs">analas_sk_&lt;workspace_prefix&gt;_&lt;random_token&gt;</code>. Each key also displays a safe non-secret hint (e.g. <code className="text-emerald-300 font-mono text-xs">analas_sk_a1b2c3_••••8d2c</code>) and tracks its last usage time (<code className="text-white/80 font-mono text-xs">lastUsedAt</code>) so you can easily identify which workspace and agent a key belongs to without exposing the secret.
            </p>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            Every request authenticates the same way: an <code className="text-emerald-300 font-mono text-xs bg-white/5 px-1 rounded">Authorization: Bearer analas_sk_...</code> header (legacy <code className="text-emerald-300 font-mono text-xs bg-white/5 px-1 rounded">analas_pk_...</code> keys continue to be fully supported). A key can only act on the workspace it was created in, and only within the scopes it was granted — a read-only key can never create or delete anything.
          </p>
        </section>

        {/* Endpoint reference */}
        <section className="space-y-6 border-b border-white/10 pb-12">
          <h2 className="text-xl font-bold text-white">2. Endpoint reference</h2>
          <div className="space-y-4">
            {ENDPOINTS.map((e) => (
              <div key={e.method + e.path} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <MethodBadge method={e.method} />
                  <code className="text-sm font-mono text-white/90">{e.path}</code>
                  <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/50">
                    {e.scope}
                  </span>
                </div>
                <p className="text-xs text-white/50">{e.desc}</p>
                {e.body && (
                  <pre className="rounded-lg bg-slate-950/80 border border-white/8 p-3 text-[11px] font-mono text-white/60 overflow-x-auto whitespace-pre-wrap">{e.body}</pre>
                )}
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/30">Response</div>
                <pre className="rounded-lg bg-slate-950/80 border border-white/8 p-3 text-[11px] font-mono text-white/60 overflow-x-auto whitespace-pre-wrap">{e.response}</pre>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40">
            Insight <code className="text-emerald-300 font-mono">type</code> values: <code className="text-emerald-300 font-mono">count</code>, <code className="text-emerald-300 font-mono">trend</code>, <code className="text-emerald-300 font-mono">breakdown</code>, <code className="text-emerald-300 font-mono">multi_trend</code>, <code className="text-emerald-300 font-mono">funnel</code>, <code className="text-emerald-300 font-mono">metric</code>, <code className="text-emerald-300 font-mono">retention</code>, <code className="text-emerald-300 font-mono">session_recording</code> — see <Link href="/docs/insight-types" className="text-emerald-300 hover:underline">insight types docs</Link> for each type&apos;s <code className="text-emerald-300 font-mono">queryConfig</code> fields. Insight types beyond <code className="text-emerald-300 font-mono">count</code> and <code className="text-emerald-300 font-mono">trend</code> require a plan that includes that feature — a 403 response means an upgrade is needed, not a bug.
          </p>
          <p className="text-xs text-white/40">
            <code className="text-emerald-300 font-mono">breakdown</code> also accepts an optional <code className="text-emerald-300 font-mono">filters</code> array in <code className="text-emerald-300 font-mono">queryConfig</code> to narrow the split by other properties: <code className="text-emerald-300 font-mono">{`"filters": [{ "property": "city", "value": "Tehran" }]`}</code> (up to 5, each an exact-match equality check). Requires a plan with the <code className="text-emerald-300 font-mono">advanced_filters</code> feature — on plans without it, filters are silently ignored and the breakdown runs unfiltered rather than erroring.
          </p>
        </section>

        {/* Worked examples */}
        <section className="space-y-6 border-b border-white/10 pb-12">
          <h2 className="text-xl font-bold text-white">3. Worked examples</h2>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/80">Sensor — poll a metric on a schedule</h3>
            <pre className="rounded-xl bg-slate-950 border border-white/10 p-5 text-xs font-mono text-white/80 overflow-x-auto whitespace-pre">{`curl https://your-domain.com/api/v1/insights/query \\
  -H "Authorization: Bearer $ANALAS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"count","queryConfig":{"eventName":"error_boundary_triggered"}}'`}</pre>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/80">Verification — did a deploy actually change a metric?</h3>
            <pre className="rounded-xl bg-slate-950 border border-white/10 p-5 text-xs font-mono text-white/80 overflow-x-auto whitespace-pre">{`# Compare a saved insight's data before/after a deploy
curl https://your-domain.com/api/v1/insights/ins_abc123/data \\
  -H "Authorization: Bearer $ANALAS_KEY"`}</pre>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/80">Breakdown — narrow a property split with filters</h3>
            <pre className="rounded-xl bg-slate-950 border border-white/10 p-5 text-xs font-mono text-white/80 overflow-x-auto whitespace-pre">{`curl https://your-domain.com/api/v1/insights/query \\
  -H "Authorization: Bearer $ANALAS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"breakdown","queryConfig":{"eventName":"reservation_completed","property":"city","filters":[{"property":"flow","value":"customer"}]}}'`}</pre>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/80">Analytics in its own right — build a dashboard</h3>
            <pre className="rounded-xl bg-slate-950 border border-white/10 p-5 text-xs font-mono text-white/80 overflow-x-auto whitespace-pre">{`curl -X POST https://your-domain.com/api/v1/dashboards \\
  -H "Authorization: Bearer $ANALAS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Agent-built: onboarding health"}'

curl -X POST https://your-domain.com/api/v1/insights \\
  -H "Authorization: Bearer $ANALAS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Signups / day","type":"trend","queryConfig":{"eventName":"signup","timeFrame":30},"dashboardId":"<id from above>"}'`}</pre>
          </div>
        </section>

        {/* Limits */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">4. Limits</h2>
          <ul className="text-sm text-white/60 space-y-1.5 list-disc list-inside">
            <li>Requests are rate-limited per key; a <code className="text-emerald-300 font-mono text-xs">429</code> response means back off and retry later.</li>
            <li>Read endpoints respect your plan&apos;s data retention window — a time range beyond that window is clamped, not rejected.</li>
            <li>Insight types gated by plan (funnels, retention, session recordings, advanced filters) return <code className="text-emerald-300 font-mono text-xs">403</code> if your workspace&apos;s plan doesn&apos;t include them.</li>
          </ul>
        </section>

      </div>
    </div>
  );
}
