"use client";

import { useState, useTransition } from "react";
import { Sparkles, Dumbbell, Loader2, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { AiWorkoutDayPlan } from "@/types/domain";

export default function AiWorkoutPage() {
  const [day, setDay] = useState<AiWorkoutDayPlan | null>(null);
  const [week, setWeek] = useState<{ weekStart: string; days: AiWorkoutDayPlan[] } | null>(null);
  const [pending, start] = useTransition();

  function generate(scope: "day" | "week") {
    start(async () => {
      const res = await fetch("/api/ai/workout", {
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
          <h1 className="text-2xl font-bold">AI Workout</h1>
          <p className="text-sm text-muted-foreground">Injury-aware blocks calibrated to your goals.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => generate("day")} disabled={pending} variant="gradient">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Today
          </Button>
          <Button onClick={() => generate("week")} disabled={pending} variant="outline">
            <Calendar className="h-4 w-4" />
            Week
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
            <DayBlocks day={day} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">Tap &quot;Today&quot; to generate.</CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="week">
          {week ? (
            <div className="space-y-4">
              {week.days.map((d) => (
                <details key={d.date} className="rounded-lg border bg-card p-3">
                  <summary className="cursor-pointer font-semibold">{d.date} — {d.focus}</summary>
                  <div className="mt-3">
                    <DayBlocks day={d} />
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">Tap &quot;Week&quot; to generate.</CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DayBlocks({ day }: { day: AiWorkoutDayPlan }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Dumbbell className="h-4 w-4 text-brand-500" />
          {day.focus}
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline">{day.durationMin} min</Badge>
          <Badge variant="secondary" className="capitalize">{day.intensity}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {day.blocks.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-lg border bg-card p-3"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{b.name}</div>
                <Badge variant="outline" className="text-[10px] capitalize">{b.type}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {b.sets ? `${b.sets} sets × ${b.reps ?? "?"} reps` : b.duration ?? ""}
              </p>
              {b.notes && <p className="mt-1 text-xs">{b.notes}</p>}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
