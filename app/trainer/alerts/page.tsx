import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { ResolveAlertButton } from "./resolve-alert-button";

export default async function AlertsPage() {
  const trainer = await requireRole("trainer");
  const supabase = createClient();
  const { data: alerts } = await supabase
    .from("trainer_alerts")
    .select("id,kind,payload,resolved_at,created_at,client_id,profiles:client_id(full_name,email)")
    .eq("trainer_id", trainer.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-sm text-muted-foreground">Issues your clients have flagged or the system has detected.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(alerts ?? []).length === 0 && <p className="text-sm text-muted-foreground">All clear.</p>}
          {(alerts ?? []).map((a) => {
            const c = a.profiles as { full_name?: string; email?: string } | null;
            return (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <Link href={`/trainer/clients/${a.client_id}`} className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={a.kind === "severe_health" ? "destructive" : "warning"} className="text-[10px] capitalize">
                      {a.kind.replace("_", " ")}
                    </Badge>
                    <span className="font-medium">{c?.full_name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c?.email} · {formatDate(a.created_at)}</p>
                </Link>
                {a.resolved_at ? (
                  <Badge variant="success">Resolved</Badge>
                ) : (
                  <ResolveAlertButton id={a.id} />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
