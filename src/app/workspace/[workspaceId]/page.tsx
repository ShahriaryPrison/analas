import { redirect } from "next/navigation";

export default async function WorkspacePage({
  params,
}: Readonly<{
  params: Promise<{ workspaceId: string }>;
}>) {
  const { workspaceId } = await params;
  redirect(`/workspace/${workspaceId}/captures`);
}
