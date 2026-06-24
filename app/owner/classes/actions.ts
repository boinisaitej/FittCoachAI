"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createClassAction(args: {
  title: string;
  category: string;
  trainerId?: string;
  startAt: string; // ISO
  endAt: string;
  capacity: number;
  notes?: string;
}) {
  const owner = await requireRole("owner");
  if (!owner.gym_id) return { ok: false as const, error: "Owner has no gym" };
  if (!args.title.trim()) return { ok: false as const, error: "Title required" };
  if (!args.startAt || !args.endAt) return { ok: false as const, error: "Start + end required" };
  if (args.capacity < 1) return { ok: false as const, error: "Capacity must be > 0" };

  const supabase = createClient();
  const { error } = await supabase.from("gym_classes").insert({
    gym_id: owner.gym_id,
    trainer_id: args.trainerId ?? null,
    title: args.title.trim(),
    category: args.category || "general",
    start_at: args.startAt,
    end_at: args.endAt,
    capacity: args.capacity,
    notes: args.notes ?? null,
  });
  if (error) return { ok: false as const, error: error.message };

  await supabase.from("audit_log").insert({
    gym_id: owner.gym_id,
    actor_id: owner.id,
    action: "class.create",
    target_kind: "gym_classes",
    payload: { title: args.title, start_at: args.startAt },
  });

  revalidatePath("/owner/classes");
  revalidatePath("/client/classes");
  return { ok: true as const };
}

export async function cancelClassAction(id: string) {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const { error } = await supabase
    .from("gym_classes")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("gym_id", owner.gym_id!);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from("audit_log").insert({
    gym_id: owner.gym_id,
    actor_id: owner.id,
    action: "class.cancel",
    target_kind: "gym_classes",
    target_id: id,
  });

  revalidatePath("/owner/classes");
  revalidatePath("/client/classes");
  return { ok: true as const };
}
