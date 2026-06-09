import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { validatePhoneNumber } from "@/lib/countries";
import { sendOtpSms } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const phone = String(body?.phone ?? "").trim();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const { isValid, error: validationError } = validatePhoneNumber(phone);
    if (!isValid) {
      return NextResponse.json({ error: validationError || "Invalid phone number format." }, { status: 400 });
    }

    // Check if phone number is already verified by another user
    const existing = await prisma.user.findFirst({
      where: {
        phone,
        phoneVerified: { not: null },
        email: { not: session.user.email },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Phone number is already registered and verified by another user." }, { status: 400 });
    }

    // Generate random 6-digit OTP
    const smsOtp = String(100000 + Math.floor(Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        phone,
        phoneVerified: null,
        verificationOtp: smsOtp,
        otpExpiresAt,
      },
    });

    await sendOtpSms(phone, smsOtp);

    return NextResponse.json({ ok: true, message: "Verification code sent successfully" });
  } catch (error) {
    console.error("[Phone Update Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        phone: null,
        phoneVerified: null,
        verificationOtp: null,
        otpExpiresAt: null,
      },
    });

    return NextResponse.json({ ok: true, message: "Phone number removed successfully" });
  } catch (error) {
    console.error("[Phone Delete Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
