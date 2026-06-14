import { prisma } from "@/lib/prisma";
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
    const type = String(body?.type ?? "").trim(); // 'email' or 'phone'
    const verified = Boolean(body?.verified);

    if (!userId || (type !== "email" && type !== "phone")) {
      return NextResponse.json(
        { error: "User ID and valid verification type ('email' or 'phone') are required" },
        { status: 400 }
      );
    }

    const value = verified ? new Date() : null;

    await prisma.user.update({
      where: { id: userId },
      data: {
        [type === "email" ? "emailVerified" : "phoneVerified"]: value,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Toggle verification route failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
