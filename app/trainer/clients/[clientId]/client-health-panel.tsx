"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Apple,
  HeartPulse,
  Leaf,
  Loader2,
  ScrollText,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn, classifyBmi, formatDate } from "@/lib/utils";

export type BmiRow = { id: string; bmi: number; height_cm: number; weight_kg: number; logged_at: string };
export type Preferences = {
  exercise_types: string[];
  is_vegetarian: boolean;
  water_goal_glasses: number;
  allergies: string[] | null;
  ai_diet_enabled: boolean;
  ai_workout_enabled: boolean;
} | null;

export type Injury = { id: string; tag: string; severity: string; notes: string | null; resolved_at: string | null };
export type HealthIssue = { id: string; problem: string; severity: string; created_at: string; resolved_at: string | null };

export function ClientHealthPanel({
  clientId,
  client,
  prefs,
  bmiHistory,
  injuries,
  healthIssues,
}: {
  clientId: string;
  client: { full_name: string | null; gender: string | null; dob: string | null; height_cm: number | null; weight_kg: number | null };
  prefs: Preferences;
  bmiHistory: BmiRow[];
  injuries: Injury[];
  healthIssues: HealthIssue[];
}) {
  const router = useRouter();
  const [height, setHeight] = useState<string>(String(client.height_cm ?? bmiHistory[0]?.height_cm ?? ""));
  const [weight, setWeight] = useState<string>(String(client.weight_kg ?? bmiHistory[0]?.weight_kg ?? ""));
  const [pending, start] = useTransition();

  const latest = bmiHistory[0];
  const previous = bmiHistory[1];
  const delta = latest && previous ? (latest.bmi - previous.bmi).toFixed(2) : null;
  const cls = latest ? classifyBmi(latest.bmi) : null;
  const age = client.dob
    ? Math.floor((Date.now() - new Date(client.dob).getTime()) / (365.25 * 86400000))
    : null;

  const activeInjuries = injuries.filter((i) => !i.resolved_at);
  const openIssues = healthIssues.filter((i) => !i.resolved_at);
  const hasAlerts = activeInjuries.length > 0 || openIssues.length > 0;

  function logBmi() {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w) return toast.error("Height + weight required.");
    start(async () => {
      const res = await fetch("/api/trainer/bmi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, height_cm: h, weight_kg: w }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error("Failed", { description: j.error ?? `HTTP ${res.status}` });
      toast.success(`Logged · BMI ${j.bmi}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ─── Snapshot the AI uses ─── */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            What the AI sees when planning for this client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Age" value={age != null ? `${age} yrs` : "—"} />
            <Stat label="Gender" value={client.gender ?? "—"} capitalize />
            <Stat
              label="BMI"
              value={latest ? latest.bmi.toFixed(1) : "—"}
              sub={cls?.label}
              tone={cls?.tone}
            />
            <Stat
              label="Diet style"
              value={prefs?.is_vegetarian ? "Vegetarian 🥦" : "Non-veg"}
              tone={prefs?.is_vegetarian ? "good" : undefined}
            />
          </div>

          <Separator className="my-3" />

          <div className="grid gap-3 md:grid-cols-3">
            <PrefBlock
              icon={<Apple className="h-3.5 w-3.5 text-emerald-600" />}
              title="Exercise focus"
              items={(prefs?.exercise_types ?? []).map((t) => t.replace("_", " "))}
              empty="No preferences set yet"
            />
            <PrefBlock
              icon={<ShieldAlert className="h-3.5 w-3.5 text-amber-600" />}
              title="Food allergies"
              items={prefs?.allergies ?? []}
              empty="No allergies declared"
              tone="warning"
            />
            <PrefBlock
              icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
              title="Active injuries"
              items={activeInjuries.map((i) => `${i.tag}${i.severity !== "mild" ? ` (${i.severity})` : ""}`)}
              empty="No active injuries"
              tone="danger"
            />
          </div>

          {hasAlerts && (
            <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              ⚠️ Plans will auto-exclude these and any allergens. AI also reads the last 7 days of meals/exercises
              + 14-day BMI trend + 7-day adherence to vary intensity.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── BMI logger + history ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Log BMI (monthly check-in)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="h">Height (cm)</Label>
              <Input
                id="h"
                type="number"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="w">Weight (kg)</Label>
              <Input
                id="w"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="68.5"
              />
            </div>
          </div>
          <Button onClick={logBmi} variant="gradient" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Saving…" : "Save BMI entry"}
          </Button>

          {latest && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold tabular-nums">{latest.bmi.toFixed(2)}</div>
                {cls && (
                  <Badge variant={cls.tone === "good" ? "success" : cls.tone === "warn" ? "warning" : "destructive"}>
                    {cls.label}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {latest.weight_kg} kg · {latest.height_cm} cm · {formatDate(latest.logged_at)}
                {delta !== null && (
                  <span className={cn("ml-2", parseFloat(delta) >= 0 ? "text-rose-600" : "text-emerald-600")}>
                    {parseFloat(delta) >= 0 ? "+" : ""}
                    {delta} vs previous
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent
            </div>
            {bmiHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">No BMI logs yet.</p>
            ) : (
              <ul className="space-y-0.5 text-xs">
                {bmiHistory.slice(0, 6).map((b) => (
                  <li key={b.id} className="flex items-center justify-between border-b py-1 last:border-0">
                    <span className="text-muted-foreground">{formatDate(b.logged_at)}</span>
                    <span className="font-mono tabular-nums">
                      {b.weight_kg} kg · {b.bmi.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Health issues log ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4 text-primary" />
            Recent health issues reported
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No health issues reported. The client can submit one from <code>/client/health</code>.
            </p>
          ) : (
            <ul className="space-y-2">
              {healthIssues.slice(0, 6).map((iss) => (
                <motion.li
                  key={iss.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{iss.problem}</span>
                    <Badge
                      variant={
                        iss.severity === "severe"
                          ? "destructive"
                          : iss.severity === "moderate"
                            ? "warning"
                            : "outline"
                      }
                      className="text-[10px] capitalize"
                    >
                      {iss.severity}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{formatDate(iss.created_at)}</span>
                    {iss.resolved_at && <span className="text-emerald-600">· resolved</span>}
                  </div>
                </motion.li>
              ))}
            </ul>
          )}

          <Separator className="my-3" />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Leaf className="h-3.5 w-3.5 text-emerald-600" />
            Water goal: {prefs?.water_goal_glasses ?? 8} glasses/day
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <ScrollText className="h-3.5 w-3.5" />
            AI diet enabled: {prefs?.ai_diet_enabled === false ? "no" : "yes"} · AI workout enabled:{" "}
            {prefs?.ai_workout_enabled === false ? "no" : "yes"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
  capitalize,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn" | "bad";
  capitalize?: boolean;
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "bad"
          ? "text-rose-600 dark:text-rose-400"
          : "";
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", capitalize && "capitalize", toneCls)}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function PrefBlock({
  icon,
  title,
  items,
  empty,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  empty: string;
  tone?: "warning" | "danger";
}) {
  const chipCls =
    tone === "warning"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : tone === "danger"
        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
        : "bg-primary/10 text-primary";
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((t, i) => (
            <span key={i} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", chipCls)}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
