"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [gymName, setGymName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState<{ needsConfirm: boolean; email: string } | null>(null);
  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!configured) {
      setErrorMsg(
        "Supabase isn't configured. Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then RESTART the dev server."
      );
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    let supabase;
    try {
      supabase = createClient();
    } catch (err) {
      setLoading(false);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, gym_name: gymName },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      toast.error("Signup failed", { description: error.message });
      return;
    }

    // If session is returned, email confirmation is OFF — log them straight in.
    if (data.session) {
      toast.success("Gym created! Signing you in...");
      router.push("/owner");
      router.refresh();
      return;
    }

    // Otherwise the user exists but needs to confirm their email.
    setDone({ needsConfirm: true, email });
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Almost there</CardTitle>
            <CardDescription>One more step to activate your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              A confirmation link has been sent to <strong>{done.email}</strong>. Click the link inside that email to activate your account, then sign in.
            </p>
            <div className="rounded-md border border-amber-300/50 bg-amber-100/50 p-3 text-xs dark:bg-amber-950/30">
              <p className="font-semibold">No email? Two fast fixes:</p>
              <ol className="mt-1 list-decimal pl-4">
                <li>
                  Open Supabase Dashboard → <strong>Authentication → Users</strong> → click your user → mark as <strong>Confirmed</strong>.
                </li>
                <li>
                  Or disable email confirmation entirely: Supabase Dashboard → <strong>Authentication → Sign In / Providers → Email</strong> → toggle off <strong>Confirm email</strong> → Save. Then sign up again.
                </li>
              </ol>
            </div>
            <Link href="/login" className="inline-block text-primary hover:underline">
              Go to sign in →
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <Card className="border-0 shadow-none lg:border lg:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create your gym</CardTitle>
          <CardDescription>
            The first user becomes the Owner. You&apos;ll be able to add trainers and clients next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!configured && (
            <div className="mb-4 rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-semibold">Setup required</p>
              <p className="mt-1">
                Add Supabase URL + anon key to <code>.env.local</code> and restart the dev server.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gym">Gym name</Label>
              <Input id="gym" value={gymName} onChange={(e) => setGymName(e.target.value)} required placeholder="Iron Paradise" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
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
              <p className="text-xs text-muted-foreground">8+ characters.</p>
            </div>

            {errorMsg && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create gym
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
