
<!-- kit:section:start -->
## Working alongside other agents in this repo (kit v1.2.2)

This repository is worked by several agents at once — Codex, Claude Code
sessions, possibly more. They coordinate through one protocol, and it only works
if every provider follows it. **Read `.claude/kit/protocol.md` before your first
edit.** These are the same rules Claude sessions run under, not a summary of
them: an earlier version of this file omitted the autonomy model entirely, which
meant an agent following it faithfully would merge a schema change on green CI
having never been told the category existed.

**Trunk is `main`**, always green, never committed to directly.

**One unit of work = one branch.** Branch names carry the provider:
`codex/<slug>`, `claude/<slug>`. Size the work to merge within a day.

### Before you edit: claim your scope

Open a PR *before* writing code, with a machine-readable scope block in the body:

```
<!-- kit:scope
track: <slug>
provider: codex
owns:
  - <glob>
-->
```

1. List the repository's open PRs and read their scope blocks.
2. If your intended globs overlap an open track's, do not proceed — narrow your
   scope, wait for it to merge, sequence behind it, or raise it with the owner.
3. After opening your PR, **list again**. An overlapping claim created before
   yours wins; close yours and go back to step 2. Steps 1–2 are a read and step
   3 is the write, and two agents starting seconds apart both pass step 1.

Writing outside your declared `owns` is a protocol violation, not a judgement
call. `docs/STATE.md` is the one exception: it is shared, exempt from scope, and
appended by everybody.

### Before you merge: the gates

A track merges only after **all** of these, and the human approves the *plan*,
not the diff — so these gates are the only thing standing between your change
and trunk:

1. `./scripts/verify.sh` green locally. A check that did not run is a failure, not a pass.
2. CI green.
3. A review by an agent that **did not write the code**. Reviewing your own work
   re-derives your own assumptions and confirms them.

### Always escalate to a human instead of merging

Migrations and schema changes · secrets, credentials and permission
configuration · production hosts and deploy paths · deletions you cannot justify
from the plan · new dependencies · public-facing copy where a tone standard
exists · **changes to the gate itself** (`./scripts/verify.sh`, CI config, `.claude/**`,
this protocol) · anything outside your declared `owns` · your own genuine
uncertainty that the change is correct.

Escalation is not failure. Merging something broken costs far more than asking.

### Never

Rebase or force-push a branch that has an open PR — another agent may have it
checked out on another machine, and rewriting it destroys their working tree.
Merge trunk in instead.

When this protocol changes, `CLAUDE.md` and `AGENTS.md` change in the same
commit. A protocol only one side follows is worse than none, because it produces
confident and wrong assumptions about who owns which files.
<!-- kit:section:end -->
