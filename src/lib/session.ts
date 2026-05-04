import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export type AppSession = {
  user: { id?: string; email: string; name?: string | null };
};

export async function getAppSession(): Promise<AppSession | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (await getServerSession(authOptions as any)) as any;
  if (!raw?.user?.email) return null;
  return { user: { id: raw.user.id, email: raw.user.email as string, name: raw.user.name } };
}
