"use client";

import { useTransition } from "react";
import { PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { grantCheatDayAction } from "./actions";

export function CheatDayButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    const reason = window.prompt("Reason for cheat day (optional):", "Earned it!") ?? "";
    start(async () => {
      const r = await grantCheatDayAction(clientId, reason);
      if (r.ok) {
        toast.success("Cheat day granted");
        router.refresh();
      } else toast.error("Failed");
    });
  }
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
      <PartyPopper className="h-4 w-4" />
      Cheat day
    </Button>
  );
}
