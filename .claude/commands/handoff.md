---
description: Update STATE.md and push, so any session or provider can resume cleanly
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, ListAgents, SendMessage
---

Leave this project resumable by someone with no memory of this session.

1. Update `docs/STATE.md`:
   - where the project is now, in a paragraph
   - what changed this session
   - open tracks: slug, branch, status, what is blocking each
   - what is worth doing next, and why that rather than the alternatives
   - anything discovered that will bite the next agent — a gotcha found the hard
     way here is worth more than a description of what was built

2. Commit and push everything. **Nothing stays uncommitted.** Work that exists
   only in a working tree exists on one machine; this setup has lost 9.9 MB that
   way once already.

   **But never to trunk.** A session that ran `/kickoff` and `/plan` has no
   branch — `/plan` deliberately does not create one — so it is sitting on trunk
   with a new plan doc and a modified `STATE.md`. Pushing "everything" there
   commits directly to trunk, which the protocol forbids. If you are on trunk
   with changes, create `claude/<slug>` first and push that. This is the common
   session shape, not an edge case.

3. Ping Dispatch, if it is reachable. Run `ListAgents`; if a session named
   **Dispatch** is listed, `SendMessage` it three lines: which project, which
   branch/PR the work landed on, and whether it is a delivery to review or a
   handoff mid-track. This turns "Dispatch notices at the next poll" into
   "Dispatch knows in seconds". If no Dispatch session is reachable, skip
   silently — it reads the pushed STATE.md and the PR anyway, so nothing is
   lost, only delayed. Never let this step block the handoff.

4. Report what is left in flight, in three lines.

Write STATE.md for an agent that has never seen this project. "Continued the
refactor" is useless; name the files, the branch, and the next concrete step.
