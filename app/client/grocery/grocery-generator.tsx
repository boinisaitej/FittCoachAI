"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Categories = Record<string, { item: string; quantity: string; inr: number }[]>;

export function GroceryGenerator() {
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date();
  week.setDate(week.getDate() + 7);
  const weekStr = week.toISOString().slice(0, 10);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(weekStr);
  const [data, setData] = useState<{ categories: Categories; totalInr: number } | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  function generate() {
    start(async () => {
      const res = await fetch("/api/ai/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      if (!res.ok) return toast.error("Failed");
      const j = (await res.json()) as { data: { categories: Categories; totalInr: number } };
      setData(j.data);
      setChecked(new Set());
      toast.success("Generated");
    });
  }

  const totalItems = data ? Object.values(data.categories).reduce((a, b) => a + b.length, 0) : 0;
  const pct = totalItems ? Math.round((checked.size * 100) / totalItems) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Generate from diet plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <Button onClick={generate} disabled={pending} variant="gradient">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate
        </Button>

        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-card p-3">
              <span className="font-medium">{checked.size}/{totalItems} checked · ₹{Math.round(data.totalInr)}</span>
              <span className="text-xs text-muted-foreground">{pct}%</span>
            </div>
            {Object.entries(data.categories).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat}</h3>
                <div className="grid gap-1 sm:grid-cols-2">
                  {items.map((it, i) => {
                    const key = `${cat}-${i}`;
                    const isChecked = checked.has(key);
                    return (
                      <motion.label
                        key={key}
                        layout
                        whileTap={{ scale: 0.97 }}
                        className={`flex items-center gap-2 rounded-lg border p-2 ${isChecked ? "bg-emerald-50 line-through opacity-70 dark:bg-emerald-950/30" : "bg-card"}`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(v) => {
                            const next = new Set(checked);
                            if (v) next.add(key);
                            else next.delete(key);
                            setChecked(next);
                          }}
                        />
                        <span className="flex-1 text-sm">{it.item}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{it.quantity} · ₹{it.inr}</span>
                        {isChecked && <Check className="h-3 w-3 text-emerald-600" />}
                      </motion.label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
