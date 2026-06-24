"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CalendarPlus, Percent, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { discountSubscriptionAction, extendSubscriptionAction } from "./actions";

export function SubscriptionActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function extend(days: number) {
    start(async () => {
      const r = await extendSubscriptionAction(id, days);
      if (r.ok) {
        toast.success(`Extended ${days} days`);
        router.refresh();
      } else toast.error("Failed");
    });
  }

  function discount() {
    const raw = window.prompt("Discount % (0-100):", "10");
    if (!raw) return;
    const pct = parseInt(raw, 10);
    if (Number.isNaN(pct)) return;
    start(async () => {
      const r = await discountSubscriptionAction(id, pct);
      if (r.ok) {
        toast.success(`Discount set to ${pct}%`);
        router.refresh();
      } else toast.error("Failed");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => extend(7)}><CalendarPlus className="mr-2 h-4 w-4" />+ 7 days</DropdownMenuItem>
        <DropdownMenuItem onClick={() => extend(30)}><CalendarPlus className="mr-2 h-4 w-4" />+ 30 days</DropdownMenuItem>
        <DropdownMenuItem onClick={() => extend(90)}><CalendarPlus className="mr-2 h-4 w-4" />+ 90 days</DropdownMenuItem>
        <DropdownMenuItem onClick={discount}><Percent className="mr-2 h-4 w-4" />Set discount</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
