---
name: ai-eval
description: Run an evaluation harness on the FitCoachAI Gemini prompts. Generates a diet day, workout day, why-todo, and weekly report for a synthetic client; asserts each output matches its JSON schema and core constraints (veg lock, injury exclusion, calorie range). Use when prompts change or before a release.
---

# AI Eval Harness

## When to use
- After editing any file in `lib/ai/prompts.ts` or `lib/ai/index.ts`.
- Before a release that touches AI features.
- When the user reports "AI is giving weird answers."

## What it tests
Five canonical scenarios:
1. **Vegetarian client + festival day** → output must contain ZERO non-veg items.
2. **Knee-injury client** → workout must exclude squats / lunges / running.
3. **Low-BMI client (BMI 16)** → diet calorie total > 2200 kcal.
4. **JSON shape** → every AI response that promises STRICT JSON must parse without salvage.
5. **No hallucinated allergens** → response must not mention any allergen listed in `client_preferences.allergies`.

## Steps
1. Start dev server.
2. Run `tsx scripts/ai-eval.ts` (scaffold this if missing).
3. Report pass/fail per scenario with the offending output snippet.
4. If failures > 0, hand off to the `prompt-tuner` agent.

## Output format
```
Scenario 1 (veg + festival)        ✅
Scenario 2 (knee injury)           ❌  Output included "barbell squats"
Scenario 3 (low BMI calories)      ✅
Scenario 4 (JSON shape)            ✅
Scenario 5 (no hallucinated allergens) ✅

4/5 passed.
```
