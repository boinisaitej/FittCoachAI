import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateDietDay, generateWorkoutDay, recoveryTodos } from "@/lib/ai";
import { buildClientContext } from "@/lib/ai/client-context";
import type { TodoKind } from "@/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireRole("trainer");
  const { clientId } = (await req.json()) as { clientId: string };
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
  const today = new Date().toISOString().slice(0, 10);
  const [diet, workout] = await Promise.all([generateDietDay(ctx, today), generateWorkoutDay(ctx, today)]);

  if (!diet.ok) return NextResponse.json({ error: `Diet AI failed: ${diet.error}` }, { status: 502 });
  if (!workout.ok) return NextResponse.json({ error: `Workout AI failed: ${workout.error}` }, { status: 502 });

  // Build the list of meals + exercises so the LLM can produce per-item
  // reasons (and the hydration / sleep todos) without anything hardcoded.
  const d = diet.data;
  const mealsRaw = [d.breakfast, d.lunch, d.dinner, d.snack].filter(Boolean) as {
    name: string;
    items: { food: string; quantity: string }[];
  }[];
  const exercisesRaw = (workout.data.blocks ?? []).map((b) => ({
    name: b.name,
    type: b.type,
    focus: workout.data.focus,
  }));

  const recovery = await recoveryTodos(ctx, mealsRaw, exercisesRaw);
  if (!recovery.ok) {
    return NextResponse.json({ error: `Recovery AI failed: ${recovery.error}` }, { status: 502 });
  }
  const mealReasonByName = new Map(recovery.data.mealReasons.map((r) => [r.name, r.reason]));
  const exReasonByName = new Map(recovery.data.exerciseReasons.map((r) => [r.name, r.reason]));

  const items: { kind: TodoKind; title: string; description?: string; quantity?: string; ai_reason?: string; position: number }[] = [];
  let pos = 0;

  for (const meal of mealsRaw) {
    items.push({
      kind: "food",
      title: meal.name,
      description: meal.items.map((i) => `${i.food} (${i.quantity})`).join(" + "),
      quantity: undefined,
      ai_reason: mealReasonByName.get(meal.name),
      position: pos++,
    });
  }

  for (const b of workout.data.blocks ?? []) {
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
    title: recovery.data.hydration.title,
    quantity: recovery.data.hydration.quantity,
    ai_reason: recovery.data.hydration.reason,
    position: pos++,
  });
  items.push({
    kind: "sleep",
    title: recovery.data.sleep.title,
    quantity: recovery.data.sleep.quantity,
    ai_reason: recovery.data.sleep.reason,
    position: pos++,
  });

  return NextResponse.json({ ok: true, items });
}
