import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AnnouncementForm } from "./announcement-form";

export default async function AnnouncementsPage() {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const { data: list } = await supabase
    .from("announcements")
    .select("id,title,body,audience,scheduled_for,sent_at,created_at")
    .eq("gym_id", owner.gym_id!)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-sm text-muted-foreground">Send immediately or schedule for later. Audience: all / trainers / clients.</p>
      </div>

      <AnnouncementForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(list ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
          {(list ?? []).map((a) => (
            <div key={a.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{a.title}</div>
                <Badge variant={a.sent_at ? "success" : a.scheduled_for ? "secondary" : "outline"}>
                  {a.sent_at ? "Sent" : a.scheduled_for ? "Scheduled" : "Draft"}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.sent_at ? `Sent ${formatDate(a.sent_at)}` : a.scheduled_for ? `Scheduled ${formatDate(a.scheduled_for)}` : `Created ${formatDate(a.created_at)}`}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
