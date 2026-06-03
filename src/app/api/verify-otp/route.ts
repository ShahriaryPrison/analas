import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const otp = String(body?.otp ?? "").trim();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and verification code are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is already verified via email or phone
    if (user.emailVerified || user.phoneVerified) {
      return NextResponse.json({ ok: true, message: "Already verified" });
    }

    // Check OTP exists
    if (!user.verificationOtp || !user.otpExpiresAt) {
      return NextResponse.json({ error: "No pending OTP verification found for this account" }, { status: 400 });
    }

    // Check OTP expiry
    if (new Date() > user.otpExpiresAt) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new code." }, { status: 400 });
    }

    // Check match
    if (user.verificationOtp !== otp) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Update database to verify phone
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerified: new Date(),
        verificationOtp: null,
        otpExpiresAt: null,
      },
    });

    return NextResponse.json({ ok: true, message: "Phone number verified successfully" });
  } catch (error) {
    console.error("[OTP Verification Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
