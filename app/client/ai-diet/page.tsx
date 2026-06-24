"use client";

import { useState, useTransition } from "react";
import { Sparkles, Apple, Loader2, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { AiDietDayPlan } from "@/types/domain";

export default function AiDietPage() {
  const [day, setDay] = useState<AiDietDayPlan | null>(null);
  const [week, setWeek] = useState<{ weekStart: string; days: AiDietDayPlan[] } | null>(null);
  const [pending, start] = useTransition();

  function generate(scope: "day" | "week") {
    start(async () => {
      const res = await fetch("/api/ai/diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error("AI error", { description: j.error ?? `HTTP ${res.status}` });
      if (scope === "day") setDay(j.data);
      else setWeek(j.data);
      toast.success("Generated");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">AI Diet</h1>
          <p className="text-sm text-muted-foreground">Personalised to your goals, injuries, festivals, and allergies.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => generate("day")} disabled={pending} variant="gradient">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Today&apos;s plan
          </Button>
          <Button onClick={() => generate("week")} disabled={pending} variant="outline">
            <Calendar className="h-4 w-4" />
            Full week
          </Button>
        </div>
      </div>

      <Tabs defaultValue="day">
        <TabsList>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
        </TabsList>
        <TabsContent value="day">
          {day ? (
            <DayCards day={day} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">Tap &quot;Today&apos;s plan&quot; to generate.</CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="week">
          {week ? (
            <div className="space-y-6">
              {week.days.map((d) => (
                <div key={d.date}>
                  <h3 className="mb-2 text-sm font-semibold">{d.date}</h3>
                  <DayCards day={d} />
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">Tap &quot;Full week&quot; to generate.</CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DayCards({ day }: { day: AiDietDayPlan }) {
  const meals = [day.breakfast, day.midMorning, day.lunch, day.snack, day.dinner].filter(Boolean) as NonNullable<AiDietDayPlan["breakfast"]>[];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {meals.map((m, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Apple className="h-4 w-4 text-emerald-500" />
                {m.name}
              </CardTitle>
              <Badge variant="secondary">{m.totalCalories} kcal</Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {m.items.map((it, j) => (
                  <li key={j} className="flex items-center justify-between border-b py-1 last:border-0">
                    <span>{it.food}</span>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {it.quantity}{it.calories ? ` · ${it.calories} kcal` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              {m.recipe && <p className="mt-2 text-xs text-muted-foreground">📖 {m.recipe}</p>}
            </CardContent>
          </Card>
        </motion.div>
      ))}
      <Card className="sm:col-span-2 bg-gradient-to-r from-brand-500/10 to-emerald-500/10">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Day total</div>
            <div className="text-2xl font-bold">{day.totalCalories} kcal</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-muted-foreground">Hydration goal</div>
            <div className="text-2xl font-bold">{day.hydrationGlasses} glasses</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
