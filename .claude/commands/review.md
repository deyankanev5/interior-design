---
description: Fresh-context adversarial review of a PR or the current diff
argument-hint: [PR number, or blank for current branch]
allowed-tools: Read, Grep, Glob, Bash
---

Review: **$ARGUMENTS** (blank → the current branch against trunk).

Use the `reviewer` agent. It must not be the agent that wrote the code — that is
the entire point of this gate.

Give it: the plan doc, the full diff, the track's `owns` globs, and the CI result.
Do not give it the implementer's summary of what it did; the diff is what merges.

Return the verdict verbatim. On `ESCALATE`, state in two lines what decision the
human needs to make — not a walkthrough of the reasoning.
