"use client";

import { motion } from "framer-motion";
import { Leaf } from "lucide-react";

export function FestivalBanner({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center gap-2 border-b bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
    >
      <Leaf className="h-3.5 w-3.5 text-emerald-600" />
      Festival day: <strong>{name}</strong> — diet locked to vegetarian.
    </motion.div>
  );
}
