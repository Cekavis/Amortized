import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/server/current-user";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();

  return (
    <AppShell
      user={{
        name: user.name,
        username: user.username,
        role: user.role,
      }}
    >
      {children}
    </AppShell>
  );
}
