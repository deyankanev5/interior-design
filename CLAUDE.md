
<!-- kit:section:start -->
## Working with other agents in this repo (kit v1.2.0)

Several agents work this repository at once — Claude sessions in parallel, and
sometimes Codex. **Read `.claude/kit/protocol.md` before your first edit of a
session.** The rules below are the short form; the protocol wins on detail.

**Trunk is `main`.** It is always green. Nothing is committed to it
directly — everything arrives by squash-merge from a track.

**One unit of work = one track = one branch = one session.** A track is sized to
merge within a day. Long-lived branches are the failure this protocol exists to
prevent.

**Claim scope before editing.** List open PRs, parse their `kit:scope` blocks,
and check your intended path globs against them. If they overlap, stop and apply
protocol §5 — narrow, wait, sequence, or escalate. Never "edit it and sort it out
at merge." Your own claim is a PR opened *before* you write code, carrying:

```
<!-- kit:scope
track: <slug>
provider: claude
owns:
  - <glob>
-->
```

**Never rebase or force-push a branch with an open PR.** Another provider's agent
may have it checked out; rewriting history destroys their working tree. Merge
trunk in instead.

**Verify locally before pushing:** `./scripts/verify.sh`. Pushing to discover whether CI
passes burns everyone's CI queue and ten minutes per attempt.

**Report failures as failures.** Every silent success in this codebase has cost
hours. Prefer failing loudly over `|| warn`.

### Commands

`/kickoff` orient · `/plan` propose · `/build` claim + implement · `/ship` merge
`/verify` gate · `/review` fresh-context review · `/handoff` leave resumable
`/standup` cross-project · `/brief` SEO research · `/draft` copy · `/extract` data

### Autonomy

The human approves the **plan**, not the diff. Everything downstream runs
unattended if it clears verify, CI, and a fresh-context reviewer. Escalate rather
than merge on: migrations, secrets, permissions, production or deploy paths,
unjustified deletions, new dependencies, public-facing copy where a tone standard
exists, out-of-scope files, or your own genuine uncertainty. Escalation is not
failure; a reviewer that never escalates is not reviewing.
<!-- kit:section:end -->
