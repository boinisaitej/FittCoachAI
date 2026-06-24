import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FadeIn } from "@/components/animations/fade-in";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { TodoItem } from "./todo-item";

export default async function TodayPage() {
  const user = await requireRole("client");
  const supabase = createClient();
  const today = todayISO();

  const [{ data: plan }, { data: cheat }] = await Promise.all([
    supabase
      .from("daily_plans")
      .select("id,plan_date,daily_plan_items(id,kind,title,description,quantity,ai_reason,position)")
      .eq("client_id", user.id)
      .eq("plan_date", today)
      .maybeSingle(),
    supabase
      .from("cheat_days")
      .select("reason")
      .eq("client_id", user.id)
      .eq("cheat_date", today)
      .maybeSingle(),
  ]);

  const items = (plan?.daily_plan_items ?? []).sort((a, b) => a.position - b.position);

  const { data: completions } = await supabase
    .from("todo_completions")
    .select("daily_plan_item_id,status,completed_at")
    .eq("client_id", user.id)
    .in("daily_plan_item_id", items.map((i) => i.id));

  const statusOf = new Map((completions ?? []).map((c) => [c.daily_plan_item_id, c.status]));
  const completed = items.filter((i) => statusOf.get(i.id) === "completed").length;
  const pct = items.length ? Math.round((completed * 100) / items.length) : 0;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Today</h1>
            <p className="text-sm text-muted-foreground">{items.length} items · {completed} done</p>
          </div>
          {cheat && <Badge variant="warning">🎉 Cheat day{cheat.reason ? `: ${cheat.reason}` : ""}</Badge>}
        </div>
      </FadeIn>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={pct} />
          <p className="mt-2 text-xs text-muted-foreground">{pct}% complete</p>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No plan for today yet. Your trainer will add one — or generate an AI plan.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-2 p-4">
            {items.map((it, i) => (
              <TodoItem key={it.id} item={it} status={statusOf.get(it.id) ?? null} delay={i * 0.04} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
