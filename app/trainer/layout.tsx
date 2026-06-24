import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { trainerNav } from "@/components/shell/nav-config";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("trainer");
  return (
    <AppShell user={user} nav={trainerNav}>
      {children}
    </AppShell>
  );
}
