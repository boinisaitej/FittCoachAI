import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { autoProgression } from "@/lib/ai";
import { buildClientContext } from "@/lib/ai/client-context";
import { assertCron } from "@/lib/cron";
import { weekStart } from "@/lib/utils";

/**
 * Monday 06:00 — generate AI auto-progression proposals for every active client.
 * Vercel cron: { "path": "/api/cron/auto-progression?secret=$CRON_SECRET", "schedule": "0 6 * * 1" }
 */
export async function GET(req: Request) {
  try {
    assertCron(req);
  } catch (e) {
    return e as Response;
  }

  const supabase = createServiceClient();
  const start = weekStart(new Date(Date.now() - 7 * 86400000)).toISOString().slice(0, 10);
  const end = new Date().toISOString().slice(0, 10);

  const { data: clients } = await supabase
    .from("subscriptions")
    .select("client_id")
    .eq("status", "active");
  let proposals = 0;

  for (const c of clients ?? []) {
    const ctx = await buildClientContext(c.client_id);
    const { data: adherenceRaw } = await supabase.rpc("adherence_pct", {
      p_client: c.client_id,
      p_from: start,
      p_to: end,
    });
    const prop = await autoProgression(ctx, {
      focus: "general",
      adherence: Number(adherenceRaw ?? 0),
      topMissed: [],
    });
    if (!prop.ok) {
      console.warn(`[cron:auto-progression] AI failed for ${c.client_id}: ${prop.error}`);
      continue;
    }
    const { data: assign } = await supabase
      .from("trainer_clients")
      .select("trainer_id")
      .eq("client_id", c.client_id)
      .is("ended_at", null)
      .maybeSingle();
    if (assign?.trainer_id) {
      await supabase.from("trainer_alerts").insert({
        trainer_id: assign.trainer_id,
        client_id: c.client_id,
        kind: "stale_todos",
        payload: { proposal: prop.data },
      });
      proposals++;
    }
  }
  return NextResponse.json({ ok: true, proposals });
}
