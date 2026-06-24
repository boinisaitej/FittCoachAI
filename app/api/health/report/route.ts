import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { healthRemedy } from "@/lib/ai";
import { buildClientContext } from "@/lib/ai/client-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireRole("client");
  const { problem, severity } = (await req.json()) as { problem: string; severity: "mild" | "moderate" | "severe" };
  const supabase = createClient();
  const ctx = await buildClientContext(user.id);
  const remedy = await healthRemedy(problem, severity, ctx);
  if (!remedy.ok) return NextResponse.json({ error: remedy.error }, { status: 502 });

  const { data: row } = await supabase
    .from("health_issues")
    .insert({
      client_id: user.id,
      problem,
      severity,
      ai_foods: remedy.data.foods as never,
      ai_exercises: remedy.data.exercises as never,
      ai_tips: remedy.data.tips as never,
    })
    .select("id")
    .single();

  if (severity === "severe" || remedy.data.seek_doctor) {
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
        kind: "severe_health",
        payload: { problem, severity, health_issue_id: row?.id },
      });
    }
  }

  return NextResponse.json({ ok: true, remedy: remedy.data });
}
