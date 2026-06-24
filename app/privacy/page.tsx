import Link from "next/link";
import { Dumbbell } from "lucide-react";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-emerald-500">
              <Dumbbell className="h-4 w-4 text-white" />
            </div>
            FitCoachAI
          </Link>
        </div>
      </header>

      <article className="container max-w-3xl space-y-6 py-12 text-sm leading-relaxed">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. What we collect</h2>
          <p>
            When you sign up, we store your name, email, phone number, optional address, gender, date of birth, height,
            weight, dietary preferences, allergies, and fitness goals. As you use FitCoachAI we additionally store the
            plans your trainer creates, your todo completions, BMI logs, progress photos, chat messages, and AI-generated
            content tied to your profile.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. How we use it</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>To generate personalised AI diet / workout plans, recipes, and explanations.</li>
            <li>To let your assigned trainer build daily and weekly plans that respect your medical context.</li>
            <li>To remind you about scheduled todos, classes, and renewal dates.</li>
            <li>To bill you and issue GST-compliant invoices.</li>
            <li>To compute streaks, adherence metrics, and weekly progress reports.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. Who sees your data</h2>
          <p>
            Your data is scoped to your gym. Inside that gym, your owner and your assigned trainer can read your profile,
            allergies, injuries, plans, and BMI logs. Other members cannot. We never sell your data to advertisers or
            third parties.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. AI processing</h2>
          <p>
            Diet / workout / recipe generation sends a redacted context (age, gender, BMI, goals, allergies, injuries —
            never your name or contact info) to Google&apos;s Gemini API. Gemini does not train on your prompts. Responses
            are cached against the relevant todo so re-opens don&apos;t re-send your data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. Your rights</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Access</strong> — download every record we hold on you from <code>/account</code>.</li>
            <li><strong>Rectification</strong> — edit any profile / preference field on <code>/account</code>.</li>
            <li><strong>Deletion</strong> — email your gym owner to deactivate your account; full erasure within 30 days.</li>
            <li><strong>Portability</strong> — export your plan history and invoices on request.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. Security</h2>
          <p>
            All traffic is HTTPS-only with HttpOnly + Secure + SameSite cookies. Database queries enforce Row-Level
            Security so even a compromised browser session can&apos;t reach another member&apos;s rows. Passwords are hashed
            by Supabase Auth (bcrypt). Service-role keys live in environment variables and never reach the browser bundle.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">7. Contact</h2>
          <p>
            For data requests, contact your gym owner directly — they hold the admin console. For platform-level questions,
            reach the FitCoachAI team via the support channel listed on the gym&apos;s page.
          </p>
        </section>

        <hr className="my-8" />
        <p className="text-xs text-muted-foreground">
          This document is provided in good faith as a baseline. Operating gyms should adapt it to their jurisdiction
          (India DPDP Act 2023, EU GDPR, etc.) and have it reviewed by counsel before public release.
        </p>
      </article>
    </div>
  );
}
