---
description: Hand a task to Dispatch — the always-on session that assigns work, tracks deliveries, and batches decisions
allowed-tools: Read, Grep, Glob, Bash, ListAgents, SendMessage, Write, Edit
---

Forward the task in $ARGUMENTS to the owner's dispatcher session, so it is
tracked, assigned and followed up without the owner opening another window.

**Dispatch** is a persistent cloud session named exactly that; its operating
contract is installed at `.claude/kit/dispatcher.md`. It spawns cloud
workers, watches every PR, refreshes the operations board, and puts decisions
in front of the owner in one place. Handing it a task means the task cannot be
forgotten: it either becomes a track with a claim PR, or comes back with a
question.

## Steps

1. Compose the task note. One short block:
   - the goal, in the owner's words from $ARGUMENTS
   - which project it belongs to (infer from the current repo if not stated)
   - anything this session knows that Dispatch cannot see — an uncommitted
     finding, a local-only detail, a constraint the owner just mentioned
2. Run `ListAgents`. If a session named **Dispatch** is reachable, `SendMessage`
   it the note and confirm to the owner in one line that it was handed off.
3. If Dispatch is not reachable (no cloud access from this machine, or it is
   not running): do **not** silently drop the task. Say so, and write the task
   into `docs/STATE.md` under **Next** instead — Dispatch reads STATE.md on
   every board refresh, so the task still arrives, just slower.

## Rules

- Never invent context to pad the note. Two accurate lines beat ten guessed.
- A reply is not expected: a message to a cloud session is one-way. Dispatch
  acts on it and reports to the owner in its own conversation.
- This command forwards; it does not start the work here. If the owner wants
  the work done in *this* session, that is `/plan`, not `/dispatch`.
