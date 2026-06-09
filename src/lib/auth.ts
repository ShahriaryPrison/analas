import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
        loginType: { label: "Login Type", type: "text" },
      },
      async authorize(credentials) {
        if (credentials?.loginType === "otp") {
          const phone = credentials.phone?.trim();
          const otp = credentials.otp?.trim();

          if (!phone || !otp) return null;

          const user = await prisma.user.findUnique({
            where: { phone },
          });

          if (!user) return null;
          if (!user.verificationOtp || !user.otpExpiresAt) return null;
          if (new Date() > user.otpExpiresAt) return null;
          if (user.verificationOtp !== otp) return null;

          // Clear OTP and verify phone since they verified it to log in
          await prisma.user.update({
            where: { id: user.id },
            data: {
              verificationOtp: null,
              otpExpiresAt: null,
              phoneVerified: user.phoneVerified || new Date(),
            },
          });

          return { id: user.id, email: user.email, name: user.name ?? undefined };
        } else {
          // Default: Email and Password login
          if (!credentials?.email || !credentials?.password) return null;

          const user = await prisma.user.findUnique({
            where: { email: credentials.email.trim().toLowerCase() },
          });

          if (!user) return null;

          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid) return null;

          return { id: user.id, email: user.email, name: user.name ?? undefined };
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  secret: process.env.AUTH_SECRET,
};
