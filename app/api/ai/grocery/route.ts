import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { groceryFromItems } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Meal = { items?: { food: string; quantity: string }[] };

export async function POST(req: Request) {
  const user = await requireRole("client");
  const { from, to } = (await req.json()) as { from: string; to: string };
  const supabase = createClient();

  const { data: plans } = await supabase
    .from("ai_diet_plans")
    .select("plan,scope,start_date")
    .eq("client_id", user.id)
    .gte("start_date", from)
    .lte("start_date", to)
    .order("created_at", { ascending: false });

  const flat: { food: string; quantity: string }[] = [];
  for (const p of plans ?? []) {
    const plan = p.plan as unknown as {
      days?: { breakfast: Meal; lunch: Meal; dinner: Meal; snack?: Meal; midMorning?: Meal }[];
    } & { breakfast?: Meal; lunch?: Meal; dinner?: Meal; snack?: Meal; midMorning?: Meal };
    const days = plan.days ?? [plan];
    for (const d of days) {
      const meals = [d.breakfast, d.midMorning, d.lunch, d.snack, d.dinner].filter(Boolean) as Meal[];
      for (const m of meals) {
        for (const it of m.items ?? []) flat.push({ food: it.food, quantity: it.quantity });
      }
    }
  }

  if (flat.length === 0) {
    return NextResponse.json(
      { error: "Generate a diet plan first — the grocery list is built from your saved AI diet plans in the date range." },
      { status: 400 }
    );
  }

  const out = await groceryFromItems(flat);
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: 502 });

  await supabase.from("grocery_lists").insert({
    client_id: user.id,
    title: `${from} – ${to}`,
    date_from: from,
    date_to: to,
    items: out.data as never,
    total_inr: out.data.totalInr,
  });

  return NextResponse.json({ ok: true, data: out.data });
}
