import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { classifyBmi, formatDate } from "@/lib/utils";
import { BmiForm } from "./bmi-form";
import { BmiChart } from "../bmi-chart";

export default async function BmiPage() {
  const user = await requireRole("client");
  const supabase = createClient();
  const { data: logs } = await supabase
    .from("bmi_logs")
    .select("id,bmi,height_cm,weight_kg,logged_at")
    .eq("client_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(30);

  const latest = logs?.[0];
  const previous = logs?.[1];
  const delta = latest && previous ? (latest.bmi - previous.bmi).toFixed(2) : null;
  const cls = latest ? classifyBmi(latest.bmi) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">BMI</h1>
          <p className="text-sm text-muted-foreground">Track weight and body mass index.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Log new</CardTitle>
          </CardHeader>
          <CardContent>
            <BmiForm clientId={user.id} />
            {latest && (
              <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="font-semibold">Latest: {latest.bmi.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">
                  {latest.weight_kg} kg · {latest.height_cm} cm · {formatDate(latest.logged_at)}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {cls && <Badge variant={cls.tone === "good" ? "success" : cls.tone === "warn" ? "warning" : "destructive"}>{cls.label}</Badge>}
                  {delta && (
                    <span className={parseFloat(delta) >= 0 ? "text-rose-600" : "text-emerald-600"}>
                      {parseFloat(delta) >= 0 ? "+" : ""}{delta} vs previous
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <BmiChart data={(logs ?? []).slice().reverse()} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All logs</CardTitle>
        </CardHeader>
        <CardContent>
          {(logs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {logs!.map((l) => (
                <li key={l.id} className="flex items-center justify-between border-b py-2 last:border-0">
                  <span>{formatDate(l.logged_at, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="font-mono tabular-nums">{l.weight_kg} kg · {l.height_cm} cm · {l.bmi.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
