"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updatePlanAction } from "./actions";

type Plan = { id: string; name: string; kind: "basic" | "pro"; price_cents: number; duration_days: number; active: boolean };

export function PlanEditor({ plan }: { plan: Plan }) {
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(plan.price_cents / 100);
  const [days, setDays] = useState(plan.duration_days);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await updatePlanAction(plan.id, {
        name,
        price_cents: Math.round(price * 100),
        duration_days: days,
      });
      if (r.ok) toast.success("Plan updated");
      else toast.error("Failed");
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base capitalize">{plan.kind} plan</CardTitle>
          <p className="text-xs text-muted-foreground">{plan.kind === "pro" ? "Personal trainer · AI premium" : "Group · standard AI"}</p>
        </div>
        <Badge variant={plan.kind === "pro" ? "default" : "secondary"} className="capitalize">{plan.kind}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`n-${plan.id}`}>Display name</Label>
          <Input id={`n-${plan.id}`} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`p-${plan.id}`}>Price (₹)</Label>
            <Input id={`p-${plan.id}`} type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value || "0"))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`d-${plan.id}`}>Duration (days)</Label>
            <Input id={`d-${plan.id}`} type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value || "0", 10))} />
          </div>
        </div>
        <Button onClick={save} disabled={pending} variant="gradient" size="sm">
          <Save className="h-4 w-4" />
          {pending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
