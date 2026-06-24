import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WeeklyReportPdf } from "@/lib/pdf/weekly-report";
import { weeklyReport } from "@/lib/ai";
import { buildClientContext } from "@/lib/ai/client-context";
import { weekStart } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { clientId: string } }) {
  const trainer = await requireRole("trainer");
  const supabase = createClient();
  const { data: own } = await supabase
    .from("trainer_clients")
    .select("id")
    .eq("trainer_id", trainer.id)
    .eq("client_id", params.clientId)
    .is("ended_at", null)
    .maybeSingle();
  if (!own) return NextResponse.json({ error: "Not your client" }, { status: 403 });

  const start = weekStart().toISOString().slice(0, 10);
  const end = new Date().toISOString().slice(0, 10);

  const { data: adherenceRaw } = await supabase.rpc("adherence_pct", {
    p_client: params.clientId,
    p_from: start,
    p_to: end,
  });
  const adherence = Number(adherenceRaw ?? 0);
  const { data: pointsRows } = await supabase
    .from("points_log")
    .select("points")
    .eq("client_id", params.clientId)
    .gte("created_at", `${start}T00:00:00Z`);
  const totalPoints = (pointsRows ?? []).reduce((a, b) => a + b.points, 0);

  const ctx = await buildClientContext(params.clientId);
  const aiRes = await weeklyReport(ctx, { adherence, points: totalPoints, missedDays: 0 });
  if (!aiRes.ok) {
    return NextResponse.json({ error: `AI summary failed: ${aiRes.error}` }, { status: 502 });
  }
  const summary = aiRes.data;

  const { data: client } = await supabase.from("profiles").select("full_name").eq("id", params.clientId).single();

  await supabase
    .from("weekly_reports")
    .upsert(
      {
        client_id: params.clientId,
        week_start: start,
        adherence_pct: adherence,
        total_points: totalPoints,
        ai_summary: summary,
      },
      { onConflict: "client_id,week_start" }
    );

  const stream = await renderToStream(
    <WeeklyReportPdf
      client={{ name: client?.full_name ?? "Client" }}
      weekStart={start}
      adherence={adherence}
      points={totalPoints}
      summary={summary}
    />
  );

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="weekly-${start}.pdf"`,
    },
  });
}
