"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Row = {
  name: string | null;
  email: string | null;
  spec: string | null;
  clients: number;
  revenueCents: number;
  commissionCents: number;
};

export function PayrollExport({ rows, period }: { rows: Row[]; period: string }) {
  function download() {
    if (rows.length === 0) {
      toast.message("Nothing to export yet.");
      return;
    }
    const escape = (s: string | null | undefined) =>
      s == null ? "" : `"${String(s).replace(/"/g, '""')}"`;
    const lines = [
      `# FitCoachAI payroll export · ${period}`,
      ["trainer_name", "email", "specialization", "active_clients", "revenue_inr", "commission_inr"]
        .map(escape)
        .join(","),
      ...rows.map((r) =>
        [
          escape(r.name),
          escape(r.email),
          escape(r.spec),
          r.clients,
          (r.revenueCents / 100).toFixed(2),
          (r.commissionCents / 100).toFixed(2),
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  return (
    <Button onClick={download} variant="gradient">
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
