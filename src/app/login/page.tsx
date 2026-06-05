import { getAppSession } from "@/lib/session";
import { redirect } from "next/navigation";
import LoginClient from "./login-client";

export default async function LoginPage() {
  const session = await getAppSession();
  if (session) {
    redirect("/dashboard");
  }

  return <LoginClient />;
}
