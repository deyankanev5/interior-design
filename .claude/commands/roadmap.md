---
description: Draft or update this project's docs/ROADMAP.md from what the repo already contains
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
---

Create or update `docs/ROADMAP.md` for this project, so the operations board has
a real roadmap to show and so any session can see what is left without reading
the whole repo.

## Rules

**Derive, never invent.** Every item must trace to something already written or
already true in this repository: `docs/STATE.md`, an existing plan or analysis
doc, an open PR or issue, a `TODO`/`FIXME` in the code, or a gap the project's
own docs name. If you cannot source an item, do not write it — an invented
roadmap is worse than an empty one, because it looks authoritative.

**Ask before inventing priorities.** Ordering phases is the owner's call. Where
the existing docs already state a priority (alni's "parity first, advancements
after"; a Phase 1 / Phase 2 split), follow it exactly. Where they do not, put
the items under a `## Unsequenced` heading and say so in your report rather than
picking an order yourself.

**Do not restate work that is already done** unless the source says it is done,
in which case tick it.

## Shape

The board parses `- [ ]` / `- [x]` items grouped under the nearest heading
above them, so headings carry the structure:

```markdown
# Roadmap — <project>

**Updated:** YYYY-MM-DD

## Phase 1 — <what this phase achieves>

- [ ] One outcome per line, in the language the project already uses
- [x] A done item, ticked

## Phase 2 — <…>

- [ ] …
```

Keep item text to a single line where you can; the board shows about 200
characters. Put the detail in the plan doc the item points to, not in the item.

## Steps

1. Read `docs/STATE.md`, then every plan, analysis or PRD document under
   `docs/`. Note what each one says is outstanding.
2. List open PRs and issues; anything open is in flight, not outstanding.
3. Group what is left into phases the existing docs already imply.
4. Write `docs/ROADMAP.md` in the shape above.
5. Report: how many items, which sources they came from, and — explicitly —
   anything you deliberately left out because you could not source it.

Then commit on a track branch as usual. Do not push a roadmap straight to
trunk: sequencing is a decision, and the owner approves decisions.
