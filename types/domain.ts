export type UserRole = "owner" | "trainer" | "client";

export type PlanKind = "basic" | "pro";
export type SubStatus = "active" | "expired" | "cancelled" | "grace";
export type TodoKind = "food" | "exercise" | "water" | "sleep" | "note";
export type TodoStatus = "pending" | "completed" | "partial" | "skipped";
export type Severity = "mild" | "moderate" | "severe";
export type PhotoKind = "before" | "progress" | "after";

export type NotificationKind =
  | "welcome"
  | "plan_assigned"
  | "plan_extended"
  | "invoice"
  | "report"
  | "announcement"
  | "broadcast"
  | "todo_reminder"
  | "streak_reward"
  | "alert"
  | "message"
  | "system";

export type AlertKind =
  | "sleep_low"
  | "severe_health"
  | "injury"
  | "junk_excess"
  | "missed_workout"
  | "stale_todos";

export type AiDietMeal = {
  name: string;
  items: { food: string; quantity: string; calories?: number }[];
  totalCalories: number;
  notes?: string;
  recipe?: string;
};

export type AiDietDayPlan = {
  date: string;
  breakfast: AiDietMeal;
  midMorning?: AiDietMeal;
  lunch: AiDietMeal;
  snack?: AiDietMeal;
  dinner: AiDietMeal;
  totalCalories: number;
  hydrationGlasses: number;
};

export type AiWorkoutBlock = {
  name: string;
  type: "warmup" | "cardio" | "strength" | "mobility" | "cooldown" | "yoga";
  sets?: number;
  reps?: string;
  duration?: string;
  notes?: string;
};

export type AiWorkoutDayPlan = {
  date: string;
  focus: string;
  blocks: AiWorkoutBlock[];
  durationMin: number;
  intensity: "low" | "moderate" | "high";
};

export type ExerciseType = "cardio" | "muscle_gain" | "zumba" | "yoga" | "weight_loss";

export const EXERCISE_TYPES: { value: ExerciseType; label: string; emoji: string }[] = [
  { value: "cardio", label: "Cardio", emoji: "🏃" },
  { value: "muscle_gain", label: "Muscle Gain", emoji: "💪" },
  { value: "zumba", label: "Zumba", emoji: "💃" },
  { value: "yoga", label: "Yoga", emoji: "🧘" },
  { value: "weight_loss", label: "Weight Loss", emoji: "🔥" },
];
