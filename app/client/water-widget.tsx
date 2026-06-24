"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Droplet, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WaterWidget({ clientId, initial, goal }: { clientId: string; initial: number; goal: number }) {
  const [count, setCount] = useState(initial);
  const [pending, start] = useTransition();
  void clientId;

  function update(delta: number) {
    const next = Math.max(0, count + delta);
    setCount(next);
    start(async () => {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ glasses: next }),
      });
      if (!res.ok) toast.error("Failed to save");
    });
  }

  const pct = Math.min(100, (count / goal) * 100);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Droplet className="h-4 w-4 text-sky-500" />
          Water
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto h-44 w-32 overflow-hidden rounded-2xl border-2 border-sky-400/40 bg-sky-50 dark:bg-sky-950/30">
          <motion.div
            initial={false}
            animate={{ height: `${pct}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky-400 to-sky-300"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums text-sky-700 dark:text-sky-200">{count}</span>
            <span className="text-xs text-sky-700/70 dark:text-sky-200/70">/ {goal} glasses</span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" onClick={() => update(-1)} disabled={pending || count === 0}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="gradient" size="sm" onClick={() => update(+1)} disabled={pending}>
            <Plus className="h-4 w-4" />
            Add glass
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
