"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Check, Download, FileUp, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
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
import { bulkImportUsersAction } from "./bulk-import-actions";

type Row = {
  email: string;
  full_name: string;
  role: "trainer" | "client";
  phone?: string;
  gender?: "male" | "female" | "other";
  specialization?: string;
  trainer_type?: "general" | "personal" | "specialized";
  plan_kind?: "basic" | "pro";
};

type ImportResult = {
  ok: boolean;
  email: string;
  fullName: string;
  role: string;
  tempPassword?: string;
  error?: string;
};

const TEMPLATE_CSV = `email,full_name,role,phone,gender,specialization,trainer_type,plan_kind
priya@fitcoach.demo,Priya Sharma,trainer,9876543210,female,Yoga,personal,
arjun@fitcoach.demo,Arjun Reddy,trainer,9876543211,male,Strength,general,
ravi@fitcoach.demo,Ravi Kumar,client,9876500001,male,,,basic
meera@fitcoach.demo,Meera Iyer,client,9876500002,female,,,pro
`;

export function BulkImportDialog() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<Row[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [pending, start] = useTransition();

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fitcoach-users-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseCsv(text: string): Row[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) throw new Error("CSV needs a header row + at least one user row.");
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const required = ["email", "full_name", "role"];
    for (const r of required) {
      if (!header.includes(r)) throw new Error(`Missing required column: ${r}`);
    }
    const idx = (name: string) => header.indexOf(name);
    return lines.slice(1).map((line, n) => {
      const cells = line.split(",").map((c) => c.trim());
      const row: Row = {
        email: cells[idx("email")] ?? "",
        full_name: cells[idx("full_name")] ?? "",
        role: (cells[idx("role")] ?? "").toLowerCase() as Row["role"],
      };
      if (idx("phone") >= 0) row.phone = cells[idx("phone")] || undefined;
      if (idx("gender") >= 0) {
        const g = (cells[idx("gender")] ?? "").toLowerCase();
        if (g === "male" || g === "female" || g === "other") row.gender = g;
      }
      if (idx("specialization") >= 0) row.specialization = cells[idx("specialization")] || undefined;
      if (idx("trainer_type") >= 0) {
        const t = (cells[idx("trainer_type")] ?? "").toLowerCase();
        if (t === "general" || t === "personal" || t === "specialized") row.trainer_type = t;
      }
      if (idx("plan_kind") >= 0) {
        const p = (cells[idx("plan_kind")] ?? "").toLowerCase();
        if (p === "basic" || p === "pro") row.plan_kind = p;
      }
      if (!row.email || !row.full_name || (row.role !== "trainer" && row.role !== "client")) {
        throw new Error(
          `Row ${n + 2}: needs email, full_name, and role=trainer|client. Got: ${JSON.stringify(cells)}`
        );
      }
      return row;
    });
  }

  function onFile(file: File) {
    setParseError(null);
    setResults(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsv(String(reader.result ?? ""));
        setParsed(rows);
      } catch (e) {
        setParsed([]);
        setParseError(e instanceof Error ? e.message : String(e));
      }
    };
    reader.readAsText(file);
  }

  function runImport() {
    if (parsed.length === 0) return;
    start(async () => {
      const res = await bulkImportUsersAction(parsed);
      if (!res.ok) {
        toast.error("Import failed", { description: (res as { error?: string }).error });
        return;
      }
      setResults(res.results);
      router.refresh();
      const okCount = res.results.filter((r) => r.ok).length;
      const errCount = res.results.length - okCount;
      toast.success(`Imported ${okCount}/${res.results.length}${errCount > 0 ? ` — ${errCount} failed` : ""}`);
    });
  }

  function reset() {
    setParsed([]);
    setParseError(null);
    setResults(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTimeout(reset, 200);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileUp className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import users</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              email,full_name,role,phone,gender,specialization,trainer_type,plan_kind
            </code>
            . Required: email, full_name, role (trainer|client).
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <ResultsView results={results} onClose={close} />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="text-sm">
                <div className="font-medium">Need the format?</div>
                <div className="text-xs text-muted-foreground">Download a working template with 4 sample rows.</div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />
                Template
              </Button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 transition-all hover:border-primary hover:bg-card"
            >
              <Upload className="h-7 w-7 text-primary" />
              <div className="text-sm font-medium">Click to choose a CSV</div>
              <div className="text-xs text-muted-foreground">UTF-8, comma-separated, header row required</div>
            </button>

            {parseError && (
              <div className="rounded-lg border border-rose-300/60 bg-rose-50 p-3 text-sm text-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertCircle className="mr-1 inline h-4 w-4" />
                {parseError}
              </div>
            )}

            {parsed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {parsed.length} row{parsed.length === 1 ? "" : "s"} ready ·{" "}
                    {parsed.filter((r) => r.role === "trainer").length} trainers ·{" "}
                    {parsed.filter((r) => r.role === "client").length} clients
                  </span>
                  <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs">
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/40">
                      <tr>
                        <th className="px-2 py-1 text-left">Name</th>
                        <th className="px-2 py-1 text-left">Email</th>
                        <th className="px-2 py-1 text-left">Role</th>
                        <th className="px-2 py-1 text-left">Extra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1">{r.full_name}</td>
                          <td className="px-2 py-1 text-muted-foreground">{r.email}</td>
                          <td className="px-2 py-1 capitalize">{r.role}</td>
                          <td className="px-2 py-1 text-muted-foreground">
                            {r.role === "trainer"
                              ? `${r.specialization ?? "—"} · ${r.trainer_type ?? "general"}`
                              : r.plan_kind ?? "basic"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!results && (
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={runImport} variant="gradient" disabled={pending || parsed.length === 0}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {pending ? "Importing…" : `Import ${parsed.length} user${parsed.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultsView({ results, onClose }: { results: ImportResult[]; onClose: () => void }) {
  const okCount = results.filter((r) => r.ok).length;
  const errCount = results.length - okCount;

  function downloadCreds() {
    const lines = ["email,password,role,name"];
    for (const r of results.filter((r) => r.ok)) {
      lines.push(`${r.email},${r.tempPassword ?? ""},${r.role},${r.fullName.replace(/,/g, " ")}`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitcoach-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg border bg-emerald-50 p-3 text-center dark:bg-emerald-950/30">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{okCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">
              Created
            </div>
          </div>
          {errCount > 0 && (
            <div className="flex-1 rounded-lg border bg-rose-50 p-3 text-center dark:bg-rose-950/30">
              <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">{errCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-rose-700/80 dark:text-rose-300/80">
                Failed
              </div>
            </div>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/40">
              <tr>
                <th className="px-2 py-1 text-left">Status</th>
                <th className="px-2 py-1 text-left">Email</th>
                <th className="px-2 py-1 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.015 }}
                  className="border-t"
                >
                  <td className="px-2 py-1">
                    {r.ok ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <X className="h-3 w-3 text-rose-600" />
                    )}
                  </td>
                  <td className="px-2 py-1">{r.email}</td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {r.ok ? (
                      <span className="font-mono">password: {r.tempPassword}</span>
                    ) : (
                      <span className="text-rose-600">{r.error}</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          ⚠️ Passwords won&apos;t be shown again. Download the credentials CSV now to share.
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={downloadCreds} disabled={okCount === 0}>
          <Download className="h-4 w-4" />
          Download credentials
        </Button>
        <Button variant="gradient" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
}
