import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KpiCard } from "@/components/kpi-card";
import { FadeIn } from "@/components/animations/fade-in";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { initials, todayISO } from "@/lib/utils";

export default async function TrainerDashboard() {
  const user = await requireRole("trainer");
  const supabase = createClient();
  const today = todayISO();

  const [{ data: clients }, { data: alerts }] = await Promise.all([
    supabase
      .from("trainer_clients")
      .select("client_id, profiles:client_id(id,full_name,email,avatar_url,active,gender)")
      .eq("trainer_id", user.id)
      .is("ended_at", null),
    supabase
      .from("trainer_alerts")
      .select("id,kind,client_id,created_at,payload,profiles:client_id(full_name)")
      .eq("trainer_id", user.id)
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const ids = (clients ?? []).map((c) => c.client_id);

  const [{ data: todayItems }, { data: todayCompletions }] = await Promise.all([
    ids.length
      ? supabase
          .from("daily_plans")
          .select("id,client_id,daily_plan_items(id)")
          .eq("plan_date", today)
          .in("client_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase
          .from("todo_completions")
          .select("client_id,status,completed_at")
          .gte("completed_at", `${today}T00:00:00Z`)
          .in("client_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const completionByClient = new Map<string, { done: number; total: number }>();
  for (const c of clients ?? []) {
    const plan = (todayItems ?? []).find((p) => p.client_id === c.client_id);
    const total = plan?.daily_plan_items?.length ?? 0;
    const done = (todayCompletions ?? []).filter((t) => t.client_id === c.client_id && t.status === "completed").length;
    completionByClient.set(c.client_id, { done, total });
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-3xl font-bold">Hello, Coach {user.full_name?.split(" ")[0] ?? ""}</h1>
          <p className="text-sm text-muted-foreground">{ids.length} active clients · {(alerts ?? []).length} open alerts</p>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active clients" value={ids.length} icon="users" delay={0} />
        <KpiCard
          label="Today's adherence"
          value={(() => {
            const totalTodos = Array.from(completionByClient.values()).reduce((a, b) => a + b.total, 0);
            const totalDone = Array.from(completionByClient.values()).reduce((a, b) => a + b.done, 0);
            return totalTodos === 0 ? "—" : `${Math.round((totalDone * 100) / totalTodos)}%`;
          })()}
          icon="clipboard"
          tone="success"
          delay={0.05}
        />
        <KpiCard label="Open alerts" value={(alerts ?? []).length} icon="alert" tone="warning" delay={0.1} />
        <KpiCard label="Unread chats" value={0} icon="message" delay={0.15} hint="real-time" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FadeIn delay={0.2} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today&apos;s clients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(clients ?? []).map((row) => {
                const c = row.profiles as { id: string; full_name: string | null; email: string | null; gender: string | null };
                const stats = completionByClient.get(c.id) ?? { done: 0, total: 0 };
                const pct = stats.total ? Math.round((stats.done * 100) / stats.total) : 0;
                return (
                  <Link
                    key={c.id}
                    href={`/trainer/clients/${c.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-gradient-to-br from-brand-500 to-emerald-500 text-white text-xs">
                        {initials(c.full_name ?? c.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{c.full_name}</span>
                        <span className="text-xs text-muted-foreground">{stats.done}/{stats.total || "—"}</span>
                      </div>
                      <Progress value={pct} className="mt-1 h-1.5" />
                    </div>
                  </Link>
                );
              })}
              {(clients ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No clients assigned yet. Ask the owner to assign you on the Assignments page.</p>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.25}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(alerts ?? []).length === 0 && <p className="text-sm text-muted-foreground">All clear.</p>}
              {(alerts ?? []).map((a) => {
                const p = a.profiles as { full_name?: string } | null;
                return (
                  <Link key={a.id} href={`/trainer/clients/${a.client_id}`} className="block rounded-lg border p-2 transition-colors hover:bg-muted/40">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{p?.full_name}</span>
                      <Badge variant={a.kind === "severe_health" ? "destructive" : "warning"} className="text-[10px] capitalize">
                        {a.kind.replace("_", " ")}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
