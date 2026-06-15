import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { validatePhoneNumber } from "@/lib/countries";
import { sendOtpSms } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const { email, password, name, phone, inviteToken } = await req.json();

    // 1. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate raw API key before transaction so we can return it
    const rawKey = `analas_pk_${crypto.randomUUID()}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    // Generate verification details
    const emailToken = crypto.randomBytes(32).toString("hex");
    let smsOtp: string | null = null;
    let otpExpiresAt: Date | null = null;

    if (phone && String(phone).trim().length > 0) {
      const { isValid, error: validationError } = validatePhoneNumber(String(phone));
      if (!isValid) {
        return NextResponse.json({ error: validationError || "Invalid phone number format." }, { status: 400 });
      }

      smsOtp = String(100000 + Math.floor(Math.random() * 900000));
      otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    }

    // 2. Create User and their first Workspace in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          passwordHash: hashedPassword,
          phone: phone && String(phone).trim().length > 0 ? String(phone).trim() : null,
          emailVerificationToken: emailToken,
          emailVerified: null,
          verificationOtp: smsOtp,
          otpExpiresAt: otpExpiresAt,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `${name}'s Workspace`,
          tenantId: crypto.randomUUID(), // This is your ClickHouse ID!
          publicToken: `analas_pub_${crypto.randomBytes(16).toString("hex")}`,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
      });

      // Create a default API key for this workspace (using pre-computed hash)
      await tx.apiKey.create({
        data: {
          keyHash,
          name: "Default key",
          workspaceId: workspace.id,
        },
      });

      return { user, workspace };
    });

    // Dispatch logging (simulation of email link and SMS OTP)
    const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://analas.ir").replace(/\/$/, "");
    const verificationLink = `${appUrl}/api/verify-email?token=${emailToken}`;

    console.log(`\n==========================================================`);
    console.log(`[DISPATCH LOG] New User Registered: ${email}`);
    console.log(`[DISPATCH LOG] Email Verification Link:\n  ${verificationLink}`);
    console.log(`==========================================================\n`);

    if (phone && smsOtp) {
      await sendOtpSms(phone, smsOtp);
    }

    // 3. Auto-join any pending email invites for this email (outside main tx)
    const pendingEmailInvites = await prisma.workspaceInvite.findMany({
      where: { email: email.trim().toLowerCase(), usedAt: null },
    });

    for (const invite of pendingEmailInvites) {
      // Skip if already a member (shouldn't happen, but be safe)
      const existing = await prisma.workspaceMember.findFirst({
        where: { workspaceId: invite.workspaceId, userId: result.user.id },
      });
      if (!existing) {
        await prisma.workspaceMember.create({
          data: { workspaceId: invite.workspaceId, userId: result.user.id, role: invite.role },
        });
      }
      await prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });
    }

    // 4. Honor a public link invite token if provided
    if (inviteToken && typeof inviteToken === "string") {
      const publicInvite = await prisma.workspaceInvite.findUnique({
        where: { token: inviteToken },
      });

      if (
        publicInvite &&
        publicInvite.email === null &&
        !publicInvite.usedAt &&
        (!publicInvite.expiresAt || publicInvite.expiresAt > new Date())
      ) {
        const alreadyMember = await prisma.workspaceMember.findFirst({
          where: { workspaceId: publicInvite.workspaceId, userId: result.user.id },
        });
        if (!alreadyMember) {
          await prisma.workspaceMember.create({
            data: {
              workspaceId: publicInvite.workspaceId,
              userId: result.user.id,
              role: publicInvite.role,
            },
          });
        }
        // Public link tokens are NOT marked as used (reusable)
      }
    }

    // Return the raw key to the client once so they can copy it (show-once)
    return NextResponse.json(
      {
        message: "User created, verification required",
        requiresVerification: true,
        email,
        phone: phone || null,
        apiKey: rawKey,
        workspaceId: result.workspace.id,
        tenantId: result.workspace.tenantId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "User already exists or data invalid" }, { status: 400 });
  }
}