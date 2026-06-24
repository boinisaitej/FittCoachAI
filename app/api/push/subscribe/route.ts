import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const user = await requireUser();
  const { subscription, ua } = (await req.json()) as { subscription: { endpoint: string; keys: { p256dh: string; auth: string } }; ua?: string };
  if (!subscription?.endpoint) return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
  const supabase = createClient();
  await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        ua: ua ?? null,
      },
      { onConflict: "user_id,endpoint" }
    );
  return NextResponse.json({ ok: true });
}
