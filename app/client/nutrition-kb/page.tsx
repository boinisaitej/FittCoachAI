import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { KbSearch } from "./kb-search";

export default async function NutritionKbPage() {
  const user = await requireRole("client");
  const supabase = createClient();
  const { data: history } = await supabase
    .from("nutrition_kb_queries")
    .select("id,query,results,vector_live,created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nutrition KB</h1>
        <p className="text-sm text-muted-foreground">RAG-backed nutrition search — sources cited.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <KbSearch />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent searches</CardTitle>
          </CardHeader>
          <CardContent>
            {(history ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
            <ul className="space-y-1">
              {(history ?? []).map((h) => (
                <li key={h.id} className="rounded border p-2 text-sm">
                  <div className="font-medium line-clamp-1">{h.query}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(h.created_at)}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
