"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const QUICK = ["🍕 Pizza", "🍔 Burger", "🍟 Fries", "🍩 Doughnut", "🥤 Soda", "🍫 Chocolate", "🍦 Ice cream", "🍿 Popcorn"];

export function JunkForm() {
  const router = useRouter();
  const [item, setItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pending, start] = useTransition();

  function save(text?: string) {
    const value = (text ?? item).trim();
    if (!value) return toast.error("Enter what you ate.");
    start(async () => {
      const res = await fetch("/api/junk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: value, quantity: quantity || null }),
      });
      if (!res.ok) return toast.error("Failed");
      toast.success("Logged");
      setItem("");
      setQuantity("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="item">Item</Label>
        <Input
          id="item"
          value={item}
          placeholder="e.g. Cheese pizza"
          onChange={(e) => setItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="qty">Quantity (optional)</Label>
        <Input
          id="qty"
          value={quantity}
          placeholder="1 slice / 200g / 1 cup"
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>
      <Button onClick={() => save()} variant="gradient" className="w-full" disabled={pending}>
        <Plus className="h-4 w-4" />
        {pending ? "Saving..." : "Log it"}
      </Button>

      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick add
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => save(q)}
              disabled={pending}
              className="rounded-full border bg-card px-2.5 py-1 text-xs transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
