import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { SleepForm } from "./sleep-form";

export default async function SleepPage() {
  const user = await requireRole("client");
  const supabase = createClient();
  const { data: logs } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("client_id", user.id)
    .order("log_date", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sleep tracker</h1>
        <p className="text-sm text-muted-foreground">Log hours so we can recommend better recovery.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tonight&apos;s log</CardTitle>
          </CardHeader>
          <CardContent>
            <SleepForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent>
            {(logs ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
            <ul className="space-y-1">
              {(logs ?? []).map((l) => (
                <li key={l.id} className="flex justify-between border-b py-1 last:border-0 text-sm">
                  <span>{formatDate(l.log_date)}</span>
                  <span className={l.hours < 6 ? "text-rose-600 font-semibold" : ""}>{l.hours} h</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
