---
description: Turn a goal into a plan doc for approval, before any code is written
argument-hint: <goal, in plain language>
allowed-tools: Read, Grep, Glob, Bash, Write, WebSearch, WebFetch
---

Produce a plan for: **$ARGUMENTS**

Use the `planner` agent. Give it the goal verbatim, plus the project's
`CLAUDE.md`, `docs/STATE.md`, and the scope globs of every currently open track
so it does not propose a scope that is already claimed.

Before writing the plan, the planner must read the code the goal touches. A plan
whose "Approach" section cannot name files is not finished.

When the plan doc exists, present to the human **only**:

- the goal as understood, in one sentence
- the approach in two or three
- the scope globs
- anything the planner flagged as a risk or disagreement
- the path to the doc

Then proceed. Under the act-then-report model (`.claude/kit/autonomy.md`,
2026-09-01) the plan does not wait: post the summary where the owner will see
it and begin — silence is consent, and a veto is honoured instantly whenever
it comes. Stop and wait only if the plan touches the floor (live production or
its data, secrets, irreversible deletion, money) — those wait however long the
owner takes.

If the goal is too large for one track, present the decomposition instead and ask
which track to start with.
