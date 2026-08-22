---
description: Design a UI — three distinct directions, then build and critique it from real screenshots
argument-hint: <what to design>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit, WebSearch, WebFetch
---

Design: **$ARGUMENTS**

Use the `designer` agent. Do not let it skip to implementation — the two steps
below are what separate a designed interface from a generated one.

## 1. Diverge before converging

Require **three directions that disagree with each other** — different
organising principles, not three palettes on one layout. Each with a name, its
principle in a sentence, the type and colour decisions that follow, and what it
gives up. A direction with no sacrifice has made no decision.

Present the three to the human with a recommendation and a reason tied to
audience and content. Let them pick. This is the one point where taste is theirs,
not the agent's.

## 2. Build on tokens

Type scale with a stated ratio, spacing scale, palette with defined roles, radii,
elevation, motion. In one place. A design whose values are scattered inline
cannot be adjusted and drifts within a single page.

Respect an existing system where there is one — `alni` has `docs/design-system.md`
and `docs/css-architecture.md`, whose container-query rules exist because
components broke at widths nobody tested.

## 3. Then actually look at it

```
node scripts/design-shot.mjs http://localhost:<port> --dark --out design-shots
```

Captures five widths — including the middle sizes that break more often than the
named breakpoints — in light and dark, flags horizontal overflow, and reports
console errors and failed requests.

**Read the PNGs.** The automated checks catch overflow and errors; they cannot
tell you whether the hierarchy works, whether the rhythm is intentional, or
whether the thing has any character. Fix what you see, re-shoot, iterate. One
pass is a draft.

## Hold the line on

Contrast at AA, designed focus states, real semantic structure, thumb-sized
touch targets, `prefers-reduced-motion`. And the generic tells: centered card on
a gradient, untouched framework palette as the identity, three icon-heading-filler
columns, emoji as iconography, one radius and one shadow everywhere, purple-to-blue
gradient headings. Avoiding those is not distinctiveness — it is the floor.

Report what the screenshots showed that the code did not.
