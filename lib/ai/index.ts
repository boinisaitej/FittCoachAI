import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getGemini, extractJson, AiUnavailableError } from "./gemini";
import * as P from "./prompts";
import type { AiDietDayPlan, AiWorkoutDayPlan } from "@/types/domain";

export { AiUnavailableError };

const SYSTEM = new SystemMessage(
  "You are FitCoachAI: a friendly, evidence-based fitness + nutrition assistant. Be concise and respect dietary restrictions and injuries."
);

/**
 * Bubble the model's response up — no silent hardcoded fallbacks anywhere.
 * If GOOGLE_API_KEY is missing or the call throws, the error reaches the
 * caller so the UI can show a real message instead of a fabricated plan.
 */
async function ask(prompt: string, model: "flash" | "pro" = "flash"): Promise<string> {
  const llm = getGemini(model);
  const res = await llm.invoke([SYSTEM, new HumanMessage(prompt)]);
  return typeof res.content === "string" ? res.content : JSON.stringify(res.content);
}

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail<T>(err: unknown, label: string): AiResult<T> {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[ai:${label}] ${msg}`);
  return { ok: false, error: msg };
}

export async function generateDietDay(c: P.ClientContext, date: string): Promise<AiResult<AiDietDayPlan>> {
  try {
    return { ok: true, data: extractJson<AiDietDayPlan>(await ask(P.dietDayPrompt(c, date))) };
  } catch (e) {
    return fail<AiDietDayPlan>(e, "diet-day");
  }
}

export async function generateDietWeek(c: P.ClientContext, weekStart: string): Promise<AiResult<{ weekStart: string; days: AiDietDayPlan[] }>> {
  try {
    return { ok: true, data: extractJson<{ weekStart: string; days: AiDietDayPlan[] }>(await ask(P.dietWeekPrompt(c, weekStart), "pro")) };
  } catch (e) {
    return fail(e, "diet-week");
  }
}

export async function generateWorkoutDay(c: P.ClientContext, date: string): Promise<AiResult<AiWorkoutDayPlan>> {
  try {
    return { ok: true, data: extractJson<AiWorkoutDayPlan>(await ask(P.workoutDayPrompt(c, date))) };
  } catch (e) {
    return fail<AiWorkoutDayPlan>(e, "workout-day");
  }
}

export async function generateWorkoutWeek(c: P.ClientContext, weekStart: string): Promise<AiResult<{ weekStart: string; days: AiWorkoutDayPlan[] }>> {
  try {
    return { ok: true, data: extractJson<{ weekStart: string; days: AiWorkoutDayPlan[] }>(await ask(P.workoutWeekPrompt(c, weekStart), "pro")) };
  } catch (e) {
    return fail(e, "workout-week");
  }
}

export async function motivation(c: P.ClientContext): Promise<AiResult<string>> {
  try {
    return { ok: true, data: await ask(P.motivationPrompt(c)) };
  } catch (e) {
    return fail<string>(e, "motivation");
  }
}

export async function whyTodo(todo: { title: string; kind: string; description?: string }, c: P.ClientContext): Promise<AiResult<string>> {
  try {
    return { ok: true, data: await ask(P.whyTodoPrompt(todo, c)) };
  } catch (e) {
    return fail<string>(e, "why-todo");
  }
}

export async function healthRemedy(
  problem: string,
  severity: string,
  c: P.ClientContext
): Promise<AiResult<{
  foods: { name: string; reason: string }[];
  exercises: { name: string; reason: string }[];
  tips: string[];
  seek_doctor: boolean;
}>> {
  try {
    return {
      ok: true,
      data: extractJson(await ask(P.healthRemedyPrompt(problem, severity, c))),
    };
  } catch (e) {
    return fail(e, "health-remedy");
  }
}

export async function recipeFor(foodName: string, c: P.ClientContext) {
  try {
    return {
      ok: true,
      data: extractJson<{
        ingredients: { item: string; quantity: string }[];
        steps: string[];
        calories: number;
        prepMinutes: number;
      }>(await ask(P.recipePrompt(foodName, c))),
    } as const;
  } catch (e) {
    return fail<{
      ingredients: { item: string; quantity: string }[];
      steps: string[];
      calories: number;
      prepMinutes: number;
    }>(e, "recipe");
  }
}

export async function groceryFromItems(items: { food: string; quantity: string }[]) {
  try {
    return {
      ok: true,
      data: extractJson<{
        categories: Record<string, { item: string; quantity: string; inr: number }[]>;
        totalInr: number;
      }>(await ask(P.groceryPrompt(items))),
    } as const;
  } catch (e) {
    return fail<{
      categories: Record<string, { item: string; quantity: string; inr: number }[]>;
      totalInr: number;
    }>(e, "grocery");
  }
}

export async function chat(
  history: { role: "user" | "assistant"; content: string }[],
  next: string
): Promise<AiResult<string>> {
  try {
    const llm = getGemini("flash");
    const msgs = [
      SYSTEM,
      ...history.map((m) => (m.role === "user" ? new HumanMessage(m.content) : new SystemMessage(m.content))),
      new HumanMessage(next),
    ];
    const res = await llm.invoke(msgs);
    return { ok: true, data: typeof res.content === "string" ? res.content : JSON.stringify(res.content) };
  } catch (e) {
    return fail<string>(e, "chat");
  }
}

export async function weeklyReport(
  c: P.ClientContext,
  stats: { adherence: number; points: number; missedDays: number; bmiTrend?: string }
): Promise<AiResult<string>> {
  try {
    return { ok: true, data: await ask(P.weeklyReportPrompt(c, stats)) };
  } catch (e) {
    return fail<string>(e, "weekly-report");
  }
}

export async function autoProgression(
  c: P.ClientContext,
  lastWeek: { focus: string; adherence: number; topMissed: string[] }
) {
  try {
    return {
      ok: true,
      data: extractJson<{
        intensity_change: "increase" | "hold" | "decrease";
        diet_tweak: string;
        workout_tweak: string;
        rationale: string;
      }>(await ask(P.autoProgressionPrompt(c, lastWeek))),
    } as const;
  } catch (e) {
    return fail<{
      intensity_change: "increase" | "hold" | "decrease";
      diet_tweak: string;
      workout_tweak: string;
      rationale: string;
    }>(e, "auto-progression");
  }
}

export async function generateSlogans(count = 6) {
  try {
    return {
      ok: true,
      data: extractJson<{ slogans: string[] }>(await ask(P.sloganPrompt(count))),
    } as const;
  } catch (e) {
    return fail<{ slogans: string[] }>(e, "slogans");
  }
}

export type RecoveryTodos = {
  hydration: { title: string; quantity: string; reason: string };
  sleep: { title: string; quantity: string; reason: string };
  mealReasons: { name: string; reason: string }[];
  exerciseReasons: { name: string; reason: string }[];
};

export async function recoveryTodos(
  c: P.ClientContext,
  meals: { name: string; items: { food: string; quantity: string }[] }[],
  exercises: { name: string; type: string; focus?: string }[]
): Promise<AiResult<RecoveryTodos>> {
  try {
    return {
      ok: true,
      data: extractJson<RecoveryTodos>(await ask(P.recoveryTodosPrompt(c, meals, exercises))),
    };
  } catch (e) {
    return fail<RecoveryTodos>(e, "recovery-todos");
  }
}
