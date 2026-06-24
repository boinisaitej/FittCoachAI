import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils";
import { AssignmentRow } from "./assignment-row";
import { AutoMatchButton } from "./auto-match-button";

export default async function AssignmentsPage() {
  const owner = await requireRole("owner");
  const supabase = createClient();

  const [{ data: clients }, { data: trainers }, { data: assignments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,gender,email")
      .eq("gym_id", owner.gym_id!)
      .eq("role", "client")
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("profiles")
      .select("id,full_name,trainer_type,gender,specialization")
      .eq("gym_id", owner.gym_id!)
      .eq("role", "trainer")
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("trainer_clients")
      .select("client_id,trainer_id")
      .is("ended_at", null),
  ]);

  const activeMap = new Map((assignments ?? []).map((a) => [a.client_id, a.trainer_id]));
  const trainerLoad = new Map<string, number>();
  (assignments ?? []).forEach((a) => trainerLoad.set(a.trainer_id, (trainerLoad.get(a.trainer_id) ?? 0) + 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trainer ↔ Client</h1>
          <p className="text-sm text-muted-foreground">Auto-match by gender / plan, or assign manually.</p>
        </div>
        <AutoMatchButton />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(clients ?? []).map((c) => (
                  <AssignmentRow
                    key={c.id}
                    client={c}
                    trainers={trainers ?? []}
                    currentTrainerId={activeMap.get(c.id) ?? null}
                  />
                ))}
                {(clients ?? []).length === 0 && <p className="text-sm text-muted-foreground">No clients yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="text-base">Trainer load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(trainers ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border p-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-gradient-to-br from-brand-500 to-emerald-500 text-white text-[10px]">
                      {initials(t.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{t.full_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {t.trainer_type ?? "general"} · {t.gender ?? "—"}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">{trainerLoad.get(t.id) ?? 0} clients</Badge>
              </div>
            ))}
            {(trainers ?? []).length === 0 && <p className="text-sm text-muted-foreground">No trainers yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
