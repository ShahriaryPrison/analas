"use client";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PineappleIcon from "@/components/PineappleIcon";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccess("Account created! Sign in to continue.");
    }
    if (searchParams.get("verified") === "true") {
      setSuccess("Email verified successfully! You can now sign in.");
    }
    if (searchParams.get("verified") === "false") {
      const errorMsg = searchParams.get("error");
      if (errorMsg === "invalid_token") {
        setError("The verification link is invalid or has expired.");
      } else if (errorMsg === "missing_token") {
        setError("Verification token is missing.");
      } else {
        setError("Email verification failed. Please try again.");
      }
    }
    if (searchParams.get("error") === "CredentialsSignin") {
      setError("Invalid email or password.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-emerald-950 via-slate-900 to-amber-950 flex items-center justify-center p-4">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-amber-400/25 blur-3xl" />
      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-300 via-teal-300 to-cyan-300 mb-4 shadow-lg shadow-emerald-500/30">
            <PineappleIcon className="w-7 h-7 text-slate-900" title="Analas pineapple" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ANALAS</h1>
          <p className="text-slate-300 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_25px_80px_-30px_rgba(16,185,129,0.45)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-emerald-300 text-sm">
                {success}
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:via-teal-300 hover:to-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-slate-300 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors">
              Create one
            </Link>
          </p>

          <div className="text-center border-t border-white/5 pt-4 mt-6 text-xs text-slate-500">
            Need billing or payment support?{" "}
            <a
              href="https://t.me/heysamadmin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline font-semibold"
            >
              Contact @heysamadmin
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Suspense } from "react";

export default function LoginClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-emerald-400">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
