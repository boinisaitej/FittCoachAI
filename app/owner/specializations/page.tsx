import Link from "next/link";
import { Tags, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { trainerCountsBySpecializationAction } from "../users/actions";
import { SPECIALIZATIONS } from "@/lib/specializations";

export default async function SpecializationsPage() {
  await requireRole("owner");
  const counts = await trainerCountsBySpecializationAction();

  const rows = SPECIALIZATIONS.map((s) => ({ ...s, count: counts[s.value] ?? 0 }));
  const totalTrainers = rows.reduce((a, r) => a + r.count, 0);
  const inUse = rows.filter((r) => r.count > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Tags className="h-5 w-5 text-primary" />
            Specializations
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of how many trainers cover each specialty in your gym.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="h-6">
            {SPECIALIZATIONS.length} types
          </Badge>
          <Badge variant="default" className="h-6">
            {inUse} in use
          </Badge>
          <Badge variant="outline" className="h-6">
            {totalTrainers} trainers
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trainers per specialty</CardTitle>
          <CardDescription>Click any count chip to see those trainers on the Users page.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((r) => {
              const active = r.count > 0;
              return (
                <Link
                  key={r.value}
                  href={active ? `/owner/users?q=${encodeURIComponent(r.value)}` : "#"}
                  aria-disabled={!active}
                  className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-3 transition-all ${
                    active
                      ? "hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg hover:shadow-brand-500/10"
                      : "pointer-events-none opacity-70"
                  }`}
                >
                  <div className="text-2xl">{r.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{r.value}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.count === 0 ? "No trainers" : `${r.count} trainer${r.count > 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <span
                    className={`inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full px-2 text-xs font-bold ${
                      active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    {r.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
