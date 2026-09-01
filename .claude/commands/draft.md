---
description: Draft long-form copy from a brief, under the project's tone-of-voice standard
argument-hint: <brief path or slug>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit, WebSearch, WebFetch
---

## Before you write anything

This command writes files, so it is a track like any other: claim scope and work
on a branch (`/build`), never straight on trunk. Running it beside an open track
that owns the same paths is the collision the protocol exists to prevent.

Public-facing copy goes through the same review gate as code, and since
2026-09-01 it **merges with a notice** rather than waiting (`.claude/kit/protocol.md`
§7): the reviewer checks it against the tone-of-voice standard, it lands on
trunk, and the owner is told what was written and where. *Deploying* it to a
live site remains a production act on the floor — copy on trunk is revisable;
copy in front of customers is not.

Draft the piece specified by: **$ARGUMENTS**

Use the `writer` agent. Before drafting, it reads the brief, the project's
tone-of-voice standard if one exists (in `alni` this is mandatory, not advisory),
and two or three existing pages to match the register.

Hold it to the factual standard: **every technical claim is verified against a
source in this repo or a retrievable one, or it is cut.** No invented
specifications, capacities, dimensions, certifications or clinical details. A
confident wrong specification in public copy is a commercial problem, not a style
problem.

Bulgarian copy is written in Bulgarian, not translated from an English draft.

When the draft exists, report:

- the draft path
- what could not be verified and was cut or written around
- anywhere the brief asked for a claim the sources do not support

That last list is the important part of the handoff. Lead with it, do not bury it
under a summary of the article.
