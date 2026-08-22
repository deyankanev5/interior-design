#!/usr/bin/env bash
# Verification gate. Run green before every push. CI runs the same checks.
cd "$(dirname "$0")/.." || exit 1
. .claude/kit/verify-lib.sh

PM=npm; [ -f pnpm-lock.yaml ] && PM=pnpm

# has_script distinguishes "node missing", "package.json unreadable" and "script
# not defined" — all three used to collapse into one false reason and report a
# skip. Whether a skip fails is decided by requiredChecks in .claude/kit.json,
# so deleting a check that existed at install time now fails rather than passes.
for c in lint typecheck test build; do
  if reason=$(has_script "$c"); then
    step "$c" $PM run "$c"
  else
    skip "$c" "$reason"
  fi
done

summary
