"use server";

import { revalidatePath } from "next/cache";
import { adminCreateUser, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, Templates } from "@/lib/email";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { z } from "zod";

// HTML forms submit empty strings for unfilled fields. Convert "" → undefined
// before enum/number validation runs so optional fields actually behave as such.
const emptyToUndef = (val: unknown) => (val === "" ? undefined : val);

const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(["trainer", "client"]),
  phone: z.preprocess(emptyToUndef, z.string().optional()),
  gender: z.preprocess(emptyToUndef, z.enum(["male", "female", "other"]).optional()),
  dob: z.preprocess(emptyToUndef, z.string().optional()),
  height_cm: z.preprocess(emptyToUndef, z.coerce.number().optional()),
  weight_kg: z.preprocess(emptyToUndef, z.coerce.number().optional()),
  specialization: z.preprocess(emptyToUndef, z.string().optional()),
  trainer_type: z.preprocess(emptyToUndef, z.enum(["general", "personal", "specialized"]).optional()),
  plan_kind: z.preprocess(emptyToUndef, z.enum(["basic", "pro"]).optional()),
  password: z.preprocess(emptyToUndef, z.string().min(8).optional()),
  availability_days: z.preprocess(emptyToUndef, z.string().optional()),
  availability_start: z.preprocess(emptyToUndef, z.string().optional()),
  availability_end: z.preprocess(emptyToUndef, z.string().optional()),
  availability_note: z.preprocess(emptyToUndef, z.string().optional()),
});

export async function createUserAction(formData: FormData) {
  const owner = await requireRole("owner");
  const raw = Object.fromEntries(formData.entries());
  const parsed = createUserSchema.parse(raw);

  const { user, tempPassword } = await adminCreateUser({
    email: parsed.email,
    full_name: parsed.full_name,
    role: parsed.role,
    gym_id: owner.gym_id!,
    phone: parsed.phone,
    gender: parsed.gender,
    password: parsed.password,
  });

  if (!user) return { ok: false, error: "Could not create user" };

  const supabase = createClient();

  // Pack the trainer availability fields into a single JSON column.
  const availability = parsed.role === "trainer"
    ? {
        days: parsed.availability_days ? parsed.availability_days.split(",").filter(Boolean) : [],
        start: parsed.availability_start ?? null,
        end: parsed.availability_end ?? null,
        note: parsed.availability_note ?? null,
      }
    : {};

  // Persist optional extra fields
  await supabase
    .from("profiles")
    .update({
      dob: parsed.dob || null,
      height_cm: parsed.height_cm ?? null,
      weight_kg: parsed.weight_kg ?? null,
      specialization: parsed.specialization ?? null,
      trainer_type: parsed.trainer_type ?? null,
      availability,
    })
    .eq("id", user.id);

  // Auto-create default preferences for clients
  if (parsed.role === "client") {
    await supabase.from("client_preferences").upsert({ client_id: user.id });
    if (parsed.plan_kind) {
      const { data: plan } = await supabase
        .from("plans")
        .select("id, duration_days, kind")
        .eq("gym_id", owner.gym_id!)
        .eq("kind", parsed.plan_kind)
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

  // Background — fire-and-forget so the action returns immediately.
  void (async () => {
    try {
      const { data: gym } = await supabase.from("gyms").select("name").eq("id", owner.gym_id!).single();
      const gymName = gym?.name ?? "FitCoachAI";
      await Promise.allSettled([
        sendEmail({
          to: parsed.email,
          subject: `Welcome to ${gymName}`,
          template: "welcome",
          html: Templates.welcome({
            name: parsed.full_name,
            email: parsed.email,
            tempPassword,
            gym: gymName,
            loginUrl: `${env.NEXT_PUBLIC_APP_URL}/login`,
          }),
        }),
        supabase.from("notifications").insert({
          recipient_id: user.id,
          kind: "welcome",
          title: `Welcome to ${gymName}`,
          body: "Your account is ready. Update your password on first sign-in.",
          link: "/account",
        }),
      ]);
    } catch (err) {
      console.warn("[createUserAction] post-create side effects failed:", err);
    }
  })();

  await audit({
    gym_id: owner.gym_id,
    actor_id: owner.id,
    action: "user.create",
    target_kind: "profiles",
    target_id: user.id,
    payload: { email: parsed.email, role: parsed.role },
  });

  revalidatePath("/owner/users");
  return {
    ok: true,
    id: user.id,
    email: parsed.email,
    fullName: parsed.full_name,
    role: parsed.role,
    tempPassword,
  };
}

export async function setActiveAction(id: string, active: boolean) {
  const owner = await requireRole("owner");
  const supabase = createClient();
  await supabase.from("profiles").update({ active }).eq("id", id).neq("role", "owner");
  await audit({
    gym_id: owner.gym_id,
    actor_id: owner.id,
    action: active ? "user.reactivate" : "user.deactivate",
    target_kind: "profiles",
    target_id: id,
  });
  revalidatePath("/owner/users");
  return { ok: true };
}

export async function resetPasswordAction(id: string) {
  await requireRole("owner");
  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("email").eq("id", id).single();
  if (!profile?.email) return { ok: false };
  // Trigger Supabase magic-link reset (delivers via email if SMTP set on Supabase)
  await supabase.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });
  return { ok: true };
}

/* ───── Gym-level specialization management ─────────────────────────── */

export async function listGymSpecializationsAction(): Promise<string[]> {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const { data } = await supabase
    .from("gyms")
    .select("specializations")
    .eq("id", owner.gym_id!)
    .maybeSingle();
  return (data?.specializations as string[] | null) ?? [];
}

export async function addGymSpecializationAction(label: string) {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const trimmed = label.trim();
  if (!trimmed || trimmed.length > 64) return { ok: false, error: "Invalid label" };
  const { data: gym } = await supabase
    .from("gyms")
    .select("specializations")
    .eq("id", owner.gym_id!)
    .maybeSingle();
  const current = (gym?.specializations as string[] | null) ?? [];
  if (current.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: true, list: current, duplicate: true };
  }
  const next = [...current, trimmed];
  await supabase.from("gyms").update({ specializations: next }).eq("id", owner.gym_id!);
  revalidatePath("/owner/users");
  return { ok: true, list: next };
}

export async function removeGymSpecializationAction(label: string, opts?: { reassignTo?: string }) {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const { data: gym } = await supabase
    .from("gyms")
    .select("specializations")
    .eq("id", owner.gym_id!)
    .maybeSingle();
  const current = (gym?.specializations as string[] | null) ?? [];
  const next = current.filter((s) => s !== label);
  await supabase.from("gyms").update({ specializations: next }).eq("id", owner.gym_id!);

  // Re-tag any trainers who were on the removed spec so they don't dangle on
  // a missing label. If a reassign target is provided & still in the list,
  // move them there; otherwise clear the field.
  const target = opts?.reassignTo && next.includes(opts.reassignTo) ? opts.reassignTo : null;
  await supabase
    .from("profiles")
    .update({ specialization: target })
    .eq("gym_id", owner.gym_id!)
    .eq("role", "trainer")
    .eq("specialization", label);

  revalidatePath("/owner/users");
  revalidatePath("/owner/specializations");
  return { ok: true, list: next };
}

export async function renameGymSpecializationAction(oldLabel: string, newLabel: string) {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const trimmed = newLabel.trim();
  if (!trimmed) return { ok: false, error: "Empty label" };
  if (trimmed === oldLabel) return { ok: true };

  const { data: gym } = await supabase
    .from("gyms")
    .select("specializations")
    .eq("id", owner.gym_id!)
    .maybeSingle();
  const current = (gym?.specializations as string[] | null) ?? [];

  if (current.some((s) => s !== oldLabel && s.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: "Another specialization with that name already exists" };
  }

  const next = current.map((s) => (s === oldLabel ? trimmed : s));
  await supabase.from("gyms").update({ specializations: next }).eq("id", owner.gym_id!);

  // Cascade rename onto every trainer profile pointing at the old label.
  await supabase
    .from("profiles")
    .update({ specialization: trimmed })
    .eq("gym_id", owner.gym_id!)
    .eq("role", "trainer")
    .eq("specialization", oldLabel);

  revalidatePath("/owner/users");
  revalidatePath("/owner/specializations");
  return { ok: true, list: next };
}

export async function trainerCountsBySpecializationAction(): Promise<Record<string, number>> {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("specialization")
    .eq("gym_id", owner.gym_id!)
    .eq("role", "trainer")
    .eq("active", true);
  const counts: Record<string, number> = {};
  for (const r of data ?? []) {
    const key = r.specialization ?? "—";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
