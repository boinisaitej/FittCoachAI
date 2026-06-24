import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { IssueInvoiceDialog } from "./issue-invoice-dialog";
import { PreviewInvoiceDialog } from "./preview-invoice-dialog";

export default async function InvoicesPage() {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const [{ data: invoices }, { data: clients }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id,invoice_number,total_cents,gst_cents,currency,issued_at,status,profiles:client_id(full_name,email)")
      .eq("gym_id", owner.gym_id!)
      .order("issued_at", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select("id,full_name,email")
      .eq("gym_id", owner.gym_id!)
      .eq("role", "client")
      .eq("active", true)
      .order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Sequential, fiscal-year aware, optional GST.</p>
        </div>
        <IssueInvoiceDialog clients={clients ?? []} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {(invoices ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pl-2">Number</th>
                    <th className="py-2">Client</th>
                    <th className="py-2">Issued</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">GST</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices!.map((inv) => {
                    const c = inv.profiles as { full_name?: string; email?: string } | null;
                    return (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pl-2 font-mono text-xs">{inv.invoice_number}</td>
                        <td className="py-2">
                          <div className="font-medium">{c?.full_name}</div>
                          <div className="text-xs text-muted-foreground">{c?.email}</div>
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">{formatDate(inv.issued_at)}</td>
                        <td className="py-2 font-semibold tabular-nums">{formatCurrency(inv.total_cents, inv.currency)}</td>
                        <td className="py-2 tabular-nums">{formatCurrency(inv.gst_cents, inv.currency)}</td>
                        <td className="py-2">
                          <Badge variant={inv.status === "paid" ? "success" : "outline"}>{inv.status}</Badge>
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <PreviewInvoiceDialog
                              invoiceId={inv.id}
                              invoiceNumber={inv.invoice_number}
                              total={formatCurrency(inv.total_cents, inv.currency)}
                              status={inv.status}
                            />
                            <Button asChild size="sm" variant="outline" title="Download PDF">
                              <a
                                href={`/api/invoices/${inv.id}/pdf?download=1`}
                                download={`${inv.invoice_number}.pdf`}
                              >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Download</span>
                              </a>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
