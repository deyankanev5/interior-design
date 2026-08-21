# Project state

**Updated:** 2026-08-21 — workflow kit installation

## Where this is now

**Palette Studio** — an interior-design tool for colour *and material* schemes:
walls, floors, joinery, worktops, textiles and accents, worked against real
supplier decor ranges rather than free-floating hex codes. Coolors-like
interaction (full-height columns, spacebar to generate, lock what is decided),
but every slot carries a room role and, where possible, an orderable product
reference.

Vite + React + TypeScript, entirely client-side, published to GitHub Pages via
`.github/workflows/pages.yml`. Scripts: `lint`, `typecheck`, `build`, `smoke`,
`check:pages`. There is no unit test suite, so `verify.sh` reports `test` as
SKIPPED — treat that as reduced coverage, not as a pass.

Domain logic worth knowing before editing: `src/engine/` (generate, harmony,
score), `src/domain/surfaces.ts` (role constraints), `src/color/convert.ts`.

## In flight

| Track | Branch | Status | Blocked on |
|---|---|---|---|
| workflow-kit | claude/multi-project-workflow-autonomy-1g2alh | in review | — |

## Next

Unset — the owner has not named the next objective for this project. Run
`/plan` with a goal before building anything here.

## Gotchas found the hard way

- **Roles are hard constraints, not hints.** A decorative board can be joinery or
  wall panelling and can never be proposed as a floor; each role carries a
  lightness and chroma envelope that stops near-black ceilings and fully
  saturated large walls. Changes to `src/engine/generate.ts` that ignore the
  envelopes produce output that looks plausible in a diff and wrong on screen.
- **Locks must be identical across every result**, including the eight-up
  Variations grid. That invariant is easy to break and not covered by a test.
- This is a public repository. Nothing private belongs in it.
