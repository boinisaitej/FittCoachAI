"use client";

import { useState, useTransition } from "react";
import { Plus, Save, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXERCISE_TYPES, type ExerciseType } from "@/types/domain";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Prefs = {
  client_id: string;
  exercise_types: string[];
  is_vegetarian: boolean;
  ai_diet_enabled: boolean;
  ai_workout_enabled: boolean;
  water_goal_glasses: number;
  allergies?: string[] | null;
};

const COMMON_ALLERGIES = [
  "Peanuts",
  "Tree nuts",
  "Shellfish",
  "Fish",
  "Eggs",
  "Dairy / lactose",
  "Soy",
  "Wheat / gluten",
  "Sesame",
  "Mustard",
  "Sulfites",
];

export function PreferencesForm({ initial }: { initial: Prefs | null }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(
    initial ?? {
      client_id: "",
      exercise_types: [],
      is_vegetarian: false,
      ai_diet_enabled: true,
      ai_workout_enabled: true,
      water_goal_glasses: 8,
      allergies: [],
    }
  );
  const [newAllergy, setNewAllergy] = useState("");
  const [pending, start] = useTransition();

  const allergies = prefs.allergies ?? [];

  function toggleType(t: ExerciseType) {
    const types = prefs.exercise_types.includes(t)
      ? prefs.exercise_types.filter((x) => x !== t)
      : [...prefs.exercise_types, t];
    setPrefs({ ...prefs, exercise_types: types });
  }

  function addAllergy(label: string) {
    const v = label.trim();
    if (!v) return;
    if (allergies.some((a) => a.toLowerCase() === v.toLowerCase())) {
      toast.message(`"${v}" is already in your list.`);
      return;
    }
    setPrefs({ ...prefs, allergies: [...allergies, v] });
    setNewAllergy("");
  }

  function removeAllergy(label: string) {
    setPrefs({ ...prefs, allergies: allergies.filter((a) => a !== label) });
  }

  function save() {
    start(async () => {
      const supabase = createClient();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return toast.error("Not authenticated");
      const { error } = await supabase.from("client_preferences").upsert({
        ...prefs,
        allergies: allergies, // ensure normalized array
        client_id: u.user.id,
      });
      if (error) return toast.error("Failed", { description: error.message });
      toast.success("Preferences saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Exercise types */}
      <div>
        <Label className="text-sm font-medium">Exercise types you enjoy</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pick what you like — AI tailors workouts to these goals.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXERCISE_TYPES.map((et) => {
            const active = prefs.exercise_types.includes(et.value);
            return (
              <button
                key={et.value}
                type="button"
                onClick={() => toggleType(et.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "bg-card hover:bg-muted"
                )}
              >
                {et.emoji} {et.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Allergies */}
      <div className="space-y-2 rounded-lg border bg-amber-50/40 p-3 dark:bg-amber-950/15">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <Label className="text-sm font-medium">Food allergies / intolerances</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          AI will exclude every listed allergen from all generated diets. Your trainer can see this list too.
        </p>

        {/* Active allergy chips */}
        <div className="flex flex-wrap gap-1.5">
          {allergies.length === 0 && (
            <span className="text-xs text-muted-foreground">None declared yet.</span>
          )}
          {allergies.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-200"
            >
              ⚠ {a}
              <button
                type="button"
                onClick={() => removeAllergy(a)}
                className="rounded-full p-0.5 hover:bg-amber-500/30"
                aria-label={`Remove ${a}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Add input */}
        <div className="flex gap-2">
          <Input
            value={newAllergy}
            onChange={(e) => setNewAllergy(e.target.value)}
            placeholder="Type an allergen and press Enter (e.g. cashew)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAllergy(newAllergy);
              }
            }}
          />
          <Button type="button" variant="outline" onClick={() => addAllergy(newAllergy)} disabled={!newAllergy.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Common pick-list */}
        <div className="pt-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Common — tap to add
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {COMMON_ALLERGIES.filter(
              (c) => !allergies.some((a) => a.toLowerCase() === c.toLowerCase())
            ).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => addAllergy(c)}
                className="rounded-full border bg-card px-2 py-0.5 text-xs transition-colors hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                + {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Switches + water goal */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SwitchRow
          label="Vegetarian"
          checked={prefs.is_vegetarian}
          onChange={(v) => setPrefs({ ...prefs, is_vegetarian: v })}
        />
        <SwitchRow
          label="AI Diet"
          checked={prefs.ai_diet_enabled}
          onChange={(v) => setPrefs({ ...prefs, ai_diet_enabled: v })}
        />
        <SwitchRow
          label="AI Workout"
          checked={prefs.ai_workout_enabled}
          onChange={(v) => setPrefs({ ...prefs, ai_workout_enabled: v })}
        />
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label className="text-sm">Daily water goal</Label>
          <Input
            type="number"
            min={1}
            max={20}
            className="w-20"
            value={prefs.water_goal_glasses}
            onChange={(e) => setPrefs({ ...prefs, water_goal_glasses: parseInt(e.target.value || "0", 10) })}
          />
        </div>
      </div>

      <Button onClick={save} disabled={pending} variant="gradient">
        <Save className="h-4 w-4" />
        {pending ? "Saving..." : "Save preferences"}
      </Button>

      <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        💡 Got an injury or health issue? Log them on the{" "}
        <a href="/client/health" className="font-medium text-primary hover:underline">
          Health page
        </a>{" "}
        — your trainer sees those in real time too.
      </div>
    </div>
  );
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
