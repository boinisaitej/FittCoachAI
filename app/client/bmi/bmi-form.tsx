"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function BmiForm({ clientId }: { clientId: string }) {
  void clientId;
  const router = useRouter();
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [pending, start] = useTransition();

  function save() {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w) return toast.error("Height and weight required.");
    start(async () => {
      const res = await fetch("/api/bmi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ height_cm: h, weight_kg: w }),
      });
      if (res.ok) {
        toast.success("Logged");
        setHeight("");
        setWeight("");
        router.refresh();
      } else toast.error("Failed");
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="h">Height (cm)</Label>
        <Input id="h" type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="w">Weight (kg)</Label>
        <Input id="w" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </div>
      <Button onClick={save} variant="gradient" className="w-full" disabled={pending}>
        <Save className="h-4 w-4" />
        {pending ? "Saving..." : "Log BMI"}
      </Button>
    </div>
  );
}
