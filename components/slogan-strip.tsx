"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

type Props = { slogans: string[]; intervalMs?: number };

/**
 * Single-slogan rotator. Fades + slides one slogan at a time, every
 * ~4 seconds. Far less DOM than the previous marquee and much easier to
 * read. Pauses on hover.
 */
export function SloganStrip({ slogans, intervalMs = 4000 }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slogans.length <= 1 || paused) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % slogans.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slogans.length, intervalMs, paused]);

  if (!slogans.length) return null;
  const text = slogans[idx % slogans.length];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative flex h-9 items-center justify-center overflow-hidden border-b bg-gradient-to-r from-brand-500/10 via-emerald-500/10 to-cyan-500/10"
    >
      <Sparkles className="mr-2 h-3.5 w-3.5 shrink-0 text-brand-500" />
      <AnimatePresence mode="wait">
        <motion.span
          key={text}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-sm font-medium text-foreground/85"
        >
          {text}
        </motion.span>
      </AnimatePresence>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex gap-1">
        {slogans.slice(0, 8).map((_, i) => (
          <span
            key={i}
            className={`h-1 w-1 rounded-full transition-all ${
              (idx % slogans.length) === i ? "w-3 bg-brand-500" : "bg-foreground/20"
            }`}
          />
        ))}
      </span>
    </div>
  );
}
