import { Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeadPipeline, type Lead } from "./lead-pipeline";

export default async function LeadsPage() {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("id,full_name,email,phone,source,notes,stage,converted_client_id,created_at,updated_at")
    .eq("gym_id", owner.gym_id!)
    .order("updated_at", { ascending: false });

  const list = (leads ?? []) as Lead[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users2 className="h-5 w-5 text-primary" />
            Lead pipeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Walk-ins, trial sign-ups, conversions, and lost leads — drag through the stages.
          </p>
        </div>
        <Badge variant="secondary" className="h-6">
          {list.length} total leads
        </Badge>
      </div>

      <LeadPipeline initial={list} />
    </div>
  );
}
