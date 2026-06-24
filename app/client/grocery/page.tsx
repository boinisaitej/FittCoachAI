import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { GroceryGenerator } from "./grocery-generator";

export default async function GroceryPage() {
  const user = await requireRole("client");
  const supabase = createClient();
  const { data: lists } = await supabase
    .from("grocery_lists")
    .select("id,title,date_from,date_to,total_inr,items,checked,created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grocery list</h1>
        <p className="text-sm text-muted-foreground">Generate from your AI diet plan and tick items off as you shop.</p>
      </div>

      <GroceryGenerator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(lists ?? []).length === 0 && <p className="text-sm text-muted-foreground">No lists yet.</p>}
          {(lists ?? []).map((g) => (
            <div key={g.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{g.title}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(g.date_from)} – {formatDate(g.date_to)} · ₹{Math.round(g.total_inr)}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
