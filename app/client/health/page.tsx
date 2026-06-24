import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { HealthForm } from "./health-form";
import { InjuriesPanel } from "./injuries-panel";

export default async function HealthPage() {
  const user = await requireRole("client");
  const supabase = createClient();
  const [{ data: issues }, { data: injuries }] = await Promise.all([
    supabase
      .from("health_issues")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("injuries")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Health & Injuries</h1>
        <p className="text-sm text-muted-foreground">Tell your trainer (and the AI) about issues so plans adapt.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report an issue</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthForm />
          </CardContent>
        </Card>

        <InjuriesPanel injuries={injuries ?? []} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(issues ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
          {(issues ?? []).map((iss) => (
            <details key={iss.id} className="rounded-lg border p-3">
              <summary className="flex cursor-pointer items-center justify-between">
                <span className="font-medium">{iss.problem}</span>
                <span className="flex items-center gap-2">
                  <Badge variant={iss.severity === "severe" ? "destructive" : iss.severity === "moderate" ? "warning" : "outline"} className="capitalize">{iss.severity}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(iss.created_at)}</span>
                </span>
              </summary>
              <div className="mt-2 grid gap-3 text-sm md:grid-cols-3">
                <Block title="Foods" items={(iss.ai_foods as { name: string; reason: string }[] | null) ?? []} />
                <Block title="Exercises" items={(iss.ai_exercises as { name: string; reason: string }[] | null) ?? []} />
                <Block title="Tips" items={((iss.ai_tips as string[] | null) ?? []).map((t) => ({ name: t, reason: "" }))} />
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Block({ title, items }: { title: string; items: { name: string; reason: string }[] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      <ul className="space-y-1">
        {items.length === 0 && <li className="text-xs text-muted-foreground">—</li>}
        {items.map((it, i) => (
          <li key={i} className="rounded border bg-muted/30 p-2">
            <div className="text-sm">{it.name}</div>
            {it.reason && <div className="text-xs text-muted-foreground">{it.reason}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
