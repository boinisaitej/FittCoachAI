import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const user = await requireRole("client");
  const { tag, severity, notes } = (await req.json()) as { tag: string; severity: "mild" | "moderate" | "severe"; notes?: string };
  const supabase = createClient();
  await supabase.from("injuries").insert({ client_id: user.id, tag, severity: severity ?? "mild", notes: notes ?? null });

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
      kind: "injury",
      payload: { tag, severity },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const user = await requireRole("client");
  const { id, resolve } = (await req.json()) as { id: string; resolve?: boolean };
  const supabase = createClient();
  await supabase
    .from("injuries")
    .update({ resolved_at: resolve ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("client_id", user.id);
  return NextResponse.json({ ok: true });
}
