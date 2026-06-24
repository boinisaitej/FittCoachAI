"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateSlogans } from "@/lib/ai";

export async function addSloganAction(gymId: string, text: string) {
  await requireRole("owner");
  const supabase = createClient();
  await supabase.from("slogans").insert({ gym_id: gymId, text, source: "owner" });
  revalidatePath("/owner/slogans");
  return { ok: true };
}

export async function generateAiSlogansAction(gymId: string, count = 6) {
  await requireRole("owner");
  const supabase = createClient();
  const res = await generateSlogans(count);
  if (!res.ok) return { ok: false, error: res.error };
  const slogans = res.data.slogans ?? [];
  if (slogans.length) {
    await supabase
      .from("slogans")
      .insert(slogans.map((t) => ({ gym_id: gymId, text: t, source: "ai" as const })));
  }
  revalidatePath("/owner/slogans");
  return { ok: true, count: slogans.length };
}
