import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PreviewInvoiceDialog } from "@/app/owner/invoices/preview-invoice-dialog";

export default async function ClientInvoicesPage() {
  const user = await requireRole("client");
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id,invoice_number,total_cents,gst_cents,currency,issued_at,status")
    .eq("client_id", user.id)
    .order("issued_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-sm text-muted-foreground">Preview any invoice in-app or download the PDF.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {(invoices ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <ul className="space-y-2">
              {invoices!.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                >
                  <div>
                    <div className="font-mono text-sm">{inv.invoice_number}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(inv.issued_at)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(inv.total_cents, inv.currency)}
                    </span>
                    <Badge variant={inv.status === "paid" ? "success" : "outline"}>{inv.status}</Badge>
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
