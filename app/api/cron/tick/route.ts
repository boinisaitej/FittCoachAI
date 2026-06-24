import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { assertCron } from "@/lib/cron";
import { fanout } from "@/app/owner/announcements/actions";

/**
 * Master scheduler tick — call every minute.
 *
 * Vercel: configure in vercel.json
 *   crons: [{ "path": "/api/cron/tick?secret=$CRON_SECRET", "schedule": "* * * * *" }]
 *
 * Self-hosted: run `npm run cron:tick` from a system cron.
 */
export async function GET(req: Request) {
  try {
    assertCron(req);
  } catch (e) {
    return e as Response;
  }
  const out: Record<string, number> = {};

  // 1. Scheduled announcements due
  out.announcements = await runScheduledAnnouncements();

  // 2. Sleep-low + junk-excess + stale-todo monitors
  out.alerts = await runMonitors();

  // 3. Expire subscriptions
  out.expired = await runExpireSubs();

  return NextResponse.json({ ok: true, ...out });
}

async function runScheduledAnnouncements() {
  const supabase = createServiceClient();
  const { data: due } = await supabase
    .from("announcements")
    .select("id,gym_id,title,body,audience")
    .is("sent_at", null)
    .not("scheduled_for", "is", null)
    .lte("scheduled_for", new Date().toISOString())
    .limit(50);
  let count = 0;
  for (const a of due ?? []) {
    await fanout(a.id, a.gym_id, {
      title: a.title,
      body: a.body,
      audience: (a.audience as { roles: ("trainer" | "client")[]; sendEmail: boolean }) ?? { roles: ["client"], sendEmail: false },
    });
    count++;
  }
  return count;
}

async function runMonitors() {
  const supabase = createServiceClient();
  let raised = 0;
  // Sleep-low: last sleep log < 6h
  const today = new Date().toISOString().slice(0, 10);
  const { data: sleepLow } = await supabase
    .from("sleep_logs")
    .select("client_id,hours")
    .eq("log_date", today)
    .lt("hours", 6);
  for (const s of sleepLow ?? []) {
    const { data: assign } = await supabase
      .from("trainer_clients")
      .select("trainer_id")
      .eq("client_id", s.client_id)
      .is("ended_at", null)
      .maybeSingle();
    if (assign?.trainer_id) {
      await supabase.from("trainer_alerts").insert({
        trainer_id: assign.trainer_id,
        client_id: s.client_id,
        kind: "sleep_low",
        payload: { hours: s.hours },
      });
      raised++;
    }
  }
  return raised;
}

async function runExpireSubs() {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("end_date", new Date().toISOString().slice(0, 10))
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}
