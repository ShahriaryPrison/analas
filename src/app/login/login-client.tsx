"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PineappleIcon from "@/components/PineappleIcon";
import { ALLOWED_COUNTRIES } from "@/lib/countries";

function LoginContent() {
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");

  // Email login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone login states
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(ALLOWED_COUNTRIES[0]);
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const fromAutofill = useRef(false);

  // Status & loading states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();


  // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setError("Invalid credentials.");
    }
  }, [searchParams]);

  // Handle email/password submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      loginType: "password",
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  // Handle send OTP code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSendingCode(true);

    // Sanitize phone
    let sanitized = phone.trim().replace(/\D/g, "");
    if (sanitized.startsWith("0")) {
      sanitized = sanitized.slice(1);
    }

    const regex = new RegExp(selectedCountry.nationalRegexString);
    if (!regex.test(sanitized)) {
      setError(`Invalid phone number format. Enter a valid number (e.g. ${selectedCountry.placeholder}).`);
      setSendingCode(false);
      return;
    }

    const fullPhone = `${selectedCountry.dialCode}${sanitized}`;

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsOtpSent(true);
        setSuccess("Verification code sent successfully. Check console logs.");
      } else {
        setError(data.error ?? "Failed to send verification code.");
      }
    } catch {
      setError("An error occurred sending code. Please try again.");
    } finally {
      setSendingCode(false);
    }
  };

  // Handle phone OTP verify submit
  const handlePhoneSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Sanitize phone
    let sanitized = phone.trim().replace(/\D/g, "");
    if (sanitized.startsWith("0")) {
      sanitized = sanitized.slice(1);
    }
    const fullPhone = `${selectedCountry.dialCode}${sanitized}`;

    const result = await signIn("credentials", {
      phone: fullPhone,
      otp,
      loginType: "otp",
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid or expired verification code.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  // WebOTP API listener
  useEffect(() => {
    if (!isOtpSent) return;
    if (!("OTPCredential" in window)) return;

    const ac = new AbortController();

    (navigator.credentials.get as unknown as (options: unknown) => Promise<unknown>)({
      otp: { transport: ["sms"] },
      signal: ac.signal,
    })
      .then((credential: unknown) => {
        const cred = credential as { code?: string } | null;
        if (cred?.code) {
          fromAutofill.current = true;
          setOtp(cred.code);
        }
      })
      .catch(() => {});

    return () => ac.abort();
  }, [isOtpSent]);

  // Autofill auto-submit handler
  useEffect(() => {
    if (fromAutofill.current && otp.length === 6) {
      fromAutofill.current = false;
      handlePhoneSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

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
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-[0_25px_80px_-30px_rgba(16,185,129,0.45)]">
          {/* Tabs */}
          <div className="flex border-b border-white/5 mb-6">
            <button
              onClick={() => {
                setActiveTab("email");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === "email"
                  ? "border-emerald-400 text-emerald-300 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Email Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab("phone");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === "phone"
                  ? "border-emerald-400 text-emerald-300 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Phone OTP Sign In
            </button>
          </div>

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-emerald-300 text-sm mb-5">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm mb-5">
              {error}
            </div>
          )}

          {activeTab === "email" ? (
            /* EMAIL & PASSWORD LOGIN FORM */
            <form onSubmit={handleEmailSubmit} className="space-y-5">
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
          ) : (
            /* PHONE OTP LOGIN FORM */
            <div className="space-y-5">
              {!isOtpSent ? (
                /* STEP 1: ENTER PHONE NUMBER */
                <form onSubmit={handleSendCode} className="space-y-5">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-1.5">
                      Phone Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedCountry.code}
                        onChange={(e) => {
                          const matched = ALLOWED_COUNTRIES.find((c) => c.code === e.target.value);
                          if (matched) setSelectedCountry(matched);
                        }}
                        className="w-[84px] sm:w-[92px] bg-slate-800/60 border border-white/10 rounded-lg px-2 sm:px-3 py-2.5 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition shrink-0 cursor-pointer"
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
                        placeholder={selectedCountry.placeholder}
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 min-w-0 bg-slate-800/60 border border-white/10 rounded-lg px-3 sm:px-4 py-2.5 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingCode}
                    className="w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:via-teal-300 hover:to-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-900"
                  >
                    {sendingCode ? "Sending Code..." : "Send Verification Code"}
                  </button>
                </form>
              ) : (
                /* STEP 2: ENTER OTP CODE */
                <form onSubmit={handlePhoneSubmit} className="space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-lg border border-white/5 bg-white/2 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sending OTP to</div>
                      <div className="text-xs sm:text-sm font-semibold text-white font-mono mt-0.5 truncate max-w-[240px] sm:max-w-xs">{selectedCountry.dialCode} {phone}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOtpSent(false)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 underline shrink-0 self-end sm:self-auto"
                    >
                      Change
                    </button>
                  </div>

                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-slate-300 mb-1.5">
                      Verification Code
                    </label>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 text-center font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:via-teal-300 hover:to-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-900"
                  >
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </button>
                </form>
              )}
            </div>
          )}

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

export default function LoginClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-emerald-400">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
