import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTimeIST } from "@/lib/utils";
import { JunkForm } from "./junk-form";

export default async function JunkPage() {
  const user = await requireRole("client");
  const supabase = createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const { data: logs } = await supabase
    .from("junk_food_logs")
    .select("id,item,quantity,log_date,created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const last7 = (logs ?? []).filter((l) => l.log_date >= sevenDaysAgo);
  const overThreshold = last7.length >= 5;

  // Group by date
  const grouped: Record<string, typeof last7> = {};
  for (const l of logs ?? []) {
    (grouped[l.log_date] ??= []).push(l);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Junk-food log</h1>
          <p className="text-sm text-muted-foreground">
            Track your slip-ups honestly — your trainer is notified at 5+ in 7 days.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={overThreshold ? "destructive" : "outline"} className="h-7 text-xs">
            {last7.length} in last 7 days
          </Badge>
          <Badge variant="secondary" className="h-7 text-xs">
            {(logs ?? []).length} total
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Log a slip</CardTitle>
            <CardDescription>What did you eat & how much?</CardDescription>
          </CardHeader>
          <CardContent>
            <JunkForm />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
            <CardDescription>Grouped by day, most recent first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(grouped).length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries yet. You&apos;re on track. 🎉</p>
            ) : (
              Object.entries(grouped).map(([date, rows]) => (
                <div key={date}>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {formatDate(date)} · {rows.length} item{rows.length > 1 ? "s" : ""}
                  </div>
                  <ul className="space-y-1">
                    {rows.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm"
                      >
                        <span className="truncate">
                          🍔 <span className="font-medium">{r.item}</span>
                          {r.quantity ? (
                            <span className="ml-1 text-muted-foreground">· {r.quantity}</span>
                          ) : null}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatTimeIST(r.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
