---
description: Run Playwright end-to-end tests.
---

Run `npm run test:e2e`. If failures occur:
1. Read `playwright-report/index.html` summary (or `test-results/` JSON) to identify the failing assertion.
2. Open the failing spec, the page under test, and the failing component.
3. Propose a fix — do NOT modify the spec to make it pass unless the spec was provably wrong.

Report total pass/fail counts. Don't run `--update-snapshots`.
