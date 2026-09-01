# Autonomy: what runs without you

The model is **act, then report**. Work does not wait for approval; it starts,
clears the gates, merges, and the owner reads outcomes. Steering happens by
veto, not by sign-off.

That is a deliberate choice the owner made explicitly (2026-09-01: "I want to
minimize the manual work from my side, even if that means increased risk"),
recorded here because a widened autonomy line is a §7 gate change and must be
auditable. The previous model — approve every plan before work starts — is
superseded.

This document says exactly where the line now sits, because an autonomy model
you cannot predict is one you end up supervising anyway — which defeats it.

---

## Plans: silence is consent

A plan doc is still written for every track — goal, approach, scope globs,
risks, definition of done. But it no longer waits. The plan is posted where the
owner will see it (Dispatch, or the PR), and work begins immediately. A veto or
redirect is honoured instantly at any point — but nothing idles waiting for a
yes.

Everything downstream — branching, implementing, testing, fixing CI, review,
merge — happens without the owner unless the floor below is touched.

## The gates

A track merges only if **all four** clear. They are ordered cheapest-first, so
failures surface before expensive ones run:

| Gate | What it catches | Runs |
|---|---|---|
| `scripts/verify.sh` | lint, types, tests — the repo's own standard | locally, before push |
| CI | environment differences, anything not reproduced locally | on push |
| Reviewer agent | logic errors, scope violations, missed requirements | fresh context, on the full diff |
| Escalation rules | the categories listed in `protocol.md` §7 | reviewer's judgement |

The reviewer is a **separate agent with no memory of writing the code**. This is
the load-bearing detail. An agent reviewing its own work re-derives the same
assumptions and confirms itself; the failure is invisible precisely where it
matters. Fresh context is what makes the review worth anything.

## What still stops for you — the floor that does not move

The owner accepted increased risk; these stay anyway, because their failures
cannot be un-made and accepted risk does not buy back destroyed state:

- **Live production hosts and their data.** `alni.eu` is read-only, absolute.
  The Hetzner box runs four live sites off one shared MySQL container —
  nothing destructive runs there unattended, ever.
- **Secrets, credentials, permission grants.** A leaked secret cannot be
  unleaked.
- **Irreversible deletion** of anything that exists nowhere else.
- **Spending money.**

## What moved from "stops" to "act, then notify" (2026-09-01)

These previously halted for approval. They now proceed, with a plain notice of
what was done and why, so the owner can revert:

- **Schema and migrations** on non-production data. Production data is floor.
- **New dependencies** — the notice names the package and why it earned its
  place; the supply-chain decision stays visible without blocking.
- **Public-facing copy** under a tone-of-voice standard — it merges to trunk
  behind the reviewer; *deploying* it to a live site is a production act and
  sits on the floor.
- **Scope widening**, when the notice says what widened and why.

The reviewer still examines all of these. "Act, then notify" changes who
waits, not what gets checked.

## What you get instead of a diff

When a track merges: nothing. That is the point. It appears in trunk.

When a track escalates: two lines — what it wanted to do, and the specific thing
it could not decide. Not the diff, not the reasoning chain. If two lines are not
enough to decide, the escalation was written badly and you should say so.

`/standup` gives the cross-project picture on demand: what is in flight, what is
blocked, what merged since you last looked.

## Where this can bite you

**Small, frequent tracks are what make this safe.** The gates catch defects in
proportion to how well they can see them, and a 40-file diff defeats a reviewer
the same way it defeats a human. If tracks start growing, the model degrades
quietly — that is the thing to watch for.

**A green CI is not a correct feature.** In `Psychiatry-App` the only check is
lint, so CI green means almost nothing there until real tests exist. The kit
installs a verify script per repo, but a verify script is only as good as the
project's actual tests. Where coverage is thin, the reviewer agent is doing
nearly all the work — so treat thin-coverage repos as lower-autonomy until the
tests exist.

**Escalation fatigue runs both ways.** Too many escalations and you start
approving without reading, which is worse than no gate. Too few and something
lands that should not have. The 2026-09-01 shift to act-then-report was the
deliberate version of this correction: the owner was the bottleneck, so the
bottleneck moved to the gates. If something lands under this policy that
should not have, the fix is to name the category and move it back to the floor
— one line in this file — not to quietly resume asking about everything.
