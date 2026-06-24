"use client";

import { useTransition } from "react";
import { CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function NotificationActions({ hasItems }: { hasItems: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function call(action: "mark_all_read" | "clear") {
    start(async () => {
      const res = await fetch("/api/notifications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) return toast.error("Failed");
      toast.success(action === "mark_all_read" ? "All marked read" : "Cleared");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => call("mark_all_read")} disabled={pending || !hasItems}>
        <CheckCheck className="h-4 w-4" />
        Mark all read
      </Button>
      <Button variant="ghost" size="sm" onClick={() => call("clear")} disabled={pending || !hasItems} className="text-destructive">
        <Trash2 className="h-4 w-4" />
        Clear all
      </Button>
    </div>
  );
}
