import Link from "next/link";

type Props = { searchParams: Promise<{ reason?: string }> };

const MESSAGES: Record<string, { title: string; body: string }> = {
  member_limit: {
    title: "Workspace is full",
    body: "This workspace has reached the maximum number of members allowed on its current plan. Ask the workspace owner to upgrade their plan or free up a seat.",
  },
  invalid: {
    title: "Invalid invite link",
    body: "This invite link is not valid. It may have been revoked or never existed.",
  },
  expired: {
    title: "Invite link expired",
    body: "This invite link has expired. Ask the workspace owner to send a new one.",
  },
  used: {
    title: "Invite already used",
    body: "This invite link has already been used and is no longer active.",
  },
  email_mismatch: {
    title: "Wrong email address",
    body: "This invite was sent to a different email address. Please sign in with the correct account.",
  },
};

const FALLBACK = {
  title: "Cannot join workspace",
  body: "Something went wrong with this invite link. Please contact the workspace owner.",
};

export default async function InviteErrorPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const { title, body } = (reason ? MESSAGES[reason] : undefined) ?? FALLBACK;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-amber-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_25px_80px_-30px_rgba(16,185,129,0.45)] text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">{title}</h1>
        <p className="text-slate-400 text-sm mb-6">{body}</p>
        <Link
          href="/login"
          className="inline-block bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-900 font-semibold rounded-lg px-6 py-2.5 text-sm hover:opacity-90 transition-opacity"
        >
          Go to login
        </Link>
      </div>
    </div>
  );
}
