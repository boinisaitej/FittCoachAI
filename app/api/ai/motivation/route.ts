import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildClientContext } from "@/lib/ai/client-context";
import { motivation } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* In-memory daily-ping cache keyed by user. Reset on cold-start.
 * One LLM call per user per IST-day instead of every dashboard load. */
const cache = new Map<string, { date: string; line: string }>();
function istDay(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function GET() {
  const user = await requireUser();
  if (user.role !== "client") {
    return NextResponse.json({ ok: false, error: "Client-only" }, { status: 403 });
  }

  const day = istDay();
  const cached = cache.get(user.id);
  if (cached && cached.date === day) {
    return NextResponse.json({ ok: true, data: cached.line, cached: true });
  }

  const ctx = await buildClientContext(user.id);
  const res = await motivation(ctx);
  if (!res.ok) return NextResponse.json(res, { status: 200 });

  const trimmed = res.data.trim().replace(/^"+|"+$/g, "");
  cache.set(user.id, { date: day, line: trimmed });
  return NextResponse.json({ ok: true, data: trimmed });
}
