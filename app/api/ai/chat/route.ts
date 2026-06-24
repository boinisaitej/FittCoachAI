import { NextResponse } from "next/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getGemini } from "@/lib/ai/gemini";
import { todayISO } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASIC_LIMIT = 10;
const SYSTEM_PROMPT =
  "You are FitCoachAI: a friendly, evidence-based fitness + nutrition assistant. Be concise and respect dietary restrictions and injuries.";

const FRIENDLY_HINT =
  "\n\n(If you keep seeing this, set a valid `GOOGLE_API_KEY` and a current model in `.env.local`, e.g. `GEMINI_MODEL=\"gemini-2.0-flash\"`.)";

/**
 * Streaming AI chat — tokens reach the browser as Gemini generates them
 * (first word in ~300 ms vs ~3-8 s of wait for the full reply). The client
 * pipes the response body into the active assistant bubble.
 *
 * On Gemini failure we still return 200 with the error streamed as the
 * assistant turn so the user sees the cause inline AND the conversation
 * stays persisted (both user message + the error reply are saved).
 *
 * Response headers:
 *   x-session-id  — session row this exchange belongs to (new ones included)
 *   x-quota-used / x-quota-limit — Basic-plan counter
 */
export async function POST(req: Request) {
  const user = await requireRole(["client", "trainer", "owner"]);
  const supabase = createClient();
  const { sessionId, message } = (await req.json()) as { sessionId?: string | null; message: string };

  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Quota gate for Basic-plan clients only.
  let used = 0;
  let limit: number | "infinity" = "infinity";
  if (user.role === "client") {
    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("plans:plan_id(kind)")
      .eq("client_id", user.id)
      .eq("status", "active")
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const kind = (subRow?.plans as { kind?: "basic" | "pro" } | null)?.kind ?? "basic";
    if (kind === "basic") {
      limit = BASIC_LIMIT;
      const today = todayISO();
      const { data: usage } = await supabase
        .from("ai_chat_daily_usage")
        .select("count")
        .eq("client_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();
      used = usage?.count ?? 0;
      if (used >= limit) {
        return NextResponse.json(
          { error: `Daily AI chat limit reached (${limit}). Upgrade to Pro for unlimited.` },
          { status: 429 }
        );
      }
    }
  }

  // Ensure session up-front so its id can ride out in the response headers.
  let sid = sessionId ?? null;
  if (!sid) {
    const { data: created, error } = await supabase
      .from("ai_chat_sessions")
      .insert({ client_id: user.id, title: message.slice(0, 60) })
      .select("id")
      .single();
    if (error || !created) {
      return NextResponse.json({ error: error?.message ?? "Failed to create chat session" }, { status: 500 });
    }
    sid = created.id;
  }

  // Persist the user turn now so it isn't lost if the stream drops.
  await supabase.from("ai_chat_messages").insert({ session_id: sid, role: "user", content: message });

  const { data: history } = await supabase
    .from("ai_chat_messages")
    .select("role,content")
    .eq("session_id", sid)
    .order("created_at", { ascending: true })
    .limit(20);

  const msgs = [
    new SystemMessage(SYSTEM_PROMPT),
    ...((history ?? []) as { role: "user" | "assistant" | "system"; content: string }[])
      .filter((m) => m.role !== "system")
      .map((m) => (m.role === "user" ? new HumanMessage(m.content) : new SystemMessage(m.content))),
    new HumanMessage(message),
  ];

  // Try to start the Gemini stream. On failure we stream the error back as
  // a friendly assistant message (200 OK) so the user sees the cause in-chat
  // rather than a vanishing toast.
  type Chunk = { content: unknown };
  let llmStream: AsyncIterable<Chunk> | null = null;
  let initError: string | null = null;
  try {
    const llm = getGemini("flash");
    llmStream = (await llm.stream(msgs)) as AsyncIterable<Chunk>;
  } catch (e) {
    initError = e instanceof Error ? e.message : String(e);
  }

  let fullReply = "";
  let streamFailed = !!initError;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (llmStream) {
          for await (const chunk of llmStream) {
            const piece = typeof chunk.content === "string" ? chunk.content : "";
            if (piece) {
              fullReply += piece;
              controller.enqueue(encoder.encode(piece));
            }
          }
        } else if (initError) {
          const msg = `⚠️ AI is currently unavailable: ${initError}${FRIENDLY_HINT}`;
          fullReply = msg;
          controller.enqueue(encoder.encode(msg));
        }
      } catch (err) {
        streamFailed = true;
        const msg = err instanceof Error ? err.message : String(err);
        const note = `\n\n⚠️ Stream error: ${msg}${FRIENDLY_HINT}`;
        fullReply += note;
        try {
          controller.enqueue(encoder.encode(note));
        } catch {
          /* client already gone — still persist below */
        }
      } finally {
        try {
          if (fullReply.trim()) {
            await supabase
              .from("ai_chat_messages")
              .insert({ session_id: sid, role: "assistant", content: fullReply });
          }
          await supabase
            .from("ai_chat_sessions")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", sid);
          // Only charge the quota when the LLM actually produced content.
          if (limit !== "infinity" && !streamFailed && fullReply.trim()) {
            await supabase
              .from("ai_chat_daily_usage")
              .upsert(
                { client_id: user.id, usage_date: todayISO(), count: used + 1 },
                { onConflict: "client_id,usage_date" }
              );
          }
        } catch {
          /* persistence is best-effort — reply was already streamed */
        }
        try {
          controller.close();
        } catch {
          /* client already disconnected / stream closed — nothing to flush */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "x-session-id": sid!,
      "x-quota-used": String(used + (limit === "infinity" || streamFailed ? 0 : 1)),
      // HTTP header values must be Latin-1 (<=255). "∞" (U+221E) throws a
      // ByteString TypeError → 500, so use an ASCII sentinel here and map it
      // back to Infinity on the client.
      "x-quota-limit": limit === "infinity" ? "unlimited" : String(limit),
    },
  });
}
