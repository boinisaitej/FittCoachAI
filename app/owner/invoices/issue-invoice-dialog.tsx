"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { issueInvoiceAction } from "./actions";

export function IssueInvoiceDialog({
  clients,
}: {
  clients: { id: string; full_name: string | null; email: string | null }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [gst, setGst] = useState<string>("0");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const amt = parseFloat(amount || "0");
  const gstPct = parseFloat(gst || "0");
  const total = amt + (amt * gstPct) / 100;

  function submit() {
    setError(null);
    if (!clientId) {
      setError("Pick a client first.");
      return;
    }
    if (!amt || amt <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    start(async () => {
      const r = await issueInvoiceAction({
        clientId,
        amountCents: Math.round(amt * 100),
        gstPercent: gstPct,
      });
      if (r.ok) {
        toast.success(`Invoice ${r.invoice_number ?? ""} issued`);
        setOpen(false);
        setClientId("");
        setAmount("");
        setGst("0");
        router.refresh();
      } else {
        setError(r.error ?? "Unknown error");
        toast.error("Could not issue invoice", { description: r.error });
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="h-4 w-4" />
          Issue invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Issue invoice
          </DialogTitle>
          <DialogDescription>
            Sequential FY-aware numbering. GST optional. PDF is auto-generated on download.
          </DialogDescription>
        </DialogHeader>

        {clients.length === 0 && (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            ⚠ You have no active clients yet. Create one on{" "}
            <a href="/owner/users" className="font-semibold underline">
              /owner/users
            </a>{" "}
            first.
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="client">
                <SelectValue placeholder="Pick a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name ?? "—"} · {c.email ?? "no email"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amt">Amount (₹)</Label>
              <Input
                id="amt"
                type="number"
                inputMode="decimal"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gst">GST %</Label>
              <Input
                id="gst"
                type="number"
                inputMode="decimal"
                min={0}
                max={28}
                step={1}
                value={gst}
                onChange={(e) => setGst(e.target.value)}
              />
            </div>
          </div>

          {amt > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">₹{amt.toFixed(2)}</span>
              </div>
              {gstPct > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST ({gstPct}%)</span>
                  <span className="tabular-nums">₹{((amt * gstPct) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
                <span>Total</span>
                <span className="tabular-nums text-emerald-700 dark:text-emerald-400">₹{total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-300/60 bg-rose-50 p-2 text-xs text-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || clients.length === 0} variant="gradient">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {pending ? "Issuing…" : "Issue invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
