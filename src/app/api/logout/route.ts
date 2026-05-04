import { NextResponse } from "next/server";

export async function POST() {
  // Simple logout endpoint — client should also clear local session (signOut)
  return NextResponse.json({ signedOut: true });
}
