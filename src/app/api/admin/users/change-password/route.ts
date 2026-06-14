import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getAppSession } from "@/lib/session";
import { isAdmin } from "@/lib/auth-admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getAppSession();
    if (!session || !isAdmin(session.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbAdmin = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!dbAdmin || !dbAdmin.emailVerified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const userId = String(body?.userId ?? "").trim();
    const newPassword = String(body?.newPassword ?? "").trim();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "User ID and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Change password route failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
