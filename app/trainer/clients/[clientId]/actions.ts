"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TodoKind } from "@/types/domain";

async function assertOwnership(clientId: string) {
  const trainer = await requireRole("trainer");
  const supabase = createClient();
  const { data } = await supabase
    .from("trainer_clients")
    .select("id")
    .eq("trainer_id", trainer.id)
    .eq("client_id", clientId)
    .is("ended_at", null)
    .maybeSingle();
  if (!data) throw new Error("Not your client");
  return { trainer, supabase };
}

type ItemDraft = {
  id?: string;
  kind: TodoKind;
  title: string;
  description?: string;
  quantity?: string;
  ai_reason?: string;
  position: number;
};

export async function saveDailyPlanAction(clientId: string, items: ItemDraft[], date?: string) {
  const { trainer, supabase } = await assertOwnership(clientId);
  const planDate = date ?? new Date().toISOString().slice(0, 10);

  let { data: plan } = await supabase
    .from("daily_plans")
    .select("id")
    .eq("client_id", clientId)
    .eq("plan_date", planDate)
    .maybeSingle();
  if (!plan) {
    const { data: created, error } = await supabase
      .from("daily_plans")
      .insert({ client_id: clientId, trainer_id: trainer.id, plan_date: planDate })
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: error?.message };
    plan = created;
  }

  await supabase.from("daily_plan_items").delete().eq("daily_plan_id", plan.id);
  if (items.length) {
    await supabase.from("daily_plan_items").insert(
      items.map((it) => ({
        daily_plan_id: plan!.id,
        kind: it.kind,
        title: it.title,
        description: it.description ?? null,
        quantity: it.quantity ?? null,
        ai_reason: it.ai_reason ?? null,
        position: it.position,
      }))
    );
  }

  revalidatePath(`/trainer/clients/${clientId}`);
  return { ok: true };
}

/**
 * Saves a 7-day batch of daily plans for a client. Used by the trainer's
 * "Week plan" tab. Each day is a separate daily_plans row + items, written
 * in parallel.
 */
export async function saveWeekPlanAction(
  clientId: string,
  weekStart: string,
  byDate: Record<string, ItemDraft[]>
) {
  const { trainer, supabase } = await assertOwnership(clientId);

  const dates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  for (const date of dates) {
    const items = byDate[date] ?? [];
    let { data: plan } = await supabase
      .from("daily_plans")
      .select("id")
      .eq("client_id", clientId)
      .eq("plan_date", date)
      .maybeSingle();
    if (!plan) {
      const { data: created } = await supabase
        .from("daily_plans")
        .insert({ client_id: clientId, trainer_id: trainer.id, plan_date: date })
        .select("id")
        .single();
      plan = created ?? null;
      if (!plan) continue;
    }
    await supabase.from("daily_plan_items").delete().eq("daily_plan_id", plan.id);
    if (items.length) {
      await supabase.from("daily_plan_items").insert(
        items.map((it) => ({
          daily_plan_id: plan!.id,
          kind: it.kind,
          title: it.title,
          description: it.description ?? null,
          quantity: it.quantity ?? null,
          ai_reason: it.ai_reason ?? null,
          position: it.position,
        }))
      );
    }
  }

  revalidatePath(`/trainer/clients/${clientId}`);
  return { ok: true, days: dates.length };
}

export async function grantCheatDayAction(clientId: string, reason: string) {
  const { trainer, supabase } = await assertOwnership(clientId);
  const date = new Date().toISOString().slice(0, 10);
  await supabase.from("cheat_days").upsert({
    client_id: clientId,
    trainer_id: trainer.id,
    cheat_date: date,
    reason: reason || null,
  });
  await supabase.from("notifications").insert({
    recipient_id: clientId,
    kind: "system",
    title: "Cheat day unlocked 🎉",
    body: reason || "Enjoy your treats today (within reason).",
  });
  revalidatePath(`/trainer/clients/${clientId}`);
  return { ok: true };
}

export async function saveNoteAction(clientId: string, body: string) {
  const { trainer, supabase } = await assertOwnership(clientId);
  // Reuse trainer_summaries with week_start = today as a "note timeline"
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("trainer_summaries").upsert(
    { trainer_id: trainer.id, week_start: today, body },
    { onConflict: "trainer_id,week_start" }
  );
  revalidatePath(`/trainer/clients/${clientId}`);
  return { ok: true };
}
