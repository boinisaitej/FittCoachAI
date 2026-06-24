"use server";

import { revalidatePath } from "next/cache";
import { adminCreateUser, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Stage = "new" | "trial" | "paid" | "lost";

export async function createLeadAction(args: {
  full_name: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
}) {
  const owner = await requireRole("owner");
  if (!owner.gym_id) return { ok: false as const, error: "Owner has no gym" };
  const supabase = createClient();
  const { error } = await supabase.from("leads").insert({
    gym_id: owner.gym_id,
    full_name: args.full_name,
    email: args.email ?? null,
    phone: args.phone ?? null,
    source: args.source ?? "walkin",
    notes: args.notes ?? null,
    stage: "new",
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/owner/leads");
  return { ok: true as const };
}

export async function updateLeadStageAction(id: string, stage: Stage) {
  await requireRole("owner");
  const supabase = createClient();
  const { error } = await supabase.from("leads").update({ stage }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/owner/leads");
  return { ok: true as const };
}

export async function deleteLeadAction(id: string) {
  await requireRole("owner");
  const supabase = createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/owner/leads");
  return { ok: true as const };
}

/**
 * Convert a lead into a paid client: creates an auth user + profile, optionally
 * assigns a Basic plan, then marks the lead as "paid" with converted_client_id.
 */
export async function convertLeadAction(id: string) {
  const owner = await requireRole("owner");
  if (!owner.gym_id) return { ok: false as const, error: "Owner has no gym" };

  const supabase = createClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .select("id,full_name,email,phone")
    .eq("id", id)
    .single();
  if (error || !lead) return { ok: false as const, error: error?.message ?? "Lead not found" };
  if (!lead.email) return { ok: false as const, error: "Lead needs an email before conversion" };

  const { user, tempPassword } = await adminCreateUser({
    email: lead.email,
    full_name: lead.full_name,
    role: "client",
    gym_id: owner.gym_id,
    phone: lead.phone ?? undefined,
  });
  if (!user) return { ok: false as const, error: "Could not create account" };

  // Default-create client_preferences + assign Basic plan
  await supabase.from("client_preferences").upsert({ client_id: user.id });
  const { data: plan } = await supabase
    .from("plans")
    .select("id,duration_days")
    .eq("gym_id", owner.gym_id)
    .eq("kind", "basic")
    .maybeSingle();
  if (plan) {
    const end = new Date();
    end.setDate(end.getDate() + plan.duration_days);
    await supabase.from("subscriptions").insert({
      client_id: user.id,
      plan_id: plan.id,
      end_date: end.toISOString().slice(0, 10),
      status: "active",
    });
  }

  await supabase
    .from("leads")
    .update({ stage: "paid", converted_client_id: user.id })
    .eq("id", id);

  revalidatePath("/owner/leads");
  revalidatePath("/owner/users");
  return { ok: true as const, tempPassword, email: lead.email };
}
