import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";

export async function POST(req: Request) {
  const user = await requireRole("client");
  const { glasses } = (await req.json()) as { glasses: number };
  const supabase = createClient();
  await supabase
    .from("water_logs")
    .upsert(
      { client_id: user.id, log_date: todayISO(), glasses: Math.max(0, Math.floor(glasses)) },
      { onConflict: "client_id,log_date" }
    );
  return NextResponse.json({ ok: true });
}
