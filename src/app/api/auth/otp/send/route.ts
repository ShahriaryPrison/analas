import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validatePhoneNumber } from "@/lib/countries";
import { sendOtpSms } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const phone = String(body?.phone ?? "").trim();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    const { isValid, error: validationError } = validatePhoneNumber(phone);
    if (!isValid) {
      return NextResponse.json({ error: validationError || "Invalid phone number format." }, { status: 400 });
    }

    // Check if user exists with this phone number
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return NextResponse.json({ error: "This phone number is not registered." }, { status: 404 });
    }

    // Generate random 6-digit OTP
    const smsOtp = String(100000 + Math.floor(Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationOtp: smsOtp,
        otpExpiresAt,
      },
    });

    // Send the OTP
    await sendOtpSms(phone, smsOtp);

    return NextResponse.json({ ok: true, message: "Verification code sent successfully." });
  } catch (error) {
    console.error("[Send Auth OTP Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
