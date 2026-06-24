"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClassAction } from "./actions";

const CATEGORIES = ["Yoga", "Zumba", "HIIT", "CrossFit", "Aerobics", "Pilates", "Spinning", "Strength", "General"];

export function NewClassForm({
  trainers,
}: {
  trainers: { id: string; full_name: string | null; specialization: string | null }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Yoga");
  const [trainerId, setTrainerId] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("08:00");
  const [capacity, setCapacity] = useState(12);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return toast.error("Title required");
    const startAt = new Date(`${date}T${start}:00`).toISOString();
    const endAt = new Date(`${date}T${end}:00`).toISOString();
    startTransition(async () => {
      const res = await createClassAction({
        title,
        category,
        trainerId: trainerId || undefined,
        startAt,
        endAt,
        capacity,
        notes,
      });
      if (res.ok) {
        toast.success("Class scheduled");
        setTitle("");
        setNotes("");
        router.refresh();
      } else toast.error("Failed", { description: res.error });
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sunrise Yoga"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Trainer</Label>
          <Select value={trainerId} onValueChange={setTrainerId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick trainer" />
            </SelectTrigger>
            <SelectContent>
              {trainers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.full_name} {t.specialization ? `· ${t.specialization}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Start</Label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>End</Label>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Capacity</Label>
          <Input
            type="number"
            min={1}
            max={200}
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value || "0", 10))}
          />
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bring your mat" />
        </div>
      </div>
      <Button onClick={submit} disabled={pending || !title.trim()} variant="gradient">
        <Plus className="h-4 w-4" />
        {pending ? "Saving…" : "Schedule class"}
      </Button>
    </div>
  );
}
