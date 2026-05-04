import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    // 1. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate raw API key before transaction so we can return it
    const rawKey = `analas_pk_${crypto.randomUUID()}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    // 2. Create User and their first Workspace in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `${name}'s Workspace`,
          tenantId: crypto.randomUUID(), // This is your ClickHouse ID!
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

    // Return the raw key to the client once so they can copy it (show-once)
    return NextResponse.json(
      {
        message: "User created",
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