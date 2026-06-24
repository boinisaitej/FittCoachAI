"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Loader2, PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

/* ─── Indian-calendar conventions ─────────────────────────────────────
 * Week starts on SUNDAY (standard Indian / Hindu calendar layout).
 * All "today" math runs in Asia/Kolkata, not browser-local UTC, so a
 * tap shortly after midnight IST doesn't end up picking yesterday's
 * UTC date.
 * ─────────────────────────────────────────────────────────────────── */
const IST_TZ = "Asia/Kolkata";
const WEEK_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Returns YYYY-MM-DD for a given Date in IST. */
function istDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
const todayIST = () => istDateStr(new Date());

type StatusMap = Record<string, { completed: number; partial: number; skipped: number }>;

type DayItem = {
  id: string;
  kind: "food" | "exercise" | "water" | "sleep" | "note";
  title: string;
  quantity: string | null;
  description: string | null;
  position: number;
  status: "completed" | "partial" | "skipped" | "pending";
};

const KIND_EMOJI: Record<DayItem["kind"], string> = {
  food: "🍎",
  exercise: "💪",
  water: "💧",
  sleep: "🌙",
  note: "📝",
};

export function CalendarView({
  year: initialYear,
  month: initialMonth,
  statusByDate,
}: {
  year: number;
  month: number;
  statusByDate: StatusMap;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selected, setSelected] = useState<string>(() => todayIST());
  const [items, setItems] = useState<DayItem[] | null>(null);
  const [cheat, setCheat] = useState<{ reason: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  // Sunday-first layout: getDay() returns 0=Sun … 6=Sat, so the lead count
  // IS the day-of-week. (Previous code used `(firstDow + 6) % 7` to shift to
  // Monday-first — Indian calendars start on Sunday.)
  const firstDow = new Date(year, month, 1).getDay();
  const lead = firstDow;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: ({ date?: Date })[] = [];
  for (let i = 0; i < lead; i++) cells.push({});
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });

  const todayStr = useMemo(() => todayIST(), []);

  // Fetch the selected day's plan + cheat + completions.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setItems(null);
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const [{ data: plan }, { data: cheatRow }] = await Promise.all([
        supabase
          .from("daily_plans")
          .select("id,plan_date,daily_plan_items(id,kind,title,quantity,description,position)")
          .eq("client_id", user.id)
          .eq("plan_date", selected)
          .maybeSingle(),
        supabase
          .from("cheat_days")
          .select("reason")
          .eq("client_id", user.id)
          .eq("cheat_date", selected)
          .maybeSingle(),
      ]);

      const planItems = (plan?.daily_plan_items ?? []) as Omit<DayItem, "status">[];
      const ids = planItems.map((i) => i.id);
      let statusMap = new Map<string, DayItem["status"]>();
      if (ids.length) {
        const { data: comps } = await supabase
          .from("todo_completions")
          .select("daily_plan_item_id,status")
          .eq("client_id", user.id)
          .in("daily_plan_item_id", ids);
        statusMap = new Map((comps ?? []).map((c) => [c.daily_plan_item_id, c.status as DayItem["status"]]));
      }
      if (cancelled) return;
      setCheat(cheatRow ?? null);
      setItems(
        planItems
          .sort((a, b) => a.position - b.position)
          .map((it) => ({ ...it, status: statusMap.get(it.id) ?? "pending" }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    setMonth(m);
    setYear(y);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
      {/* ─── Calendar grid ─────────────────────────────────────────── */}
      <Card className="self-start">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">
            {new Date(year, month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} className="h-7 w-7" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Parse today's IST date so the highlighted year/month line up
                // even if browser-local time is on the other side of midnight.
                const [y, m] = todayIST().split("-").map(Number);
                setYear(y);
                setMonth(m - 1);
                setSelected(todayIST());
              }}
              className="h-7 px-2 text-xs"
            >
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} className="h-7 w-7" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {WEEK_DAY_LABELS.map((d) => (
              <div key={d} className={cn(d === "Sun" && "text-rose-600/70 dark:text-rose-400/80")}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((c, i) => {
              if (!c.date) return <div key={i} />;
              const key = istDateStr(c.date);
              const s = statusByDate[key];
              const isToday = key === todayStr;
              const isPast = key < todayStr;
              const isSunday = c.date.getDay() === 0;
              const tone =
                s?.completed && s.completed >= 3
                  ? "bg-emerald-500/15 border-emerald-300 text-emerald-700 dark:text-emerald-300"
                  : s?.completed
                    ? "bg-amber-500/15 border-amber-300 text-amber-700 dark:text-amber-300"
                    : isPast
                      ? "bg-rose-500/10 border-rose-200 text-rose-700/70 dark:text-rose-300/70"
                      : "border-border bg-card";
              const isSelected = key === selected;
              return (
                <motion.button
                  type="button"
                  key={i}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.004 }}
                  onClick={() => setSelected(key)}
                  className={cn(
                    "relative flex h-9 items-center justify-center rounded-md border text-[11px] font-medium transition-all hover:scale-[1.05]",
                    tone,
                    isSunday && !s && "text-rose-600/80 dark:text-rose-400/90",
                    isToday && "ring-2 ring-primary",
                    isSelected && "scale-[1.06] shadow-md ring-2 ring-brand-500"
                  )}
                >
                  {c.date.getDate()}
                  {s && (
                    <span
                      className={cn(
                        "absolute bottom-0.5 right-0.5 h-1 w-1 rounded-full",
                        s.completed && s.completed >= 3
                          ? "bg-emerald-500"
                          : s.partial
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      )}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <Dot cls="bg-emerald-500" /> 3+ completed
            <Dot cls="bg-amber-500" /> partial
            <Dot cls="bg-rose-500" /> missed
          </div>
        </CardContent>
      </Card>

      {/* ─── Day detail panel ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalIcon className="h-4 w-4 text-primary" />
            {formatDate(selected, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </CardTitle>
          {cheat && (
            <Badge variant="warning" className="w-fit gap-1">
              <PartyPopper className="h-3 w-3" />
              Cheat day{cheat.reason ? ` — ${cheat.reason}` : ""}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="min-h-[360px]">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="l"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-40 items-center justify-center text-sm text-muted-foreground"
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </motion.div>
            ) : items && items.length > 0 ? (
              <motion.ul
                key="i"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-1.5"
              >
                {items.map((it, i) => (
                  <motion.li
                    key={it.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors",
                      it.status === "completed" && "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/20",
                      it.status === "partial" && "border-amber-300/60 bg-amber-50 dark:bg-amber-950/20",
                      it.status === "skipped" && "opacity-60"
                    )}
                  >
                    <span className="text-base">{KIND_EMOJI[it.kind]}</span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className={cn("font-medium", it.status === "completed" && "line-through")}>
                          {it.title}
                        </span>
                        {it.quantity && (
                          <span className="text-xs text-muted-foreground">· {it.quantity}</span>
                        )}
                      </div>
                      {it.description && (
                        <div className="line-clamp-2 text-xs text-muted-foreground">{it.description}</div>
                      )}
                    </div>
                    <StatusBadge status={it.status} />
                  </motion.li>
                ))}
              </motion.ul>
            ) : (
              <motion.div
                key="e"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-40 flex-col items-center justify-center text-sm text-muted-foreground"
              >
                <CalIcon className="h-8 w-8 opacity-30" />
                <p className="mt-2">No plan was created for this day.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

function Dot({ cls }: { cls: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("h-1.5 w-1.5 rounded-full", cls)} />
    </span>
  );
}

function StatusBadge({ status }: { status: DayItem["status"] }) {
  const cfg = {
    completed: { label: "Done", cls: "bg-emerald-500 text-white" },
    partial: { label: "Partial", cls: "bg-amber-500 text-white" },
    skipped: { label: "Skipped", cls: "bg-rose-500 text-white" },
    pending: { label: "Pending", cls: "border" },
  }[status];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", cfg.cls)}>
      {cfg.label}
    </span>
  );
}
