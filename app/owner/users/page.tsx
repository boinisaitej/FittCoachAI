import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { initials, formatDate } from "@/lib/utils";
import { CreateUserDialog } from "./create-user-dialog";
import { BulkImportDialog } from "./bulk-import-dialog";
import { UserActions } from "./user-actions";

export default async function UsersPage({ searchParams }: { searchParams: { create?: string; q?: string } }) {
  const owner = await requireRole("owner");
  const supabase = createClient();

  const q = (searchParams.q ?? "").trim();
  let qb = supabase
    .from("profiles")
    .select("id,email,full_name,role,phone,gender,specialization,trainer_type,active,created_at,avatar_url")
    .eq("gym_id", owner.gym_id!)
    .neq("role", "owner")
    .order("created_at", { ascending: false });
  if (q) qb = qb.ilike("full_name", `%${q}%`);
  const { data: users } = await qb;

  const trainers = (users ?? []).filter((u) => u.role === "trainer");
  const clients = (users ?? []).filter((u) => u.role === "client");
  const defaultCreate = searchParams.create === "trainer" || searchParams.create === "client" ? searchParams.create : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">Trainers and clients across your gym.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action="/owner/users" method="get" className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder="Search by name..." className="w-56 pl-9" />
          </form>
          <BulkImportDialog />
          <CreateUserDialog defaultRole={defaultCreate as "trainer" | "client" | null} />
        </div>
      </div>

      <Tabs defaultValue={defaultCreate ?? "trainers"}>
        <TabsList>
          <TabsTrigger value="trainers">Trainers ({trainers.length})</TabsTrigger>
          <TabsTrigger value="clients">Clients ({clients.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="trainers">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trainers</CardTitle>
            </CardHeader>
            <CardContent>
              <UserTable rows={trainers} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <UserTable rows={clients} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserTable({ rows }: { rows: { id: string; full_name: string | null; email: string | null; role: string; active: boolean; created_at: string; specialization?: string | null; trainer_type?: string | null; phone?: string | null; gender?: string | null }[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No users yet. Create one above.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pl-2">Name</th>
            <th className="py-2">Contact</th>
            <th className="py-2">Detail</th>
            <th className="py-2">Joined</th>
            <th className="py-2">Status</th>
            <th className="py-2 pr-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-2 pl-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-gradient-to-br from-brand-500 to-emerald-500 text-white text-[10px]">
                      {initials(u.full_name ?? u.email)}
                    </AvatarFallback>
                  </Avatar>
                  <Link href={`/owner/users/${u.id}`} className="font-medium hover:underline">
                    {u.full_name ?? "—"}
                  </Link>
                </div>
              </td>
              <td className="py-2 text-muted-foreground">
                <div>{u.email}</div>
                {u.phone && <div className="text-xs">{u.phone}</div>}
              </td>
              <td className="py-2 text-muted-foreground">
                {u.role === "trainer" ? (
                  <>
                    <span className="capitalize">{u.trainer_type ?? "—"}</span>
                    <div className="text-xs">{u.specialization ?? "—"}</div>
                  </>
                ) : (
                  <span className="capitalize">{u.gender ?? "—"}</span>
                )}
              </td>
              <td className="py-2 text-muted-foreground">{formatDate(u.created_at)}</td>
              <td className="py-2">
                <Badge variant={u.active ? "success" : "outline"}>{u.active ? "Active" : "Deactivated"}</Badge>
              </td>
              <td className="py-2 pr-2 text-right">
                <UserActions id={u.id} active={u.active} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
