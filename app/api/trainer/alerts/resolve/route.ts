import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const trainer = await requireRole("trainer");
  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = createClient();
  await supabase
    .from("trainer_alerts")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("trainer_id", trainer.id);
  return NextResponse.json({ ok: true });
}
