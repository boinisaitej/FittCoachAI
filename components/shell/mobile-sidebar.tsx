"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  Moon,
  LogOut,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
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

export function MobileSidebar({
  open,
  onOpenChange,
  items,
  user,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: NavItem[];
  user: SessionUser;
}) {
  const path = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <Link
          href={`/${user.role}`}
          className="group flex items-center gap-2 border-b px-4 py-4"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            whileHover={{ rotate: -8, scale: 1.05 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-emerald-500 to-cyan-500 shadow-lg shadow-brand-500/30"
          >
            <Dumbbell className="h-5 w-5 text-white" />
          </motion.div>
          <div>
            <div className="text-base font-bold tracking-tight">FitCoachAI</div>
            <div className="-mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {user.role}
            </div>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-thin">
          {items.map((item) => {
            const active = path === item.href || path.startsWith(item.href + "/");
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all",
                  active ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted"
                )}
              >
                {active && (
                  <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gradient-to-b from-brand-500 to-emerald-500" />
                )}
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                <span className="flex-1 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-2">
          <Link
            href="/account"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
          >
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/30">
              {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.full_name ?? ""} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-brand-500 to-emerald-500 text-xs text-white">
                {initials(user.full_name ?? user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user.full_name ?? "—"}</div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </Link>
          <div className="mt-2 flex gap-1">
            <Button asChild variant="ghost" size="sm" className="flex-1 justify-start gap-2">
              <Link href="/account" onClick={() => onOpenChange(false)}>
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex-1 justify-start gap-2 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
