"use client";

import { useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ScannedFood = {
  detected: { name: string; quantity: string; calories: number; protein_g?: number; carbs_g?: number; fat_g?: number }[];
  totalCalories: number;
  notes?: string;
};

export function Scanner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScannedFood | null>(null);
  const [pending, start] = useTransition();

  function onFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large", { description: "Keep it under 5 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDataUrl(typeof reader.result === "string" ? reader.result : null);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }

  function reset() {
    setDataUrl(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function scan() {
    if (!dataUrl) return;
    start(async () => {
      const res = await fetch("/api/ai/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error("AI error", { description: j.error ?? `HTTP ${res.status}` });
      setResult(j.data as ScannedFood);
      toast.success("Scanned");
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      {/* Upload area */}
      <div className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />

        {dataUrl ? (
          <div className="relative overflow-hidden rounded-xl border">
            <img src={dataUrl} alt="To scan" className="aspect-square w-full object-cover" />
            <button
              onClick={reset}
              className="absolute right-2 top-2 rounded-full bg-card/90 p-2 shadow hover:bg-card"
              title="Remove"
            >
              <Trash2 className="h-4 w-4 text-rose-600" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-card/50 p-6 text-center transition-all hover:border-primary hover:bg-card"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-500 shadow-lg shadow-brand-500/30">
              <Camera className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold">Tap to take or upload a photo</div>
              <div className="mt-1 text-xs text-muted-foreground">Max 5 MB · jpg / png / webp</div>
            </div>
          </button>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={pending} className="flex-1">
            <Upload className="h-4 w-4" />
            {dataUrl ? "Replace" : "Choose photo"}
          </Button>
          <Button onClick={scan} disabled={!dataUrl || pending} variant="gradient" className="flex-1">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {pending ? "Scanning..." : "Scan with AI"}
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <Card className="bg-gradient-to-br from-brand-500/10 to-emerald-500/10">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
                    <div className="text-3xl font-bold tabular-nums">{result.totalCalories}</div>
                    <div className="text-xs text-muted-foreground">calories</div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {result.detected.length} item{result.detected.length === 1 ? "" : "s"} detected
                  </div>
                </CardContent>
              </Card>

              {result.detected.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    {result.notes ?? "No food detected. Try a clearer photo."}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {result.detected.map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card>
                        <CardContent className="flex items-center justify-between p-3">
                          <div>
                            <div className="text-sm font-semibold">{d.name}</div>
                            <div className="text-xs text-muted-foreground">{d.quantity}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold tabular-nums">{d.calories} kcal</div>
                            <div className="flex gap-2 text-[10px] text-muted-foreground">
                              {d.protein_g != null && <span>P {d.protein_g}g</span>}
                              {d.carbs_g != null && <span>C {d.carbs_g}g</span>}
                              {d.fat_g != null && <span>F {d.fat_g}g</span>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {result.notes && (
                <p className="rounded-lg border bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  💡 {result.notes}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border bg-card/40 p-6 text-center"
            >
              <Sparkles className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Scan a photo to see calories + macros here</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Works best on single-plate photos with good lighting.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
