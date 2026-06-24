import type { ExerciseType } from "@/types/domain";

export type ClientContext = {
  name?: string;
  age?: number;
  gender?: "male" | "female" | "other";
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  goals?: ExerciseType[];
  vegetarian?: boolean;
  allergies?: string[];
  injuries?: string[];
  language?: string;
  isFestivalVegDay?: boolean;
  waterGoal?: number;
  // History — fed in so the model VARIES upcoming plans and SCALES intensity.
  recentFoods?: string[];
  recentExercises?: string[];
  bmiTrend?: string;
  recentAdherencePct?: number;
};

const ctxBlock = (c: ClientContext) => {
  const historyLines: string[] = [];
  if (c.bmiTrend) historyLines.push(`- 14-day trend: ${c.bmiTrend}`);
  if (c.recentAdherencePct !== undefined)
    historyLines.push(`- 7-day plan adherence: ${c.recentAdherencePct}% (use to scale intensity)`);
  if (c.recentFoods?.length)
    historyLines.push(`- Foods served in the last 7 days (AVOID repeating these to keep meals varied): ${c.recentFoods.join(", ")}`);
  if (c.recentExercises?.length)
    historyLines.push(`- Exercises programmed in the last 7 days (PROGRESS or rotate these, do not repeat verbatim): ${c.recentExercises.join(", ")}`);

  return `
Client profile:
- Name: ${c.name ?? "Client"}
- Age: ${c.age ?? "unknown"}
- Gender: ${c.gender ?? "unknown"}
- Height: ${c.height_cm ?? "?"} cm
- Weight: ${c.weight_kg ?? "?"} kg
- BMI: ${c.bmi ?? "?"}
- Goals: ${(c.goals ?? []).join(", ") || "general fitness"}
- Vegetarian: ${c.vegetarian || c.isFestivalVegDay ? "yes" : "no"}${c.isFestivalVegDay ? " (festival day — strictly veg)" : ""}
- Allergies: ${(c.allergies ?? []).join(", ") || "none"}
- Active injuries to avoid: ${(c.injuries ?? []).join(", ") || "none"}
- Water goal: ${c.waterGoal ?? 8} glasses/day
- Language: ${c.language ?? "en"}${historyLines.length ? "\n\nRecent history:\n" + historyLines.join("\n") : ""}
`.trim();
};

/**
 * Hard, non-negotiable dietary constraints hoisted to the TOP of diet prompts.
 * Weak/fast models reliably honour an explicit named-ingredient ban at the
 * start far better than a rule buried in a list, so we enumerate the actual
 * forbidden items (allergens + their common forms, plus the veg lock).
 */
const dietHardConstraints = (c: ClientContext): string => {
  const lines: string[] = [];
  const allergies = (c.allergies ?? []).filter(Boolean);
  if (allergies.length) {
    lines.push(
      `- FORBIDDEN — the client is ALLERGIC to: ${allergies.join(", ")}. Do NOT include any of these, NOR any dish/ingredient derived from them (e.g. peanut→groundnut, peanut oil; soy→tofu, soya chunks, edamame, soy sauce, soy milk; milk→paneer, curd, ghee, butter; wheat→roti, atta, rava). If unsure, leave it out. A plan containing any of these is INVALID.`
    );
  }
  if (c.vegetarian || c.isFestivalVegDay) {
    lines.push(`- STRICTLY VEGETARIAN: no meat, fish, egg, or seafood of any kind.`);
  }
  if (!lines.length) return "";
  return `!!! CRITICAL CONSTRAINTS — violating any of these makes the entire plan unusable:\n${lines.join("\n")}\n\n`;
};

export const dietDayPrompt = (c: ClientContext, date: string) => `
You are FitCoachAI, a certified sports nutritionist. Build ONE day's meal plan.

${dietHardConstraints(c)}${ctxBlock(c)}

Date: ${date}

Return STRICT JSON only, no prose, no markdown fences, matching exactly:
{
  "date": "${date}",
  "breakfast": { "name": "Breakfast", "items": [{"food":"","quantity":"","calories":0}], "totalCalories": 0, "recipe":"" },
  "midMorning": { "name":"Mid morning", "items":[...], "totalCalories":0 },
  "lunch":     { "name":"Lunch", "items":[...], "totalCalories":0, "recipe":"" },
  "snack":     { "name":"Snack", "items":[...], "totalCalories":0 },
  "dinner":    { "name":"Dinner", "items":[...], "totalCalories":0, "recipe":"" },
  "totalCalories": 0,
  "hydrationGlasses": ${c.waterGoal ?? 8}
}

Rules:
- Indian palette; quantities in grams / ml / pieces.
- Calories must sum sensibly per meal and overall.
- Calorie target: if BMI < 18.5 OR a goal is muscle_gain/weight_gain, plan a SURPLUS — at least 2400 kcal/day for an adult (more for very low BMI). If BMI >= 25 OR a goal is weight_loss, plan a moderate deficit. Otherwise maintain.
- NEVER include any listed allergen OR its derived forms. E.g. peanut → also exclude groundnut & peanut oil; soy → also exclude tofu, soya chunks, edamame, soy sauce, soy milk; milk → also exclude paneer, curd, ghee, butter; wheat → also exclude roti, atta, semolina/rava. When unsure whether an item contains an allergen, exclude it.
- Avoid injury-conflicting items.
- If vegetarian, strictly no meat / fish / egg.
- Include short recipe (max 30 words) for the 3 main meals.
`.trim();

export const dietWeekPrompt = (c: ClientContext, weekStart: string) => `
You are FitCoachAI. Build a 7-day diet plan starting ${weekStart}.

${dietHardConstraints(c)}${ctxBlock(c)}

Return STRICT JSON: { "weekStart": "${weekStart}", "days": [<7 day objects identical to the day plan>] }
`.trim();

export const workoutDayPrompt = (c: ClientContext, date: string) => `
You are FitCoachAI, a certified strength coach. Build today's workout.

${ctxBlock(c)}

Date: ${date}

Return STRICT JSON only:
{
  "date": "${date}",
  "focus": "string",
  "intensity": "low|moderate|high",
  "durationMin": 0,
  "blocks": [
    {"name":"","type":"warmup|cardio|strength|mobility|cooldown|yoga","sets":0,"reps":"","duration":"","notes":""}
  ]
}

Rules:
- Skip any movement that loads the listed injuries.
- Match focus to client goals (cardio / muscle_gain / zumba / yoga / weight_loss).
- 6-10 blocks typical, 45-60 min total.
`.trim();

export const workoutWeekPrompt = (c: ClientContext, weekStart: string) => `
You are FitCoachAI. Build a 7-day workout plan starting ${weekStart}.

${ctxBlock(c)}

Return STRICT JSON: { "weekStart":"${weekStart}", "days":[<7 day objects matching the day schema>] }
Include 1-2 rest / mobility days.
`.trim();

export const motivationPrompt = (c: ClientContext) => `
You are FitCoachAI. Generate ONE short motivational ping (max 18 words) personalised to:
${ctxBlock(c)}
Plain string, no quotes, no JSON.
`.trim();

export const whyTodoPrompt = (todo: { title: string; kind: string; description?: string }, c: ClientContext) => `
Why is "${todo.title}" (${todo.kind}) in this client's plan? Be specific to their goals/profile.

${ctxBlock(c)}

Return a single paragraph, max 60 words, plain text.
`.trim();

export const healthRemedyPrompt = (
  problem: string,
  severity: string,
  c: ClientContext
) => `
You are FitCoachAI Health Assistant. The client reports: "${problem}" (severity: ${severity}).

${ctxBlock(c)}

Return STRICT JSON:
{
  "foods":  [{"name":"","reason":""}],
  "exercises":[{"name":"","reason":""}],
  "tips":[ "" ],
  "seek_doctor": <boolean>
}
- "seek_doctor": true if severity is "severe" or symptoms warrant medical attention.
- 3-6 items per array.
- No prose outside JSON.
`.trim();

export const recipePrompt = (foodName: string, c: ClientContext) => `
Give a healthy ${c.vegetarian || c.isFestivalVegDay ? "vegetarian " : ""}recipe for "${foodName}".

Return JSON: { "ingredients":[{"item":"","quantity":""}], "steps":[""], "calories": 0, "prepMinutes": 0 }
Steps max 6, max 80 words total.
`.trim();

export const groceryPrompt = (items: { food: string; quantity: string }[]) => `
Group the following grocery items by category (Vegetables, Fruits, Dairy, Grains, Pulses, Spices, Snacks, Other),
de-duplicate, and estimate INR cost for each line.

Items: ${JSON.stringify(items)}

Return STRICT JSON:
{
  "categories":{
    "Vegetables":[{"item":"","quantity":"","inr":0}],
    "Fruits":[...], "Dairy":[...], "Grains":[...], "Pulses":[...], "Spices":[...], "Snacks":[...], "Other":[...]
  },
  "totalInr": 0
}
`.trim();

export const foodScannerPrompt = `
Analyse the provided food image. Return STRICT JSON:
{
  "detected":[{"name":"","quantity":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}],
  "totalCalories":0,
  "notes":""
}
If the image is not food, return: { "detected":[], "totalCalories":0, "notes":"Not a food image" }
`.trim();

export const weeklyReportPrompt = (
  c: ClientContext,
  stats: { adherence: number; points: number; missedDays: number; bmiTrend?: string }
) => `
Write a friendly, encouraging weekly progress summary for FitCoachAI.

${ctxBlock(c)}

This week:
- Adherence: ${stats.adherence}%
- Points: ${stats.points}
- Missed days: ${stats.missedDays}
- BMI trend: ${stats.bmiTrend ?? "n/a"}

Max 120 words. End with one specific suggestion for next week. Plain text only.
`.trim();

export const autoProgressionPrompt = (
  c: ClientContext,
  lastWeek: { focus: string; adherence: number; topMissed: string[] }
) => `
The client completed last week with these stats: focus="${lastWeek.focus}", adherence=${lastWeek.adherence}%,
top missed items=${JSON.stringify(lastWeek.topMissed)}.

${ctxBlock(c)}

Propose next week's adjustment as STRICT JSON:
{
  "intensity_change":"increase|hold|decrease",
  "diet_tweak":"",
  "workout_tweak":"",
  "rationale":""
}
`.trim();

export const sloganPrompt = (count = 6) => `
Generate ${count} short gym motivational slogans (max 8 words each).
Return STRICT JSON: { "slogans": ["", ""] }
`.trim();

/**
 * One-shot hydration + sleep todos and per-meal "why" reasons.
 * Used by /api/ai/suggest-plan and /api/ai/suggest-week so nothing in the
 * plan UI is hardcoded — water + sleep titles and every ai_reason string
 * come from the model.
 */
export const recoveryTodosPrompt = (
  c: ClientContext,
  meals: { name: string; items: { food: string; quantity: string }[] }[],
  exercises: { name: string; type: string; focus?: string }[]
) => `
You are FitCoachAI. For the client below, craft personalised "todo" copy:
1. ONE hydration todo (title + quantity + a one-sentence reason).
2. ONE sleep todo (title + quantity + a one-sentence reason).
3. A per-item "why" line for every meal and every exercise (≤ 22 words each).
Use the client's name and goals when natural.

${ctxBlock(c)}

Meals: ${JSON.stringify(meals)}
Exercises: ${JSON.stringify(exercises)}

Return STRICT JSON only, in this exact shape:
{
  "hydration": { "title": "", "quantity": "", "reason": "" },
  "sleep":     { "title": "", "quantity": "", "reason": "" },
  "mealReasons":    [ { "name": "", "reason": "" } ],
  "exerciseReasons":[ { "name": "", "reason": "" } ]
}
- mealReasons must include one entry per meal (same name), exerciseReasons one per exercise.
- No prose outside JSON, no markdown fences.
`.trim();
