"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Injury = { id: string; tag: string; severity: string; notes: string | null; resolved_at: string | null };

export function InjuriesPanel({ injuries }: { injuries: Injury[] }) {
  const router = useRouter();
  const [tag, setTag] = useState("");
  const [pending, start] = useTransition();

  function add() {
    if (!tag.trim()) return;
    start(async () => {
      const res = await fetch("/api/health/injury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, severity: "mild" }),
      });
      if (res.ok) {
        setTag("");
        toast.success("Logged. Future AI workouts will exclude this.");
        router.refresh();
      } else toast.error("Failed");
    });
  }

  function resolve(id: string) {
    start(async () => {
      const res = await fetch("/api/health/injury", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolve: true }),
      });
      if (res.ok) {
        toast.success("Resolved");
        router.refresh();
      } else toast.error("Failed");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Active injuries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. left knee"
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          />
          <Button onClick={add} disabled={pending}><Plus className="h-4 w-4" />Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {injuries.filter((i) => !i.resolved_at).map((i) => (
            <Badge key={i.id} variant="warning" className="cursor-pointer gap-1" onClick={() => resolve(i.id)} title="Mark resolved">
              {i.tag}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {injuries.filter((i) => !i.resolved_at).length === 0 && (
            <p className="text-xs text-muted-foreground">No active injuries.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
