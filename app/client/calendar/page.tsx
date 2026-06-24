import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage() {
  const user = await requireRole("client");
  const supabase = createClient();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const { data: completions } = await supabase
    .from("todo_completions")
    .select("status,completed_at")
    .eq("client_id", user.id)
    .gte("completed_at", start.toISOString())
    .lte("completed_at", end.toISOString());

  const byDate: Record<string, { completed: number; partial: number; skipped: number }> = {};
  (completions ?? []).forEach((c) => {
    const d = c.completed_at.slice(0, 10);
    byDate[d] = byDate[d] ?? { completed: 0, partial: 0, skipped: 0 };
    byDate[d][c.status as "completed" | "partial" | "skipped"]++;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Green = strong day · amber = partial · red = missed. Click any date to see that day&apos;s plan on the right.
        </p>
      </div>
      <CalendarView year={today.getFullYear()} month={today.getMonth()} statusByDate={byDate} />
    </div>
  );
}
