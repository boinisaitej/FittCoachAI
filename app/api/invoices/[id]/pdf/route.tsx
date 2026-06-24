import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { requireUser } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { InvoicePdf } from "@/lib/pdf/invoice";
import { env } from "@/lib/env";

// @react-pdf/renderer needs Node APIs (Buffer, streams) — never on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const supabase = createClient();
  const admin = createServiceClient();
  const url = new URL(req.url);
  const asDownload = url.searchParams.get("download") === "1";

  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "id,invoice_number,fiscal_year,amount_cents,gst_cents,total_cents,currency,issued_at,paid_at,status,gym_id,client_id"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "owner" && inv.client_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use service-role for related lookups so RLS edge cases + the
  // double-FK ambiguity (trainer_clients → profiles via both trainer_id
  // and client_id) never silently return "trainer not assigned" again.
  const [gymRes, clientRes, assignRes, subRes, prefRes] = await Promise.all([
    admin.from("gyms").select("name,address").eq("id", inv.gym_id).maybeSingle(),
    admin
      .from("profiles")
      .select("full_name,email,phone,gender,dob,address,created_at")
      .eq("id", inv.client_id)
      .maybeSingle(),
    admin
      .from("trainer_clients")
      .select("trainer_id")
      .eq("client_id", inv.client_id)
      .is("ended_at", null)
      .maybeSingle(),
    admin
      .from("subscriptions")
      .select("end_date,plan_id")
      .eq("client_id", inv.client_id)
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("client_preferences")
      .select("exercise_types")
      .eq("client_id", inv.client_id)
      .maybeSingle(),
  ]);

  // Resolve trainer + plan via explicit follow-up queries.
  const trainerId = assignRes.data?.trainer_id ?? null;
  const planId = subRes.data?.plan_id ?? null;
  const [trainerRes, planRes] = await Promise.all([
    trainerId
      ? admin.from("profiles").select("full_name,specialization").eq("id", trainerId).maybeSingle()
      : Promise.resolve({ data: null }),
    planId
      ? admin.from("plans").select("name,kind").eq("id", planId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const gym = gymRes.data as { name?: string | null; address?: string | null } | null;
  const client = clientRes.data as {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    gender?: string | null;
    dob?: string | null;
    address?: string | null;
    created_at?: string | null;
  } | null;
  const trainer = trainerRes.data as { full_name?: string | null; specialization?: string | null } | null;
  const plan = planRes.data as { name?: string | null; kind?: string | null } | null;
  const prefs = prefRes.data as { exercise_types?: string[] | null } | null;
  const exerciseType = prefs?.exercise_types?.[0] ?? "general";

  const age = client?.dob
    ? Math.floor((Date.now() - new Date(client.dob).getTime()) / (365.25 * 86400000))
    : null;

  const stream = await renderToStream(
    <InvoicePdf
      data={{
        gym: {
          name: gym?.name ?? "Gym",
          address: gym?.address ?? null,
          gst: process.env.GST_NUMBER ?? null,
        },
        client: {
          name: client?.full_name ?? "Member",
          email: client?.email ?? null,
          phone: client?.phone ?? null,
          address: client?.address ?? null,
          age,
          joinedAt: client?.created_at ?? null,
          gender: client?.gender ?? null,
          exerciseType,
        },
        trainer: trainer
          ? { name: trainer.full_name ?? null, specialization: trainer.specialization ?? null }
          : null,
        plan: plan
          ? { name: plan.name ?? null, kind: plan.kind ?? null, endDate: subRes.data?.end_date ?? null }
          : null,
        number: inv.invoice_number,
        fiscalYear: inv.fiscal_year,
        issuedAt: inv.issued_at,
        paidAt: inv.paid_at ?? null,
        status: inv.status,
        lines: [
          {
            label:
              plan?.name && plan?.kind
                ? `${plan.name} plan (${plan.kind}) — membership`
                : "Membership",
            qty: 1,
            unitCents: inv.amount_cents,
            subCents: inv.amount_cents,
          },
        ],
        amountCents: inv.amount_cents,
        gstCents: inv.gst_cents ?? 0,
        totalCents: inv.total_cents,
        currency: inv.currency,
      }}
    />
  );

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${asDownload ? "attachment" : "inline"}; filename="${inv.invoice_number}.pdf"`,
      "Cache-Control": "private, no-cache",
    },
  });
}

void env;
