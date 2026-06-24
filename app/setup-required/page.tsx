import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function SetupRequiredPage() {
  const missing = {
    NEXT_PUBLIC_SUPABASE_URL: !process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_API_KEY: !process.env.GOOGLE_API_KEY,
    CRON_SECRET: !process.env.CRON_SECRET || process.env.CRON_SECRET === "dev-cron-secret",
  };

  return (
    <div className="container max-w-2xl py-16">
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">Setup required</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          FitCoachAI needs a Supabase project and Google AI key to run. Open <code className="rounded bg-muted px-1 py-0.5">.env.local</code> and fill in the values below, then restart the dev server.
        </p>

        <div className="mt-6 space-y-2 rounded-lg border bg-muted/40 p-4 font-mono text-xs">
          {Object.entries(missing).map(([key, m]) => (
            <div key={key} className="flex items-center justify-between">
              <span>{key}</span>
              <span className={m ? "text-rose-600" : "text-emerald-600"}>{m ? "missing" : "ok"}</span>
            </div>
          ))}
        </div>

        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm">
          <li>
            <Link href="https://supabase.com/dashboard" target="_blank" className="text-primary hover:underline">
              Create a Supabase project
            </Link>{" "}
            and copy your URL + anon key + service-role key from <strong>Settings → API</strong>.
          </li>
          <li>
            <Link href="https://aistudio.google.com/app/apikey" target="_blank" className="text-primary hover:underline">
              Create a Google AI Studio key
            </Link>.
          </li>
          <li>
            Edit <code className="rounded bg-muted px-1 py-0.5">.env.local</code> in your editor (copy <code>.env.example</code> if needed) and paste the values.
          </li>
          <li>
            Run <code className="rounded bg-muted px-1 py-0.5">npm run db:push</code> to apply migrations.
          </li>
          <li>
            Stop and restart <code className="rounded bg-muted px-1 py-0.5">npm run dev</code>.
          </li>
        </ol>

        <p className="mt-6 text-xs text-muted-foreground">
          Full walkthrough: <Link href="https://github.com/" className="text-primary hover:underline">docs/SETUP.md</Link>
        </p>
      </div>
    </div>
  );
}
