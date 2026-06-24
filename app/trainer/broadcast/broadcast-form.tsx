"use client";

import { useState, useTransition } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { broadcastAction } from "./actions";

export function BroadcastForm({ clientCount }: { clientCount: number }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  function send() {
    if (!title || !body) return toast.error("Title and message required.");
    start(async () => {
      const r = await broadcastAction({ title, body });
      if (r.ok) {
        toast.success(`Sent to ${r.count} clients`);
        setTitle("");
        setBody("");
      } else toast.error(r.error ?? "Failed");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4 text-primary" />
          Message
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="t">Title</Label>
          <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b">Message</Label>
          <Textarea id="b" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <Button onClick={send} disabled={pending || clientCount === 0} variant="gradient">
          {pending ? "Sending..." : `Send to ${clientCount} clients`}
        </Button>
      </CardContent>
    </Card>
  );
}
