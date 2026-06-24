"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function broadcastAction(args: { title: string; body: string }) {
  const trainer = await requireRole("trainer");
  const supabase = createClient();
  const { data: assignments } = await supabase
    .from("trainer_clients")
    .select("client_id,profiles:client_id(active)")
    .eq("trainer_id", trainer.id)
    .is("ended_at", null);
  const recipientIds = (assignments ?? [])
    .filter((a) => (a.profiles as { active?: boolean } | null)?.active !== false)
    .map((a) => a.client_id);

  if (!recipientIds.length) return { ok: false, error: "No active clients." };

  // Create one broadcast thread + post a message visible to all (one row per recipient via separate threads)
  // Simpler: drop a notification + a single broadcast chat thread with all participants.
  const { data: thread } = await supabase
    .from("chat_threads")
    .insert({
      gym_id: trainer.gym_id,
      kind: "broadcast",
      participant_ids: [trainer.id, ...recipientIds],
      title: args.title,
    })
    .select("id")
    .single();

  if (thread) {
    await supabase.from("chat_messages").insert({
      thread_id: thread.id,
      sender_id: trainer.id,
      body: `${args.title}\n\n${args.body}`,
    });
  }

  await supabase.from("notifications").insert(
    recipientIds.map((id) => ({
      recipient_id: id,
      kind: "broadcast" as const,
      title: args.title,
      body: args.body,
      link: "/client/chat",
    }))
  );

  revalidatePath("/trainer/broadcast");
  return { ok: true, count: recipientIds.length };
}
