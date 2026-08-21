
## Working alongside other agents in this repo (kit v1.0.0)

This repository is worked by several agents at once — Codex, Claude Code
sessions, possibly more. They coordinate through one protocol, and it only works
if every provider follows it. **Read `.claude/kit/protocol.md` before your first
edit.**

**Trunk is `main`**, always green, never committed to directly.

**One unit of work = one branch.** Branch names carry the provider: `codex/<slug>`,
`claude/<slug>`. Size the work to merge within a day.

**Claim your scope before editing.** Open a PR *before* writing code, with a
machine-readable scope block in the body:

```
<!-- kit:scope
track: <slug>
provider: codex
owns:
  - <glob>
-->
```

Before you claim, list the repository's open PRs and read their scope blocks. If
your intended globs overlap an open track's, do not proceed — narrow your scope,
wait for it to merge, sequence behind it, or raise it with the owner. Writing
outside your declared `owns` is a protocol violation, not a judgement call.

**Never rebase or force-push a branch that has an open PR.** Another agent may
have it checked out on another machine. Merge trunk in instead.

**Run `./scripts/verify.sh` locally and green before you push.**

When this protocol changes, `CLAUDE.md` and `AGENTS.md` change in the same commit.
A protocol only one side follows is worse than none, because it produces
confident and wrong assumptions about who owns which files.
