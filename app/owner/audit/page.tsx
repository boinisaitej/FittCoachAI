import Link from "next/link";
import { History, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { formatDateTimeIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  action: string;
  target_kind: string | null;
  target_id: string | null;
  actor_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

function actionTone(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.endsWith(".cancel") || action.includes("deactivate")) return "destructive";
  if (action.endsWith(".create") || action.endsWith(".assign")) return "default";
  return "secondary";
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams?: { action?: string };
}) {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const admin = createServiceClient();

  let q = supabase
    .from("audit_log")
    .select("id,action,target_kind,target_id,actor_id,payload,created_at")
    .eq("gym_id", owner.gym_id!)
    .order("created_at", { ascending: false })
    .limit(200);
  if (searchParams?.action) q = q.eq("action", searchParams.action);

  const { data: rowsRaw } = await q;
  const rows = (rowsRaw ?? []) as AuditRow[];

  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x)));
  let actorMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await admin
      .from("profiles")
      .select("id,full_name,email,role")
      .in("id", actorIds);
    actorMap = new Map(
      (actors ?? []).map((a) => [
        a.id,
        `${a.full_name ?? a.email ?? "—"} · ${a.role}`,
      ])
    );
  }

  const distinctActions = Array.from(new Set(rows.map((r) => r.action))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-slate-500 to-zinc-700 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Every privileged action in this gym, last 200 events.
          </p>
        </div>
      </div>

      {distinctActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/owner/audit"
            className={`rounded-full border px-3 py-1 text-xs ${
              !searchParams?.action ? "bg-foreground text-background" : "bg-card"
            }`}
          >
            all
          </Link>
          {distinctActions.map((a) => (
            <Link
              key={a}
              href={`/owner/audit?action=${encodeURIComponent(a)}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                searchParams?.action === a ? "bg-foreground text-background" : "bg-card"
              }`}
            >
              {a}
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Events
          </CardTitle>
          <CardDescription>Times shown in IST. Read-only.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events yet. Anything you change in the owner console (creating a class, issuing an
              invoice, cancelling a class…) will appear here.
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => {
                const actor = r.actor_id ? actorMap.get(r.actor_id) ?? r.actor_id.slice(0, 8) : "system";
                const payloadSummary = r.payload
                  ? Object.entries(r.payload)
                      .slice(0, 3)
                      .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
                      .join(" · ")
                  : "";
                return (
                  <li key={r.id} className="flex flex-wrap items-start gap-3 py-3 text-sm">
                    <Badge variant={actionTone(r.action)} className="font-mono">
                      {r.action}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{actor}</div>
                      {r.target_kind && (
                        <div className="text-xs text-muted-foreground">
                          → {r.target_kind}
                          {r.target_id ? ` · ${r.target_id.slice(0, 8)}` : ""}
                        </div>
                      )}
                      {payloadSummary && (
                        <div className="text-xs text-muted-foreground truncate">{payloadSummary}</div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTimeIST(r.created_at)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
