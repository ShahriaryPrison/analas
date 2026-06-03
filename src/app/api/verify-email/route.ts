import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://analas.ir").replace(/\/$/, "");

  if (!token) {
    return NextResponse.redirect(`${appUrl}/login?verified=false&error=missing_token`);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      return NextResponse.redirect(`${appUrl}/login?verified=false&error=invalid_token`);
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
      },
    });

    return NextResponse.redirect(`${appUrl}/login?verified=true`);
  } catch (error) {
    console.error("[Email Verification Endpoint Error]:", error);
    return NextResponse.redirect(`${appUrl}/login?verified=false&error=server_error`);
  }
}
