import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchKb } from "@/lib/ai/kb";

export async function POST(req: Request) {
  const user = await requireRole(["client", "trainer", "owner"]);
  const { query } = (await req.json()) as { query: string };
  const result = await searchKb(query, 6);
  const supabase = createClient();
  await supabase.from("nutrition_kb_queries").insert({
    client_id: user.id,
    query,
    results: result.hits as never,
    vector_live: result.vectorLive,
  });
  return NextResponse.json(result);
}
