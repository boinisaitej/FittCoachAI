"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Severity } from "@/types/domain";

export function HealthForm() {
  const router = useRouter();
  const [problem, setProblem] = useState("");
  const [severity, setSeverity] = useState<Severity>("mild");
  const [pending, start] = useTransition();

  function submit() {
    if (!problem.trim()) return toast.error("Describe the issue.");
    start(async () => {
      const res = await fetch("/api/health/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem, severity }),
      });
      if (!res.ok) return toast.error("Failed");
      toast.success("Reported — AI remedy generated.");
      setProblem("");
      setSeverity("mild");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="problem">What&apos;s going on?</Label>
        <Textarea id="problem" rows={3} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="e.g. Lower back ache after deadlifts" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sev">Severity</Label>
        <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mild">Mild</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="severe">Severe</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={submit} disabled={pending} variant="gradient" className="w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Submit + AI remedy
      </Button>
    </div>
  );
}
