import { Sidebar } from "./sidebar";
import type { NavItem } from "./nav-config";
import { Topbar } from "./topbar";
import { SloganStrip } from "@/components/slogan-strip";
import { FestivalBanner } from "@/components/festival-banner";
import { PageTransition } from "@/components/animations/page-transition";
import { AnimatedBg } from "@/components/animations/animated-bg";
import { createClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth";

// Tiny in-memory cache. Slogans + festivals change rarely, but the AppShell
// renders on every authenticated page. Cache for 5 minutes per gym.
const _shellCache = new Map<string, { at: number; slogans: string[]; festival: { name: string; is_veg_only: boolean } | null }>();
const SHELL_TTL_MS = 5 * 60_000;

export async function AppShell({
  user,
  nav,
  children,
}: {
  user: SessionUser;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const cacheKey = `${user.gym_id ?? "_"}|${new Date().toISOString().slice(0, 10)}`;
  let cached = _shellCache.get(cacheKey);
  if (!cached || Date.now() - cached.at > SHELL_TTL_MS) {
    const supabase = createClient();
    const [{ data: slogans }, { data: festivalsToday }] = await Promise.all([
      supabase
        .from("slogans")
        .select("text")
        .or(`gym_id.is.null,gym_id.eq.${user.gym_id ?? "00000000-0000-0000-0000-000000000000"}`)
        .eq("active", true)
        .limit(40),
      supabase
        .from("festivals")
        .select("name,is_veg_only")
        .eq("festival_date", new Date().toISOString().slice(0, 10)),
    ]);
    cached = {
      at: Date.now(),
      slogans: (slogans ?? []).map((s) => s.text),
      festival: (festivalsToday?.[0] as { name: string; is_veg_only: boolean } | undefined) ?? null,
    };
    _shellCache.set(cacheKey, cached);
  }

  const slogansText = cached.slogans;
  const festivalToday = cached.festival;

  return (
    <div className="flex min-h-screen">
      <Sidebar items={nav} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} nav={nav} />
        <SloganStrip slogans={slogansText} />
        {festivalToday?.is_veg_only && <FestivalBanner name={festivalToday.name} />}
        <main className="relative flex-1 overflow-x-hidden bg-gradient-to-br from-background via-background to-muted/30">
          <AnimatedBg />
          <div
            className="relative mx-auto w-full
              px-3 py-4
              sm:px-4 sm:py-6
              md:px-6
              lg:max-w-[min(100%-3rem,1280px)] lg:px-8 lg:py-8
              xl:max-w-[min(100%-3rem,1440px)] xl:py-10
              2xl:max-w-[min(100%-4rem,1600px)] 2xl:py-12
              3xl:max-w-[min(100%-6rem,1800px)]"
          >
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
