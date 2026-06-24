# FitCoachAI — Claude project config

This folder configures the Claude Code assistant for this repository.

## Layout

```
.claude/
├── settings.json         repo-wide settings (versioned)
├── settings.local.json   personal overrides (gitignored)
├── skills/               project-specific skills
├── commands/             slash commands (custom)
├── agents/               specialized subagent definitions
└── hooks/                lifecycle hooks (pretest, postcommit, …)
```

## Skills

| Name | Trigger |
|------|---------|
| `seed-demo` | "seed demo data", "add fake clients", "/seed-demo" |
| `ai-eval`   | "evaluate AI prompts", "regression test AI" |
| `schema-diff` | "check schema drift", "compare migrations to DB" |
| `bump-feature` | "add new feature X", scaffolds page+API+test |

## Slash commands

- `/seed-demo` — runs `npm run seed`
- `/sync-schema` — applies pending Supabase migrations and regenerates types
- `/new-feature <name>` — scaffolds a new feature (page + API + test)
- `/run-e2e` — runs Playwright against `npm run dev`
- `/lint-drift` — runs harness lint-drift to detect pattern drift

## Agents

- `db-migrator` — generates Supabase SQL migrations from a natural-language description.
- `prompt-tuner` — improves Gemini prompts when AI outputs go off-spec.
- `e2e-runner` — runs Playwright, parses failures, suggests fixes.

## Hooks

- `pre-tool-use:Write` — block writes to `supabase/migrations/*` after they've been applied.
- `post-tool-use:Bash` — print a reminder if `supabase db push` was run without running `npm run db:types`.

See `hooks/README.md` for installation steps.
