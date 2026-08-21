# Shared harness for verify.sh. Sourced, not run.
#
# A step either PASSES, FAILS, or is SKIPPED. Skipped is never reported as
# passing — "the checks ran green" when half of them never ran is the exact
# silent success this repo has been bitten by before.

set -uo pipefail
PASSED=(); FAILED=(); SKIPPED=()

step() {           # step <name> <command...>
  local name="$1"; shift
  printf '\n\033[1m── %s\033[0m\n' "$name"
  if "$@"; then PASSED+=("$name"); else FAILED+=("$name"); fi
}

skip() {           # skip <name> <reason>
  printf '\n\033[2m── %s — skipped: %s\033[0m\n' "$1" "$2"
  SKIPPED+=("$1 ($2)")
}

have() { command -v "$1" >/dev/null 2>&1; }

# has_script <name> — true if package.json defines that npm script
has_script() {
  [ -f package.json ] || return 1
  node -e "process.exit((require('./package.json').scripts||{})['$1']?0:1)" 2>/dev/null
}

summary() {
  printf '\n\033[1m════ verify summary ════\033[0m\n'
  for s in "${PASSED[@]:-}";  do [ -n "$s" ] && printf '  \033[32mPASS\033[0m  %s\n' "$s"; done
  for s in "${SKIPPED[@]:-}"; do [ -n "$s" ] && printf '  \033[2mSKIP\033[0m  %s\n' "$s"; done
  for s in "${FAILED[@]:-}";  do [ -n "$s" ] && printf '  \033[31mFAIL\033[0m  %s\n' "$s"; done

  local nf=0; for s in "${FAILED[@]:-}"; do [ -n "$s" ] && nf=$((nf+1)); done
  local ns=0; for s in "${SKIPPED[@]:-}"; do [ -n "$s" ] && ns=$((ns+1)); done

  if [ "$nf" -gt 0 ]; then
    printf '\n\033[31mVERIFY FAILED\033[0m — %d step(s). Do not push.\n' "$nf"; exit 1
  fi
  if [ "$ns" -gt 0 ]; then
    printf '\n\033[33mVERIFY PASSED WITH %d SKIPPED\033[0m — say which when reporting.\n' "$ns"
  else
    printf '\n\033[32mVERIFY PASSED\033[0m\n'
  fi
  exit 0
}
