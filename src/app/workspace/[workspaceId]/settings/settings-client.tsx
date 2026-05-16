"use client";

import { useState } from "react";
import {
  PlusIcon, KeyIcon, CopyIcon, CheckIcon, TrashIcon,
  ShareIcon, LinkIcon, MailIcon, UserPlusIcon, XIcon, UsersIcon,
} from "@/components/icons";

// ─── types ────────────────────────────────────────────────────────────────────
type ApiKey = { id: string; name: string; createdAt: string };
type Member = { id: string; name: string | null; email: string; role: string };
type PendingInvite = { id: string; email: string; role: string; createdAt: string };

// ─── role helpers ─────────────────────────────────────────────────────────────
const ROLE_BADGE: Record<string, string> = {
  OWNER: "bg-amber-500/15 text-amber-300",
  ADMIN: "bg-violet-500/15 text-violet-300",
  MEMBER: "bg-white/10 text-white/50",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE[role] ?? ROLE_BADGE.MEMBER}`}>
      {role}
    </span>
  );
}

function Avatar({ name, email }: { name: string | null; email: string }) {
  const letter = (name ?? email).charAt(0).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300 border border-emerald-500/20">
      {letter}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function SettingsClient({
  workspaceId,
  initialKeys,
  members: initialMembers,
  pendingInvites: initialInvites,
  myRole,
  inviteLinkEnabled: initialLinkEnabled,
  inviteLinkToken: initialToken,
  inviteLinkExpiry: initialExpiry,
}: {
  workspaceId: string;
  initialKeys: ApiKey[];
  members: Member[];
  pendingInvites: PendingInvite[];
  myRole: string;
  inviteLinkEnabled: boolean;
  inviteLinkToken: string | null;
  inviteLinkExpiry: string | null;
}) {
  const isAdmin = myRole === "OWNER" || myRole === "ADMIN";

  // ── API Keys state ──────────────────────────────────────────────────────────
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [lang, setLang] = useState<"js" | "curl">("curl");

  // ── Members & sharing state ─────────────────────────────────────────────────
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [invites, setInvites] = useState<PendingInvite[]>(initialInvites);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // ── Public link state ───────────────────────────────────────────────────────
  const [linkEnabled, setLinkEnabled] = useState(initialLinkEnabled);
  const [linkToken, setLinkToken] = useState<string | null>(initialToken);
  const [linkExpiry, setLinkExpiry] = useState(initialExpiry ?? "");
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

  // ── helpers ─────────────────────────────────────────────────────────────────
  function copyText(text: string, setCb: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    setCb(true);
    setTimeout(() => setCb(false), 2000);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = linkToken ? `${origin}/invite/${linkToken}` : "";

  // ── API key actions ─────────────────────────────────────────────────────────
  async function createKey() {
    setCreating(true);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/api-keys`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setNewKey(data.rawKey);
        setKeys((prev) => [{ id: data.id, name: data.name, createdAt: new Date().toISOString() }, ...prev]);
      }
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(keyId: string) {
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/api-keys/${keyId}`, { method: "DELETE" });
      if (res.ok) setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } finally {
      setRevoking(null);
    }
  }

  // ── Member actions ──────────────────────────────────────────────────────────
  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.status === "added") {
          setMembers((prev) => [...prev, data.member]);
          setInviteMsg({ ok: true, text: `${inviteEmail} was added to the workspace.` });
        } else {
          setInvites((prev) => [...prev, data.invite]);
          setInviteMsg({ ok: true, text: `Invite sent — they'll join when they register with ${inviteEmail}.` });
        }
        setInviteEmail("");
      } else {
        setInviteMsg({ ok: false, text: data.error ?? "Failed to send invite." });
      }
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(userId: string) {
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/members?userId=${userId}`, { method: "DELETE" });
      if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== userId));
    } finally {
      setRemovingId(null);
    }
  }

  async function revokeInvite(inviteId: string) {
    setRevokingId(inviteId);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/invites?inviteId=${inviteId}`, { method: "DELETE" });
      if (res.ok) setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } finally {
      setRevokingId(null);
    }
  }

  // ── Public link actions ─────────────────────────────────────────────────────
  async function enableLink() {
    setLinkLoading(true);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/invite-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresAt: linkExpiry || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setLinkEnabled(true);
        setLinkToken(data.token);
      }
    } finally {
      setLinkLoading(false);
    }
  }

  async function disableLink() {
    setLinkLoading(true);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/invite-link`, { method: "DELETE" });
      if (res.ok) {
        setLinkEnabled(false);
        setLinkToken(null);
      }
    } finally {
      setLinkLoading(false);
    }
  }

  const jsCode = `fetch('${origin}/api/capture', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ${newKey}',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify([{ event: 'test_event', userId: 'user_123' }])\n})`;
  const curlCode = `curl -X POST '${origin}/api/capture' \\\n  -H 'Authorization: Bearer ${newKey}' \\\n  -H 'Content-Type: application/json' \\\n  -d '[{"event":"test_event","userId":"user_123"}]'`;

  return (
    <div className="space-y-6">

      {/* ═══════════════════════════════════════════════════════════════════════
          MEMBERS & SHARING
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20">
            <ShareIcon className="w-4 h-4 text-violet-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Members & Sharing</h2>
            <p className="text-sm text-white/40">Invite teammates and control who has access.</p>
          </div>
        </div>

        {/* ── Members list ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <UsersIcon className="w-3.5 h-3.5 text-white/30" />
            <span className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Members ({members.length})
            </span>
          </div>
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3"
            >
              <Avatar name={m.name} email={m.email} />
              <div className="flex-1 min-w-0">
                {m.name && <div className="text-sm font-medium text-white truncate">{m.name}</div>}
                <div className="text-xs text-white/40 truncate">{m.email}</div>
              </div>
              <RoleBadge role={m.role} />
              {isAdmin && m.role !== "OWNER" && m.id !== members.find((x) => x.role === "OWNER")?.id && (
                <button
                  onClick={() => removeMember(m.id)}
                  disabled={removingId === m.id}
                  className="ml-2 flex items-center gap-1 rounded-lg border border-red-500/25 bg-red-500/8 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/15 transition disabled:opacity-50"
                >
                  <TrashIcon className="w-3 h-3" />
                  {removingId === m.id ? "…" : "Remove"}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ── Invite by email (ADMIN/OWNER only) ── */}
        {isAdmin && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MailIcon className="w-3.5 h-3.5 text-white/30" />
              <span className="text-xs font-semibold uppercase tracking-wide text-white/40">
                Invite by email
              </span>
            </div>
            <form onSubmit={sendInvite} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 transition disabled:opacity-60 shrink-0"
              >
                <UserPlusIcon className="w-3.5 h-3.5" />
                {inviting ? "Sending…" : "Invite"}
              </button>
            </form>

            {inviteMsg && (
              <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${inviteMsg.ok ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border border-red-500/20 text-red-300"}`}>
                {inviteMsg.ok ? <CheckIcon className="w-4 h-4 shrink-0 mt-0.5" /> : <XIcon className="w-4 h-4 shrink-0 mt-0.5" />}
                {inviteMsg.text}
              </div>
            )}
          </div>
        )}

        {/* ── Pending invites ── */}
        {isAdmin && invites.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/40">
                Pending invites ({invites.length})
              </span>
            </div>
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/2 px-4 py-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10">
                  <MailIcon className="w-3.5 h-3.5 text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/70 truncate">{inv.email}</div>
                  <div className="text-xs text-white/30">Invited {new Date(inv.createdAt).toLocaleDateString()}</div>
                </div>
                <RoleBadge role={inv.role} />
                <button
                  onClick={() => revokeInvite(inv.id)}
                  disabled={revokingId === inv.id}
                  className="ml-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/10 transition disabled:opacity-50"
                >
                  {revokingId === inv.id ? "…" : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Public join link ── */}
        {isAdmin && (
          <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <LinkIcon className="w-4 h-4 text-white/40" />
                <div>
                  <div className="text-sm font-medium text-white">Public invite link</div>
                  <div className="text-xs text-white/40">Anyone with the link can join this workspace.</div>
                </div>
              </div>
              {/* Toggle */}
              <button
                onClick={linkEnabled ? disableLink : enableLink}
                disabled={linkLoading}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${linkEnabled ? "bg-emerald-500" : "bg-white/10"}`}
                aria-label={linkEnabled ? "Disable link" : "Enable link"}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${linkEnabled ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>

            {/* Expiry picker (shown when disabled = about to enable, or enabled) */}
            {!linkEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 shrink-0">Expires (optional):</span>
                <input
                  type="date"
                  value={linkExpiry}
                  onChange={(e) => setLinkExpiry(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="flex-1 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                />
              </div>
            )}

            {linkEnabled && linkToken && (
              <div className="space-y-2">
                {linkExpiry && (
                  <p className="text-xs text-amber-300/70">
                    Expires {new Date(linkExpiry).toLocaleDateString()}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-slate-950/60 border border-white/8 px-3 py-2 text-xs font-mono text-white/60">
                    {shareUrl}
                  </code>
                  <button
                    onClick={() => copyText(shareUrl, setLinkCopied)}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-300 transition"
                  >
                    {linkCopied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                    {linkCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <button
                  onClick={enableLink}
                  disabled={linkLoading}
                  className="text-xs text-white/30 hover:text-white/60 transition"
                >
                  Regenerate link
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          API KEYS
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">API Keys</h2>
            <p className="mt-0.5 text-sm text-white/50">Keys authenticate event capture requests from your app.</p>
          </div>
          <button
            onClick={createKey}
            disabled={creating}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-60 sm:shrink-0 sm:py-2"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            {creating ? "Creating…" : "New key"}
          </button>
        </div>

        {/* New key reveal banner */}
        {newKey && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
            <p className="text-sm font-medium text-emerald-300">
              New key created — copy it now, you won&apos;t see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-slate-800/60 px-3 py-2 text-xs font-mono text-white">
                {newKey}
              </code>
              <button
                onClick={() => copyText(newKey, setCopied)}
                className="shrink-0 flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-300 transition"
              >
                {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {(["curl", "js"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${lang === l ? "bg-emerald-500/25 text-emerald-300" : "text-white/40 hover:text-white/60"}`}
                  >
                    {l === "js" ? "JS" : "cURL"}
                  </button>
                ))}
              </div>
              <div className="relative group">
                <pre className="overflow-x-auto rounded-lg bg-slate-950/70 border border-white/6 p-3 pr-10 text-[11px] text-white/60 whitespace-pre-wrap">
                  {lang === "js" ? jsCode : curlCode}
                </pre>
                <button
                  onClick={() => copyText(lang === "js" ? jsCode : curlCode, setCodeCopied)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/50"
                >
                  {codeCopied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <button onClick={() => setNewKey(null)} className="text-xs text-white/40 hover:text-white/70 transition">
              Dismiss
            </button>
          </div>
        )}

        {/* Key list */}
        <div className="space-y-2">
          {keys.length ? (
            keys.map((k) => (
              <div
                key={k.id}
                className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 shrink-0">
                    <KeyIcon className="w-3.5 h-3.5 text-white/40" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{k.name}</div>
                    <div className="text-xs text-white/40">Created {new Date(k.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <button
                  onClick={() => revokeKey(k.id)}
                  disabled={revoking === k.id}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50 sm:py-1.5 sm:shrink-0"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  {revoking === k.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/50">
              No API keys yet. Create one to start sending events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
