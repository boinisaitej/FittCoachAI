import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PlanEditor } from "./plan-editor";
import { SubscriptionActions } from "./subscription-actions";

export default async function PlansPage() {
  const owner = await requireRole("owner");
  const supabase = createClient();

  const [{ data: plans }, { data: subs }] = await Promise.all([
    supabase.from("plans").select("*").eq("gym_id", owner.gym_id!).order("kind"),
    supabase
      .from("subscriptions")
      .select(
        "id,start_date,end_date,discount_pct,status,plans:plan_id(name,kind,price_cents),profiles:client_id(id,full_name,email)"
      )
      .order("end_date", { ascending: true })
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plans &amp; Subscriptions</h1>
        <p className="text-sm text-muted-foreground">Tune pricing, extend memberships, and apply discounts.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(plans ?? []).map((p) => (
          <PlanEditor key={p.id} plan={p} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {(subs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pl-2">Client</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">Period</th>
                    <th className="py-2">Discount</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs!.map((s) => {
                    const client = s.profiles as { id: string; full_name: string | null; email: string | null };
                    const plan = s.plans as { name: string; kind: string; price_cents: number };
                    return (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2 pl-2">
                          <div className="font-medium">{client?.full_name}</div>
                          <div className="text-xs text-muted-foreground">{client?.email}</div>
                        </td>
                        <td className="py-2">
                          {plan?.name} · {formatCurrency(plan?.price_cents ?? 0)}
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {formatDate(s.start_date)} – {formatDate(s.end_date)}
                        </td>
                        <td className="py-2">{s.discount_pct ?? 0}%</td>
                        <td className="py-2">
                          <Badge variant={s.status === "active" ? "success" : "outline"}>{s.status}</Badge>
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <SubscriptionActions id={s.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
