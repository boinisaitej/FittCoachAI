import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const trainer = await requireRole("trainer");
  const { clientId, height_cm, weight_kg } = (await req.json()) as {
    clientId: string;
    height_cm: number;
    weight_kg: number;
  };
  if (!clientId || !height_cm || !weight_kg) {
    return NextResponse.json({ error: "clientId, height_cm and weight_kg are required" }, { status: 400 });
  }

  const supabase = createClient();
  // Trainer must own this client (active assignment).
  const { data: own } = await supabase
    .from("trainer_clients")
    .select("id")
    .eq("trainer_id", trainer.id)
    .eq("client_id", clientId)
    .is("ended_at", null)
    .maybeSingle();
  if (!own) return NextResponse.json({ error: "Not your client" }, { status: 403 });

  const { data, error } = await supabase
    .from("bmi_logs")
    .insert({ client_id: clientId, height_cm, weight_kg })
    .select("bmi")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep the client's profile in sync so future AI prompts use latest numbers.
  await supabase.from("profiles").update({ height_cm, weight_kg }).eq("id", clientId);

  // Bell notify the client.
  await supabase.from("notifications").insert({
    recipient_id: clientId,
    kind: "system",
    title: "Trainer logged your BMI",
    body: `BMI: ${data?.bmi} · ${weight_kg} kg · ${height_cm} cm`,
    link: "/client/bmi",
  });

  return NextResponse.json({ ok: true, bmi: data?.bmi });
}
