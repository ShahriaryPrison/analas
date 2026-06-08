"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import PineappleIcon from "@/components/PineappleIcon";
import {
  LogOutIcon,
  CheckIcon,
  ArrowLeftIcon,
  PencilIcon,
  SlidersIcon,
} from "@/components/icons";
import { ALLOWED_COUNTRIES } from "@/lib/countries";

type UserProfile = {
  email: string;
  name: string;
  phone: string;
  phoneVerified: boolean;
  emailVerified: boolean;
};

export default function AccountSettingsClient({
  initialUser,
}: {
  initialUser: UserProfile;
}) {
  // User details state
  const [name, setName] = useState(initialUser.name);
  const [email] = useState(initialUser.email);
  const [phone, setPhone] = useState(() => {
    // If user has a phone, strip the dialCode and return national number
    if (initialUser.phone) {
      const matched = ALLOWED_COUNTRIES.find((c) => initialUser.phone.startsWith(c.dialCode));
      if (matched) {
        return initialUser.phone.slice(matched.dialCode.length);
      }
    }
    return "";
  });
  const [selectedCountry, setSelectedCountry] = useState(() => {
    if (initialUser.phone) {
      const matched = ALLOWED_COUNTRIES.find((c) => initialUser.phone.startsWith(c.dialCode));
      if (matched) return matched;
    }
    return ALLOWED_COUNTRIES[0];
  });

  const [phoneVerified, setPhoneVerified] = useState(initialUser.phoneVerified);
  const [hasPhoneRegistered, setHasPhoneRegistered] = useState(!!initialUser.phone);

  // OTP/Verification state
  const [otp, setOtp] = useState("");
  const [isOtpPending, setIsOtpPending] = useState(false);

  // Status & loading states
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; text: string } | null>(null);

  // Handle name update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ ok: true, text: "Profile details updated successfully." });
      } else {
        setProfileMsg({ ok: false, text: data.error ?? "Failed to update profile." });
      }
    } catch {
      setProfileMsg({ ok: false, text: "An error occurred. Please try again." });
    } finally {
      setProfileLoading(false);
    }
  };

  // Resend email verification
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
        setEmailStatus({ ok: true, text: "Verification link sent. Check your server/email logs." });
      } else {
        setEmailStatus({ ok: false, text: data.error ?? "Failed to resend link." });
      }
    } catch {
      setEmailStatus({ ok: false, text: "An error occurred. Please try again." });
    } finally {
      setResendingEmail(false);
    }
  };

  // Add or Update Phone Number (Trigger OTP)
  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneLoading(true);
    setPhoneMsg(null);

    // Sanitize phone
    let sanitized = phone.trim().replace(/\D/g, "");
    if (sanitized.startsWith("0")) {
      sanitized = sanitized.slice(1);
    }

    const regex = new RegExp(selectedCountry.nationalRegexString);
    if (!regex.test(sanitized)) {
      setPhoneMsg({
        ok: false,
        text: `Invalid phone format. Try: ${selectedCountry.placeholder}`,
      });
      setPhoneLoading(false);
      return;
    }

    const fullPhoneNumber = `${selectedCountry.dialCode}${sanitized}`;

    try {
      const res = await fetch("/api/user/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhoneNumber }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsOtpPending(true);
        setHasPhoneRegistered(true);
        setPhoneVerified(false);
        setPhoneMsg({ ok: true, text: "A 6-digit verification code has been sent. Check console logs." });
      } else {
        setPhoneMsg({ ok: false, text: data.error ?? "Failed to update phone number." });
      }
    } catch {
      setPhoneMsg({ ok: false, text: "An error occurred. Please try again." });
    } finally {
      setPhoneLoading(false);
    }
  };

  // Verify Phone OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setPhoneMsg({ ok: false, text: "Please enter a valid 6-digit numeric code." });
      return;
    }

    setPhoneLoading(true);
    setPhoneMsg(null);

    try {
      const res = await fetch("/api/user/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });

      const data = await res.json();
      if (res.ok) {
        setPhoneVerified(true);
        setIsOtpPending(false);
        setPhoneMsg({ ok: true, text: "Phone number verified successfully!" });
      } else {
        setPhoneMsg({ ok: false, text: data.error ?? "Invalid verification code." });
      }
    } catch {
      setPhoneMsg({ ok: false, text: "An error occurred. Please try again." });
    } finally {
      setPhoneLoading(false);
    }
  };

  // Remove Phone Number
  const handleRemovePhone = async () => {
    if (!confirm("Are you sure you want to remove your phone number? This will clear your verification status.")) {
      return;
    }

    setPhoneLoading(true);
    setPhoneMsg(null);

    try {
      const res = await fetch("/api/user/phone", {
        method: "DELETE",
      });

      if (res.ok) {
        setPhone("");
        setPhoneVerified(false);
        setHasPhoneRegistered(false);
        setIsOtpPending(false);
        setPhoneMsg({ ok: true, text: "Phone number removed successfully." });
      } else {
        const data = await res.json();
        setPhoneMsg({ ok: false, text: data.error ?? "Failed to remove phone number." });
      }
    } catch {
      setPhoneMsg({ ok: false, text: "An error occurred. Please try again." });
    } finally {
      setPhoneLoading(false);
    }
  };

  const currentFullPhone = `${selectedCountry.dialCode}${phone.replace(/\D/g, "").replace(/^0/, "")}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-white/6 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-3.5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-linear-to-br from-emerald-300 via-teal-300 to-cyan-300 shadow-md shadow-emerald-500/20">
              <PineappleIcon className="w-4.5 h-4.5 text-slate-900" />
            </div>
            <span className="text-base font-bold tracking-tight">ANALAS</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-sm text-white/60 hover:bg-white/8 hover:text-white/95 transition"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              Back
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-sm text-white/60 hover:bg-white/8 hover:text-white/95 transition"
            >
              <LogOutIcon className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20">
              <SlidersIcon className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
              <p className="text-sm text-white/40 mt-0.5">Manage your personal profile details and contact verification.</p>
            </div>
          </div>
        </div>

        {/* 1. Profile Details Card */}
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-2">
            <PencilIcon className="w-4 h-4 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Profile Details</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {profileMsg && (
              <div className={`text-sm px-4 py-3 rounded-lg border ${profileMsg.ok ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300" : "bg-red-500/10 border-red-500/35 text-red-300"}`}>
                {profileMsg.text}
              </div>
            )}

            <div>
              <label htmlFor="email-display" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  id="email-display"
                  type="email"
                  readOnly
                  value={email}
                  className="w-full bg-slate-900/60 border border-white/5 rounded-lg px-4 py-2.5 text-white/45 text-sm focus:outline-none cursor-not-allowed select-none"
                />
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${initialUser.emailVerified ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : "bg-amber-500/15 text-amber-300 border-amber-500/20"}`}>
                  {initialUser.emailVerified ? <><CheckIcon className="w-3 h-3" />Verified</> : "Unverified"}
                </span>
                {!initialUser.emailVerified && (
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={resendingEmail}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline disabled:opacity-50 shrink-0 transition"
                  >
                    {resendingEmail ? "Sending Link..." : "Resend Link"}
                  </button>
                )}
              </div>
              {emailStatus && (
                <p className={`text-[11px] mt-1 ${emailStatus.ok ? "text-emerald-400" : "text-red-400"}`}>
                  {emailStatus.text}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="name-input" className="block text-sm font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                id="name-input"
                type="text"
                placeholder="Enter your name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition"
              />
              <p className="text-[10px] text-slate-500 mt-1">Completing your name helps teammates identify you in shared workspaces.</p>
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 text-slate-900 font-semibold rounded-lg py-2 px-5 text-sm transition"
            >
              {profileLoading ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>

        {/* 2. Security & Phone Verification Card */}
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Phone Verification</h2>
            {hasPhoneRegistered && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${phoneVerified ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : "bg-amber-500/15 text-amber-300 border-amber-500/20"}`}>
                {phoneVerified ? <><CheckIcon className="w-3 h-3" />Verified</> : "Verification Pending"}
              </span>
            )}
          </div>

          {phoneMsg && (
            <div className={`text-sm px-4 py-3 rounded-lg border ${phoneMsg.ok ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300" : "bg-red-500/10 border-red-500/35 text-red-300"}`}>
              {phoneMsg.text}
            </div>
          )}

          {!hasPhoneRegistered ? (
            /* PHONE ADDITION FORM */
            <form onSubmit={handleAddPhone} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Add a phone number to enable SMS notifications, secondary account activation, and verification for billing integrations.
              </p>
              <div>
                <label htmlFor="phone-input" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const matched = ALLOWED_COUNTRIES.find((c) => c.code === e.target.value);
                      if (matched) setSelectedCountry(matched);
                    }}
                    className="bg-slate-800/60 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition cursor-pointer"
                  >
                    {ALLOWED_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                        {c.flag} {c.dialCode}
                      </option>
                    ))}
                  </select>
                  <input
                    id="phone-input"
                    type="tel"
                    placeholder={selectedCountry.placeholder}
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-slate-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={phoneLoading}
                className="bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 text-slate-900 font-semibold rounded-lg py-2 px-5 text-sm transition"
              >
                {phoneLoading ? "Sending Code..." : "Add Phone Number"}
              </button>
            </form>
          ) : (
            /* PHONE REGISTERED VIEW */
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-white/5 bg-white/2 gap-3">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Registered Phone</div>
                  <div className="text-base font-semibold text-white font-mono mt-0.5">{currentFullPhone}</div>
                </div>
                <button
                  onClick={handleRemovePhone}
                  disabled={phoneLoading}
                  className="rounded-lg border border-red-500/25 bg-red-500/8 hover:bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 transition disabled:opacity-50"
                >
                  Remove Phone
                </button>
              </div>

              {/* OTP CODE VERIFICATION FORM */}
              {isOtpPending && !phoneVerified && (
                <form onSubmit={handleVerifyOtp} className="p-4 rounded-xl border border-white/5 bg-white/2 space-y-3">
                  <div>
                    <label htmlFor="otp-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Enter Verification Code
                    </label>
                    <input
                      id="otp-input"
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-slate-600 text-center font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent transition"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={phoneLoading}
                      className="flex-1 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 text-slate-900 font-semibold rounded-lg py-2 text-xs transition"
                    >
                      {phoneLoading ? "Verifying..." : "Verify OTP Code"}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPhone}
                      disabled={phoneLoading}
                      className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition"
                    >
                      Resend Code
                    </button>
                  </div>
                </form>
              )}

              {!phoneVerified && !isOtpPending && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <p className="text-xs text-amber-300/80 leading-relaxed max-w-md">
                    Your phone number needs to be verified before it can be used for account authentication and support.
                  </p>
                  <button
                    onClick={handleAddPhone}
                    disabled={phoneLoading}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg py-1.5 px-4 text-xs transition shrink-0"
                  >
                    {phoneLoading ? "Requesting OTP..." : "Verify Now"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-3xl mx-auto px-6 pb-12 text-center text-xs text-slate-600 border-t border-white/5 pt-6">
        Need assistance with your account settings? Contact support on Telegram:{" "}
        <a
          href="https://t.me/heysamadmin"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline font-semibold"
        >
          @heysamadmin
        </a>
      </footer>
    </div>
  );
}
