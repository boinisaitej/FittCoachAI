"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  Plus,
  Dumbbell,
  Apple,
  Droplet,
  Moon as MoonIcon,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDate, weekStart as weekStartFn } from "@/lib/utils";
import { saveWeekPlanAction } from "./actions";
import type { TodoKind } from "@/types/domain";

type Item = {
  kind: TodoKind;
  title: string;
  description?: string;
  quantity?: string;
  ai_reason?: string;
  position: number;
};

const kindIcons: Record<TodoKind, React.ComponentType<{ className?: string }>> = {
  food: Apple,
  exercise: Dumbbell,
  water: Droplet,
  sleep: MoonIcon,
  note: StickyNote,
};

export function WeekPlanBuilder({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [aiPending, startAi] = useTransition();
  const [weekStart, setWeekStart] = useState<string>(() => weekStartFn().toISOString().slice(0, 10));
  const [byDate, setByDate] = useState<Record<string, Item[]>>({});
  const [activeDate, setActiveDate] = useState<string>(() => weekStartFn().toISOString().slice(0, 10));

  const dates = useMemo(() => {
    const d0 = new Date(weekStart);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(d0);
      d.setDate(d0.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [weekStart]);

  useEffect(() => {
    setActiveDate(dates[0]);
    setByDate({});
  }, [weekStart, dates]);

  const items = byDate[activeDate] ?? [];

  function setItems(next: Item[]) {
    setByDate((prev) => ({ ...prev, [activeDate]: next.map((it, i) => ({ ...it, position: i })) }));
  }
  function update(idx: number, patch: Partial<Item>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function add() {
    setItems([...items, { kind: "food", title: "", position: items.length }]);
  }
  function remove(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  async function aiSuggest() {
    startAi(async () => {
      const res = await fetch("/api/ai/suggest-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, weekStart }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error("AI error", { description: j.error ?? `HTTP ${res.status}` });
      setByDate(j.byDate as Record<string, Item[]>);
      toast.success("AI generated 7 days — review then Save.");
    });
  }

  function save() {
    start(async () => {
      const res = await saveWeekPlanAction(clientId, weekStart, byDate);
      if (res.ok) {
        toast.success(`Saved ${res.days} days`);
        router.refresh();
      } else toast.error("Save failed");
    });
  }

  function shiftWeek(deltaDays: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + deltaDays);
    setWeekStart(d.toISOString().slice(0, 10));
  }

  const totalItems = Object.values(byDate).reduce((a, b) => a + b.length, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-primary" />
          Week plan — starting {formatDate(weekStart, { day: "2-digit", month: "short" })}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={() => shiftWeek(-7)} className="h-8 w-8" title="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => shiftWeek(7)} className="h-8 w-8" title="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={aiSuggest} disabled={aiPending || pending} variant="outline" size="sm">
            {aiPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI suggest 7 days
          </Button>
          <Button
            onClick={save}
            disabled={pending || totalItems === 0}
            variant="gradient"
            size="sm"
          >
            <Save className="h-4 w-4" />
            Save week
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day tabs */}
        <div className="mb-3 grid grid-cols-7 gap-1">
          {dates.map((d) => {
            const count = (byDate[d] ?? []).length;
            const active = d === activeDate;
            const date = new Date(d);
            return (
              <button
                key={d}
                onClick={() => setActiveDate(d)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[10px] transition-all",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <span className="font-bold uppercase">
                  {date.toLocaleString("en-IN", { weekday: "short" })}
                </span>
                <span className="text-sm font-semibold">{date.getDate()}</span>
                {count > 0 && (
                  <span className={cn("rounded-full px-1.5 text-[9px]", active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Day editor */}
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((it, idx) => {
              const Icon = kindIcons[it.kind];
              return (
                <motion.div
                  key={idx}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="grid grid-cols-12 items-center gap-2 rounded-lg border bg-card p-2"
                >
                  <div className="col-span-2">
                    <Select value={it.kind} onValueChange={(v) => update(idx, { kind: v as TodoKind })}>
                      <SelectTrigger className="h-9 text-xs">
                        <Icon className="h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="exercise">Exercise</SelectItem>
                        <SelectItem value="water">Water</SelectItem>
                        <SelectItem value="sleep">Sleep</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    className="col-span-4 h-9"
                    placeholder="Title"
                    value={it.title}
                    onChange={(e) => update(idx, { title: e.target.value })}
                  />
                  <Input
                    className="col-span-2 h-9"
                    placeholder="Qty"
                    value={it.quantity ?? ""}
                    onChange={(e) => update(idx, { quantity: e.target.value })}
                  />
                  <Input
                    className="col-span-3 h-9"
                    placeholder="Notes"
                    value={it.description ?? ""}
                    onChange={(e) => update(idx, { description: e.target.value })}
                  />
                  <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8" onClick={() => remove(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <Button onClick={add} variant="outline" className="w-full">
            <Plus className="h-4 w-4" />
            Add row to {new Date(activeDate).toLocaleString("en-IN", { weekday: "short" })}
          </Button>

          {items.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Empty day. Click &quot;AI suggest 7 days&quot; or add rows manually.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
