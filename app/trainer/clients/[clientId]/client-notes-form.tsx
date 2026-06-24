"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveNoteAction } from "./actions";

export function ClientNotesForm({ clientId }: { clientId: string }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  function save() {
    if (!body.trim()) return;
    start(async () => {
      const r = await saveNoteAction(clientId, body.trim());
      if (r.ok) toast.success("Note saved");
      else toast.error("Failed");
      setBody("");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add a coach note</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="What you observed this week..." />
        <Button onClick={save} variant="gradient" disabled={pending}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
