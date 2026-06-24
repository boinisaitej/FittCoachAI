#!/usr/bin/env node
/**
 * Post-edit hook: nudges when migrations or types may have drifted.
 * Runs after Edit/Write tool calls. Reads JSON from stdin (Claude Code v0.6+).
 */
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const payload = JSON.parse(raw || "{}");
    const path = payload?.tool_input?.file_path ?? "";
    if (/supabase[\\/]migrations[\\/]/.test(path)) {
      process.stderr.write(
        "🔔 You edited a Supabase migration. After applying:\n" +
        "    npm run db:push\n" +
        "    npm run db:types\n"
      );
    }
    if (/lib[\\/]ai[\\/]prompts\.ts/.test(path)) {
      process.stderr.write(
        "🔔 Prompt change: run `npm run test:e2e -- ai` to re-check AI integration.\n"
      );
    }
  } catch {
    /* non-fatal */
  }
});
