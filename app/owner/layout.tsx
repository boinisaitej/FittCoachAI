import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { ownerNav } from "@/components/shell/nav-config";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("owner");
  return (
    <AppShell user={user} nav={ownerNav}>
      {children}
    </AppShell>
  );
}
