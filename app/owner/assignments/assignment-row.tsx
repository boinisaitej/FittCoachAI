"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initials } from "@/lib/utils";
import { assignTrainerAction } from "./actions";

type Trainer = { id: string; full_name: string | null; gender: string | null; trainer_type: string | null; specialization: string | null };
type Client = { id: string; full_name: string | null; email: string | null; gender: string | null };

export function AssignmentRow({
  client,
  trainers,
  currentTrainerId,
}: {
  client: Client;
  trainers: Trainer[];
  currentTrainerId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onChange(value: string) {
    start(async () => {
      const res = await assignTrainerAction(client.id, value);
      if (res.ok) {
        toast.success("Assigned");
        router.refresh();
      } else toast.error("Failed");
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gradient-to-br from-brand-500 to-emerald-500 text-white text-[10px]">
            {initials(client.full_name ?? client.email)}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-medium">{client.full_name}</div>
          <div className="text-xs text-muted-foreground capitalize">{client.gender ?? "—"} · {client.email}</div>
        </div>
      </div>
      <Select value={currentTrainerId ?? undefined} onValueChange={onChange} disabled={pending}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Assign trainer..." />
        </SelectTrigger>
        <SelectContent>
          {trainers.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.full_name}{t.trainer_type ? ` · ${t.trainer_type}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
