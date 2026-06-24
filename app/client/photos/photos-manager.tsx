"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate } from "@/lib/utils";
import type { PhotoKind } from "@/types/domain";

type Photo = { id: string; kind: PhotoKind; storage_path: string; notes: string | null; taken_at: string; url: string };

export function PhotosManager({ photos, clientId }: { photos: Photo[]; clientId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<PhotoKind>("progress");
  const [pending, start] = useTransition();

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    start(async () => {
      const supabase = createClient();
      const path = `${clientId}/${Date.now()}-${file.name.replace(/[^\w.]/g, "_")}`;
      const { error } = await supabase.storage.from("progress-photos").upload(path, file, { upsert: false });
      if (error) return toast.error("Upload failed", { description: error.message });
      const { error: insErr } = await supabase
        .from("progress_photos")
        .insert({ client_id: clientId, kind, storage_path: path });
      if (insErr) return toast.error("DB save failed", { description: insErr.message });
      toast.success("Uploaded");
      router.refresh();
    });
  }

  const before = photos.find((p) => p.kind === "before");
  const after = photos.find((p) => p.kind === "after");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Select value={kind} onValueChange={(v) => setKind(v as PhotoKind)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="before">Before</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
            <SelectItem value="after">After</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex">
          <input type="file" accept="image/*" onChange={upload} disabled={pending} className="hidden" />
          <Button asChild disabled={pending} variant="gradient">
            <span className="cursor-pointer">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Upload {kind}
            </span>
          </Button>
        </label>
      </div>

      {before && after && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-2">
            <div className="relative">
              <div className="absolute left-2 top-2 z-10">
                <Badge>Before · {formatDate(before.taken_at)}</Badge>
              </div>
              <img src={before.url} alt="Before" className="aspect-square w-full object-cover" />
            </div>
            <div className="relative">
              <div className="absolute left-2 top-2 z-10">
                <Badge variant="success">After · {formatDate(after.taken_at)}</Badge>
              </div>
              <img src={after.url} alt="After" className="aspect-square w-full object-cover" />
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="relative overflow-hidden rounded-xl border"
          >
            <img src={p.url} alt={p.kind} className="aspect-square w-full object-cover" />
            <div className="absolute left-2 top-2">
              <Badge
                className={cn(
                  p.kind === "before" ? "bg-rose-500" : p.kind === "after" ? "bg-emerald-500" : "bg-blue-500"
                )}
              >
                {p.kind}
              </Badge>
            </div>
            <div className="bg-card p-2 text-xs text-muted-foreground">{formatDate(p.taken_at)}</div>
          </motion.div>
        ))}
        {photos.length === 0 && <p className="text-sm text-muted-foreground">No photos yet.</p>}
      </div>
    </div>
  );
}
