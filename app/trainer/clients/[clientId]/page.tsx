import { notFound } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { initials, formatDate, todayISO } from "@/lib/utils";
import { DailyPlanBuilder } from "./daily-plan-builder";
import { WeekPlanBuilder } from "./week-plan-builder";
import { CheatDayButton } from "./cheat-day-button";
import { ClientNotesForm } from "./client-notes-form";
import { ClientHealthPanel, type BmiRow, type Preferences, type Injury, type HealthIssue } from "./client-health-panel";

export default async function ClientDeepPage({ params }: { params: { clientId: string } }) {
  const trainer = await requireRole("trainer");
  const supabase = createClient();

  // Confirm assignment
  const { data: assignment } = await supabase
    .from("trainer_clients")
    .select("id")
    .eq("trainer_id", trainer.id)
    .eq("client_id", params.clientId)
    .is("ended_at", null)
    .maybeSingle();
  if (!assignment) notFound();

  const today = todayISO();
  const [
    { data: client },
    { data: subscription },
    { data: plan },
    { data: completions },
    { data: bmi },
    { data: injuries },
    { data: prefs },
    { data: healthIssues },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,email,gender,dob,height_cm,weight_kg,phone")
      .eq("id", params.clientId)
      .single(),
    supabase
      .from("subscriptions")
      .select("end_date,status,plans:plan_id(name,kind)")
      .eq("client_id", params.clientId)
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("daily_plans")
      .select("id,plan_date,daily_plan_items(id,kind,title,description,quantity,position,ai_reason)")
      .eq("client_id", params.clientId)
      .eq("plan_date", today)
      .maybeSingle(),
    supabase
      .from("todo_completions")
      .select("daily_plan_item_id,status")
      .eq("client_id", params.clientId)
      .gte("completed_at", `${today}T00:00:00Z`),
    supabase
      .from("bmi_logs")
      .select("id,bmi,logged_at,weight_kg,height_cm")
      .eq("client_id", params.clientId)
      .order("logged_at", { ascending: false })
      .limit(12),
    supabase
      .from("injuries")
      .select("id,tag,severity,notes,resolved_at")
      .eq("client_id", params.clientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_preferences")
      .select("exercise_types,is_vegetarian,water_goal_glasses,allergies,ai_diet_enabled,ai_workout_enabled")
      .eq("client_id", params.clientId)
      .maybeSingle(),
    supabase
      .from("health_issues")
      .select("id,problem,severity,created_at,resolved_at")
      .eq("client_id", params.clientId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!client) notFound();

  const activeInjuries = (injuries ?? []).filter((i) => !i.resolved_at);

  const sub = subscription as { end_date?: string; status?: string; plans?: { name?: string; kind?: string } } | null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-gradient-to-br from-brand-500 to-emerald-500 text-white text-lg">
            {initials(client.full_name ?? client.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{client.full_name}</h1>
          <p className="text-sm text-muted-foreground">{client.email} · {client.phone ?? ""}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {sub?.plans?.kind && <Badge variant={sub.plans.kind === "pro" ? "default" : "secondary"}>{sub.plans.name}</Badge>}
            {sub?.end_date && <Badge variant="outline">ends {formatDate(sub.end_date)}</Badge>}
            {prefs?.is_vegetarian && <Badge variant="success">🥦 Vegetarian</Badge>}
            {(prefs?.allergies ?? []).slice(0, 3).map((a, i) => (
              <Badge key={i} variant="warning">⚠ {a}</Badge>
            ))}
            {activeInjuries.map((i) => (
              <Badge key={i.id} variant="destructive">{i.tag}</Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <CheatDayButton clientId={params.clientId} />
          <Button asChild variant="outline" size="sm">
            <a href={`/api/trainer/weekly-report/${params.clientId}`} target="_blank" rel="noopener noreferrer">
              Send weekly report
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="health">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="health">Health &amp; BMI</TabsTrigger>
          <TabsTrigger value="today">Today&apos;s plan</TabsTrigger>
          <TabsTrigger value="week">Week plan</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <ClientHealthPanel
            clientId={params.clientId}
            client={{
              full_name: client.full_name,
              gender: client.gender,
              dob: client.dob,
              height_cm: client.height_cm,
              weight_kg: client.weight_kg,
            }}
            prefs={(prefs as Preferences) ?? null}
            bmiHistory={(bmi ?? []) as BmiRow[]}
            injuries={(injuries ?? []) as Injury[]}
            healthIssues={(healthIssues ?? []) as HealthIssue[]}
          />
        </TabsContent>

        <TabsContent value="today">
          <DailyPlanBuilder
            clientId={params.clientId}
            initial={plan?.daily_plan_items ?? []}
            completions={completions ?? []}
            planId={plan?.id ?? null}
          />
        </TabsContent>

        <TabsContent value="week">
          <WeekPlanBuilder clientId={params.clientId} />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completion history</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoryTable clientId={params.clientId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <ClientNotesForm clientId={params.clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function HistoryTable({ clientId }: { clientId: string }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("todo_completions")
    .select("status,completed_at,daily_plan_item_id,daily_plan_items:daily_plan_item_id(title,kind)")
    .eq("client_id", clientId)
    .order("completed_at", { ascending: false })
    .limit(50);
  if (!data?.length) return <p className="text-sm text-muted-foreground">No history yet.</p>;
  return (
    <ul className="space-y-1 text-sm">
      {data.map((r, i) => {
        const item = r.daily_plan_items as { title: string; kind: string } | null;
        return (
          <li key={i} className="flex items-center justify-between border-b py-1 last:border-0">
            <span>{item?.title ?? "—"}</span>
            <span className="flex items-center gap-2">
              <Badge variant={r.status === "completed" ? "success" : r.status === "skipped" ? "outline" : "warning"} className="text-[10px] capitalize">
                {r.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatDate(r.completed_at)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
