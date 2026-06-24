"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updatePlanAction(planId: string, fields: { price_cents?: number; duration_days?: number; name?: string; active?: boolean }) {
  await requireRole("owner");
  const supabase = createClient();
  await supabase.from("plans").update(fields).eq("id", planId);
  revalidatePath("/owner/plans");
  return { ok: true };
}

export async function extendSubscriptionAction(subId: string, days: number) {
  await requireRole("owner");
  const supabase = createClient();
  const { data: sub } = await supabase.from("subscriptions").select("end_date").eq("id", subId).single();
  if (!sub) return { ok: false };
  const newEnd = new Date(sub.end_date);
  newEnd.setDate(newEnd.getDate() + days);
  await supabase
    .from("subscriptions")
    .update({ end_date: newEnd.toISOString().slice(0, 10), status: "active" })
    .eq("id", subId);
  revalidatePath("/owner/plans");
  return { ok: true };
}

export async function discountSubscriptionAction(subId: string, pct: number) {
  await requireRole("owner");
  const supabase = createClient();
  await supabase
    .from("subscriptions")
    .update({ discount_pct: Math.max(0, Math.min(100, pct)) })
    .eq("id", subId);
  revalidatePath("/owner/plans");
  return { ok: true };
}
