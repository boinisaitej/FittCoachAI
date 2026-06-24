"use server";

import { revalidatePath } from "next/cache";
import { adminCreateUser, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Row = {
  email: string;
  full_name: string;
  role: "trainer" | "client";
  phone?: string;
  gender?: "male" | "female" | "other";
  specialization?: string;
  trainer_type?: "general" | "personal" | "specialized";
  plan_kind?: "basic" | "pro";
};

type Result = {
  ok: boolean;
  email: string;
  fullName: string;
  role: string;
  tempPassword?: string;
  error?: string;
};

export async function bulkImportUsersAction(rows: Row[]) {
  const owner = await requireRole("owner");
  if (!owner.gym_id) return { ok: false as const, error: "Owner has no gym" };
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false as const, error: "No rows" };
  if (rows.length > 200) return { ok: false as const, error: "Max 200 rows per import" };

  const supabase = createClient();
  const results: Result[] = [];

  for (const r of rows) {
    try {
      const { user, tempPassword } = await adminCreateUser({
        email: r.email,
        full_name: r.full_name,
        role: r.role,
        gym_id: owner.gym_id,
        phone: r.phone,
        gender: r.gender,
      });
      if (!user) {
        results.push({ ok: false, email: r.email, fullName: r.full_name, role: r.role, error: "createUser returned no user" });
        continue;
      }
      // Optional extras
      if (r.role === "trainer") {
        await supabase
          .from("profiles")
          .update({
            specialization: r.specialization ?? null,
            trainer_type: r.trainer_type ?? null,
          })
          .eq("id", user.id);
      } else if (r.role === "client") {
        await supabase.from("client_preferences").upsert({ client_id: user.id });
        if (r.plan_kind) {
          const { data: plan } = await supabase
            .from("plans")
            .select("id,duration_days")
            .eq("gym_id", owner.gym_id)
            .eq("kind", r.plan_kind)
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
        }
      }
      results.push({ ok: true, email: r.email, fullName: r.full_name, role: r.role, tempPassword });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ ok: false, email: r.email, fullName: r.full_name, role: r.role, error: msg });
    }
  }

  revalidatePath("/owner/users");
  return { ok: true as const, results };
}
