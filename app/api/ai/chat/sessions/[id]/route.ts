import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rename a saved AI chat session. Owner check is enforced by RLS. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["client", "trainer", "owner"]);
  const supabase = createClient();
  const body = (await req.json().catch(() => ({}))) as { title?: string };
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (title.length > 120) return NextResponse.json({ error: "Title too long (max 120)" }, { status: 400 });

  const { error } = await supabase
    .from("ai_chat_sessions")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("client_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, title });
}

/** Delete a saved AI chat session — messages cascade via FK. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["client", "trainer", "owner"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("ai_chat_sessions")
    .delete()
    .eq("id", params.id)
    .eq("client_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
