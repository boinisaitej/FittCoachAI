"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Save, Trash2, GripVertical, UtensilsCrossed, Dumbbell, Droplet, Moon, StickyNote, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { TodoKind, TodoStatus } from "@/types/domain";
import { saveDailyPlanAction } from "./actions";

type Item = {
  id?: string;
  kind: TodoKind;
  title: string;
  description?: string;
  quantity?: string;
  ai_reason?: string | null;
  position: number;
};

const kindIcons: Record<TodoKind, React.ComponentType<{ className?: string }>> = {
  food: UtensilsCrossed,
  exercise: Dumbbell,
  water: Droplet,
  sleep: Moon,
  note: StickyNote,
};

export function DailyPlanBuilder({
  clientId,
  initial,
  completions,
  planId,
}: {
  clientId: string;
  initial: Item[];
  completions: { daily_plan_item_id: string; status: TodoStatus }[];
  planId: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(
    initial
      .sort((a, b) => a.position - b.position)
      .map((it, i) => ({ ...it, position: i }))
  );
  const [pending, start] = useTransition();

  const completionMap = new Map(completions.map((c) => [c.daily_plan_item_id, c.status]));

  function add() {
    setItems((prev) => [
      ...prev,
      { kind: "food", title: "", description: "", quantity: "", position: prev.length },
    ]);
  }

  function update(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function remove(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, position: i })));
  }

  function save() {
    if (items.some((it) => !it.title.trim())) return toast.error("All rows need a title.");
    start(async () => {
      const res = await saveDailyPlanAction(clientId, items);
      if (res.ok) {
        toast.success("Plan saved");
        router.refresh();
      } else toast.error("Failed", { description: res.error });
    });
  }

  async function aiSuggest() {
    start(async () => {
      const res = await fetch("/api/ai/suggest-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) return toast.error("AI suggest failed");
      const json = (await res.json()) as { items: Item[] };
      setItems(json.items.map((it, i) => ({ ...it, position: i })));
      toast.success("AI plan generated");
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Today&apos;s plan</CardTitle>
        <div className="flex gap-2">
          <Button onClick={aiSuggest} disabled={pending} variant="outline" size="sm">
            <Sparkles className="h-4 w-4" />
            AI suggest
          </Button>
          <Button onClick={save} disabled={pending} variant="gradient" size="sm">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimatePresence>
          {items.map((it, idx) => {
            const Icon = kindIcons[it.kind];
            const status = it.id ? completionMap.get(it.id) : undefined;
            return (
              <motion.div
                key={idx}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="grid grid-cols-12 items-center gap-2 rounded-lg border bg-card p-2"
              >
                <div className="col-span-1 flex justify-center text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </div>
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
                <div className="col-span-4">
                  <Input
                    value={it.title}
                    placeholder="Title"
                    onChange={(e) => update(idx, { title: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={it.quantity ?? ""}
                    placeholder="Qty"
                    onChange={(e) => update(idx, { quantity: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={it.description ?? ""}
                    placeholder="Notes"
                    onChange={(e) => update(idx, { description: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="col-span-1 flex justify-end gap-1">
                  {status && (
                    <Badge variant={status === "completed" ? "success" : "warning"} className="text-[9px] capitalize">
                      {status[0]}
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => remove(idx)} className="h-8 w-8">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <Button onClick={add} variant="outline" className="w-full">
          <Plus className="h-4 w-4" />
          Add row
        </Button>

        {items.length === 0 && <Label className="block text-center text-xs text-muted-foreground">Click &quot;AI suggest&quot; or add rows manually.</Label>}
      </CardContent>
    </Card>
  );
}
