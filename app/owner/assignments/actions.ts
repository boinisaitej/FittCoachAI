"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export async function assignTrainerAction(clientId: string, trainerId: string) {
  const owner = await requireRole("owner");
  const supabase = createClient();
  // Run the close-out of any existing assignment and the new insert in
  // parallel. The DB enforces the "one active assignment per client" rule
  // via the partial unique index — if it races, the second insert errors and
  // we ignore it (the close-out always wins).
  await Promise.all([
    supabase
      .from("trainer_clients")
      .update({ ended_at: new Date().toISOString() })
      .eq("client_id", clientId)
      .is("ended_at", null),
  ]);
  await supabase.from("trainer_clients").insert({ client_id: clientId, trainer_id: trainerId });
  await audit({
    gym_id: owner.gym_id,
    actor_id: owner.id,
    action: "trainer.assign",
    target_kind: "trainer_clients",
    target_id: clientId,
    payload: { trainer_id: trainerId },
  });
  revalidatePath("/owner/assignments");
  return { ok: true };
}

export async function autoMatchAllAction() {
  const owner = await requireRole("owner");
  const supabase = createClient();

  const [{ data: clients }, { data: trainers }, { data: subs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,gender")
      .eq("gym_id", owner.gym_id!)
      .eq("role", "client")
      .eq("active", true),
    supabase
      .from("profiles")
      .select("id,gender,trainer_type")
      .eq("gym_id", owner.gym_id!)
      .eq("role", "trainer")
      .eq("active", true),
    supabase
      .from("subscriptions")
      .select("client_id,plan_id,plans:plan_id(kind)")
      .eq("status", "active"),
  ]);

  const { data: existing } = await supabase
    .from("trainer_clients")
    .select("client_id,trainer_id")
    .is("ended_at", null);
  const assigned = new Set((existing ?? []).map((a) => a.client_id));
  const load = new Map<string, number>();
  (existing ?? []).forEach((a) => load.set(a.trainer_id, (load.get(a.trainer_id) ?? 0) + 1));

  const planByClient = new Map(
    (subs ?? []).map((s) => [s.client_id, (s.plans as { kind: string } | null)?.kind])
  );

  // Build all matches in memory FIRST, then bulk-insert once. Previously each
  // client was a separate INSERT round-trip — 30 clients = 30 sequential
  // network calls. Now it's one batched insert.
  const matches: { client_id: string; trainer_id: string }[] = [];
  for (const client of clients ?? []) {
    if (assigned.has(client.id)) continue;
    const isPro = planByClient.get(client.id) === "pro";

    let pool = (trainers ?? []).filter((t) => {
      if (client.gender === "female" && t.gender !== "female") return false;
      if (isPro && t.trainer_type !== "personal") return false;
      return true;
    });
    if (pool.length === 0) pool = trainers ?? [];
    if (pool.length === 0) break;

    pool.sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0));
    const chosen = pool[0];
    matches.push({ client_id: client.id, trainer_id: chosen.id });
    load.set(chosen.id, (load.get(chosen.id) ?? 0) + 1);
  }

  if (matches.length) {
    await supabase.from("trainer_clients").insert(matches);
  }
  revalidatePath("/owner/assignments");
  return { ok: true, matched: matches.length };
}
