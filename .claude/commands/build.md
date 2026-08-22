---
description: Open a track from an approved plan and implement it
argument-hint: <plan slug or path>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit, WebSearch, WebFetch
---

Execute the approved plan: **$ARGUMENTS**

## 1. Claim the scope — before editing anything

1. `git fetch origin <trunk>` (trunk is in `.claude/kit.json`).
2. List open PRs and parse every `kit:scope` block.
3. Intersect this plan's `owns` globs with every open track's globs.
4. **Overlap → stop.** Apply `.claude/kit/protocol.md` §5 (narrow, wait, sequence, or
   escalate) and report. Do not proceed on the assumption it will be fine.
5. `git switch -c claude/<slug> origin/<trunk>`
6. Commit **only the plan doc**.
7. Push and open a PR titled `<slug>: <goal>` whose body contains the scope
   block verbatim:

```
<!-- kit:scope
track: <slug>
provider: claude
owns:
  - <glob>
-->
```

The PR exists before the code does. It is the claim other agents and other
providers read.

## 2. Implement

Hand the plan to the `implementer` agent. It writes only inside the `owns` globs.

## 3. Verify

Run `./scripts/verify.sh`. It must pass before you call the work done. If it
fails, fix it — do not report completion with failing checks, and do not push to
find out whether CI agrees.

## 4. Report

What was built, verify output, any deviation from the plan. Then stop — `/ship`
is a separate step, so the work can be inspected first if anyone wants to.

If the plan turns out to be wrong, stop and report rather than redesigning. The
human approved that plan.
