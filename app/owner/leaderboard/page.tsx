import { Crown, Star, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils";

export default async function LeaderboardPage() {
  const owner = await requireRole("owner");
  const admin = createServiceClient();

  const { data: trainers } = await admin
    .from("profiles")
    .select("id,full_name,email,specialization,trainer_type")
    .eq("gym_id", owner.gym_id!)
    .eq("role", "trainer")
    .eq("active", true);

  const trainerIds = (trainers ?? []).map((t) => t.id);
  const [ratingsRes, loadRes] = await Promise.all([
    trainerIds.length
      ? admin.from("ratings").select("ratee_id,stars").in("ratee_id", trainerIds)
      : Promise.resolve({ data: [] }),
    trainerIds.length
      ? admin.from("trainer_clients").select("trainer_id").is("ended_at", null).in("trainer_id", trainerIds)
      : Promise.resolve({ data: [] }),
  ]);

  type Row = {
    id: string;
    name: string | null;
    email: string | null;
    spec: string | null;
    type: string | null;
    avg: number;
    count: number;
    clients: number;
  };

  const byId = new Map<string, Row>();
  for (const t of trainers ?? []) {
    byId.set(t.id, {
      id: t.id,
      name: t.full_name,
      email: t.email,
      spec: t.specialization,
      type: t.trainer_type,
      avg: 0,
      count: 0,
      clients: 0,
    });
  }
  for (const r of ratingsRes.data ?? []) {
    const row = byId.get(r.ratee_id);
    if (!row) continue;
    row.avg = (row.avg * row.count + r.stars) / (row.count + 1);
    row.count++;
  }
  for (const l of loadRes.data ?? []) {
    const row = byId.get(l.trainer_id);
    if (row) row.clients++;
  }

  const ranked = Array.from(byId.values()).sort((a, b) => {
    if (b.avg !== a.avg) return b.avg - a.avg;
    if (b.count !== a.count) return b.count - a.count;
    return b.clients - a.clients;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Crown className="h-5 w-5 text-amber-500" />
          Trainer leaderboard
        </h1>
        <p className="text-sm text-muted-foreground">Ranked by average weekly rating, then number of ratings, then client load.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trainers yet.</p>
          ) : (
            <ol className="space-y-2">
              {ranked.map((t, idx) => (
                <li key={t.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-white shadow">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-xs text-white">
                      {initials(t.name ?? t.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{t.name ?? "—"}</span>
                      {t.spec && <Badge variant="outline" className="text-[10px]">{t.spec}</Badge>}
                      {t.type && <Badge variant="secondary" className="text-[10px] capitalize">{t.type}</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {t.count > 0 ? t.avg.toFixed(2) : "—"}{" "}
                        <span className="text-muted-foreground/70">({t.count} rating{t.count === 1 ? "" : "s"})</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {t.clients} active client{t.clients === 1 ? "" : "s"}
                      </span>
                    </div>
                    <Progress
                      value={t.count > 0 ? Math.round((t.avg * 100) / 5) : 0}
                      className="mt-1.5 h-1.5"
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
