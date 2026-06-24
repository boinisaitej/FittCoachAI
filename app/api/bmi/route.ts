import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const user = await requireRole("client");
  const { height_cm, weight_kg } = (await req.json()) as { height_cm: number; weight_kg: number };
  if (!height_cm || !weight_kg) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bmi_logs")
    .insert({ client_id: user.id, height_cm, weight_kg })
    .select("bmi")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep profile in sync
  await supabase.from("profiles").update({ height_cm, weight_kg }).eq("id", user.id);
  return NextResponse.json({ ok: true, bmi: data?.bmi });
}
