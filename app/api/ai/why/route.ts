import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { whyTodo } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Why is this in my plan?" — cached per todo item.
 *  - If `daily_plan_items.ai_reason` already holds a value, return it
 *    immediately. No Gemini call. No tokens.
 *  - Otherwise generate, persist to the row (service-role bypasses RLS),
 *    and return.
 */
export async function POST(req: Request) {
  const user = await requireRole(["client", "trainer", "owner"]);
  const body = (await req.json()) as {
    itemId?: string;
    title: string;
    kind: string;
    description?: string;
  };

  const supabase = createClient();

  // Cache hit — short-circuit before any AI cost.
  if (body.itemId) {
    const { data: row } = await supabase
      .from("daily_plan_items")
      .select("ai_reason")
      .eq("id", body.itemId)
      .maybeSingle();
    if (row?.ai_reason && row.ai_reason.trim().length > 0) {
      return NextResponse.json({ ok: true, data: row.ai_reason, cached: true });
    }
  }

  // Build context (cheap — parallel reads).
  const [{ data: profile }, { data: bmi }, { data: prefs }, { data: injuries }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,gender,dob,height_cm,weight_kg,language")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("bmi_logs")
      .select("bmi")
      .eq("client_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("client_preferences")
      .select("exercise_types,is_vegetarian,water_goal_glasses,allergies")
      .eq("client_id", user.id)
      .maybeSingle(),
    supabase
      .from("injuries")
      .select("tag")
      .eq("client_id", user.id)
      .is("resolved_at", null),
  ]);

  const age = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 86400000))
    : undefined;

  const res = await whyTodo(
    { title: body.title, kind: body.kind, description: body.description },
    {
      name: profile?.full_name ?? undefined,
      age,
      gender: profile?.gender as never,
      height_cm: profile?.height_cm ?? undefined,
      weight_kg: profile?.weight_kg ?? undefined,
      bmi: bmi?.bmi ?? undefined,
      goals: prefs?.exercise_types as never,
      vegetarian: prefs?.is_vegetarian,
      allergies: (prefs?.allergies as string[] | null) ?? [],
      injuries: (injuries ?? []).map((i) => i.tag),
      waterGoal: prefs?.water_goal_glasses ?? 8,
    }
  );

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });

  // Persist so the next click is free (service-role bypasses RLS).
  if (body.itemId) {
    try {
      const admin = createServiceClient();
      await admin.from("daily_plan_items").update({ ai_reason: res.data }).eq("id", body.itemId);
    } catch (err) {
      console.warn("[ai/why] cache persist failed:", err);
    }
  }

  return NextResponse.json({ ok: true, data: res.data, cached: false });
}
