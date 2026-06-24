import Link from "next/link";
import { Activity, Apple, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { KpiCard } from "@/components/kpi-card";
import { FadeIn } from "@/components/animations/fade-in";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { classifyBmi, formatDate, todayISO } from "@/lib/utils";
import { StreakStrip } from "./streak-strip";
import { BmiChart } from "./bmi-chart";
import { WaterWidget } from "./water-widget";
import { HealthSummary } from "./health-summary";
import { MotivationBanner } from "@/components/motivation-banner";

export default async function ClientDashboard() {
  const user = await requireRole("client");
  const supabase = createClient();
  const today = todayISO();

  const [
    { data: streak },
    { data: latestBmi },
    { data: bmiHistory },
    { data: subscription },
    { data: waterToday },
    { data: prefs },
    { data: trainerAssign },
    { data: injuries },
    { data: healthIssuesOpen },
  ] = await Promise.all([
    supabase.from("streaks").select("current_streak,longest_streak").eq("client_id", user.id).maybeSingle(),
    supabase
      .from("bmi_logs")
      .select("bmi,weight_kg,height_cm,logged_at")
      .eq("client_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("bmi_logs")
      .select("bmi,logged_at")
      .eq("client_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(20),
    supabase
      .from("subscriptions")
      .select("end_date,status,plans:plan_id(name,kind)")
      .eq("client_id", user.id)
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("water_logs")
      .select("glasses")
      .eq("client_id", user.id)
      .eq("log_date", today)
      .maybeSingle(),
    supabase
      .from("client_preferences")
      .select("water_goal_glasses,is_vegetarian,allergies")
      .eq("client_id", user.id)
      .maybeSingle(),
    supabase
      .from("trainer_clients")
      .select("trainer_id,profiles:trainer_id(full_name,email)")
      .eq("client_id", user.id)
      .is("ended_at", null)
      .maybeSingle(),
    supabase
      .from("injuries")
      .select("id,tag")
      .eq("client_id", user.id)
      .is("resolved_at", null),
    supabase
      .from("health_issues")
      .select("id", { count: "exact" })
      .eq("client_id", user.id)
      .is("resolved_at", null),
  ]);

  const openHealthIssues = (healthIssuesOpen ?? []).length;

  const cls = latestBmi ? classifyBmi(latestBmi.bmi) : null;
  const sub = subscription as { end_date?: string; plans?: { name?: string; kind?: string } } | null;
  const trainer = trainerAssign?.profiles as { full_name?: string; email?: string } | null;
  const waterGoal = prefs?.water_goal_glasses ?? 8;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hi {user.full_name?.split(" ")[0] ?? "there"} 👋</h1>
            <p className="text-sm text-muted-foreground">
              {trainer?.full_name ? `Your coach: ${trainer.full_name}` : "No trainer assigned yet."}
              {sub?.plans?.name && ` · ${sub.plans.name} plan`}
            </p>
          </div>
          <Link href="/client/today">
            <Button variant="gradient">
              <Apple className="h-4 w-4" />
              Today&apos;s plan
            </Button>
          </Link>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Current streak"
          value={`${streak?.current_streak ?? 0}d`}
          icon="flame"
          tone="warning"
          hint={`longest ${streak?.longest_streak ?? 0}d`}
          delay={0}
        />
        <KpiCard
          label="BMI"
          value={latestBmi ? latestBmi.bmi.toFixed(1) : "—"}
          tone={cls?.tone === "good" ? "success" : cls?.tone === "warn" ? "warning" : cls?.tone === "bad" ? "danger" : "default"}
          icon="activity"
          hint={cls?.label}
          delay={0.05}
        />
        <KpiCard
          label="Water today"
          value={`${waterToday?.glasses ?? 0}/${waterGoal}`}
          icon="droplet"
          tone="success"
          delay={0.1}
        />
        <KpiCard
          label="Plan ends"
          value={sub?.end_date ? formatDate(sub.end_date) : "—"}
          icon="trophy"
          delay={0.15}
        />
      </div>

      <MotivationBanner />

      <StreakStrip current={streak?.current_streak ?? 0} clientId={user.id} />

      <HealthSummary
        vegetarian={prefs?.is_vegetarian ?? false}
        allergies={(prefs?.allergies as string[] | null) ?? []}
        injuries={(injuries ?? []) as { id: string; tag: string }[]}
        openHealthIssues={openHealthIssues}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <FadeIn delay={0.2} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">BMI trend</CardTitle>
            </CardHeader>
            <CardContent>
              <BmiChart data={(bmiHistory ?? []).slice().reverse()} />
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.25}>
          <WaterWidget clientId={user.id} initial={waterToday?.glasses ?? 0} goal={waterGoal} />
        </FadeIn>
      </div>

      <FadeIn delay={0.3}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI quick actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLink href="/client/ai-diet" label="AI diet today" icon={Apple} />
            <QuickLink href="/client/ai-workout" label="AI workout today" icon={Activity} />
            <QuickLink href="/client/grocery" label="Grocery list" icon={Apple} />
            <QuickLink href="/client/nutrition-kb" label="Nutrition KB" icon={Sparkles} />
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link href={href} className="group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow">
      <Icon className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
      <div className="mt-2 text-sm font-medium">{label}</div>
    </Link>
  );
}
