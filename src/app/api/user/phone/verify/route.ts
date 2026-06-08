import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const otp = String(body?.otp ?? "").trim();

    if (!otp) {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.verificationOtp || !user.otpExpiresAt) {
      return NextResponse.json({ error: "No pending OTP verification found for this account." }, { status: 400 });
    }

    if (new Date() > user.otpExpiresAt) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new code." }, { status: 400 });
    }

    if (user.verificationOtp !== otp) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

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
    console.error("[Phone Verify Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
