"use client";

import { useTransition } from "react";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { autoMatchAllAction } from "./actions";

export function AutoMatchButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  function onClick() {
    start(async () => {
      const res = await autoMatchAllAction();
      if (res.ok) {
        toast.success(`Matched ${res.matched} clients`);
        router.refresh();
      } else toast.error("Failed");
    });
  }
  return (
    <Button variant="gradient" onClick={onClick} disabled={pending}>
      <Wand2 className="h-4 w-4" />
      {pending ? "Matching..." : "Auto-match all"}
    </Button>
  );
}
