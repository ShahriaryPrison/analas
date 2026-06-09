"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PineappleIcon from "@/components/PineappleIcon";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const phone = searchParams.get("phone") ?? "";
  const newKey = searchParams.get("newKey") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (res.ok) {
        // Redirection on successful verification
        const targetUrl = newKey ? `/dashboard?newKey=${encodeURIComponent(newKey)}` : "/dashboard";
        router.push(targetUrl);
      } else {
        setError(data.error ?? "Invalid verification code. Please try again.");
      }
    } catch {
      setError("An error occurred during verification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch("/api/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailStatus({ ok: true, msg: "Verification link resent successfully! Please check your logs." });
      } else {
        setEmailStatus({ ok: false, msg: data.error ?? "Failed to resend. Please try again." });
      }
    } catch {
      setEmailStatus({ ok: false, msg: "An error occurred. Please try again." });
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-300 via-teal-300 to-cyan-300 mb-4 shadow-lg shadow-emerald-500/30">
          <PineappleIcon className="w-7 h-7 text-slate-900" title="Analas pineapple" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight font-sans">Verify Account</h1>
        <p className="text-slate-400 text-sm mt-1">At least one contact method must be verified</p>
      </div>

      {/* Card */}
      <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_25px_80px_-30px_rgba(16,185,129,0.45)] space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Option A: Email verification instructions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
              A
            </span>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Verify via Email Link</h3>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/2 p-4 space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              We sent a verification link to:
              <br />
              <strong className="text-white font-mono">{email || "your registered email"}</strong>
            </p>
            <button
              onClick={handleResendEmail}
              disabled={resendingEmail}
              className="w-full text-center py-2 text-xs font-semibold rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
            >
              {resendingEmail ? "Resending Link..." : "Resend Verification Link"}
            </button>
            {emailStatus && (
              <p className={`text-[10px] ${emailStatus.ok ? "text-emerald-400" : "text-red-400"} leading-relaxed mt-1`}>
                {emailStatus.msg}
              </p>
            )}
          </div>
        </div>

        {/* Divider if phone is present */}
        {phone && (
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-xs font-bold tracking-wider text-slate-600 uppercase">OR</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>
        )}

        {/* Option B: SMS verification instructions (only if phone is registered) */}
        {phone && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-400">
                B
              </span>
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Verify via SMS OTP</h3>
            </div>
            <form onSubmit={handleOtpSubmit} className="rounded-xl border border-white/5 bg-white/2 p-4 space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                We sent a 6-digit code to your phone:
                <br />
                <strong className="text-white font-mono">{phone}</strong>
              </p>
              <div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP code"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-slate-500 text-center font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg py-2 text-xs transition"
              >
                {loading ? "Verifying OTP..." : "Verify OTP Code"}
              </button>
            </form>
          </div>
        )}

        <div className="text-center border-t border-white/5 pt-4 text-xs text-slate-500">
          Need support? Contact support at{" "}
          <a
            href="https://t.me/heysamadmin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline font-semibold"
          >
            @heysamadmin
          </a>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-emerald-950 via-slate-900 to-amber-950 flex items-center justify-center p-4">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-amber-400/25 blur-3xl" />
      
      <Suspense fallback={<div className="text-white text-sm">Loading verification content...</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
