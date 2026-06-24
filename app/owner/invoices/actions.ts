"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail, Templates } from "@/lib/email";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";

/* ───────────────────────────────────────────────────────────────────────
 * Invoice-number generation. Prefers the `next_invoice_number` SQL helper
 * (Indian FY-aware, sequential per gym). Falls back to a JS computation if
 * the migration hasn't been applied, so issuance never blocks on schema.
 * ─────────────────────────────────────────────────────────────────────── */
async function generateInvoiceNumber(gymId: string): Promise<{ invoice_number: string; fiscal_year: string }> {
  const supabase = createServiceClient(); // bypass RLS for the count

  // 1) Try the SQL helper first.
  try {
    const { data, error } = await supabase.rpc("next_invoice_number", { p_gym: gymId });
    if (!error && data && Array.isArray(data) && data.length > 0) {
      const row = data[0] as { invoice_number?: string; fiscal_year?: string };
      if (row.invoice_number && row.fiscal_year) {
        return { invoice_number: row.invoice_number, fiscal_year: row.fiscal_year };
      }
    }
  } catch (err) {
    console.warn("[invoice numbering] RPC unavailable, falling back to JS:", err);
  }

  // 2) JS fallback — same logic as the SQL helper.
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const fiscalYear =
    m >= 4
      ? `${y}-${String((y + 1) % 100).padStart(2, "0")}`
      : `${y - 1}-${String(y % 100).padStart(2, "0")}`;
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("gym_id", gymId)
    .eq("fiscal_year", fiscalYear);
  const seq = String((count ?? 0) + 1).padStart(5, "0");
  return { invoice_number: `INV-${fiscalYear}-${seq}`, fiscal_year: fiscalYear };
}

export async function issueInvoiceAction(args: {
  clientId: string;
  amountCents: number;
  gstPercent?: number;
  notes?: string;
}) {
  try {
    const owner = await requireRole("owner");
    if (!owner.gym_id) return { ok: false as const, error: "Owner has no gym configured." };
    if (!args.clientId) return { ok: false as const, error: "Pick a client." };
    if (!args.amountCents || args.amountCents <= 0) {
      return { ok: false as const, error: "Amount must be greater than zero." };
    }

    const supabase = createClient();

    // Number first — uses service-role under the hood so RLS never blocks it.
    const numb = await generateInvoiceNumber(owner.gym_id);

    const gstCents = Math.round((args.amountCents * (args.gstPercent ?? 0)) / 100);
    const total = args.amountCents + gstCents;

    const { data: inv, error } = await supabase
      .from("invoices")
      .insert({
        gym_id: owner.gym_id,
        client_id: args.clientId,
        invoice_number: numb.invoice_number,
        fiscal_year: numb.fiscal_year,
        amount_cents: args.amountCents,
        gst_cents: gstCents,
        total_cents: total,
        status: "issued",
      })
      .select("id,invoice_number,total_cents")
      .single();

    if (error || !inv) {
      console.error("[issueInvoiceAction] insert failed:", error);
      return { ok: false as const, error: error?.message ?? "Insert returned no row" };
    }

    // Background — notify + email so the dialog returns immediately.
    void (async () => {
      try {
        const { data: client } = await supabase
          .from("profiles")
          .select("full_name,email")
          .eq("id", args.clientId)
          .single();
        const amount = `₹${(total / 100).toFixed(2)}`;
        await Promise.allSettled([
          supabase.from("notifications").insert({
            recipient_id: args.clientId,
            kind: "invoice",
            title: `Invoice ${inv.invoice_number} issued`,
            body: `Amount: ${amount}`,
            link: `/client/invoices`,
          }),
          client?.email
            ? sendEmail({
                to: client.email,
                subject: `Invoice ${inv.invoice_number}`,
                template: "invoice",
                html: Templates.invoice({
                  name: client.full_name ?? "there",
                  invoiceNumber: inv.invoice_number,
                  amount,
                  pdfUrl: `${env.NEXT_PUBLIC_APP_URL}/api/invoices/${inv.id}/pdf`,
                }),
              })
            : Promise.resolve(),
        ]);
      } catch (err) {
        console.warn("[issueInvoiceAction] notify failed:", err);
      }
    })();

    await audit({
      gym_id: owner.gym_id,
      actor_id: owner.id,
      action: "invoice.issue",
      target_kind: "invoices",
      target_id: inv.id,
      payload: { invoice_number: inv.invoice_number, total_cents: total, client_id: args.clientId },
    });

    revalidatePath("/owner/invoices");
    return { ok: true as const, id: inv.id, invoice_number: inv.invoice_number };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[issueInvoiceAction] uncaught:", msg);
    return { ok: false as const, error: msg };
  }
}
