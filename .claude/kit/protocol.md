# The Track Protocol

The rules that let several agents — Claude sessions, Codex, anything else —
work the same repository at the same time without overwriting each other.

This document is the contract. `CLAUDE.md` and `AGENTS.md` in each project
carry a short version of it; this is the long form and it wins on detail.

---

## 1. Why this exists

Concurrent agents do not collide because they edit the same line. They collide
because **each one discovers the other's work at merge time**, when both have
already spent an hour building on a stale tree. By then the choice is a painful
manual merge or throwing work away.

The fix is not better merging. It is making in-flight work **visible before the
first edit**, and keeping each unit of work small enough that the window for
collision stays short.

Three rules do almost all of the work:

1. One unit of work = one branch = one session. Never two sessions on a branch.
2. Intent is published **before** editing, as an open PR carrying a scope block.
3. A branch is merged by fast-forwarding trunk *into it* — never by rewriting it.

---

## 2. The Track

A **Track** is one unit of work. It has exactly five things:

| | |
|---|---|
| **slug** | `catalogue-filters` — kebab-case, unique, stable |
| **branch** | `claude/<slug>` (or `codex/<slug>`) |
| **plan** | `docs/plans/<YYYY-MM-DD>-<slug>.md` |
| **scope** | the path globs the track is allowed to write |
| **PR** | opened at track start, merged at track end |

A track is sized to be **mergeable within a day**. If a plan cannot be shipped
in a day, it is not one track — it is a sequence of tracks, and the plan says
so. Long-lived branches are the thing this protocol exists to prevent.

## 3. Opening a track

Before writing a single file:

```
1. git fetch origin <trunk>
2. List open PRs. Parse the kit:scope block from each body.
3. Intersect your intended globs with every open track's globs.
4. Overlap?  -> STOP. See §5.
   No overlap? -> proceed.
5. git switch -c claude/<slug> origin/<trunk>
6. Commit the plan doc only.
7. Push, open the PR with a kit:scope block.
```

```
8. Re-list open PRs. An overlapping claim created BEFORE yours wins —
   close yours and apply §5. Ties break on the earlier createdAt.
```

The PR is created **before the implementation work**, not after. It carries no
code yet. Its job at this moment is to be the claim — a lock every other agent
and provider can read with one API call.

**Step 8 is not optional.** Steps 1–7 are a read followed by a write with a gap
of a minute or more between them, so two agents starting seconds apart both read
an empty list and both publish. Re-reading after publishing is what closes that
window; without it the collision surfaces at merge, which is the exact failure
§1 says this protocol exists to prevent. The earlier `createdAt` wins, so the
outcome is deterministic and both agents compute the same answer.

### The scope block

Verbatim in the PR body. Machine-parsed, so the format is not decorative:

```
<!-- kit:scope
track: catalogue-filters
provider: claude
owns:
  - theme/alni/**
  - docs/plans/2026-08-21-catalogue-filters.md
-->
```

`owns` is a list of globs. **Writing outside your `owns` is a protocol
violation**, not a judgement call. If the work genuinely needs a file you do not
own, that is §5.

Scope honestly: `theme/**` when you mean one component blocks four other tracks
for no reason. `src/**` in a single-package repo claims everything and makes the
protocol useless.

## 4. Closing a track

`/ship` runs this, in order. Every step is a gate — a failure stops the
sequence, it does not warn and continue:

```
1. git fetch origin <trunk>
2. git merge origin/<trunk>          # merge IN. never rebase, never force-push.
3. resolve conflicts, if any
4. ./scripts/verify.sh               # the repo's own checks, locally, first
5. commit, push
6. wait for CI green
7. reviewer agent, fresh context, reviews the full diff
8. clear  -> enable auto-merge (squash)
   unsure -> escalate to the human, leave open
```

**Never rebase or force-push a branch that has an open PR.** Another provider's
agent may have that branch checked out on another machine; a rewritten history
turns their working tree into garbage they cannot recover. Merging trunk in is
always safe. This costs a merge commit, which is squashed away at merge anyway.

**Step 4 is not optional and not reorderable.** Pushing to find out whether CI
passes burns ten minutes per attempt and, on a shared repo, burns everyone
else's CI queue with it. Run the checks locally, then push once.

## 5. When scopes overlap

You wanted a file another open track owns. In order of preference:

1. **Narrow.** Can your track do its job without that file? Usually yes — the
   overlap is often a shared type or a config line that can move to its own
   track.
2. **Wait.** Is the other track close to merging? Small tracks merge in hours.
   Pick up a different track and come back.
3. **Sequence.** Note the dependency in your plan doc, and say plainly that this
   track is blocked on `<other-slug>`. Then stop.
4. **Ask.** If none of those work, the two tracks are really one. Escalate to
   the human — this is a planning error, and merging two agents' half-finished
   work is the exact failure this protocol prevents.

Never "just edit it and sort it out at merge." That is the failure mode.

### Two exceptions, so the rules stay livable

**`docs/STATE.md` is shared and exempt from scope.** Every track updates it and
every session writes it at handoff. Claiming it would make every pair of tracks
overlap; not claiming it would make every track's final write out-of-scope and
therefore an automatic escalation. So it is owned by nobody, appended by
everybody, and conflicts there are resolved by keeping both entries.

**A claim expires.** A track whose PR has had no commit for **three days** is
dead, and any agent may close it, saying so in a comment. Without this, one
crashed session holds a directory forever and every later track is routed into
§5 option 4 — asking the human — which is precisely the interruption the
autonomy model exists to remove. `/kickoff` and `/standup` flag tracks over two
days so this is visible a day before it bites.

## 6. Trunk

Trunk is named in `.claude/kit.json`, because it is not `main` everywhere.

- Trunk is **always green**. A red trunk blocks every track in the repo, so it
  is the highest-priority work in the project the moment it happens.
- Nothing is committed to trunk directly. Everything arrives by squash-merge
  from a track.
- After a merge, other open tracks are behind. They pick trunk up at their next
  `/ship` (step 2), not immediately — churn is worse than staleness for a track
  that is hours from merging.

## 7. What auto-merges, and what does not

Since 2026-09-01 the model is **act, then report** (`autonomy.md` records the
owner's instruction and the reasoning). Plans post and start; work runs
unattended *if* it clears every gate: local verify, CI green, and a reviewer
agent that had no part in writing the code.

The reviewer **must escalate rather than merge** — these wait for the owner,
however long that takes:

- anything touching a **live production host or its data** — in `alni`
  absolute: `alni.eu` is read-only, and the Hetzner box runs four live sites
  off one shared MySQL container
- a change to **secrets, credentials, tokens, or permission configuration**
- an **irreversible deletion** — of data that exists nowhere else, or one the
  reviewer cannot justify from the plan
- anything that **spends money**
- **a change to the gate itself** — `scripts/verify.sh`, CI configuration,
  `.claude/**`, or this protocol
- its own honest uncertainty about whether the change is correct

The reviewer **merges with a notice** — a plain statement of what was done and
why, delivered to the owner rather than waited on — for the categories the
2026-09-01 policy moved off the floor:

- a schema change or migration on **non-production** data
- a dependency added or a version pinned, with why it earned its place
- public-facing copy under a tone-of-voice standard (deploying it to a live
  site is a production act — floor)
- a change outside the track's declared `owns`, naming what widened and why

That gate-itself category is the one a green build cannot protect you from.
A track narrows a lint glob, adds `--passWithNoTests`, or drops a `step` line:
verify passes, because verify *is* the weakened script; CI passes, because it
runs the same script; the reviewer sees an in-scope build-script tweak and
clears it. Every later track then merges through a weaker gate and nobody sees
it, because merges are silent by design. Editing `.claude/agents/reviewer.md`
is the same move aimed at the reviewer.

Escalation is not failure. A reviewer that never escalates is not reviewing, and
the whole model rests on the escalations being trustworthy.

## 8. Other providers

Codex and any other agent follow this protocol unchanged. It was designed to be
enforceable without shared tooling: the scope claim is an ordinary GitHub PR
body, and every provider can list PRs.

`AGENTS.md` carries these rules for non-Claude agents. When the protocol changes,
**both files change in the same commit** — a protocol only one side follows is
worse than no protocol, because it produces confident, wrong assumptions about
who owns what.

Branch prefix identifies the provider: `claude/`, `codex/`. The `provider:` field
in the scope block says it again, machine-readably.
