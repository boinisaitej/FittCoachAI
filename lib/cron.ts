import { env } from "@/lib/env";

export function assertCron(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const fromQuery = new URL(req.url).searchParams.get("secret");
  const expected = `Bearer ${env.CRON_SECRET}`;
  if (auth !== expected && fromQuery !== env.CRON_SECRET) {
    throw new Response("Unauthorized", { status: 401 });
  }
}
