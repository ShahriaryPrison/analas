import Link from "next/link";
import PineappleIcon from "@/components/PineappleIcon";

export default function TermsPage() {
  return (
    <div className="relative min-h-screen overflow-y-auto bg-linear-to-br from-emerald-950 via-slate-900 to-amber-950 flex flex-col items-center py-16 px-4">
      <div className="pointer-events-none absolute top-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative w-full max-w-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/login" className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-emerald-300 via-teal-300 to-cyan-300 mb-4 shadow-lg shadow-emerald-500/20">
            <PineappleIcon className="w-6 h-6 text-slate-900" title="Analas pineapple" />
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Terms of Service & Privacy</h1>
          <p className="text-slate-400 text-xs mt-1">Last updated: June 2026</p>
        </div>

        {/* Content Box */}
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-slate-300 text-sm leading-relaxed space-y-6">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Data Ingestion & Storage</h2>
            <p>
              Analas collects events and metrics sent via the API from your configured applications. You retain all ownership of the data you submit to our service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Data Retention Policy</h2>
            <p>
              To optimize database efficiency and server footprint, we enforce dynamic event data retention limits based on your subscription plan. Events older than your plan's retention threshold are automatically and permanently deleted from our databases:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2 text-slate-400">
              <li><strong className="text-white">Free Plan:</strong> 30 Days of data retention.</li>
              <li><strong className="text-white">Pro Plan:</strong> 365 Days (1 Year) of data retention.</li>
              <li><strong className="text-white">Business Plan:</strong> 365 Days (1 Year) of data retention.</li>
              <li><strong className="text-white">Enterprise Plan:</strong> 3,650 Days (10 Years) of data retention.</li>
            </ul>
            <p className="text-xs text-amber-300/80 mt-2">
              Note: Upgrading your plan will instantly apply the new retention limit to all subsequently tracked events, while downgrading will cause events beyond the lower limit to be pruned during the next database compression cycle.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Billing & Payments</h2>
            <p>
              Subscribed plans are billed on a monthly cycle via Strite. Subscriptions auto-renew until cancelled. Cancellations will keep your plan active until the end of the current billing cycle, at which point your workspace will revert to the Free plan limits.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">4. Privacy & Processing</h2>
            <p>
              We process data solely to deliver the real-time insights displayed on your analytics canvas. We do not sell or share event details, properties, or user profiles with third parties.
            </p>
          </section>

          <div className="pt-6 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <Link href="/register" className="text-emerald-300 hover:text-emerald-200 transition-colors font-medium">
              ← Return to Signup
            </Link>
            <span>Analas Analytics Inc.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
