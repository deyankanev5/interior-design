# Autonomy: what runs without you

The model is **approve the plan, not the diff**. You make decisions about what
gets built and why. Everything from there to a squash-merged commit runs
unattended, gated by checks rather than by your attention.

This document says exactly where the line sits, because an autonomy model you
cannot predict is one you end up supervising anyway — which defeats it.

---

## The one thing you review

A plan doc. It states the goal, the approach, the scope globs, the risks, and
what "done" means. It is a page, not a diff. You say yes, or you correct the
approach.

Everything else — branching, implementing, testing, fixing CI, review, merge —
happens without you unless a gate escalates.

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

## What always stops for you

Not preferences — hard stops. The reviewer does not merge these no matter how
clean they look:

- **Schema and migrations.** Reversibility depends on state the repo cannot see.
- **Secrets and permissions.** Blast radius is not local to the diff.
- **Production hosts and deploys.** In `alni` this is absolute: `alni.eu` is
  read-only, and the Hetzner box runs four other live sites off one MySQL
  container.
- **Dependencies.** A new package is a supply-chain decision.
- **Public-facing copy** in projects with a tone-of-voice standard.
- **Anything outside the track's declared scope.**

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
lands that should not have. If you find yourself rubber-stamping, the rules in
`protocol.md` §7 are too broad — narrow them deliberately rather than ignoring
them in practice.
