# Hooks

The hooks in this folder are wired up via `.claude/settings.json` and run
automatically inside Claude Code sessions in this repo.

| Hook | Trigger | What it does |
|------|---------|--------------|
| `post-edit.js` | `PostToolUse` on `Edit` or `Write` | Prints reminders when migrations or AI prompts are touched. |

## Adding a new hook

1. Create `.claude/hooks/<name>.js` (or `.sh`).
2. Reference it in `.claude/settings.json` under the appropriate event:
   - `PreToolUse` — block a tool call by writing JSON `{"continue": false, "reason": "..."}` to stdout.
   - `PostToolUse` — print user-visible reminders.
   - `Stop` — runs when the assistant finishes responding.

See: https://docs.claude.com/claude-code/hooks
