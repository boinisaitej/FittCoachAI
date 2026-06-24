import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { recipeFor } from "@/lib/ai";
import { buildClientContext } from "@/lib/ai/client-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recipe for a food todo. Cached on `daily_plan_items.ai_recipe` (JSONB):
 *   { ingredients, steps, calories, prepMinutes }
 * If a cache row exists for this item, the route returns it without
 * invoking Gemini — saving tokens on repeat opens.
 */
export async function POST(req: Request) {
  const user = await requireRole(["client", "trainer", "owner"]);
  const { itemId, foodName } = (await req.json()) as { itemId?: string; foodName: string };
  if (!foodName?.trim()) return NextResponse.json({ error: "foodName required" }, { status: 400 });

  const supabase = createClient();

  if (itemId) {
    const { data: row } = await supabase
      .from("daily_plan_items")
      .select("ai_recipe")
      .eq("id", itemId)
      .maybeSingle();
    const cached = row?.ai_recipe as
      | {
          ingredients: { item: string; quantity: string }[];
          steps: string[];
          calories: number;
          prepMinutes: number;
        }
      | null
      | undefined;
    if (cached && Array.isArray(cached.steps) && cached.steps.length > 0) {
      return NextResponse.json({ ok: true, data: cached, cached: true });
    }
  }

  const ctx = await buildClientContext(user.id);
  const res = await recipeFor(foodName.trim(), ctx);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });

  if (itemId) {
    try {
      const admin = createServiceClient();
      await admin.from("daily_plan_items").update({ ai_recipe: res.data as never }).eq("id", itemId);
    } catch (err) {
      console.warn("[ai/recipe] cache persist failed:", err);
    }
  }

  return NextResponse.json({ ok: true, data: res.data, cached: false });
}
