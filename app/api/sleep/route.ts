import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";

export async function POST(req: Request) {
  const user = await requireRole("client");
  const { hours, notes } = (await req.json()) as { hours: number; notes?: string };
  if (!hours) return NextResponse.json({ error: "hours required" }, { status: 400 });
  const supabase = createClient();
  await supabase
    .from("sleep_logs")
    .upsert(
      { client_id: user.id, log_date: todayISO(), hours, notes: notes ?? null },
      { onConflict: "client_id,log_date" }
    );
  if (hours < 6) {
    const { data: assign } = await supabase
      .from("trainer_clients")
      .select("trainer_id")
      .eq("client_id", user.id)
      .is("ended_at", null)
      .maybeSingle();
    if (assign?.trainer_id) {
      await supabase.from("trainer_alerts").insert({
        trainer_id: assign.trainer_id,
        client_id: user.id,
        kind: "sleep_low",
        payload: { hours },
      });
    }
  }
  return NextResponse.json({ ok: true });
}
