"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResolveAlertButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function onClick() {
    start(async () => {
      const res = await fetch("/api/trainer/alerts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Resolved");
        router.refresh();
      } else toast.error("Failed");
    });
  }
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={pending}>
      <Check className="h-4 w-4" />
      Resolve
    </Button>
  );
}
