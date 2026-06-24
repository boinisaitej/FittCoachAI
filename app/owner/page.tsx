import Link from "next/link";
import {
  Megaphone,
  Trophy,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { FadeIn } from "@/components/animations/fade-in";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function OwnerConsole() {
  const user = await requireRole("owner");
  const supabase = createClient();

  const [
    { count: clientsCount },
    { count: trainersCount },
    { count: activeSubs },
    { data: recentInvoices },
    { count: pendingAlerts },
    { data: announcements },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("gym_id", user.gym_id).eq("role", "client"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("gym_id", user.gym_id).eq("role", "trainer"),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("invoices")
      .select("id,invoice_number,total_cents,currency,client_id,issued_at,status,profiles:client_id(full_name)")
      .eq("gym_id", user.gym_id!)
      .order("issued_at", { ascending: false })
      .limit(5),
    supabase.from("trainer_alerts").select("*", { count: "exact", head: true }).is("resolved_at", null),
    supabase
      .from("announcements")
      .select("id,title,scheduled_for,sent_at")
      .eq("gym_id", user.gym_id!)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const revenue =
    (recentInvoices ?? []).reduce((acc, i) => acc + (i.status === "paid" ? i.total_cents : 0), 0);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Owner Console</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user.full_name}. Here&apos;s your gym at a glance.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/owner/users?create=trainer">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Trainer
              </Button>
            </Link>
            <Link href="/owner/users?create=client">
              <Button variant="gradient" size="sm">
                <Plus className="h-4 w-4" />
                Client
              </Button>
            </Link>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Clients" value={clientsCount ?? 0} icon="users" hint="active members" delay={0} />
        <KpiCard label="Trainers" value={trainersCount ?? 0} icon="activity" tone="success" delay={0.05} />
        <KpiCard label="Active subs" value={activeSubs ?? 0} icon="trending-up" tone="success" delay={0.1} />
        <KpiCard label="Recent paid" value={formatCurrency(revenue)} icon="credit-card" tone="success" delay={0.15} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent invoices</CardTitle>
              <Link href="/owner/invoices" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {(recentInvoices ?? []).length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
              {(recentInvoices ?? []).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <div>
                    <div className="text-sm font-medium">{inv.invoice_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {(inv.profiles as { full_name?: string } | null)?.full_name ?? "—"} ·{" "}
                      {formatDate(inv.issued_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">
                      {formatCurrency(inv.total_cents, inv.currency)}
                    </div>
                    <Badge variant={inv.status === "paid" ? "success" : "outline"} className="mt-1">
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.25}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Announcements</CardTitle>
              <Link href="/owner/announcements" className="text-xs text-primary hover:underline">
                Create
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {(announcements ?? []).length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
              {(announcements ?? []).map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Megaphone className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.sent_at ? `Sent ${formatDate(a.sent_at)}` : a.scheduled_for ? `Scheduled ${formatDate(a.scheduled_for)}` : "Draft"}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.3}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Open alerts
            </CardTitle>
            <Badge variant="warning">{pendingAlerts ?? 0}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {pendingAlerts ?? 0} client alerts are pending trainer attention. Trainers see them in their dashboard.
            </p>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.35}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Numbered next steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: "/owner/users?create=trainer", title: "1. Create trainers", desc: "Specialization, type, welcome email." },
                { href: "/owner/users?create=client", title: "2. Create clients", desc: "Profile, gender, plan." },
                { href: "/owner/assignments", title: "3. Assign trainers", desc: "Auto-match or pick manually." },
                { href: "/owner/plans", title: "4. Tune plans", desc: "Basic & Pro pricing + discounts." },
                { href: "/owner/invoices", title: "5. Issue invoices", desc: "GST-aware sequential numbering." },
                { href: "/owner/announcements", title: "6. Send announcements", desc: "Schedule + audience." },
                { href: "/owner/slogans", title: "7. Brand slogans", desc: "Default + AI + your own." },
                { href: "/account", title: "8. Profile & gym info", desc: "Edit gym name + address." },
              ].map((s) => (
                <Link
                  key={s.title}
                  href={s.href}
                  className="rounded-lg border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow"
                >
                  <Trophy className="mb-1 h-4 w-4 text-primary" />
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </Link>
              ))}
            </ol>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
