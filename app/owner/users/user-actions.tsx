"use client";

import { MoreVertical, KeyRound, UserX, UserCheck } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resetPasswordAction, setActiveAction } from "./actions";

export function UserActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onToggle() {
    start(async () => {
      const r = await setActiveAction(id, !active);
      if (r.ok) {
        toast.success(active ? "Deactivated" : "Reactivated");
        router.refresh();
      } else toast.error("Failed");
    });
  }

  function onReset() {
    start(async () => {
      const r = await resetPasswordAction(id);
      if (r.ok) toast.success("Password reset email sent");
      else toast.error("Failed");
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
        <DropdownMenuItem onClick={onReset}>
          <KeyRound className="mr-2 h-4 w-4" />
          Reset password
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggle} className={active ? "text-destructive" : ""}>
          {active ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
          {active ? "Deactivate" : "Reactivate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
