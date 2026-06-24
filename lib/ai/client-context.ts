import { createClient } from "@/lib/supabase/server";
import type { ClientContext } from "@/lib/ai/prompts";
import type { ExerciseType } from "@/types/domain";

/**
 * Build a ClientContext for AI prompts from the current Supabase state.
 *  - Profile basics + latest BMI
 *  - Festival veg-lock for today
 *  - Active injuries
 *  - Last 7 days of recent meals + exercises (so the model varies the
 *    upcoming plan instead of repeating).
 *  - Last 14 days of BMI trend (delta + slope).
 *  - Last 7 days of adherence so the model can scale intensity.
 */
export async function buildClientContext(clientId: string): Promise<ClientContext> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const since14 = new Date(Date.now() - 14 * 86400000).toISOString();

  const [
    { data: profile },
    { data: prefs },
    { data: bmiLatest },
    { data: bmiHistory },
    { data: injuries },
    { data: festival },
    { data: recentDietPlans },
    { data: recentWorkoutPlans },
    { data: recentCompletions },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,gender,dob,height_cm,weight_kg,language")
      .eq("id", clientId)
      .maybeSingle(),
    supabase
      .from("client_preferences")
      .select("exercise_types,is_vegetarian,water_goal_glasses,allergies")
      .eq("client_id", clientId)
      .maybeSingle(),
    supabase
      .from("bmi_logs")
      .select("bmi,height_cm,weight_kg,logged_at")
      .eq("client_id", clientId)
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("bmi_logs")
      .select("bmi,weight_kg,logged_at")
      .eq("client_id", clientId)
      .gte("logged_at", since14)
      .order("logged_at", { ascending: true }),
    supabase
      .from("injuries")
      .select("tag")
      .eq("client_id", clientId)
      .is("resolved_at", null),
    supabase.from("festivals").select("is_veg_only").eq("festival_date", today).maybeSingle(),
    supabase
      .from("ai_diet_plans")
      .select("plan,scope,start_date,created_at")
      .eq("client_id", clientId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("ai_workout_plans")
      .select("plan,scope,start_date,created_at")
      .eq("client_id", clientId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("todo_completions")
      .select("status,completed_at")
      .eq("client_id", clientId)
      .gte("completed_at", since),
  ]);

  const age = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 86400000))
    : undefined;

  // Extract recent food names + exercise names so the prompt can vary.
  const recentFoods = new Set<string>();
  const recentExercises = new Set<string>();
  for (const row of recentDietPlans ?? []) {
    const plan = row.plan as unknown as {
      days?: { breakfast?: { items?: { food: string }[] }; lunch?: { items?: { food: string }[] }; dinner?: { items?: { food: string }[] }; snack?: { items?: { food: string }[] }; midMorning?: { items?: { food: string }[] } }[];
      breakfast?: { items?: { food: string }[] }; lunch?: { items?: { food: string }[] }; dinner?: { items?: { food: string }[] }; snack?: { items?: { food: string }[] }; midMorning?: { items?: { food: string }[] };
    };
    const days = plan.days ?? [plan];
    for (const d of days) {
      for (const meal of [d.breakfast, d.lunch, d.dinner, d.snack, d.midMorning]) {
        for (const it of meal?.items ?? []) recentFoods.add(it.food);
      }
    }
  }
  for (const row of recentWorkoutPlans ?? []) {
    const plan = row.plan as unknown as {
      days?: { blocks?: { name: string }[] }[];
      blocks?: { name: string }[];
    };
    const days = plan.days ?? [plan];
    for (const d of days) for (const b of d.blocks ?? []) recentExercises.add(b.name);
  }

  // BMI trend: first → last in window
  let bmiTrend: string | undefined;
  if ((bmiHistory ?? []).length >= 2) {
    const first = bmiHistory![0];
    const last = bmiHistory![bmiHistory!.length - 1];
    const delta = (last.bmi - first.bmi).toFixed(2);
    const wdelta = (last.weight_kg - first.weight_kg).toFixed(1);
    bmiTrend = `${delta} BMI (${wdelta} kg) over last 14 days`;
  }

  // Adherence over last 7 days
  let recentAdherencePct: number | undefined;
  const completions = recentCompletions ?? [];
  if (completions.length) {
    const completed = completions.filter((c) => c.status === "completed").length;
    recentAdherencePct = Math.round((completed * 100) / completions.length);
  }

  return {
    name: profile?.full_name ?? undefined,
    age,
    gender: (profile?.gender as ClientContext["gender"]) ?? undefined,
    height_cm: profile?.height_cm ?? bmiLatest?.height_cm ?? undefined,
    weight_kg: profile?.weight_kg ?? bmiLatest?.weight_kg ?? undefined,
    bmi: bmiLatest?.bmi ?? undefined,
    goals: (prefs?.exercise_types as ExerciseType[]) ?? [],
    vegetarian: prefs?.is_vegetarian ?? false,
    isFestivalVegDay: festival?.is_veg_only ?? false,
    allergies: prefs?.allergies ?? [],
    injuries: (injuries ?? []).map((i) => i.tag),
    waterGoal: prefs?.water_goal_glasses ?? 8,
    language: profile?.language ?? "en",
    recentFoods: Array.from(recentFoods).slice(0, 24),
    recentExercises: Array.from(recentExercises).slice(0, 24),
    bmiTrend,
    recentAdherencePct,
  };
}
