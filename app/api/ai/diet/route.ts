import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateDietDay, generateDietWeek } from "@/lib/ai";
import { buildClientContext } from "@/lib/ai/client-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireRole(["client", "trainer"]);
  const body = (await req.json()) as { scope: "day" | "week"; date?: string; clientId?: string };

  const targetClient = body.clientId ?? user.id;
  if (user.role === "trainer" && targetClient !== user.id) {
    const sb = createClient();
    const { data } = await sb
      .from("trainer_clients")
      .select("id")
      .eq("trainer_id", user.id)
      .eq("client_id", targetClient)
      .is("ended_at", null)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Not your client" }, { status: 403 });
  }

  const ctx = await buildClientContext(targetClient);
  const start = body.date ?? new Date().toISOString().slice(0, 10);
  const result = body.scope === "week" ? await generateDietWeek(ctx, start) : await generateDietDay(ctx, start);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const supabase = createClient();
  await supabase.from("ai_diet_plans").insert({
    client_id: targetClient,
    scope: body.scope,
    start_date: start,
    plan: result.data as never,
  });

  return NextResponse.json({ ok: true, data: result.data });
}
