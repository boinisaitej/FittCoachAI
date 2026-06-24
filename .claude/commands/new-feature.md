---
description: Scaffold a new feature page + API route + Playwright test for FitCoachAI.
argument-hint: <role> <feature-name>
---

Arguments: $ARGUMENTS

Parse the first word as a role (`owner`, `trainer`, or `client`) and the rest as the feature name (kebab-case).

Create:
1. `app/<role>/<feature>/page.tsx` — server component, uses `requireRole`.
2. `app/<role>/<feature>/actions.ts` — server actions (if needed).
3. `app/api/<feature>/route.ts` — API handler (if the page mutates).
4. `tests/e2e/<feature>.spec.ts` — at least one happy-path Playwright test.
5. Add a NavItem entry in `components/shell/nav-config.ts`.

Stick to the existing patterns (see CLAUDE.md). Do not introduce new state libs.
