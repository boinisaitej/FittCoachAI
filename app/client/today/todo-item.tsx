"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Check, X, MinusCircle, Apple, Dumbbell, Droplet, Moon, StickyNote, Sparkles, Loader2, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TodoKind, TodoStatus } from "@/types/domain";

type Recipe = {
  ingredients: { item: string; quantity: string }[];
  steps: string[];
  calories: number;
  prepMinutes: number;
};

const iconFor: Record<TodoKind, React.ComponentType<{ className?: string }>> = {
  food: Apple,
  exercise: Dumbbell,
  water: Droplet,
  sleep: Moon,
  note: StickyNote,
};

export function TodoItem({
  item,
  status,
  delay,
}: {
  item: { id: string; kind: TodoKind; title: string; description?: string | null; quantity?: string | null; ai_reason?: string | null };
  status: TodoStatus | null;
  delay: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Seed from the cached `ai_reason` on the row — zero AI cost on render.
  const [why, setWhy] = useState<string | null>(item.ai_reason ?? null);
  const [whyLoading, setWhyLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState<TodoStatus | null>(null);
  const Icon = iconFor[item.kind] ?? StickyNote;
  const effectiveStatus = localStatus ?? status;

  // Optimistic: flip the bubble instantly, then confirm with the server.
  function set(s: TodoStatus) {
    setLocalStatus(s);
    start(async () => {
      try {
        const res = await fetch("/api/todo/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: item.id, status: s }),
        });
        if (!res.ok) {
          setLocalStatus(null);
          toast.error("Failed to save");
          return;
        }
        toast.success(s === "completed" ? "Nice! 🎯" : s === "partial" ? "Logged partial" : "Skipped");
        router.refresh();
      } catch {
        setLocalStatus(null);
        toast.error("Failed");
      }
    });
  }

  async function loadWhy() {
    if (why) return; // already loaded this session
    setWhyLoading(true);
    try {
      const res = await fetch("/api/ai/why", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          title: item.title,
          kind: item.kind,
          description: item.description,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("AI error", { description: j.error ?? `HTTP ${res.status}` });
        return;
      }
      setWhy(j.data ?? "—");
    } finally {
      setWhyLoading(false);
    }
  }

  async function loadRecipe() {
    if (recipe || recipeLoading) return;
    setRecipeLoading(true);
    try {
      const res = await fetch("/api/ai/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, foodName: item.title }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Recipe failed", { description: j.error ?? `HTTP ${res.status}` });
        return;
      }
      setRecipe(j.data as Recipe);
    } finally {
      setRecipeLoading(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors",
        effectiveStatus === "completed" && "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/20",
        effectiveStatus === "partial" && "border-amber-300/60 bg-amber-50 dark:bg-amber-950/20",
        effectiveStatus === "skipped" && "opacity-60"
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium", effectiveStatus === "completed" && "line-through")}>{item.title}</span>
          {item.quantity && <span className="text-xs text-muted-foreground">· {item.quantity}</span>}
        </div>
        {item.description && <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>}
      </div>

      {item.kind === "food" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadRecipe} title="AI recipe">
              <ChefHat className="h-4 w-4 text-emerald-600" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium uppercase text-muted-foreground">Recipe — {item.title}</div>
              {recipe && (
                <div className="text-[10px] text-muted-foreground">
                  {recipe.prepMinutes} min · {recipe.calories} kcal
                </div>
              )}
            </div>
            {recipeLoading ? (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Loader2 className="h-3 w-3 animate-spin" /> Generating recipe…
              </div>
            ) : recipe ? (
              <div className="mt-2 space-y-2 text-sm">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Ingredients
                  </div>
                  <ul className="mt-0.5 space-y-0.5">
                    {recipe.ingredients.map((i, n) => (
                      <li key={n} className="flex justify-between gap-2">
                        <span>{i.item}</span>
                        <span className="text-xs text-muted-foreground">{i.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Steps
                  </div>
                  <ol className="mt-0.5 list-decimal space-y-1 pl-5">
                    {recipe.steps.map((s, n) => (
                      <li key={n}>{s}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Tap to generate.</p>
            )}
          </PopoverContent>
        </Popover>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadWhy} title="Why is this in your plan?">
            <Sparkles className="h-4 w-4 text-primary" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="text-xs font-medium uppercase text-muted-foreground">Why is this in your plan?</div>
          {whyLoading ? (
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
            </div>
          ) : (
            <p className="mt-1 text-sm leading-relaxed">{why ?? "Tap to load — AI will explain."}</p>
          )}
        </PopoverContent>
      </Popover>

      <div className="flex gap-1">
        <Button size="icon" variant={effectiveStatus === "completed" ? "default" : "outline"} onClick={() => set("completed")} className="h-8 w-8" disabled={pending} title="Complete">
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant={effectiveStatus === "partial" ? "secondary" : "outline"} onClick={() => set("partial")} className="h-8 w-8" disabled={pending} title="Partial">
          <MinusCircle className="h-4 w-4" />
        </Button>
        <Button size="icon" variant={effectiveStatus === "skipped" ? "destructive" : "outline"} onClick={() => set("skipped")} className="h-8 w-8" disabled={pending} title="Skip">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
