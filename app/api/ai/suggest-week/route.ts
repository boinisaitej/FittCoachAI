import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateDietWeek, generateWorkoutWeek, recoveryTodos } from "@/lib/ai";
import { buildClientContext } from "@/lib/ai/client-context";
import type { TodoKind } from "@/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = {
  kind: TodoKind;
  title: string;
  description?: string;
  quantity?: string;
  ai_reason?: string;
  position: number;
};

export async function POST(req: Request) {
  const user = await requireRole("trainer");
  const { clientId, weekStart } = (await req.json()) as { clientId: string; weekStart: string };

  const supabase = createClient();
  const { data: own } = await supabase
    .from("trainer_clients")
    .select("id")
    .eq("trainer_id", user.id)
    .eq("client_id", clientId)
    .is("ended_at", null)
    .maybeSingle();
  if (!own) return NextResponse.json({ error: "Not your client" }, { status: 403 });

  const ctx = await buildClientContext(clientId);
  const [diet, workout] = await Promise.all([
    generateDietWeek(ctx, weekStart),
    generateWorkoutWeek(ctx, weekStart),
  ]);
  if (!diet.ok) return NextResponse.json({ error: `Diet AI failed: ${diet.error}` }, { status: 502 });
  if (!workout.ok) return NextResponse.json({ error: `Workout AI failed: ${workout.error}` }, { status: 502 });

  const days = diet.data.days ?? [];
  const workoutByDate = new Map(workout.data.days.map((d) => [d.date, d]));

  // One LLM round-trip per day for hydration / sleep / per-item reasons.
  const recoveryByDate = new Map<string, Awaited<ReturnType<typeof recoveryTodos>>>();
  await Promise.all(
    days.map(async (d) => {
      const meals = [d.breakfast, d.lunch, d.dinner, d.snack].filter(Boolean) as {
        name: string;
        items: { food: string; quantity: string }[];
      }[];
      const exercises = (workoutByDate.get(d.date)?.blocks ?? []).map((b) => ({
        name: b.name,
        type: b.type,
        focus: workoutByDate.get(d.date)?.focus,
      }));
      const r = await recoveryTodos(ctx, meals, exercises);
      recoveryByDate.set(d.date, r);
    })
  );

  // Fail loudly if any day's LLM call failed — never silently substitute
  // a hardcoded reason.
  for (const [date, r] of recoveryByDate) {
    if (!r.ok) {
      return NextResponse.json({ error: `Recovery AI failed for ${date}: ${r.error}` }, { status: 502 });
    }
  }

  const byDate: Record<string, Item[]> = {};
  for (const d of days) {
    const items: Item[] = [];
    let pos = 0;

    const rec = recoveryByDate.get(d.date)!;
    if (!rec.ok) continue;
    const mealReasonByName = new Map(rec.data.mealReasons.map((r) => [r.name, r.reason]));
    const exReasonByName = new Map(rec.data.exerciseReasons.map((r) => [r.name, r.reason]));

    const meals = [d.breakfast, d.lunch, d.dinner, d.snack].filter(Boolean) as {
      name: string;
      items: { food: string; quantity: string }[];
    }[];
    for (const meal of meals) {
      items.push({
        kind: "food",
        title: meal.name,
        description: meal.items.map((i) => `${i.food} (${i.quantity})`).join(" + "),
        ai_reason: mealReasonByName.get(meal.name),
        position: pos++,
      });
    }

    const w = workoutByDate.get(d.date);
    for (const b of w?.blocks ?? []) {
      items.push({
        kind: "exercise",
        title: b.name,
        description: b.notes ?? "",
        quantity: b.sets ? `${b.sets} × ${b.reps ?? ""}` : b.duration ?? "",
        ai_reason: exReasonByName.get(b.name),
        position: pos++,
      });
    }

    items.push({
      kind: "water",
      title: rec.data.hydration.title,
      quantity: rec.data.hydration.quantity,
      ai_reason: rec.data.hydration.reason,
      position: pos++,
    });
    items.push({
      kind: "sleep",
      title: rec.data.sleep.title,
      quantity: rec.data.sleep.quantity,
      ai_reason: rec.data.sleep.reason,
      position: pos++,
    });

    byDate[d.date] = items;
  }

  return NextResponse.json({ ok: true, byDate });
}
