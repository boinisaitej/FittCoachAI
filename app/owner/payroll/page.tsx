import { Receipt, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { PayrollExport } from "./payroll-export";

export default async function PayrollPage() {
  const owner = await requireRole("owner");
  const admin = createServiceClient();

  // Roll up: per trainer, count their active clients + sum the recent invoice
  // total of those clients' subscriptions. Commission rate is hard-coded at
  // 30 % of the client's paid invoices in the last 30 days.
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const [trainersRes, assignmentsRes, invoicesRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id,full_name,email,specialization")
      .eq("gym_id", owner.gym_id!)
      .eq("role", "trainer")
      .eq("active", true),
    admin
      .from("trainer_clients")
      .select("trainer_id,client_id")
      .is("ended_at", null),
    admin
      .from("invoices")
      .select("client_id,total_cents,status,issued_at,paid_at")
      .eq("gym_id", owner.gym_id!)
      .eq("status", "paid")
      .gte("paid_at", since),
  ]);

  type Row = {
    id: string;
    name: string | null;
    email: string | null;
    spec: string | null;
    clients: number;
    revenueCents: number;
    commissionCents: number;
  };

  const COMMISSION = 0.3;
  const byTrainer = new Map<string, Row>();
  for (const t of trainersRes.data ?? []) {
    byTrainer.set(t.id, {
      id: t.id,
      name: t.full_name,
      email: t.email,
      spec: t.specialization,
      clients: 0,
      revenueCents: 0,
      commissionCents: 0,
    });
  }
  const clientToTrainer = new Map<string, string>();
  for (const a of assignmentsRes.data ?? []) {
    clientToTrainer.set(a.client_id, a.trainer_id);
    const row = byTrainer.get(a.trainer_id);
    if (row) row.clients++;
  }
  for (const inv of invoicesRes.data ?? []) {
    const trainerId = clientToTrainer.get(inv.client_id);
    if (!trainerId) continue;
    const row = byTrainer.get(trainerId);
    if (row) row.revenueCents += inv.total_cents;
  }
  for (const row of byTrainer.values()) {
    row.commissionCents = Math.round(row.revenueCents * COMMISSION);
  }

  const rows = Array.from(byTrainer.values()).sort((a, b) => b.commissionCents - a.commissionCents);
  const totalRevenue = rows.reduce((s, r) => s + r.revenueCents, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commissionCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Receipt className="h-5 w-5 text-primary" />
            Trainer payroll
          </h1>
          <p className="text-sm text-muted-foreground">
            Commission @ 30 % of paid invoices in the last 30 days, attributed to each trainer&apos;s active clients.
          </p>
        </div>
        <PayrollExport rows={rows} period={`Last 30 days · 30% commission`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Trainers" value={String(rows.length)} icon={<Users className="h-3 w-3" />} />
        <Stat label="Attributed revenue (30d)" value={formatCurrency(totalRevenue)} />
        <Stat label="Total commission due" value={formatCurrency(totalCommission)} tone="emerald" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Per-trainer breakdown</CardTitle>
          <CardDescription>Sorted by commission. Download the CSV above to feed into accounting.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active trainers.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pl-2">Trainer</th>
                    <th className="py-2">Specialization</th>
                    <th className="py-2 text-right">Clients</th>
                    <th className="py-2 text-right">Revenue (30d)</th>
                    <th className="py-2 pr-2 text-right">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pl-2">
                        <div className="font-medium">{r.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="py-2">{r.spec ?? "—"}</td>
                      <td className="py-2 text-right tabular-nums">{r.clients}</td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(r.revenueCents)}</td>
                      <td className="py-2 pr-2 text-right">
                        <Badge variant="success" className="tabular-nums">
                          {formatCurrency(r.commissionCents)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "emerald";
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`mt-1 text-xl font-bold tabular-nums ${
          tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
