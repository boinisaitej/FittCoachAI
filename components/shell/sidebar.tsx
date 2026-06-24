"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  Apple,
  MessageSquare,
  Bell,
  Activity,
  Calendar,
  ImageIcon,
  CreditCard,
  Megaphone,
  Trophy,
  AlertTriangle,
  HeartPulse,
  ShoppingBasket,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Settings,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { NavItem, NavIconName } from "./nav-config";
import type { SessionUser } from "@/lib/auth";

const ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Users,
  dumbbell: Dumbbell,
  apple: Apple,
  message: MessageSquare,
  bell: Bell,
  activity: Activity,
  calendar: Calendar,
  image: ImageIcon,
  "credit-card": CreditCard,
  megaphone: Megaphone,
  trophy: Trophy,
  alert: AlertTriangle,
  heart: HeartPulse,
  basket: ShoppingBasket,
  book: BookOpen,
  moon: Moon,
};

const STORAGE_KEY = "fitcoach.sidebar.collapsed";

export function Sidebar({ items, user }: { items: NavItem[]; user: SessionUser }) {
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => {
          const next = !c;
          localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
          return next;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  // Avoid layout flash before localStorage read
  if (!mounted) {
    return <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:flex" aria-hidden />;
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card/50 backdrop-blur-xl lg:flex"
    >
      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between border-b px-3 py-4">
        <Link href={`/${user.role}`} className="group flex min-w-0 items-center gap-2">
          <motion.div
            whileHover={{ rotate: -8, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-emerald-500 to-cyan-500 shadow-lg shadow-brand-500/30"
          >
            <Dumbbell className="h-5 w-5 text-white" />
          </motion.div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="min-w-0 overflow-hidden whitespace-nowrap"
              >
                <div className="text-base font-bold tracking-tight">FitCoachAI</div>
                <div className="-mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {user.role}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={collapsed ? "Expand (Ctrl+B)" : "Collapse (Ctrl+B)"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-thin">
        {items.map((item) => {
          const active = path === item.href || path.startsWith(item.href + "/");
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-sm transition-all",
                active ? "text-primary" : "text-foreground/70 hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-pill"
                  className="absolute inset-0 -z-0 rounded-xl bg-gradient-to-r from-brand-500/15 via-emerald-500/10 to-transparent"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              {active && (
                <motion.span
                  layoutId="sidebar-bar"
                  className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gradient-to-b from-brand-500 to-emerald-500"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              <Icon
                className={cn(
                  "relative z-10 h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3",
                  active && "text-primary"
                )}
              />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    className="relative z-10 flex-1 overflow-hidden whitespace-nowrap font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && item.badge && (
                <span className="relative z-10 rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Account + actions */}
      <div className="border-t p-2">
        <Link
          href="/account"
          title={collapsed ? "Account" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted",
            collapsed && "justify-center"
          )}
        >
          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/30">
            {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.full_name ?? ""} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-brand-500 to-emerald-500 text-xs text-white">
              {initials(user.full_name ?? user.email)}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="min-w-0 flex-1 overflow-hidden"
              >
                <div className="truncate text-sm font-medium">{user.full_name ?? "—"}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        <div className={cn("mt-2 flex gap-1", collapsed ? "flex-col" : "")}>
          {!collapsed && (
            <Button asChild variant="ghost" size="sm" className="flex-1 justify-start gap-2">
              <Link href="/account">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </Button>
          )}
          <Button
            variant={collapsed ? "ghost" : "outline"}
            size={collapsed ? "icon" : "sm"}
            onClick={signOut}
            title="Sign out"
            className={cn(
              !collapsed && "flex-1 justify-start gap-2",
              "text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign out</span>}
          </Button>
        </div>
      </div>
    </motion.aside>
  );
}
