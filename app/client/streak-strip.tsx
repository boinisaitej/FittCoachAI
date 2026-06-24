"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function StreakStrip({ current, clientId }: { current: number; clientId: string }) {
  const [days, setDays] = useState<("done" | "miss" | "partial")[]>([]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const today = new Date();
      const dates = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
      });
      const { data } = await supabase
        .from("todo_completions")
        .select("completed_at,status")
        .eq("client_id", clientId)
        .gte("completed_at", `${dates[0]}T00:00:00Z`);
      const byDate = new Map<string, ("completed" | "partial" | "skipped")[]>();
      (data ?? []).forEach((r) => {
        const d = r.completed_at.slice(0, 10);
        byDate.set(d, [...(byDate.get(d) ?? []), r.status as "completed" | "partial" | "skipped"]);
      });
      setDays(
        dates.map((d) => {
          const ss = byDate.get(d) ?? [];
          if (ss.includes("completed")) return "done";
          if (ss.includes("partial")) return "partial";
          return "miss";
        })
      );
    })();
  }, [clientId]);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Flame className="h-4 w-4 text-amber-500" /> 7-day streak — <strong>{current}d</strong> active
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((s, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "flex h-12 items-center justify-center rounded-lg border text-sm font-medium",
              s === "done" && "bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-300",
              s === "partial" && "bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300",
              s === "miss" && "bg-muted text-muted-foreground"
            )}
          >
            {["M", "T", "W", "T", "F", "S", "S"][new Date(Date.now() - (6 - i) * 86400000).getDay() === 0 ? 6 : new Date(Date.now() - (6 - i) * 86400000).getDay() - 1]}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
