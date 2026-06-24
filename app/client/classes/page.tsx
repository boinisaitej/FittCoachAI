import { CalendarDays, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { formatDate, formatTimeIST } from "@/lib/utils";
import { BookButton } from "./book-button";

export default async function ClientClassesPage() {
  const user = await requireRole("client");
  const supabase = createClient();
  const admin = createServiceClient();

  const { data: classes } = await supabase
    .from("gym_classes")
    .select("id,title,category,trainer_id,start_at,end_at,capacity,status,notes")
    .gte("start_at", new Date().toISOString())
    .neq("status", "cancelled")
    .order("start_at", { ascending: true })
    .limit(50);

  const classIds = (classes ?? []).map((c) => c.id);
  const trainerIds = Array.from(new Set((classes ?? []).map((c) => c.trainer_id).filter(Boolean) as string[]));

  const [bookingsRes, myBookingsRes, trainersRes] = await Promise.all([
    classIds.length > 0
      ? admin
          .from("class_bookings")
          .select("class_id,status")
          .in("class_id", classIds)
          .in("status", ["confirmed", "waitlist", "attended"])
      : Promise.resolve({ data: [] }),
    classIds.length > 0
      ? admin
          .from("class_bookings")
          .select("class_id,status")
          .in("class_id", classIds)
          .eq("client_id", user.id)
      : Promise.resolve({ data: [] }),
    trainerIds.length > 0
      ? admin.from("profiles").select("id,full_name,specialization").in("id", trainerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const counts = new Map<string, number>();
  for (const b of bookingsRes.data ?? []) {
    counts.set(b.class_id, (counts.get(b.class_id) ?? 0) + 1);
  }
  const mine = new Map<string, string>();
  for (const b of myBookingsRes.data ?? []) {
    mine.set(b.class_id, b.status);
  }
  const trainerMap = new Map(
    (trainersRes.data ?? []).map((t) => [t.id, { name: t.full_name, spec: t.specialization }])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Group classes</h1>
        <p className="text-sm text-muted-foreground">Book a slot. Full classes go to the waitlist — you&apos;ll be promoted automatically.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upcoming</CardTitle>
        </CardHeader>
        <CardContent>
          {(classes ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming classes scheduled.</p>
          ) : (
            <ul className="space-y-2">
              {classes!.map((c) => {
                const t = c.trainer_id ? trainerMap.get(c.trainer_id) : null;
                const booked = counts.get(c.id) ?? 0;
                const myStatus = mine.get(c.id);
                const full = booked >= c.capacity;
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.title}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {c.category}
                        </Badge>
                        {myStatus === "waitlist" && <Badge variant="warning" className="text-[10px]">Waitlisted</Badge>}
                        {myStatus === "confirmed" && <Badge variant="success" className="text-[10px]">You&apos;re in</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(c.start_at)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeIST(c.start_at)} — {formatTimeIST(c.end_at)} IST
                        </span>
                        {t?.name && <span>· {t.name}{t.spec ? ` · ${t.spec}` : ""}</span>}
                      </div>
                      {c.notes && <p className="mt-1 text-[11px] text-muted-foreground">{c.notes}</p>}
                    </div>
                    <Badge variant={full ? "destructive" : "secondary"} className="gap-1">
                      <Users className="h-3 w-3" />
                      {booked}/{c.capacity}
                    </Badge>
                    <BookButton
                      classId={c.id}
                      myStatus={myStatus as "confirmed" | "waitlist" | "cancelled" | undefined}
                      full={full}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
