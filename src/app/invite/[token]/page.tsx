import { redirect } from "next/navigation";

type Props = { params: Promise<{ token: string }> };

/**
 * /invite/[token] — server-side redirect to the API resolver.
 * The actual validation logic lives in /api/invite/[token]/route.ts.
 * This page simply delegates to it so the URL is clean (no /api prefix).
 */
export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  // Delegate to the API route which handles session check + join logic
  redirect(`/api/invite/${token}`);
}
