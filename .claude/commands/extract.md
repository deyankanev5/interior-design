---
description: Extract, clean or analyse a dataset, with provenance and reproducible counts
argument-hint: <source and what to get from it>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit, WebSearch, WebFetch
---

## Before you write anything

This command writes files, so it is a track like any other: claim scope and work
on a branch (`/build`), never straight on trunk. Running it beside an open track
that owns the same paths is the collision the protocol exists to prevent.

Data task: **$ARGUMENTS**

Use the `data-analyst` agent. Hold it to these, which are the failure modes that
have actually cost time in these projects:

- **Never invent a value.** Missing is a finding; a plausible fabricated value
  propagates silently and cannot be traced back later. Mark unreadable sources
  unreadable, and count them.
- **Provenance on every record** — source URL or file, page or row, fetch date.
  Without it a disputed value cannot be settled.
- **Idempotent and resumable.** These jobs die halfway; a run that cannot resume
  turns a network blip into a full re-extraction.
- **Counts for everything** — input, parsed, skipped, failed, with reasons. A run
  reporting success without counts has not been verified, it has been assumed.
- **Commit the normalised output, not the raw bulk.** Raw PDFs and scrape dumps
  are reproducible from the manifest and stay out of git.

Watch for the silent-empty failure: a query against the wrong table prefix, a
filter matching nothing, an encoding mismatch. Zero rows must be distinguishable
from zero matching rows — if the code cannot tell those apart, that is the first
thing to fix.

Report the counts, the findings ranked by what they change, and the exact command
to reproduce the run.
