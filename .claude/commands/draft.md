---
description: Draft long-form copy from a brief, under the project's tone-of-voice standard
argument-hint: <brief path or slug>
allowed-tools: Read, Grep, Glob, Bash, Write, Edit, WebSearch, WebFetch
---

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
