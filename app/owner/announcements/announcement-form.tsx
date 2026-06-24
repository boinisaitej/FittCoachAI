"use client";

import { useState, useTransition } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { createAnnouncementAction } from "./actions";

export function AnnouncementForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [trainers, setTrainers] = useState(true);
  const [clients, setClients] = useState(true);
  const [emailToo, setEmailToo] = useState(false);
  const [scheduleFor, setScheduleFor] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!title || !body) return toast.error("Title and message are required.");
    if (!trainers && !clients) return toast.error("Pick at least one audience.");
    const audience = {
      roles: [...(trainers ? ["trainer"] : []), ...(clients ? ["client"] : [])] as ("trainer" | "client")[],
      sendEmail: emailToo,
    };
    start(async () => {
      const r = await createAnnouncementAction({ title, body, audience, scheduleFor: scheduleFor || undefined });
      if (r.ok) {
        toast.success(scheduleFor ? "Scheduled" : "Sent!");
        setTitle("");
        setBody("");
        setScheduleFor("");
        router.refresh();
      } else toast.error("Failed", { description: r.error });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4 text-primary" />
          New announcement
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
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={trainers} onCheckedChange={(v) => setTrainers(!!v)} /> Trainers
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={clients} onCheckedChange={(v) => setClients(!!v)} /> Clients
          </label>
          <label className="ml-auto flex items-center gap-2 text-sm">
            Email too
            <Switch checked={emailToo} onCheckedChange={setEmailToo} />
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sched">Schedule (optional)</Label>
          <Input id="sched" type="datetime-local" value={scheduleFor} onChange={(e) => setScheduleFor(e.target.value)} />
        </div>
        <Button onClick={submit} disabled={pending} variant="gradient">
          {pending ? "Processing..." : scheduleFor ? "Schedule" : "Send now"}
        </Button>
      </CardContent>
    </Card>
  );
}
