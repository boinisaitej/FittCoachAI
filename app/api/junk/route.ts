import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";

export async function POST(req: Request) {
  const user = await requireRole("client");
  const { item, quantity } = (await req.json()) as { item: string; quantity?: string };
  if (!item) return NextResponse.json({ error: "item required" }, { status: 400 });
  const supabase = createClient();
  await supabase.from("junk_food_logs").insert({
    client_id: user.id,
    log_date: todayISO(),
    item,
    quantity: quantity ?? null,
  });

  // 3+ items in last 7 days = trainer alert
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const { count } = await supabase
    .from("junk_food_logs")
    .select("*", { count: "exact", head: true })
    .eq("client_id", user.id)
    .gte("log_date", sevenDaysAgo);
  if ((count ?? 0) >= 5) {
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
        kind: "junk_excess",
        payload: { count_last_7d: count },
      });
    }
  }
  return NextResponse.json({ ok: true });
}
