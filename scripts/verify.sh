#!/usr/bin/env bash
# Verification gate. Run green before every push. CI runs the same checks.
cd "$(dirname "$0")/.." || exit 1
. .claude/kit/verify-lib.sh

PM=npm; [ -f pnpm-lock.yaml ] && PM=pnpm

if has_script lint;      then step "lint"      $PM run lint;      else skip "lint" "no script"; fi
if has_script typecheck; then step "typecheck" $PM run typecheck; else skip "typecheck" "no script"; fi
if has_script test;      then step "test"      $PM run test;      else skip "test" "no script"; fi
if has_script build;     then step "build"     $PM run build;     else skip "build" "no script"; fi

summary
