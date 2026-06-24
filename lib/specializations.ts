/**
 * Canonical list of trainer specializations offered across all gyms.
 * Used by:
 *   - app/owner/users/create-user-dialog.tsx   (dropdown when creating a trainer)
 *   - app/owner/specializations/page.tsx       (read-only summary with trainer counts)
 */

export type Specialization = { value: string; emoji: string };

export const SPECIALIZATIONS: Specialization[] = [
  { value: "Strength", emoji: "💪" },
  { value: "Powerlifting", emoji: "🏋️" },
  { value: "Bodybuilding", emoji: "🦾" },
  { value: "CrossFit", emoji: "🔥" },
  { value: "HIIT", emoji: "⚡" },
  { value: "Cardio", emoji: "🏃" },
  { value: "Yoga", emoji: "🧘" },
  { value: "Power Yoga", emoji: "🧘‍♀️" },
  { value: "Zumba", emoji: "💃" },
  { value: "Aerobics", emoji: "🩰" },
  { value: "Pilates", emoji: "🪷" },
  { value: "Boxing", emoji: "🥊" },
  { value: "Kickboxing", emoji: "🥋" },
  { value: "MMA", emoji: "🤼" },
  { value: "Calisthenics", emoji: "🤸" },
  { value: "Functional Training", emoji: "🧗" },
  { value: "Mobility & Stretching", emoji: "🦴" },
  { value: "Spinning", emoji: "🚴" },
  { value: "Swimming", emoji: "🏊" },
  { value: "Aqua Aerobics", emoji: "🌊" },
  { value: "Senior Fitness", emoji: "🧓" },
  { value: "Pre / Post-natal", emoji: "🤰" },
  { value: "Kids Fitness", emoji: "🧒" },
  { value: "Nutrition Coach", emoji: "🥗" },
  { value: "Physiotherapy / Rehab", emoji: "🩺" },
  { value: "General", emoji: "⚙️" },
];

export const SPECIALIZATION_VALUES = SPECIALIZATIONS.map((s) => s.value);

export function specEmoji(value: string): string {
  return SPECIALIZATIONS.find((s) => s.value === value)?.emoji ?? "🏷️";
}
