---
description: Start a session — read project state, in-flight tracks, and say what to work on next
allowed-tools: Read, Grep, Glob, Bash
---

Orient in this project and report. Do not start work.

Gather, in parallel where possible:

- `.claude/kit.json` — trunk branch, stack, verify command
- `docs/STATE.md` — where the project actually is
- `git status`, `git log --oneline -10`, current branch
- open PRs, with their `kit:scope` blocks parsed
- any plan docs in `docs/plans/` with **Status: proposed** or **in progress**

Then report, in under 20 lines:

1. **Where the project is** — one paragraph from STATE.md, not a file listing.
2. **In flight** — each open track: slug, provider, what it owns, whether it is
   green, blocked, or waiting on the human. Flag any track older than two days;
   long-lived branches are the failure mode this protocol exists to prevent.
3. **Uncommitted work** — anything in the working tree that exists nowhere else.
   Say so loudly; it has been lost on this setup before.
4. **What is worth doing next**, with a recommendation and a reason.

If the working tree is dirty on a branch that is not yours, stop and say so
before anything else — that is another session's work.
