"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, Database } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Hit = { id: string; title: string; content: string; source: string | null; score: number };

export function KbSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [vectorLive, setVectorLive] = useState(false);
  const [pending, start] = useTransition();

  function search() {
    if (!q.trim()) return;
    start(async () => {
      const res = await fetch("/api/kb/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) return toast.error("Search failed");
      const j = (await res.json()) as { hits: Hit[]; vectorLive: boolean };
      setHits(j.hits);
      setVectorLive(j.vectorLive);
    });
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex gap-2 p-4">
          <Input
            value={q}
            placeholder='Try: "post-workout protein" or "paneer macros"'
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
          />
          <Button onClick={search} disabled={pending} variant="gradient">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        <Badge variant={vectorLive ? "success" : "secondary"} className="text-[10px]">
          <Database className="mr-1 h-3 w-3" />
          {vectorLive ? "Vector live" : "Fallback search"}
        </Badge>
      </div>

      <div className="space-y-2">
        {hits.map((h, i) => (
          <motion.div key={h.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{h.title}</CardTitle>
                <Badge variant="outline" className="text-[10px]">score {h.score}</Badge>
              </CardHeader>
              <CardContent className="text-sm">
                <p>{h.content}</p>
                {h.source && <p className="mt-2 text-xs text-muted-foreground">Source: {h.source}</p>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {hits.length === 0 && !pending && (
          <p className="text-sm text-muted-foreground">Type a question above and hit search.</p>
        )}
      </div>
    </div>
  );
}
