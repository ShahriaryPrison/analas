"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import PineappleIcon from "@/components/PineappleIcon";
import { ALLOWED_COUNTRIES } from "@/lib/countries";

export default function RegisterClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState(ALLOWED_COUNTRIES[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Capture invite token from URL (?invite=TOKEN) set by /invite/[token] redirect
  const inviteToken = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("invite")
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let formattedPhone = "";
      if (phone && phone.trim().length > 0) {
        let sanitized = phone.trim().replace(/\D/g, "");
        if (sanitized.startsWith("0")) {
          sanitized = sanitized.slice(1);
        }
        const regex = new RegExp(countryCode.nationalRegexString);
        if (!regex.test(sanitized)) {
          setError(`Invalid phone number format. Please enter a valid mobile number for ${countryCode.name} (e.g. ${countryCode.placeholder}).`);
          setLoading(false);
          return;
        }
        formattedPhone = `${countryCode.dialCode}${sanitized}`;
      }

      const res = await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name, phone: formattedPhone || undefined, inviteToken }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        const apiKey = data.apiKey;

        // Auto-login with the credentials just created
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.ok) {
          // Redirect to verify page with user details
          const searchParamsPhone = formattedPhone || "";
          router.push(`/verify?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(searchParamsPhone)}&newKey=${encodeURIComponent(apiKey)}`);
        } else {
          setError("Account created but auto-login failed. Please sign in manually.");
        }
      } else {
        const data = await res.json();
        setError(data.error ?? "Registration failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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
          <p className="text-slate-300 text-sm mt-1">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_25px_80px_-30px_rgba(16,185,129,0.45)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">
                Workspace name
              </label>
              <input
                id="name"
                type="text"
                placeholder="My Company"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition"
              />
            </div>

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
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="phone" className="block text-sm font-medium text-slate-300">
                  Phone Number
                </label>
                <span className="text-[10px] text-slate-500 font-medium">Optional</span>
              </div>
              <div className="flex gap-2">
                <select
                  value={countryCode.code}
                  onChange={(e) => {
                    const matched = ALLOWED_COUNTRIES.find((c) => c.code === e.target.value);
                    if (matched) setCountryCode(matched);
                  }}
                  className="bg-slate-800/60 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition shrink-0 cursor-pointer"
                >
                  {ALLOWED_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                      {c.flag} {c.dialCode}
                    </option>
                  ))}
                </select>
                <input
                  id="phone"
                  type="tel"
                  placeholder={countryCode.placeholder}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 bg-slate-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Recommended for payment support and billing verification.</p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                required
                minLength={8}
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
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-slate-300 text-sm mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors">
              Sign in
            </Link>
          </p>

          <p className="text-center text-slate-500 text-xs mt-6 border-t border-white/5 pt-4">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors underline">
              Terms & Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
