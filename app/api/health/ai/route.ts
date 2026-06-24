import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { geminiPoolStatus } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health/ai — Owner-only. Reports how many Gemini keys are
 * configured, how many are currently healthy, and the cool-off remaining
 * on any that are parked. Useful when checking why AI calls are failing.
 */
export async function GET() {
  await requireRole("owner");
  return NextResponse.json(geminiPoolStatus());
}
