/**
 * Nav config. Icons are stored as STRING keys (not component references) so
 * this object is safe to ship from Server Components → Client Components.
 * The Sidebar resolves the string to the actual Lucide icon at render time.
 */

export type NavIconName =
  | "dashboard"
  | "users"
  | "dumbbell"
  | "apple"
  | "message"
  | "bell"
  | "activity"
  | "calendar"
  | "image"
  | "credit-card"
  | "megaphone"
  | "trophy"
  | "alert"
  | "heart"
  | "basket"
  | "book"
  | "moon";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  badge?: string | number;
};

export const ownerNav: NavItem[] = [
  { href: "/owner", label: "Console", icon: "dashboard" },
  { href: "/owner/analytics", label: "Analytics", icon: "activity" },
  { href: "/owner/users", label: "Users", icon: "users" },
  { href: "/owner/leads", label: "Leads", icon: "alert" },
  { href: "/owner/classes", label: "Classes", icon: "calendar" },
  { href: "/owner/specializations", label: "Specializations", icon: "trophy" },
  { href: "/owner/plans", label: "Plans & Subs", icon: "credit-card" },
  { href: "/owner/assignments", label: "Assignments", icon: "activity" },
  { href: "/owner/invoices", label: "Invoices", icon: "credit-card" },
  { href: "/owner/leaderboard", label: "Leaderboard", icon: "trophy" },
  { href: "/owner/payroll", label: "Payroll", icon: "credit-card" },
  { href: "/owner/announcements", label: "Announcements", icon: "megaphone" },
  { href: "/owner/chat", label: "Chat", icon: "message" },
  { href: "/owner/slogans", label: "Slogans", icon: "trophy" },
  { href: "/owner/audit", label: "Audit Log", icon: "alert" },
];

export const trainerNav: NavItem[] = [
  { href: "/trainer", label: "Dashboard", icon: "dashboard" },
  { href: "/trainer/clients", label: "My Clients", icon: "users" },
  { href: "/trainer/alerts", label: "Alerts", icon: "alert" },
  { href: "/trainer/broadcast", label: "Broadcast", icon: "megaphone" },
  { href: "/trainer/chat", label: "Chat", icon: "message" },
];

export const clientNav: NavItem[] = [
  { href: "/client", label: "Dashboard", icon: "dashboard" },
  { href: "/client/today", label: "Today", icon: "calendar" },
  { href: "/client/calendar", label: "Calendar", icon: "calendar" },
  { href: "/client/classes", label: "Group Classes", icon: "users" },
  { href: "/client/ai-diet", label: "AI Diet", icon: "apple" },
  { href: "/client/ai-workout", label: "AI Workout", icon: "dumbbell" },
  { href: "/client/scan", label: "Food Scanner", icon: "apple" },
  { href: "/client/grocery", label: "Grocery", icon: "basket" },
  { href: "/client/nutrition-kb", label: "Nutrition KB", icon: "book" },
  { href: "/client/chat", label: "Chat", icon: "message" },
  { href: "/client/bmi", label: "BMI", icon: "activity" },
  { href: "/client/health", label: "Health", icon: "heart" },
  { href: "/client/sleep", label: "Sleep", icon: "moon" },
  { href: "/client/junk", label: "Junk Log", icon: "alert" },
  { href: "/client/photos", label: "Progress Photos", icon: "image" },
  { href: "/client/invoices", label: "Invoices", icon: "credit-card" },
];

export function navForRole(role: "owner" | "trainer" | "client"): NavItem[] {
  return role === "owner" ? ownerNav : role === "trainer" ? trainerNav : clientNav;
}
