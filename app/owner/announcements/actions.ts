"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, Templates } from "@/lib/email";
import { env } from "@/lib/env";

export async function createAnnouncementAction(args: {
  title: string;
  body: string;
  audience: { roles: ("trainer" | "client")[]; sendEmail: boolean };
  scheduleFor?: string;
}) {
  const owner = await requireRole("owner");
  const supabase = createClient();

  const isFuture = !!args.scheduleFor && new Date(args.scheduleFor).getTime() > Date.now();
  const { data: ann, error } = await supabase
    .from("announcements")
    .insert({
      gym_id: owner.gym_id!,
      author_id: owner.id,
      title: args.title,
      body: args.body,
      audience: args.audience,
      scheduled_for: isFuture ? args.scheduleFor : null,
      sent_at: isFuture ? null : new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !ann) return { ok: false, error: error?.message };

  // For immediate sends, kick off fan-out in the background so the action
  // returns instantly. The page revalidates and the toast fires before all
  // emails finish.
  if (!isFuture) {
    void fanout(ann.id, owner.gym_id!, args).catch((err) =>
      console.warn("[announcement fanout]", err)
    );
  }
  revalidatePath("/owner/announcements");
  return { ok: true };
}

export async function fanout(
  announcementId: string,
  gymId: string,
  args: { title: string; body: string; audience: { roles: ("trainer" | "client")[]; sendEmail: boolean } }
) {
  const supabase = createClient();
  const { data: recipients } = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .eq("gym_id", gymId)
    .in("role", args.audience.roles);

  if (!recipients?.length) return;

  // Bulk-insert bell notifications + parallel emails — all kick off together.
  const notifyTask = supabase.from("notifications").insert(
    recipients.map((r) => ({
      recipient_id: r.id,
      kind: "announcement" as const,
      title: args.title,
      body: args.body,
      link: "/notifications",
    }))
  );

  const emailTasks = args.audience.sendEmail
    ? recipients
        .filter((r) => !!r.email)
        .map((r) =>
          sendEmail({
            to: r.email!,
            subject: args.title,
            template: "announcement",
            html: Templates.announcement({
              title: args.title,
              body: args.body,
              appUrl: env.NEXT_PUBLIC_APP_URL,
            }),
          })
        )
    : [];

  await Promise.allSettled([notifyTask, ...emailTasks]);

  await supabase
    .from("announcements")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", announcementId);
}
