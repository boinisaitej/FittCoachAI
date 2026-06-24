import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  ClipboardCheck,
  DollarSign,
  Heart,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KpiCard } from "@/components/kpi-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FadeIn } from "@/components/animations/fade-in";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

export default async function OwnerAnalyticsPage() {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const last30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const prev30 = new Date(Date.now() - 60 * 86400000).toISOString();

  const [
    clientsRes,
    trainersRes,
    activeSubsRes,
    paidThisMonthRes,
    paidPrevMonthRes,
    invoicesYtdRes,
    expiringRes,
    inactiveRes,
    plansRes,
    topTrainersRes,
    leadStagesRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,active,created_at")
      .eq("gym_id", owner.gym_id!)
      .eq("role", "client"),
    supabase
      .from("profiles")
      .select("id,active")
      .eq("gym_id", owner.gym_id!)
      .eq("role", "trainer"),
    supabase
      .from("subscriptions")
      .select("id,end_date,client_id,plans:plan_id(price_cents,kind)")
      .eq("status", "active"),
    supabase
      .from("invoices")
      .select("total_cents,status,issued_at")
      .eq("gym_id", owner.gym_id!)
      .gte("issued_at", thisMonthStart),
    supabase
      .from("invoices")
      .select("total_cents,status,issued_at")
      .eq("gym_id", owner.gym_id!)
      .gte("issued_at", lastMonthStart)
      .lt("issued_at", thisMonthStart),
    supabase
      .from("invoices")
      .select("total_cents,status,issued_at")
      .eq("gym_id", owner.gym_id!)
      .gte("issued_at", new Date(now.getFullYear(), 0, 1).toISOString()),
    supabase
      .from("subscriptions")
      .select("client_id,end_date,profiles:client_id(full_name,email)")
      .eq("status", "active")
      .lte("end_date", new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
      .order("end_date", { ascending: true })
      .limit(8),
    supabase
      .from("profiles")
      .select("id,full_name,email,created_at")
      .eq("gym_id", owner.gym_id!)
      .eq("role", "client")
      .eq("active", false)
      .limit(8),
    supabase.from("plans").select("id,kind,name,price_cents").eq("gym_id", owner.gym_id!),
    supabase
      .from("trainer_clients")
      .select("trainer_id, profiles:trainer_id(full_name,email,specialization)")
      .is("ended_at", null),
    supabase
      .from("leads")
      .select("stage")
      .eq("gym_id", owner.gym_id!),
  ]);

  const clients = clientsRes.data ?? [];
  const trainers = trainersRes.data ?? [];
  const subs = activeSubsRes.data ?? [];
  const paidThisMonth = (paidThisMonthRes.data ?? []).filter((i) => i.status === "paid");
  const paidPrevMonth = (paidPrevMonthRes.data ?? []).filter((i) => i.status === "paid");
  const invoicesYtd = (invoicesYtdRes.data ?? []).filter((i) => i.status === "paid");
  const expiring = expiringRes.data ?? [];
  const inactive = inactiveRes.data ?? [];

  const mrr = subs.reduce(
    (sum, s) => sum + ((s.plans as { price_cents?: number } | null)?.price_cents ?? 0),
    0
  );
  const revenueThisMonth = paidThisMonth.reduce((s, i) => s + i.total_cents, 0);
  const revenuePrevMonth = paidPrevMonth.reduce((s, i) => s + i.total_cents, 0);
  const revenueDelta =
    revenuePrevMonth > 0
      ? Math.round(((revenueThisMonth - revenuePrevMonth) * 100) / revenuePrevMonth)
      : 0;
  const ytdRevenue = invoicesYtd.reduce((s, i) => s + i.total_cents, 0);

  const newThisMonth = clients.filter((c) => c.created_at >= thisMonthStart).length;
  const newLast30 = clients.filter((c) => c.created_at >= last30).length;
  const newPrev30 = clients.filter((c) => c.created_at >= prev30 && c.created_at < last30).length;

  // Churn = clients that became inactive in last 30 days / total active 30 days ago
  const totalActive = clients.filter((c) => c.active).length;
  const churnRate = totalActive > 0 ? Math.round((inactive.length * 100) / (totalActive + inactive.length)) : 0;

  // Top trainers by active client count
  const trainerLoad = new Map<string, { trainer: { full_name: string | null; email: string | null; specialization: string | null }; count: number }>();
  for (const r of topTrainersRes.data ?? []) {
    const t = r.profiles as { full_name: string | null; email: string | null; specialization: string | null } | null;
    if (!t) continue;
    const cur = trainerLoad.get(r.trainer_id);
    trainerLoad.set(r.trainer_id, { trainer: t, count: (cur?.count ?? 0) + 1 });
  }
  const topTrainers = Array.from(trainerLoad.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Lead funnel
  const leadStages = (leadStagesRes.data ?? []) as { stage: "new" | "trial" | "paid" | "lost" }[];
  const leadCount = {
    new: leadStages.filter((l) => l.stage === "new").length,
    trial: leadStages.filter((l) => l.stage === "trial").length,
    paid: leadStages.filter((l) => l.stage === "paid").length,
    lost: leadStages.filter((l) => l.stage === "lost").length,
  };
  const leadTotal = leadStages.length;
  const conversionRate = leadTotal > 0 ? Math.round((leadCount.paid * 100) / leadTotal) : 0;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold">Gym analytics</h1>
          <p className="text-sm text-muted-foreground">
            Monthly recurring revenue, retention, lead funnel, top trainers — all updated live.
          </p>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="MRR"
          value={formatCurrency(mrr)}
          icon="credit-card"
          tone="success"
          hint={`${subs.length} active subs`}
          delay={0}
        />
        <KpiCard
          label="This month revenue"
          value={formatCurrency(revenueThisMonth)}
          icon="trending-up"
          tone={revenueDelta >= 0 ? "success" : "danger"}
          delta={revenueDelta}
          hint="paid invoices"
          delay={0.05}
        />
        <KpiCard
          label="Active clients"
          value={totalActive}
          icon="users"
          hint={`${newThisMonth} new this month`}
          delay={0.1}
        />
        <KpiCard
          label="Churn rate (30d)"
          value={`${churnRate}%`}
          icon="alert"
          tone={churnRate > 10 ? "danger" : churnRate > 5 ? "warning" : "success"}
          hint={`${inactive.length} deactivated`}
          delay={0.15}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              YTD revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatCurrency(ytdRevenue)}</div>
            <p className="text-[11px] text-muted-foreground">paid this year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <UserPlus className="h-3 w-3" />
              New clients (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold tabular-nums">{newLast30}</div>
              <Badge variant={newLast30 >= newPrev30 ? "success" : "warning"} className="gap-0.5 text-[10px]">
                {newLast30 >= newPrev30 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                vs {newPrev30} prev
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Users className="h-3 w-3" />
              Trainers active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{trainers.filter((t) => t.active).length}</div>
            <p className="text-[11px] text-muted-foreground">of {trainers.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Lead conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{conversionRate}%</div>
            <p className="text-[11px] text-muted-foreground">paid / total leads</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FadeIn delay={0.2} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4 text-primary" />
                Top trainers by client load
              </CardTitle>
              <CardDescription>Active trainer ↔ client assignments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {topTrainers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignments yet.</p>
              ) : (
                topTrainers.map(({ trainer, count }, i) => {
                  const pct = Math.round((count * 100) / (topTrainers[0]?.count ?? 1));
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-xs text-white">
                          {initials(trainer.full_name ?? trainer.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="truncate text-sm font-medium">{trainer.full_name ?? "—"}</div>
                          <span className="text-xs tabular-nums text-muted-foreground">{count} clients</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{trainer.specialization ?? "—"}</div>
                        <Progress value={pct} className="mt-1.5 h-1.5" />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.25}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                Lead funnel
              </CardTitle>
              <CardDescription>Walk-in → trial → paid</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <FunnelRow label="New" value={leadCount.new} total={leadTotal} tone="default" />
              <FunnelRow label="Trial" value={leadCount.trial} total={leadTotal} tone="warning" />
              <FunnelRow label="Paid" value={leadCount.paid} total={leadTotal} tone="success" />
              <FunnelRow label="Lost" value={leadCount.lost} total={leadTotal} tone="danger" />
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.3}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-4 w-4 text-rose-500" />
                Expiring in next 7 days
              </CardTitle>
              <CardDescription>Reach out before they lapse.</CardDescription>
            </CardHeader>
            <CardContent>
              {expiring.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscriptions expiring soon.</p>
              ) : (
                <ul className="space-y-1.5">
                  {expiring.map((s, i) => {
                    const c = s.profiles as { full_name?: string; email?: string } | null;
                    return (
                      <li key={i} className="flex items-center justify-between rounded-md border p-2 text-sm">
                        <div>
                          <div className="font-medium">{c?.full_name}</div>
                          <div className="text-xs text-muted-foreground">{c?.email}</div>
                        </div>
                        <Badge variant="warning" className="text-[10px]">
                          {formatDate(s.end_date)}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.35}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserMinus className="h-4 w-4 text-muted-foreground" />
                Recently deactivated
              </CardTitle>
              <CardDescription>Reactivate or run a win-back.</CardDescription>
            </CardHeader>
            <CardContent>
              {inactive.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deactivated clients.</p>
              ) : (
                <ul className="space-y-1.5">
                  {inactive.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <div>
                        <div className="font-medium">{c.full_name}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.4}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Plan catalogue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {(plansRes.data ?? []).map((p) => (
                <div key={p.id} className="rounded-lg border bg-card p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {p.kind}
                  </div>
                  <div className="mt-1 text-lg font-semibold">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{formatCurrency(p.price_cents)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

function FunnelRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "default" | "warning" | "success" | "danger";
}) {
  const pct = total > 0 ? Math.round((value * 100) / total) : 0;
  const cls = {
    default: "bg-primary/15 text-primary",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    danger: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  }[tone];
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${cls}`}>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value} · {pct}%
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
