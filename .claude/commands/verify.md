---
description: Run this project's full verification gate and report honestly
allowed-tools: Read, Grep, Glob, Bash
---

Run `./scripts/verify.sh` and report the result.

Report failures verbatim, including the command that failed and its output. Do
not summarise a failure into "some tests are failing", and do not report success
when any step failed — every silent success in these projects has cost hours: a
verification script that passed a completely failed migration, a `wp db query`
returning empty rather than erroring, a `search-replace` whose pattern never
survived shell quoting.

If a step cannot run in this environment, say which and why. That is a different
result from passing, and it must not be reported as passing.

If given an argument, scope the run to it where the script supports that.
