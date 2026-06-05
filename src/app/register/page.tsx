import { getAppSession } from "@/lib/session";
import { redirect } from "next/navigation";
import RegisterClient from "./register-client";

export default async function RegisterPage() {
  const session = await getAppSession();
  if (session) {
    redirect("/dashboard");
  }

  return <RegisterClient />;
}
