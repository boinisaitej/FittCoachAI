import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/owner", "/trainer", "/client", "/notifications", "/account"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const url = request.nextUrl.pathname;

  // Skip middleware entirely for static / webhook / cron / asset requests.
  if (
    url.startsWith("/_next") ||
    url.startsWith("/api/webhooks") ||
    url.startsWith("/api/cron") ||
    url.startsWith("/static") ||
    url === "/favicon.ico" ||
    url === "/favicon.svg" ||
    url === "/manifest.webmanifest" ||
    url === "/sw.js"
  ) {
    return response;
  }

  // Supabase not configured → bounce protected paths to /setup-required.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (PROTECTED_PREFIXES.some((p) => url.startsWith(p))) {
      const r = request.nextUrl.clone();
      r.pathname = "/setup-required";
      return NextResponse.redirect(r);
    }
    return response;
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => url.startsWith(p));
  const isAuthPage = url === "/login" || url === "/signup";

  // Fast path: anonymous user hitting a public page — skip Supabase entirely.
  const hasAuthCookie = [...request.cookies.getAll()].some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );
  if (!isProtected && !isAuthPage && !hasAuthCookie) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // getSession reads the cookie (local, no network). getUser hits Supabase.
  // For middleware we trust the cookie; the page-level requireUser() validates.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user && isProtected) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", url);
    return NextResponse.redirect(redirect);
  }

  if (user && isAuthPage) {
    const role = await getCachedRole(supabase, user.id);
    if (role) {
      const r = request.nextUrl.clone();
      r.pathname = `/${role}`;
      return NextResponse.redirect(r);
    }
  }

  if (user && isProtected) {
    const role = await getCachedRole(supabase, user.id);
    if (!role) return response;
    const seg = url.split("/")[1];
    if ((seg === "owner" || seg === "trainer" || seg === "client") && seg !== role) {
      const r = request.nextUrl.clone();
      r.pathname = `/${role}`;
      return NextResponse.redirect(r);
    }
  }

  return response;
}

// 30-second per-user role cache eliminates the per-navigation profile query.
const _roleCache = new Map<string, { at: number; role: string | null }>();
const ROLE_TTL_MS = 30_000;

async function getCachedRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<string | null> {
  const cached = _roleCache.get(userId);
  if (cached && Date.now() - cached.at < ROLE_TTL_MS) return cached.role;
  const { data } = await supabase
    .from("profiles")
    .select("role,active")
    .eq("id", userId)
    .maybeSingle();
  const role = data?.active === false ? null : data?.role ?? null;
  _roleCache.set(userId, { at: Date.now(), role });
  return role;
}
