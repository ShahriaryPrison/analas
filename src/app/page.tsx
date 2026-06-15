import Link from "next/link";
import PineappleIcon from "@/components/PineappleIcon";

// ─── inline SVG icons ──────────────────────────────────────────────────────
function IconZap() {
  return (
    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function IconKey() {
  return (
    <svg className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconDatabase() {
  return (
    <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}

// ─── data ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <IconZap />,
    title: "Real-time Captures",
    body: "Every event is written to ClickHouse in milliseconds and visible on your Captures page immediately — no polling lag.",
  },
  {
    icon: <IconKey />,
    title: "API Key Management",
    body: "Create multiple API keys per workspace. Revoke any key instantly from Settings without touching your infrastructure.",
  },
  {
    icon: <IconChart />,
    title: "Insights & Trends",
    body: "See top events, daily series, and breakdowns powered by ClickHouse columnar queries — fast even over millions of rows.",
  },
  {
    icon: (
      <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
      </svg>
    ),
    title: "Session Replays",
    body: "Record and replay user sessions frame-by-frame. Locate user friction, analyze console errors, and watch real customer behavior natively.",
  },
  {
    icon: <IconShield />,
    title: "Multi-tenant Isolation",
    body: "Each workspace gets a unique tenant UUID. ClickHouse partitions events per tenant — your data never bleeds across accounts.",
  },
  {
    icon: <IconGlobe />,
    title: "Zero SDK Required",
    body: "Any language, any runtime. If it can send an HTTP POST it can send to ANALAS. No npm install, no vendor lock-in.",
  },
  {
    icon: <IconDatabase />,
    title: "ClickHouse-powered",
    body: "Built on ClickHouse, the fastest OLAP database on the planet. Handles billions of events without breaking a sweat.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "Free",
    period: "for now",
    description: "For indie devs and side projects.",
    features: [
      "1 workspace limit",
      "10,000 events / month",
      "10 Session Replays / month",
      "3 team members limit",
      "30-day retention (7d replays)",
      "Captures & Insights",
    ],
    cta: "Start for free",
    highlight: false,
    disabled: false,
    ctaLink: "/register",
  },
  {
    name: "Pro",
    price: "390k",
    period: "Toman / mo",
    description: "For growing startups needing deeper analytics.",
    features: [
      "1 workspace limit",
      "250,000 events / month",
      "500 Session Replays / month",
      "Up to 10 team members",
      "365-day retention (14d replays)",
      "Funnels & Cohort Retention",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
    highlightLabel: "Most Popular",
    disabled: false,
    ctaLink: "/register",
  },
  {
    name: "Business",
    price: "1.19M",
    period: "Toman / mo",
    description: "For active apps needing high volume tracking.",
    features: [
      "1 workspace limit",
      "2,000,000 events / month",
      "3,000 Session Replays / month",
      "Up to 25 team members",
      "365-day retention (30d replays)",
      "Public Shared Dashboards",
    ],
    cta: "Upgrade to Business",
    highlight: false,
    disabled: false,
    ctaLink: "/register",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams with serious scale.",
    features: [
      "Unlimited workspaces",
      "Custom monthly events",
      "Custom Replay limits (90d replays)",
      "SSO / SAML integration",
      "10-year data retention",
      "Dedicated support & SLAs",
    ],
    cta: "Contact Support",
    highlight: false,
    disabled: false,
    ctaLink: "https://t.me/heysamadmin",
  },
];

const EVENTS = [
  { event: "user_signed_up", props: '{"plan":"free","source":"google"}', ts: "just now", dot: "emerald" },
  { event: "purchase_completed", props: '{"amount":99,"currency":"USD"}', ts: "2s ago", dot: "teal" },
  { event: "page_viewed", props: '{"path":"/pricing","referrer":"twitter"}', ts: "5s ago", dot: "sky" },
  { event: "feature_used", props: '{"feature":"insights","workspace":"acme"}', ts: "12s ago", dot: "violet" },
];

const GITHUB_URL = "https://github.com/ShahriaryPrison/analas";

// ─── page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020817] text-white overflow-x-hidden">

      {/* ── ambient glow blobs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-48 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[160px]" />
        <div className="absolute top-1/3 -right-48 h-[500px] w-[500px] rounded-full bg-teal-500/8 blur-[120px]" />
        <div className="absolute bottom-0 -left-48 h-[500px] w-[500px] rounded-full bg-amber-500/6 blur-[120px]" />
      </div>

      {/* ════════════════════════════════════════════════
          NAV
      ════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#020817]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30 transition group-hover:shadow-emerald-400/50">
              <PineappleIcon className="h-5 w-5 text-slate-900" title="Analas" />
            </div>
            <span className="text-lg font-bold tracking-tight">ANALAS</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-white/55 md:flex">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/docs/insight-types" className="hover:text-white transition-colors">Docs</Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm text-white/60 transition hover:text-white">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-md shadow-emerald-500/20 transition hover:bg-emerald-300"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════ */}
      <section className="relative px-6 pb-20 pt-20 text-center md:pt-28">

        {/* badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Open analytics platform for developers
        </div>

        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight md:text-[72px]">
          Know exactly what
          <br />
          <span className="bg-linear-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
            your users are doing
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/55">
          Capture every user action with a single HTTP call. Stream events into
          ClickHouse. Explore real-time captures and trends in seconds.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-xl bg-emerald-400 px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-300 hover:shadow-emerald-400/35"
          >
            Start for free — no card needed
          </Link>
          <a
            href="#how-it-works"
            className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-medium transition hover:bg-white/10"
          >
            See how it works ↓
          </a>
        </div>

        {/* ── live events demo panel ── */}
        <div className="mx-auto mt-16 grid max-w-5xl gap-6 text-left lg:grid-cols-2">

          {/* terminal */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/60 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 bg-slate-950/50 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/60" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/60" />
              <span className="ml-3 font-mono text-xs text-white/25">POST /api/capture</span>
            </div>
            <pre className="overflow-x-auto px-5 py-4 text-xs font-mono leading-loose">
<span className="text-white/30">$</span> <span className="text-sky-300">curl</span> <span className="text-white/60">-X POST</span> <span className="text-emerald-300">&apos;https://analas.app/api/capture&apos;</span>{"\n"}
{"  "}<span className="text-white/60">-H</span> <span className="text-amber-300">&apos;Authorization: Bearer ana_live_xK9mNp&apos;</span>{"\n"}
{"  "}<span className="text-white/60">-H</span> <span className="text-amber-300">&apos;Content-Type: application/json&apos;</span>{"\n"}
{"  "}<span className="text-white/60">-d</span> <span className="text-white/70">&apos;&#123;</span>{"\n"}
{"       "}<span className="text-sky-300">&quot;event&quot;</span><span className="text-white/50">:</span> <span className="text-emerald-300">&quot;purchase_completed&quot;</span><span className="text-white/50">,</span>{"\n"}
{"       "}<span className="text-sky-300">&quot;properties&quot;</span><span className="text-white/50">: &#123;</span>{"\n"}
{"         "}<span className="text-sky-300">&quot;amount&quot;</span><span className="text-white/50">:</span> <span className="text-violet-300">99</span><span className="text-white/50">,</span>{"\n"}
{"         "}<span className="text-sky-300">&quot;plan&quot;</span><span className="text-white/50">:</span> <span className="text-emerald-300">&quot;pro&quot;</span>{"\n"}
{"       "}<span className="text-white/50">&#125;</span>{"\n"}
{"     "}<span className="text-white/70">&apos;&#125;</span>
            </pre>
            <div className="border-t border-white/5 bg-emerald-500/5 px-5 py-2.5 flex items-center gap-3 text-xs font-mono">
              <span className="font-semibold text-emerald-400">200 OK</span>
              <span className="text-white/40">→</span>
              <span className="text-white/55">{`{"status":"accepted"}`}</span>
              <span className="ml-auto text-white/25">14ms</span>
            </div>
          </div>

          {/* live stream */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/60 overflow-hidden transition-all duration-300 hover:shadow-emerald-500/5 hover:border-white/20">
            <div className="flex items-center justify-between border-b border-white/8 bg-slate-950/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="font-mono text-xs text-white/40">Live Captures</span>
              </div>
              <span className="text-xs text-white/25">acme-inc workspace</span>
            </div>
            <div className="divide-y divide-white/5">
              {EVENTS.map((ev, i) => (
                <div key={ev.event + ev.ts} className={`px-4 py-3 hover:bg-white/5 transition-colors ${i === 0 ? "bg-white/[0.02]" : ""}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full bg-${ev.dot}-400 ${i === 0 ? "animate-pulse shadow-[0_0_5px_currentColor]" : ""}`} />
                      <span className={`text-sm font-medium ${i === 0 ? "text-white" : "text-white/80"}`}>{ev.event}</span>
                    </div>
                    <span className="shrink-0 text-xs text-white/30">{ev.ts}</span>
                  </div>
                  <code className={`text-xs font-mono ${i === 0 ? "text-white/60" : "text-white/40"}`}>{ev.props}</code>
                </div>
              ))}
            </div>
            <div className="border-t border-white/5 bg-slate-950/30 px-4 py-2.5 flex items-center justify-between text-xs text-white/30">
              <span>4 events shown</span>
              <Link href="/register" className="text-emerald-400 hover:text-emerald-300 transition font-medium">
                Open dashboard →
              </Link>
            </div>
          </div>
        </div>

        {/* stats strip */}
        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm">
          {[
            ["< 20ms", "avg response time"],
            ["ClickHouse", "columnar storage"],
            ["REST API", "zero SDK needed"],
            ["Multi-tenant", "workspace isolation"],
          ].map(([value, label]) => (
            <div key={value} className="flex items-center gap-2 text-white/35">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              <span className="font-semibold text-white/60">{value}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════ */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-400">How it works</p>
            <h2 className="text-3xl font-bold md:text-4xl">Live in under 5 minutes</h2>
            <p className="mx-auto mt-4 max-w-md text-white/55">
              No infrastructure to manage. No SDK to install. Just sign up and start capturing.
            </p>
          </div>

          <div className="grid gap-px md:grid-cols-3 rounded-2xl overflow-hidden border border-white/10">
            {[
              {
                step: "01",
                title: "Create a workspace",
                body: "Sign up in seconds. Your first workspace is created automatically with a unique tenant ID and isolated ClickHouse partition.",
                gradient: "from-emerald-500/15",
              },
              {
                step: "02",
                title: "Generate an API key",
                body: "Head to Settings and create your first API key. It's shown once in full — copy it to start sending events right away.",
                gradient: "from-teal-500/15",
              },
              {
                step: "03",
                title: "Capture & explore",
                body: "POST events from anywhere — your frontend, server, or cron jobs. Watch them appear in Captures and analyze in Insights.",
                gradient: "from-cyan-500/15",
              },
            ].map(({ step, title, body, gradient }) => (
              <div key={step} className={`group relative bg-slate-900/60 p-8 bg-linear-to-b ${gradient} to-transparent transition-colors hover:bg-slate-900/40`}>
                <div className="mb-5 text-5xl font-black text-white/5 group-hover:text-white/10 leading-none select-none transition-colors">{step}</div>
                <h3 className="text-lg font-semibold mb-3 text-white/90 group-hover:text-white transition-colors">{title}</h3>
                <p className="text-sm text-white/50 group-hover:text-white/60 leading-relaxed transition-colors">{body}</p>
              </div>
            ))}
          </div>

          {/* Architecture note */}
          <div className="mt-8 rounded-2xl border border-white/8 bg-white/3 px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:gap-8 text-sm text-white/50">
            <div className="shrink-0 font-semibold text-white/70">Under the hood:</div>
            <div className="flex flex-wrap gap-3">
              {[
                ["Next.js 16", "App & API"],
                ["PostgreSQL", "Users & workspaces"],
                ["ClickHouse", "Event storage"],
                ["Prisma 7", "ORM"],
                ["NextAuth", "Auth"],
              ].map(([tech, role]) => (
                <span key={tech} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                  <span className="text-white/80 font-medium">{tech}</span>
                  <span className="ml-1.5 text-white/35">{role}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          CODE SECTION
      ════════════════════════════════════════════════ */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-xl shadow-black/40">
            {/* header */}
            <div className="flex flex-col gap-3 border-b border-white/8 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold">One endpoint. Any language.</h2>
                <p className="mt-1 text-sm text-white/50">No SDK, no install — a plain HTTP POST is all it takes.</p>
              </div>
              <Link
                href="/register"
                className="shrink-0 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300 transition"
              >
                Get your API key →
              </Link>
            </div>

            {/* code panels */}
            <div className="grid divide-y divide-white/8 md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="group relative">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5 bg-white/[0.01]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.6)]" />
                    <span className="font-mono text-xs text-white/40 group-hover:text-white/60 transition-colors">cURL</span>
                  </div>
                  <button className="text-xs text-white/20 hover:text-white/80 transition-colors" title="Copy to clipboard">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <pre className="overflow-x-auto p-5 text-xs font-mono leading-relaxed text-white/60 group-hover:text-white/75 transition-colors">{`curl -X POST 'https://your-app.com/api/capture' \\
  -H 'Authorization: Bearer <your-api-key>' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "event": "user_signed_up",
    "properties": {
      "plan": "free",
      "source": "google_ads",
      "country": "US"
    }
  }'`}</pre>
              </div>

              <div className="group relative">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5 bg-white/[0.01]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_5px_rgba(56,189,248,0.6)]" />
                    <span className="font-mono text-xs text-white/40 group-hover:text-white/60 transition-colors">JavaScript / TypeScript</span>
                  </div>
                  <button className="text-xs text-white/20 hover:text-white/80 transition-colors" title="Copy to clipboard">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <pre className="overflow-x-auto p-5 text-xs font-mono leading-relaxed text-white/60 group-hover:text-white/75 transition-colors">{`await fetch('/api/capture', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <your-api-key>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    event: 'user_signed_up',
    properties: {
      plan: 'free',
      source: 'google_ads',
    },
  }),
});`}</pre>
              </div>
            </div>

            {/* response bar */}
            <div className="flex flex-wrap items-center gap-4 border-t border-white/8 bg-emerald-500/5 px-5 py-3 text-xs font-mono">
              <span className="font-semibold text-emerald-400">200 OK</span>
              <span className="text-white/40">→</span>
              <span className="text-white/60">{`{"status":"accepted"}`}</span>
              <span className="ml-auto text-white/30 hidden sm:block">Written to ClickHouse in &lt; 20ms</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FEATURES
      ════════════════════════════════════════════════ */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-400">Features</p>
            <h2 className="text-3xl font-bold md:text-4xl">Everything you need. Nothing you don&apos;t.</h2>
            <p className="mx-auto mt-4 max-w-md text-white/55">
              Built for developers who need real answers about their users, fast.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-white/8 bg-white/3 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/5 hover:shadow-2xl hover:shadow-emerald-500/10 overflow-hidden"
              >
                <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-800/60 shadow-inner group-hover:bg-slate-800 transition-colors">
                    {f.icon}
                  </div>
                  <h3 className="mb-2 font-semibold text-white/90 group-hover:text-white transition-colors">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-white/50 group-hover:text-white/60 transition-colors">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          SESSION REPLAY FEATURE SHOWCASE
      ════════════════════════════════════════════════ */}
      <section className="px-6 py-24 border-t border-b border-white/5 bg-gradient-to-b from-transparent via-emerald-950/5 to-transparent">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-12 items-center">
            
            {/* Left Column: Copy */}
            <div className="space-y-6 lg:col-span-5">
              <div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  New Feature
                </span>
                <h2 className="mt-4 text-3xl font-black text-white tracking-tight leading-none sm:text-4xl">
                  Session Replay
                </h2>
                <p className="text-xl font-bold text-white/40 mt-1">
                  See what your users see.
                </p>
              </div>
              
              <p className="text-base leading-relaxed text-white/55">
                Understand user drop-offs and reproduce hard-to-find client bugs. Capture clicks, typing, scrolls, and DOM mutations in real time, and replay them in a beautiful player directly inside ANALAS.
              </p>
              
              <ul className="space-y-3.5">
                {[
                  ["High-Fidelity Replay", "Reconstructs HTML/CSS events dynamically instead of recording heavy video streams."],
                  ["Privacy-First Masking", "Automatically redacts inputs and supports strict full-text masking by default."],
                  ["Developer Timeline", "Inspect exact navigation logs, clicks, and page interactions on a visual timeline."],
                  ["Gzip Compression", "All replay streams are compressed client-side, reducing server bandwidth and S3 costs to near zero."]
                ].map(([title, desc]) => (
                  <li key={title} className="flex gap-3">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <div>
                      <strong className="text-sm font-semibold text-white/90">{title}</strong>
                      <p className="text-xs text-white/50 mt-0.5">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column: Interactive Replayer Mockup */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl overflow-hidden shadow-emerald-500/5 hover:border-white/15 transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/8 bg-slate-900/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500/60" />
                    <span className="font-mono text-xs text-emerald-400 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      REPLAYING SESSION
                    </span>
                  </div>
                  <span className="text-xs font-mono text-white/30">sess_k9r2j8w5…</span>
                </div>
                
                {/* Player Layout */}
                <div className="grid grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/8">
                  {/* Canvas Viewport */}
                  <div className="col-span-12 md:col-span-8 p-6 flex flex-col justify-between min-h-[260px] bg-slate-900/10 relative overflow-hidden select-none">
                    {/* Mock Website Canvas */}
                    <div className="border border-white/5 bg-slate-950/40 rounded-xl p-4 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px] text-white/30">
                        <span>acme-shop.ir/checkout</span>
                        <span>🛒 3 items</span>
                      </div>
                      
                      {/* Fake Payment Form */}
                      <div className="space-y-2 max-w-xs mx-auto w-full">
                        <div className="h-7 rounded-lg bg-white/5 border border-white/10 flex items-center px-2 text-[10px] text-white/30 justify-between">
                          <span>Cardholder Name</span>
                          <span className="font-mono bg-white/10 px-1 py-0.2 rounded text-white/60">*** ***</span>
                        </div>
                        <div className="h-7 rounded-lg bg-white/5 border border-white/10 flex items-center px-2 text-[10px] text-white/30 justify-between">
                          <span>Card Number</span>
                          <span className="font-mono bg-white/10 px-1 py-0.2 rounded text-white/60">**** **** **** 8820</span>
                        </div>
                        <button className="h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 w-full flex items-center justify-center">
                          Pay 1,200,000 Toman
                        </button>
                      </div>
                      
                      <div className="text-[8px] text-white/20 text-center font-mono">
                        Security inputs redacted via [data-mask] automatically
                      </div>
                    </div>
                    
                    {/* Floating Replay Cursor */}
                    <div className="absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 flex flex-col items-start gap-1">
                      <svg className="h-4 w-4 text-emerald-400 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.5 3v15.2l3.8-3.8h5.9l-9.7-11.4z" />
                      </svg>
                      <span className="text-[8px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded shadow">
                        Click: Pay
                      </span>
                    </div>
                  </div>
                  
                  {/* Event Timeline Sidebar */}
                  <div className="col-span-12 md:col-span-4 bg-slate-950/20 p-4 space-y-3 font-mono text-[10px]">
                    <div className="font-bold text-white/30 text-xs pb-1 uppercase tracking-wider">
                      Events Log
                    </div>
                    <div className="space-y-2">
                      {[
                        ["00:02", "page_loaded", "checkout"],
                        ["00:11", "input_change", "name"],
                        ["00:24", "input_change", "card"],
                        ["00:32", "button_click", "submit"]
                      ].map(([time, type, detail], idx) => (
                        <div key={idx} className={`flex items-center gap-2 p-1.5 rounded transition ${idx === 3 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "text-white/40"}`}>
                          <span className="opacity-60">{time}</span>
                          <span className={`h-1.5 w-1.5 rounded-full ${idx === 3 ? "bg-emerald-400" : "bg-white/20"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{type}</div>
                            <div className="opacity-45 text-[8px]">{detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Control Bar */}
                <div className="border-t border-white/8 bg-slate-900/50 px-5 py-3 flex items-center justify-between gap-4 text-xs font-mono">
                  <div className="flex items-center gap-3 shrink-0">
                    <button className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20">
                      ▶
                    </button>
                    <span className="text-white/30">00:32 / 01:10</span>
                  </div>
                  
                  {/* Progress Line */}
                  <div className="flex-1 h-1 bg-white/5 rounded-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full w-[45%] bg-emerald-400 rounded-full" />
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-white/50">
                      2x Speed
                    </span>
                    <span className="bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-400">
                      Skip Inactivity
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          PRICING
      ════════════════════════════════════════════════ */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-400">Pricing</p>
            <h2 className="text-3xl font-bold md:text-4xl">Simple, per-workspace pricing</h2>
            <p className="mx-auto mt-4 max-w-md text-white/55">
              The basic usage is <strong className="font-bold text-white">free for now</strong>. Advanced tiers are now available.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  plan.highlight
                    ? "border-emerald-500/40 bg-linear-to-b from-emerald-500/10 to-emerald-500/3 shadow-2xl shadow-emerald-500/15"
                    : "border-white/10 bg-white/3"
                } ${plan.disabled ? "opacity-50 grayscale-[50%]" : ""}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 px-3 py-0.5 text-xs font-bold text-slate-900 whitespace-nowrap animate-pulse">
                    {plan.highlightLabel || "Free for now"}
                  </div>
                )}

                <div className="mb-5">
                  <div className="text-xs font-bold uppercase tracking-widest text-white/40">{plan.name}</div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                    {plan.period && <span className="text-sm text-white/40">{plan.period}</span>}
                  </div>
                  <p className="mt-2 text-sm text-white/45 min-h-[40px]">{plan.description}</p>
                </div>

                <ul className="mb-7 flex-1 space-y-3 text-sm text-white/65">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <span className="shrink-0 text-emerald-400 font-bold">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.disabled ? (
                  <div className="block w-full rounded-xl py-3 text-center text-sm font-semibold border border-white/10 bg-white/5 cursor-not-allowed text-white/50">
                    {plan.cta}
                  </div>
                ) : (
                  <Link
                    href={plan.ctaLink || "/register"}
                    className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
                      plan.highlight
                        ? "bg-emerald-400 text-slate-900 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20"
                        : "border border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════ */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-linear-to-b from-emerald-500/10 to-transparent p-12 text-center">
            {/* subtle grid pattern */}
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            <div className="relative">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-500/30">
                <PineappleIcon className="h-9 w-9 text-slate-900" title="Analas" />
              </div>

              <h2 className="text-3xl font-bold md:text-4xl">
                Ready to understand your users?
              </h2>
              <p className="mx-auto mt-4 max-w-sm text-white/55">
                Your first workspace and API key are ready the moment you sign up. No credit card required.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="rounded-xl bg-emerald-400 px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-300"
                >
                  Create free account
                </Link>
                <Link href="/login" className="text-sm text-white/45 transition hover:text-white/70">
                  Already have an account? Sign in →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════ */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2.5 text-white/35">
            <PineappleIcon className="h-4 w-4" />
            <span className="text-sm font-bold tracking-tight">ANALAS</span>
            <span className="text-xs ml-1">© 2026 — Open analytics for developers</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <a href="#how-it-works" className="hover:text-white/60 transition">How it works</a>
            <a href="#features" className="hover:text-white/60 transition">Features</a>
            <a href="#pricing" className="hover:text-white/60 transition">Pricing</a>
            <Link href="/docs/insight-types" className="hover:text-white/60 transition">Docs</Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition">GitHub</a>
            <Link href="/login" className="hover:text-white/60 transition">Sign in</Link>
            <Link href="/register" className="hover:text-white/60 transition">Register</Link>
          </div>
        </div>

        {/* Implemented by Heysam Tech Badge */}
        <div className="mt-8 flex justify-center">
          <a
            href="https://heysam-tech.ir"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border border-white/10 bg-slate-900/50 px-4 py-1.5 text-xs text-white/50 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          >
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">Implemented by</span>
            <span className="h-3 w-px bg-white/15" />
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white/80 group-hover:text-emerald-400 transition-colors">Heysam Tech</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          </a>
        </div>
      </footer>
    </div>
  );
}
