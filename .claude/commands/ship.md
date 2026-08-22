---
description: Sync with trunk, verify, push, review, and auto-merge the current track
allowed-tools: Read, Grep, Glob, Bash, Edit
---

Take the current track to merged. Every step is a gate: a failure stops the
sequence. Never `|| warn` past one.

1. **Sync.** `git fetch origin <trunk>` then `git merge origin/<trunk>`.
   **Never rebase and never force-push** — another provider may have this branch
   checked out, and rewriting it destroys their working tree.
   Resolve conflicts by understanding both sides. If both sides changed the same
   logic and either choice loses behaviour, stop and ask.

2. **Verify locally.** `./scripts/verify.sh`. Must be green before pushing.
   Regenerate lockfiles and generated files with the project's own tooling, never
   by hand.

3. **Commit and push.** `git push -u origin <branch>`. Retry network failures up
   to 4 times with exponential backoff (2s, 4s, 8s, 16s).

4. **CI.** Wait for it. If it fails: root-cause it, fix, push again. "Flake" is
   not a root cause — re-run only if the job died before any test body ran, or the
   same commit passed earlier, and at most once. Never skip, disable or quarantine
   a test to get green. Never push an empty commit to kick CI.

5. **Review.** Hand the full diff to the `reviewer` agent — fresh context, and it
   must not be the agent that wrote the code. Give it the plan doc, the diff, the
   scope globs and the CI result.

6. **Merge or escalate.**
   - `CLEAR` → enable auto-merge, squash. Done.
   - `ESCALATE` → leave the PR open. Tell the human in **two lines**: what the
     track wanted to do, and the specific decision that needs them. Not the diff.

**Update `docs/STATE.md` in step 3, before the review — never after it.** A
write after the verdict is a commit nobody reviewed, and STATE.md is exempt from
scope (`.claude/kit/protocol.md` §5) precisely so it can go in the reviewed diff.

**A verdict belongs to a commit, not to a branch.** If you push anything after
the reviewer cleared — a CI fix in step 4, anything — the verdict no longer
covers the head. Re-run the reviewer on the new SHA. Auto-merge will otherwise
merge a commit that was never reviewed.

Report the outcome in one line: merged, or escalated and why.
