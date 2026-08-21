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

Then stop and wait for approval. Do not create a branch, do not open a PR, do not
write code. Approval of the plan is the one decision the human makes in this
workflow — do not pre-empt it.

If the goal is too large for one track, present the decomposition instead and ask
which track to start with.
