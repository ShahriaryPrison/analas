import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AccountSettingsClient from "./settings-client";

async function SettingsServer() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      phoneVerified: true,
      emailVerified: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <AccountSettingsClient
      initialUser={{
        email: user.email,
        name: user.name ?? "",
        phone: user.phone ?? "",
        phoneVerified: !!user.phoneVerified,
        emailVerified: !!user.emailVerified,
      }}
    />
  );
}

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">Loading account settings...</div>}>
      <SettingsServer />
    </Suspense>
  );
}
