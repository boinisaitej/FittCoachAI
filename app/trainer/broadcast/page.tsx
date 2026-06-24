import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BroadcastForm } from "./broadcast-form";

export default async function BroadcastPage() {
  const trainer = await requireRole("trainer");
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("trainer_clients")
    .select("client_id,profiles:client_id(id,full_name,email,active)")
    .eq("trainer_id", trainer.id)
    .is("ended_at", null);

  const list = (clients ?? [])
    .map((c) => c.profiles as { id: string; full_name: string | null; email: string | null; active: boolean })
    .filter(Boolean)
    .filter((c) => c.active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Broadcast</h1>
        <p className="text-sm text-muted-foreground">Send the same message to all your clients at once.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audience</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{list.length} active clients will receive your broadcast.</p>
        </CardContent>
      </Card>
      <BroadcastForm clientCount={list.length} />
    </div>
  );
}
