import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TodoStatus } from "@/types/domain";

export async function POST(req: Request) {
  const user = await requireRole("client");
  const { itemId, status } = (await req.json()) as { itemId: string; status: TodoStatus };
  const supabase = createClient();

  await supabase
    .from("todo_completions")
    .upsert(
      { daily_plan_item_id: itemId, client_id: user.id, status },
      { onConflict: "daily_plan_item_id,client_id" }
    );

  if (status === "completed") {
    // Recompute streak + apply milestone rewards
    await supabase.rpc("recompute_streak", { p_client: user.id });
  }
  return NextResponse.json({ ok: true });
}
