"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelClassAction } from "./actions";

export function CancelClassButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function go() {
    if (!confirm("Cancel this class? Confirmed bookings will keep the slot until refunded manually.")) return;
    start(async () => {
      const r = await cancelClassAction(id);
      if (r.ok) {
        toast.success("Cancelled");
        router.refresh();
      } else toast.error("Failed", { description: r.error });
    });
  }
  return (
    <Button onClick={go} variant="ghost" size="icon" disabled={pending} title="Cancel class">
      <X className="h-4 w-4 text-rose-600" />
    </Button>
  );
}
