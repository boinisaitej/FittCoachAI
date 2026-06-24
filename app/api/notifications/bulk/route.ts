import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const user = await requireUser();
  const { action } = (await req.json()) as { action: "mark_all_read" | "clear" };
  const supabase = createClient();
  if (action === "mark_all_read") {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", user.id)
      .is("read_at", null);
  } else if (action === "clear") {
    await supabase.from("notifications").delete().eq("recipient_id", user.id);
  }
  return NextResponse.json({ ok: true });
}
