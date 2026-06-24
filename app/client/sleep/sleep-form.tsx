"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SleepForm() {
  const router = useRouter();
  const [hours, setHours] = useState<number>(7);
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  function save() {
    start(async () => {
      const res = await fetch("/api/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours, notes }),
      });
      if (res.ok) {
        toast.success("Logged");
        router.refresh();
      } else toast.error("Failed");
    });
  }
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Hours slept</Label>
        <Input type="number" step="0.25" value={hours} onChange={(e) => setHours(parseFloat(e.target.value))} />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button onClick={save} disabled={pending} variant="gradient">
        <Save className="h-4 w-4" />
        Save
      </Button>
    </div>
  );
}
