---
description: Refresh the cross-project operations board now and republish it
allowed-tools: Read, Grep, Glob, Bash
---

Rebuild the operations board from the current state of every project and
republish it to the same URL. Use this any time the board is stale — the
scheduled run is daily, so anything that landed since this morning is not on it
yet.

## Where things are

The tooling lives in the **claude-workflow** repository, on `main`. If it is
not already checked out in this session, clone it before doing anything else.

`projects.json` there holds both the project list and, under `artifact`, the URL
of the board to republish to.

## Steps

**1. Make sure the clones exist.** The collector reads commit cadence,
`docs/STATE.md` and every checklist under `docs/` from the working tree of each
project listed in `projects.json`. A project with no clone renders as "no local
clone in this session" rather than as zero — correct, but half a board. Clone
any that are missing, to the path the config names.

**2. Read the live board first — this is not optional.** Checklist items ticked
in the published page live only in that page. Regenerating without them destroys
them:

```
Artifact tool, action "read", url = <the `artifact` value from projects.json>
```

The result names a local file holding the full HTML.

**3. Collect and render:**

```sh
cd claude-workflow
DASHBOARD_PREVIOUS=<the file from step 2> ./bin/dashboard.sh
```

That runs the collector (git + the GitHub API) and the renderer, which carries
the tick overlay forward via `--carry-from` and drops only ticks whose task no
longer exists. **It prints how many it carried.** If that says 0 and the
previous board had ticks, stop and say so rather than publishing over them.

**4. Republish to the same URL:**

```
Artifact tool, publish
  url       = <the `artifact` value from projects.json>
  file_path = the generated dashboard.html
```

Do not pass `favicon` — the artifact keeps the icon it has. Do not pass
`capabilities` — omitting it carries the stored declaration forward, which is
what keeps the checkboxes saveable. Do not publish without `url`: that creates a
second, separate board instead of updating this one.

If `projects.json` has no `artifact` value, this is a first publish — publish
without `url`, then write the URL it returns back into `projects.json` and
commit that.

**5. Report what changed** since the version you read in step 2 — new or cleared
items in "Waiting on you", a PR gone red, a repo that became unreachable. Keep
it to a few lines. If nothing material changed, say just that.

## Do not

- Do not tick anything to make the numbers look better. Most checklists read
  `0/N` and the board labels that "nothing ticked yet" — those plans were
  written and never maintained, which is the truth and should stay visible.
- Do not edit any project's markdown as part of a refresh. Use `/roadmap` for
  that, as its own change.
- Do not fabricate analytics figures. The Search & analytics panel is empty by
  design until a source is connected.
- Do not push commits or open pull requests. This refreshes a page; that is all.
