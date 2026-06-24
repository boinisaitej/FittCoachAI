import { CalendarDays, Clock, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { formatDate, formatTimeIST } from "@/lib/utils";
import { NewClassForm } from "./new-class-form";
import { CancelClassButton } from "./cancel-class-button";

export default async function OwnerClassesPage() {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const admin = createServiceClient();

  const [{ data: trainers }, { data: classes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,specialization")
      .eq("gym_id", owner.gym_id!)
      .eq("role", "trainer")
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("gym_classes")
      .select("id,title,category,trainer_id,start_at,end_at,capacity,status,notes")
      .eq("gym_id", owner.gym_id!)
      .order("start_at", { ascending: true }),
  ]);

  // Booking counts per class (service-role for the count head)
  const classIds = (classes ?? []).map((c) => c.id);
  let counts = new Map<string, number>();
  if (classIds.length > 0) {
    const { data: bookings } = await admin
      .from("class_bookings")
      .select("class_id,status")
      .in("class_id", classIds)
      .in("status", ["confirmed", "waitlist", "attended"]);
    for (const b of bookings ?? []) {
      counts.set(b.class_id, (counts.get(b.class_id) ?? 0) + 1);
    }
  }

  const trainerMap = new Map(
    (trainers ?? []).map((t) => [t.id, { name: t.full_name, spec: t.specialization }])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Group classes</h1>
        <p className="text-sm text-muted-foreground">
          Schedule Zumba / Yoga / HIIT slots. Clients book from their app.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Create a class</CardTitle>
          <CardDescription>Pick a trainer, time window, and capacity. Bookings open immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewClassForm trainers={trainers ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {(classes ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes scheduled yet.</p>
          ) : (
            <ul className="space-y-2">
              {classes!.map((c) => {
                const t = c.trainer_id ? trainerMap.get(c.trainer_id) : null;
                const booked = counts.get(c.id) ?? 0;
                const full = booked >= c.capacity;
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.title}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {c.category}
                        </Badge>
                        {c.status !== "scheduled" && (
                          <Badge
                            variant={c.status === "cancelled" ? "destructive" : "secondary"}
                            className="text-[10px] capitalize"
                          >
                            {c.status}
                          </Badge>
                        )}
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
                        {t?.name && <span>· Trainer: {t.name}</span>}
                      </div>
                    </div>
                    <Badge variant={full ? "destructive" : "secondary"} className="gap-1">
                      <Users className="h-3 w-3" />
                      {booked}/{c.capacity}
                    </Badge>
                    {c.status === "scheduled" && <CancelClassButton id={c.id} />}
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
