import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { initials, formatDate } from "@/lib/utils";

export default async function TrainerClients({ searchParams }: { searchParams: { q?: string } }) {
  const user = await requireRole("trainer");
  const supabase = createClient();
  const q = (searchParams.q ?? "").trim();
  const { data: rows } = await supabase
    .from("trainer_clients")
    .select("client_id,assigned_at,profiles:client_id(id,full_name,email,gender,phone,avatar_url)")
    .eq("trainer_id", user.id)
    .is("ended_at", null);

  let list = (rows ?? []).map((r) => ({
    ...((r.profiles as { id: string; full_name: string | null; email: string | null; gender: string | null; phone: string | null })),
    assigned_at: r.assigned_at,
  }));
  if (q) list = list.filter((c) => (c.full_name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">My clients</h1>
          <p className="text-sm text-muted-foreground">{list.length} clients</p>
        </div>
        <form className="relative" action="/trainer/clients">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search..." className="w-56 pl-9" />
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <Link
                key={c.id}
                href={`/trainer/clients/${c.id}`}
                className="rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-brand-500 to-emerald-500 text-white">
                      {initials(c.full_name ?? c.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </div>
                  <Badge variant="outline" className="capitalize">{c.gender ?? "—"}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Assigned {formatDate(c.assigned_at)}</p>
              </Link>
            ))}
          </div>
          {list.length === 0 && <p className="text-sm text-muted-foreground">No clients matching that filter.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
