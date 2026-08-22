---
description: Research a topic against real SERP and Search Console data, and produce a content brief
argument-hint: <topic or query>
allowed-tools: Read, Grep, Glob, Bash, Write, WebSearch, WebFetch
---

## Before you write anything

This command writes files, so it is a track like any other: claim scope and work
on a branch (`/build`), never straight on trunk. Running it beside an open track
that owns the same paths is the collision the protocol exists to prevent.

Produce a content brief for: **$ARGUMENTS**

Use the `seo-researcher` agent. It must retrieve real data through the Semdash
and Search Console tools — a brief assembled from assumptions about what people
search is worse than no brief, because it looks researched.

Direct it to:

1. Check Search Console first for queries this site already ranks on, especially
   positions 8–20 with real volume. Those are edits to existing pages, and they
   are cheaper and faster than anything new. If the best move is an edit, the
   brief should say so and name the page.
2. Set location and language explicitly on every call. These are Bulgarian-market
   projects; the default US/English parameters silently produce a brief for the
   wrong market.
3. Analyse what actually ranks and name the gap the new piece exploits.

Present to the human: the primary query with its real numbers, the intent, the
gap being exploited, and the recommendation — new piece, edit an existing page,
or do not pursue. "Do not pursue" is a valid and useful outcome when the SERP is
owned by marketplaces or brands this project cannot displace; say it plainly.

Then the path to the brief.
