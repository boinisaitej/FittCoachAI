"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export function MotivationBanner() {
  const [line, setLine] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/ai/motivation", { cache: "no-store" });
        const j = (await r.json()) as { ok: boolean; data?: string };
        if (alive && j.ok && j.data) setLine(j.data);
      } catch {
        /* silent — banner just stays hidden */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading || !line) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-pink-500/10 px-4 py-3 text-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Daily nudge
          </div>
          <p className="text-foreground/90">{line}</p>
        </div>
      </div>
    </div>
  );
}
