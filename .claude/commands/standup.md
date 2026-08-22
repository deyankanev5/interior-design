---
description: Cross-project status — what is in flight, blocked, or waiting on you, across every repo
allowed-tools: Read, Grep, Glob, Bash
---

Report the state of every project in the portfolio (listed in `.claude/kit.json`
under `portfolio`).

For each repo, using the GitHub tools — no local clone needed:

- open PRs, with `kit:scope` track slug, age, CI status, and mergeability
- anything escalated and waiting on the human
- anything merged since yesterday

Then produce, in this order and nothing else:

**Waiting on you** — escalations, with the one decision each needs. If this
section is empty, say so in one line; that is the good outcome.

**Blocked** — tracks stalled on a dependency, a conflict, or red CI. Name the
blocker, not the symptom.

**In flight** — one line each: repo, track, age. Flag anything over two days.

**Landed since yesterday** — one line each.

Keep the whole thing under 25 lines. This is a dashboard you read in thirty
seconds, not a report. If nothing needs the human, the answer is a short list of
what is running, and that is a complete and good answer.

Do not fetch or clone repositories to produce this. If a repo is not accessible
in this session, say which and move on rather than guessing at its state.
