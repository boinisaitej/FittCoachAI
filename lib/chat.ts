import "server-only";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Thread } from "@/components/chat/chat-shell";

/**
 * Load conversations + ensure default threads exist:
 *  - client ↔ their trainer (auto)
 *  - client ↔ gym owner (auto, on first chat open)
 */
export async function loadThreads(userId: string): Promise<Thread[]> {
  const supabase = createClient();

  const { data: me } = await supabase.from("profiles").select("role,gym_id").eq("id", userId).single();
  if (!me) return [];

  // Auto-create thread to trainer (for clients)
  if (me.role === "client") {
    const { data: assign } = await supabase
      .from("trainer_clients")
      .select("trainer_id")
      .eq("client_id", userId)
      .is("ended_at", null)
      .maybeSingle();
    if (assign?.trainer_id) {
      await ensureThread(supabase, "trainer_client", me.gym_id, [userId, assign.trainer_id]);
    }
  }

  // For Owner: ensure a 1:1 thread with every active trainer + client in the gym.
  if (me.role === "owner" && me.gym_id) {
    const { data: members } = await supabase
      .from("profiles")
      .select("id,role")
      .eq("gym_id", me.gym_id)
      .eq("active", true)
      .neq("id", userId);
    for (const m of members ?? []) {
      const kind: "owner_trainer" | "owner_client" =
        m.role === "trainer" ? "owner_trainer" : "owner_client";
      await ensureThread(supabase, kind, me.gym_id, [userId, m.id]);
    }
  }

  // Pull all threads where I am a participant
  const { data: rows } = await supabase
    .from("chat_threads")
    .select("id,title,kind,participant_ids,created_at")
    .contains("participant_ids", [userId])
    .order("created_at", { ascending: false });

  if (!rows?.length) return [];

  const otherIds = Array.from(new Set(rows.flatMap((r) => r.participant_ids).filter((id) => id !== userId)));

  // IMPORTANT: use the service-role client here so we can ALWAYS read the
  // peer's name + role, even when the viewer's RLS policy would block it
  // (e.g. a client looking up their trainer's profile). Membership in the
  // same chat thread is already proof of permission to see them.
  let peers: { id: string; full_name: string | null; email: string | null; avatar_url: string | null; role: "owner" | "trainer" | "client" }[] = [];
  if (otherIds.length) {
    try {
      const admin = createServiceClient();
      const { data } = await admin
        .from("profiles")
        .select("id,full_name,email,avatar_url,role")
        .in("id", otherIds);
      peers = (data ?? []) as typeof peers;
    } catch {
      // Service-role key missing in env → fall back to the user-bound client.
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,email,avatar_url,role")
        .in("id", otherIds);
      peers = (data ?? []) as typeof peers;
    }
  }

  const peerMap = new Map(peers.map((p) => [p.id, p]));

  // Last message preview
  const { data: lastMsgs } = await supabase
    .from("chat_messages")
    .select("thread_id,body,created_at")
    .in("thread_id", rows.map((r) => r.id))
    .order("created_at", { ascending: false });
  const lastByThread = new Map<string, { body: string; created_at: string }>();
  for (const m of lastMsgs ?? []) {
    if (!lastByThread.has(m.thread_id)) lastByThread.set(m.thread_id, { body: m.body, created_at: m.created_at });
  }

  return rows.map((r) => {
    const kind = r.kind;
    const fallbackRoleFromKind = (otherId: string): "owner" | "trainer" | "client" => {
      if (kind === "owner_client" || kind === "owner_trainer") {
        // The non-self participant is the owner if we're not the owner.
        return me.role === "owner" ? (kind === "owner_trainer" ? "trainer" : "client") : "owner";
      }
      if (kind === "trainer_client") {
        return me.role === "trainer" ? "client" : "trainer";
      }
      void otherId;
      return "client";
    };
    return {
      id: r.id,
      title: r.title,
      kind,
      participants: r.participant_ids.map((id) => {
        const p = peerMap.get(id);
        if (p) return p;
        const role = id === userId ? me.role : fallbackRoleFromKind(id);
        const labelByRole = { owner: "Gym Owner", trainer: "Trainer", client: "Client" } as const;
        return {
          id,
          full_name: id === userId ? null : labelByRole[role],
          email: null,
          avatar_url: null,
          role,
        };
      }),
      lastBody: lastByThread.get(r.id)?.body ?? null,
      lastAt: lastByThread.get(r.id)?.created_at ?? null,
    };
  });
}

type SupabaseLike = ReturnType<typeof createClient>;

async function ensureThread(
  supabase: SupabaseLike,
  kind: "trainer_client" | "owner_client" | "owner_trainer",
  gymId: string | null,
  participants: string[]
) {
  const sorted = [...participants].sort();
  const { data: existing } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("kind", kind)
    .contains("participant_ids", sorted)
    .maybeSingle();
  if (existing) return existing.id;
  const { data } = await supabase
    .from("chat_threads")
    .insert({ kind, gym_id: gymId, participant_ids: sorted })
    .select("id")
    .single();
  return data?.id ?? null;
}
