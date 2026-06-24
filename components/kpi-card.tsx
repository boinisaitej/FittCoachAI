"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import {
  Activity,
  Apple,
  Bell,
  CreditCard,
  Droplet,
  Dumbbell,
  Flame,
  Megaphone,
  MessageSquare,
  Moon,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  AlertTriangle,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiIconName =
  | "users"
  | "activity"
  | "trending-up"
  | "trending-down"
  | "credit-card"
  | "trophy"
  | "flame"
  | "apple"
  | "dumbbell"
  | "droplet"
  | "moon"
  | "bell"
  | "megaphone"
  | "message"
  | "alert"
  | "clipboard";

const ICONS: Record<KpiIconName, LucideIcon> = {
  users: Users,
  activity: Activity,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "credit-card": CreditCard,
  trophy: Trophy,
  flame: Flame,
  apple: Apple,
  dumbbell: Dumbbell,
  droplet: Droplet,
  moon: Moon,
  bell: Bell,
  megaphone: Megaphone,
  message: MessageSquare,
  alert: AlertTriangle,
  clipboard: ClipboardCheck,
};

const TONE_GRADIENTS = {
  default: "from-brand-500/20 via-emerald-500/10 to-cyan-500/10",
  success: "from-emerald-500/25 via-emerald-400/10 to-teal-500/10",
  warning: "from-amber-500/25 via-orange-400/10 to-rose-500/10",
  danger: "from-rose-500/25 via-pink-400/10 to-purple-500/10",
};

const TONE_ICON = {
  default: "text-brand-600 dark:text-brand-400",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-rose-600 dark:text-rose-400",
};

export function KpiCard({
  label,
  value,
  hint,
  delta,
  icon,
  tone = "default",
  delay = 0,
}: {
  label: string;
  value: string | number;
  hint?: string;
  delta?: number;
  icon?: KpiIconName;
  tone?: "default" | "success" | "warning" | "danger";
  delay?: number;
}) {
  const Icon = icon ? ICONS[icon] : undefined;
  const isNumeric = typeof value === "number";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group relative"
    >
      <div className={cn("absolute -inset-px rounded-2xl bg-gradient-to-br opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-60", TONE_GRADIENTS[tone])} />
      <div className="relative overflow-hidden rounded-2xl border bg-card/80 shadow-sm transition-all duration-300 group-hover:shadow-xl">
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", TONE_GRADIENTS[tone])} />
        <div
          aria-hidden
          className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/40 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:bg-white/5"
        />
        <div className="relative p-5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {label}
            </div>
            {Icon && (
              <motion.div
                whileHover={{ rotate: -8, scale: 1.15 }}
                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-card shadow-sm", TONE_ICON[tone])}
              >
                <Icon className="h-4 w-4" />
              </motion.div>
            )}
          </div>

          <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight">
            {isNumeric ? <CountUp to={value as number} delay={delay} /> : value}
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {delta !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
                  delta >= 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                )}
              >
                {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(delta)}%
              </span>
            )}
            {hint && <span>{hint}</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CountUp({ to, delay = 0 }: { to: number; delay?: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("en-IN"));
  useEffect(() => {
    const controls = animate(mv, to, { duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [mv, to, delay]);
  return <motion.span>{rounded}</motion.span>;
}
