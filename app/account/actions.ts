"use server";

import { revalidatePath } from "next/cache";
import { invalidateUserCache, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ProfilePatch = {
  full_name?: string | null;
  phone?: string | null;
  gender?: "male" | "female" | "other" | null;
  dob?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  language?: string;
};

type GymPatch = { name?: string; address?: string };

/**
 * Update the signed-in user's profile (and optionally their gym for owners).
 * Bumps `updated_at` so peers see the new value on their next read, and
 * invalidates the self-side session cache so the topbar/sidebar refresh
 * without waiting for the 5-minute TTL.
 */
export async function saveProfileAction(input: { profile: ProfilePatch; gym?: GymPatch | null }) {
  const user = await requireUser();
  const supabase = createClient();

  const { error } = await (supabase as any)
    .from("profiles")
    .update({ ...input.profile, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  if (user.role === "owner" && user.gym_id && input.gym) {
    const { error: gErr } = await (supabase as any)
      .from("gyms")
      .update({ name: input.gym.name, address: input.gym.address })
      .eq("id", user.gym_id);
    if (gErr) return { ok: false, error: gErr.message };
  }

  invalidateUserCache(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
