import Link from "next/link";
import { Dumbbell, Sparkles, ShieldCheck, Bot, Activity, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn, Float, Stagger } from "@/components/animations/fade-in";
export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 -z-10 bg-brand-mesh" />
      <header className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-emerald-500">
              <Dumbbell className="h-4 w-4 text-white" />
            </div>
            FitCoachAI
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="gradient" size="sm">
                Get started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="container py-20 lg:py-28">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card/50 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3 w-3 text-brand-500" />
              AI-powered gym SaaS — built for gyms, trainers, and clients
            </div>
            <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
              Run your gym{" "}
              <span className="gradient-text">on autopilot.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              FitCoachAI ships role-aware dashboards, AI diet + workout plans, adherence tracking,
              animated reports, and gamified streaks — out of the box.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/signup">
                <Button size="lg" variant="gradient">
                  Create your gym
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline">
                  See features
                </Button>
              </Link>
            </div>
          </div>
        </FadeIn>

        <Float className="mx-auto mt-16 max-w-4xl">
          <div className="glass rounded-2xl p-2 shadow-2xl">
            <div className="aspect-video rounded-xl bg-gradient-to-br from-brand-500/30 via-emerald-500/20 to-cyan-500/20 p-8">
              <div className="grid h-full grid-cols-3 gap-4">
                {[
                  { icon: Bot, label: "AI Diet" },
                  { icon: Activity, label: "Live KPIs" },
                  { icon: Trophy, label: "Streaks" },
                ].map((x) => (
                  <div
                    key={x.label}
                    className="flex flex-col items-center justify-center rounded-xl bg-background/70 p-6 backdrop-blur"
                  >
                    <x.icon className="h-8 w-8 text-brand-500" />
                    <div className="mt-2 font-medium">{x.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Float>
      </section>

      <section id="features" className="container border-t py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything a modern gym needs</h2>
          <p className="mt-3 text-muted-foreground">
            One app for owners, trainers, and clients. No spreadsheets.
          </p>
        </div>

        <Stagger className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Bot, title: "AI coach", body: "Gemini-powered diet, workout, motivation, food-scanner, RAG nutrition KB." },
            { icon: Activity, title: "Live tracking", body: "BMI charts, water/sleep/junk logs, calendar adherence, 7-day streaks." },
            { icon: Trophy, title: "Gamification", body: "Points per todo, milestone rewards extend subscriptions automatically." },
            { icon: ShieldCheck, title: "Multi-role security", body: "Owner, trainer, client — Supabase Row-Level Security on every table." },
            { icon: Sparkles, title: "Animated UX", body: "Framer Motion micro-interactions, dark mode, festival-aware veg banner." },
            { icon: Dumbbell, title: "Plans & billing", body: "Basic / Pro plans, discounts, Razorpay-ready invoices, weekly PDF reports." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <f.icon className="h-6 w-6 text-brand-500" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </Stagger>
      </section>

      <footer className="container border-t py-8 text-center text-sm text-muted-foreground">
        Built with Next.js + Supabase + Gemini — © {new Date().getFullYear()} FitCoachAI
      </footer>
    </div>
  );
}
