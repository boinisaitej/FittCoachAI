"use client";

import { useState, useTransition } from "react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addSloganAction, generateAiSlogansAction } from "./actions";

export function AddSloganForm({ gymId }: { gymId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  function add() {
    if (!text.trim()) return;
    start(async () => {
      const r = await addSloganAction(gymId, text.trim());
      if (r.ok) {
        setText("");
        toast.success("Added");
        router.refresh();
      } else toast.error("Failed");
    });
  }

  function gen() {
    start(async () => {
      const r = await generateAiSlogansAction(gymId, 6);
      if (r.ok) {
        toast.success(`Generated ${r.count}`);
        router.refresh();
      } else toast.error("Failed");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add or generate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your own slogan..."
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          />
          <Button onClick={add} disabled={pending}><Plus className="h-4 w-4" />Add</Button>
          <Button variant="gradient" onClick={gen} disabled={pending}>
            <Sparkles className="h-4 w-4" />
            AI generate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
