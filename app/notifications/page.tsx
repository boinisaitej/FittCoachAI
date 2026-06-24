import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { NotificationActions } from "./notification-actions";
import Link from "next/link";

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = createClient();
  const { data: notifs } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const unread = (notifs ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="container max-w-3xl space-y-6 py-6 lg:py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unread} unread of {(notifs ?? []).length} total</p>
        </div>
        <NotificationActions hasItems={(notifs ?? []).length > 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(notifs ?? []).length === 0 && <p className="text-sm text-muted-foreground">All caught up!</p>}
          {(notifs ?? []).map((n) => (
            <Link
              key={n.id}
              href={n.link ?? "#"}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40 ${!n.read_at ? "bg-primary/5" : ""}`}
            >
              <Badge variant={n.read_at ? "outline" : "default"} className="mt-0.5 capitalize">
                {n.kind.replace("_", " ")}
              </Badge>
              <div className="flex-1">
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
                <div className="text-xs text-muted-foreground">{formatDate(n.created_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              {!n.read_at && <div className="h-2 w-2 self-center rounded-full bg-primary" />}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
