import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate new verification tokens
    const emailToken = crypto.randomBytes(32).toString("hex");
    let smsOtp: string | null = null;
    let otpExpiresAt: Date | null = null;

    if (user.phone) {
      smsOtp = String(100000 + Math.floor(Math.random() * 900000));
      otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    }

    // Update user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: emailToken,
        verificationOtp: smsOtp,
        otpExpiresAt: otpExpiresAt,
      },
    });

    // Logging verification link and SMS code to stdout/logs
    const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://analas.ir").replace(/\/$/, "");
    const verificationLink = `${appUrl}/api/verify-email?token=${emailToken}`;

    console.log(`\n==========================================================`);
    console.log(`[DISPATCH LOG - RESEND] Token request for: ${email}`);
    console.log(`[DISPATCH LOG - RESEND] Email Verification Link:\n  ${verificationLink}`);
    if (user.phone && smsOtp) {
      console.log(`[DISPATCH LOG - RESEND] SMS Phone OTP Code for ${user.phone}:\n  ${smsOtp}`);
    }
    console.log(`==========================================================\n`);

    return NextResponse.json({ ok: true, message: "Verification link resent successfully" });
  } catch (error) {
    console.error("[Resend Verification Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
