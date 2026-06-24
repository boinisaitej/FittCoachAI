import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { AddSloganForm } from "./add-slogan-form";

export default async function SlogansPage() {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const { data: slogans } = await supabase
    .from("slogans")
    .select("id,text,source,active,gym_id")
    .or(`gym_id.is.null,gym_id.eq.${owner.gym_id}`)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Slogans</h1>
        <p className="text-sm text-muted-foreground">Animated strip on every page. Mix defaults + AI + your own.</p>
      </div>

      <AddSloganForm gymId={owner.gym_id!} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All slogans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(slogans ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="text-sm">{s.text}</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{s.source}</Badge>
                {s.gym_id ? (
                  <Badge variant="secondary">Yours</Badge>
                ) : (
                  <Badge>Global</Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
