import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { weekStart } from "@/lib/utils";

export async function POST(req: Request) {
  const user = await requireUser();
  const { rateeId, stars, comment } = (await req.json()) as { rateeId: string; stars: number; comment?: string };
  if (!rateeId || stars < 1 || stars > 5) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const supabase = createClient();
  await supabase
    .from("ratings")
    .upsert(
      {
        week_start: weekStart().toISOString().slice(0, 10),
        rater_id: user.id,
        ratee_id: rateeId,
        stars,
        comment: comment ?? null,
      },
      { onConflict: "week_start,rater_id,ratee_id" }
    );
  return NextResponse.json({ ok: true });
}
