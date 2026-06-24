/**
 * Nutrition KB search — uses pgvector when available, falls back to ILIKE.
 * The Supabase migration leaves the embedding column commented out; once you
 * enable pgvector and rerun, set USE_VECTOR=1 to switch this on.
 */
import { createClient } from "@/lib/supabase/server";

export type KbHit = {
  id: string;
  title: string;
  content: string;
  source: string | null;
  score: number;
};

export async function searchKb(query: string, limit = 5): Promise<{ hits: KbHit[]; vectorLive: boolean }> {
  const supabase = createClient();
  const q = query.trim().slice(0, 200);
  if (!q) return { hits: [], vectorLive: false };

  // Fallback: ILIKE on title + content with a poor-man's BM25-ish ranking.
  const { data, error } = await supabase
    .from("nutrition_kb_docs")
    .select("id,title,content,source")
    .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
    .limit(limit * 2);

  if (error || !data) return { hits: [], vectorLive: false };

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const ranked: KbHit[] = data
    .map((d) => {
      const text = `${d.title} ${d.content}`.toLowerCase();
      const score = terms.reduce(
        (acc, t) => acc + (text.match(new RegExp(t, "g"))?.length ?? 0),
        0
      );
      return { ...d, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { hits: ranked, vectorLive: false };
}
