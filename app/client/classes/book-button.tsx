"use client";

import { useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { bookClassAction, cancelBookingAction } from "./actions";

export function BookButton({
  classId,
  myStatus,
  full,
}: {
  classId: string;
  myStatus?: "confirmed" | "waitlist" | "cancelled";
  full: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const active = myStatus === "confirmed" || myStatus === "waitlist";

  function go() {
    start(async () => {
      if (active) {
        const r = await cancelBookingAction(classId);
        if (r.ok) {
          toast.success("Cancelled");
          router.refresh();
        } else toast.error("Failed");
        return;
      }
      const r = await bookClassAction(classId);
      if (r.ok) {
        toast.success(r.status === "waitlist" ? "Added to waitlist" : "Booked");
        router.refresh();
      } else toast.error("Failed", { description: r.error });
    });
  }

  return (
    <Button
      onClick={go}
      disabled={pending}
      size="sm"
      variant={active ? "outline" : full ? "secondary" : "gradient"}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : active ? (
        <X className="h-4 w-4" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      {active ? "Cancel" : full ? "Join waitlist" : "Book"}
    </Button>
  );
}
