import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { weeklyReport } from "@/lib/ai";
import { buildClientContext } from "@/lib/ai/client-context";
import { sendEmail, Templates } from "@/lib/email";
import { assertCron } from "@/lib/cron";
import { env } from "@/lib/env";
import { weekStart } from "@/lib/utils";

/**
 * Sunday 18:00 — generate + email weekly reports to Pro clients.
 * Vercel cron: { "path": "/api/cron/weekly-reports?secret=$CRON_SECRET", "schedule": "0 18 * * 0" }
 */
export async function GET(req: Request) {
  try {
    assertCron(req);
  } catch (e) {
    return e as Response;
  }
  const supabase = createServiceClient();
  const start = weekStart().toISOString().slice(0, 10);
  const end = new Date().toISOString().slice(0, 10);

  // Pro subscribers
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("client_id, plans:plan_id(kind), profiles:client_id(full_name,email)")
    .eq("status", "active");

  const pros = (subs ?? []).filter((s) => (s.plans as { kind?: string } | null)?.kind === "pro");

  let sent = 0;
  for (const row of pros) {
    const { data: adherenceRaw } = await supabase.rpc("adherence_pct", {
      p_client: row.client_id,
      p_from: start,
      p_to: end,
    });
    const adherence = Number(adherenceRaw ?? 0);
    const ctx = await buildClientContext(row.client_id);
    const r = await weeklyReport(ctx, { adherence, points: 0, missedDays: 0 });
    if (!r.ok) {
      console.warn(`[cron:weekly-reports] AI failed for ${row.client_id}: ${r.error}`);
      continue;
    }
    const summary = r.data;
    await supabase.from("weekly_reports").upsert(
      { client_id: row.client_id, week_start: start, adherence_pct: adherence, ai_summary: summary, total_points: 0 },
      { onConflict: "client_id,week_start" }
    );
    await supabase.from("notifications").insert({
      recipient_id: row.client_id,
      kind: "report",
      title: "Your weekly progress report",
      body: summary.slice(0, 160),
      link: "/client",
    });
    const profile = row.profiles as { full_name?: string; email?: string } | null;
    if (profile?.email) {
      await sendEmail({
        to: profile.email,
        subject: "Your FitCoachAI weekly report",
        template: "report",
        html: Templates.report({
          name: profile.full_name ?? "there",
          adherence,
          summary,
          appUrl: env.NEXT_PUBLIC_APP_URL,
        }),
      });
    }
    sent++;
  }
  return NextResponse.json({ ok: true, sent });
}
