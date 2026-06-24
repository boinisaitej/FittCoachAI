import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { scanFoodImage } from "@/lib/ai/image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await requireRole(["client", "trainer", "owner"]);
  const { image } = (await req.json()) as { image: string };
  if (!image?.startsWith("data:image/")) {
    return NextResponse.json({ error: "Send a data URL of the image." }, { status: 400 });
  }
  const result = await scanFoodImage(image);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, data: result.data });
}
