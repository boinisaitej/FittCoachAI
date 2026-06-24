import { createServiceClient } from "@/lib/supabase/server";

export type AuditAction =
  | "user.create"
  | "user.deactivate"
  | "user.reactivate"
  | "trainer.assign"
  | "subscription.create"
  | "subscription.extend"
  | "invoice.issue"
  | "invoice.mark_paid"
  | "invoice.cancel"
  | "announcement.create"
  | "class.create"
  | "class.cancel"
  | "lead.convert"
  | "plan.create"
  | "specialization.add"
  | "specialization.remove";

type AuditInput = {
  gym_id: string | null;
  actor_id: string | null;
  action: AuditAction | string;
  target_kind?: string | null;
  target_id?: string | null;
  payload?: Record<string, unknown> | null;
};

export async function audit(input: AuditInput): Promise<void> {
  try {
    const admin = createServiceClient();
    await admin.from("audit_log").insert({
      gym_id: input.gym_id,
      actor_id: input.actor_id,
      action: input.action,
      target_kind: input.target_kind ?? null,
      target_id: input.target_id ?? null,
      payload: input.payload ?? null,
    });
  } catch {
    /* audit must never break a user action */
  }
}
