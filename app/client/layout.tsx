import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { clientNav } from "@/components/shell/nav-config";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("client");
  return (
    <AppShell user={user} nav={clientNav}>
      {children}
    </AppShell>
  );
}
