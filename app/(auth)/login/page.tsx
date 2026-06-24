"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Shield, Dumbbell, User } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const DEMO_ACCOUNTS = [
  { role: "Owner", email: "owner@fitcoach.demo", icon: Shield, blurb: "Gym dashboard & members" },
  { role: "Trainer", email: "trainer@fitcoach.demo", icon: Dumbbell, blurb: "Clients & plans" },
  { role: "Client", email: "client@fitcoach.demo", icon: User, blurb: "Todos, diet & chat" },
] as const;
const DEMO_PASSWORD = "Demo@12345";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  /** Core sign-in: authenticate, resolve role, redirect. Returns false on failure. */
  async function signIn(loginEmail: string, loginPassword: string): Promise<boolean> {
    setErrorMsg(null);
    if (!configured) {
      setErrorMsg(
        "Supabase isn't configured. Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then RESTART the dev server (Ctrl+C → npm run dev). Next.js only loads .env.local at boot."
      );
      return false;
    }
    let supabase;
    try {
      supabase = createClient();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      return false;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });

    if (error) {
      const friendly = explainAuthError(error.message);
      setErrorMsg(friendly);
      toast.error("Login failed", { description: friendly });
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      setErrorMsg(`Profile lookup failed: ${profileError.message}. Did you run the database migrations? (npm run db:push)`);
      toast.error("Profile lookup failed", { description: profileError.message });
      return false;
    }

    if (!profile?.role) {
      setErrorMsg(
        "Your auth user exists but no profile row was created. The handle_new_user trigger probably didn't run. Re-apply 0003_functions.sql and try signing up again."
      );
      return false;
    }

    const dest = params.get("next") ?? `/${profile.role}`;
    toast.success("Welcome back!");
    router.push(dest);
    router.refresh();
    return true;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn(email, password);
    setLoading(false);
  }

  /** One-click demo login — fills the form for visibility, then signs in. */
  async function handleDemoLogin(demoEmail: string) {
    if (loading || demoLoading) return;
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setDemoLoading(demoEmail);
    const ok = await signIn(demoEmail, DEMO_PASSWORD);
    if (!ok) setDemoLoading(null); // on success we navigate away, so leave spinner
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <Card className="border-0 shadow-none lg:border lg:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to continue to your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          {!configured && (
            <div className="mb-4 rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-semibold">Setup required</p>
              <p className="mt-1">
                Supabase keys are missing from <code>.env.local</code>. Add them, then stop and restart the dev server.
              </p>
            </div>
          )}
          {configured && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Try a demo account — one click to sign in
              </p>
              <div className="grid gap-2">
                {DEMO_ACCOUNTS.map(({ role, email: demoEmail, icon: Icon, blurb }) => {
                  const busy = demoLoading === demoEmail;
                  return (
                    <button
                      key={demoEmail}
                      type="button"
                      onClick={() => handleDemoLogin(demoEmail)}
                      disabled={loading || demoLoading !== null}
                      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-tight">{role}</span>
                        <span className="block truncate text-xs text-muted-foreground">{blurb}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {busy ? "Signing in…" : "Login →"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or sign in with email</span>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@gym.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            {params.get("error") === "deactivated" && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Your account has been deactivated. Contact your gym owner.
              </div>
            )}

            <Button type="submit" className="w-full" variant="gradient" disabled={loading || demoLoading !== null}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create your gym
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function explainAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) {
    return "Wrong email or password. If you just signed up, you may need to confirm your email first (check Supabase Dashboard → Authentication → Users) or disable email confirmation in Supabase → Auth → Providers → Email.";
  }
  if (m.includes("email not confirmed")) {
    return "Email not confirmed. Open Supabase Dashboard → Authentication → Users → click your user → mark as confirmed, OR disable 'Confirm email' under Auth → Providers → Email.";
  }
  if (m.includes("fetch failed") || m.includes("failed to fetch")) {
    return "Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local and that you've restarted the dev server after editing.";
  }
  if (m.includes("user not found")) {
    return "No account exists for that email. Click 'Create your gym' below to sign up.";
  }
  return msg;
}
