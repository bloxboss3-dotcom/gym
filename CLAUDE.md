# Working agreements for FORGED

## Shipping

**Ship without asking.** The owner has standing authorisation: when work is
finished and verified, merge it to `main` and let it deploy. Do not open a
draft PR and wait for a yes. Do not ask "want me to merge this?".

"Finished and verified" means all of:

```bash
npm run verify   # typecheck + lint + test + build
npm run smoke    # the browser suite, at an iPhone viewport, zero console errors
```

If a gate fails, fix it. If something is genuinely blocked or ambiguous in a
way that changes the work, say so — that is different from asking permission.

After merging, confirm the deploy actually landed rather than trusting the
green tick: compare a clean build of `main` against what GitHub Pages is
serving, file by file. The live URL is <https://bloxboss3-dotcom.github.io/gym/>.

## Testing

Bugs here have repeatedly slipped past checks that assert the **absence** of a
problem. Prefer checks that assert the **presence** of the working behaviour.

Real examples, all of which shipped past a green suite:

| Bug | Why the existing checks missed it |
| --- | --- |
| Horizontal gutter collapsed to zero on every screen | Flush content does not overflow |
| Number input squeezed to 0px wide | A 0px element does not overflow either, and the touch-target sweep only ran on one screen |
| Search fields lost focus once a second | The test used `fill()`, which sets a value in one shot and never needs focus to survive |

When adding a regression test, **verify it fails against the broken code**
before trusting it. Two of the above needed a second attempt because the first
version of the test passed on the bug.

## Units

Every stored weight is in kilograms, and means *the number written on the
implement* — the total on the bar including the bar, or the number on one
dumbbell.

Gym hardware must be **unit-native, never converted**. A pound gym has 45 lb
bars, 45/35/25 lb plates and 5 lb jumps. Converting kilogram constants has
produced `44.1 lb` increments, `44.1 lb` bars, `55.12 lb` plates and a
`44.1 lb` opening weight — four separate times. Any new constant expressed in
kg that reaches the UI is a bug waiting to happen; pick it in display units.

## Engine

`src/engine/` is pure, deterministic, dependency-free TypeScript. No React, no
storage, no network, and no model call in any decision path — a language model
cannot be unit-tested, cannot explain itself reproducibly, and cannot be held
to a safety threshold.

Every recommendation carries: action, exact target, plain-language reason, the
named rule that fired, citations, a confidence level, what data was missing,
and a safety warning where relevant. New engine code follows the same contract.

All thresholds live in `src/config/rules.ts`; reward economics in
`src/config/economy.ts`. Tests assert behaviour *relative* to those values
where possible, so changing the config changes the app and the tests still
describe what it does.
