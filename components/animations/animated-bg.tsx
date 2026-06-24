"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Soft animated mesh-gradient background. Cheap variant:
 *  - Static gradient base always renders (zero cost).
 *  - Two blurry blobs only mount after first paint AND only if the OS
 *    doesn't prefer reduced motion.
 *  - Animation cycles are slow (22s, 28s) so we're not burning a frame loop.
 */
export function AnimatedBg() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEnabled(true), 200);
    return () => clearTimeout(id);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-cyan-500/5" />
      {enabled && !reduce && (
        <>
          <motion.div
            className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
    </div>
  );
}
