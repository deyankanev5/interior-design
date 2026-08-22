# Shared harness for verify.sh. Sourced, not run.
#
# A step PASSES, FAILS, or does not run. The last case is the dangerous one, and
# review found three ways it was being laundered into a pass:
#
#   - alni: no vendor/, so phpcs and phpstan skipped and the entire gate for a
#     WooCommerce rebuild was `php -l`. Exit 0, "VERIFY PASSED WITH 2 SKIPPED".
#   - node: `node` missing or package.json malformed reported skip "no script"
#     — a false reason — for all four checks. Exit 0 over four failing checks.
#   - php: `git ls-files` failing outside a work tree linted zero files and
#     reported PASS.
#
# So a step that did not run is now a FAILURE whenever that check is listed in
# `requiredChecks` in .claude/kit.json — which the installer populates from the
# checks the project actually had at install time. That makes a thin gate an
# explicit, recorded decision instead of a silent default, and it makes silently
# weakening the gate later show up as a failure rather than as green.
#
# A check genuinely not applicable to this project is declared with `optional`,
# which records the gap without failing.

set -uo pipefail
PASSED=(); FAILED=(); SKIPPED=(); OPTIONAL=(); RAN=0

_kit_required() {
  [ -f .claude/kit.json ] || return 0
  python3 - <<'PY' 2>/dev/null || true
import json
try:
    cfg = json.load(open(".claude/kit.json"))
except Exception:
    raise SystemExit(0)
print(" ".join(cfg.get("requiredChecks", [])))
PY
}
REQUIRED_CHECKS=" $(_kit_required) "

_is_required() { case "$REQUIRED_CHECKS" in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

step() {           # step <name> <command...>
  local name="$1"; shift
  printf '\n\033[1m── %s\033[0m\n' "$name"
  RAN=$((RAN+1))
  if "$@"; then PASSED+=("$name"); else FAILED+=("$name"); fi
}

# Could not run. Fails if this check is one the project is supposed to have.
skip() {           # skip <name> <reason>
  if _is_required "$1"; then
    printf '\n\033[31m── %s — DID NOT RUN: %s\033[0m\n' "$1" "$2"
    FAILED+=("$1 — required check did not run: $2")
  else
    printf '\n\033[33m── %s — skipped: %s\033[0m\n' "$1" "$2"
    SKIPPED+=("$1 ($2)")
  fi
}

# Genuinely not applicable here. Recorded, never fails.
optional() {       # optional <name> <reason>
  printf '\n\033[2m── %s — n/a: %s\033[0m\n' "$1" "$2"
  OPTIONAL+=("$1 ($2)")
}

have() { command -v "$1" >/dev/null 2>&1; }

# Distinguishes "node is missing", "package.json is unreadable" and "the script
# is genuinely not defined" — previously all three collapsed into one false
# reason. Echoes a diagnosis; returns 0 only when the script exists.
has_script() {
  if [ ! -f package.json ]; then echo "no package.json"; return 1; fi
  if ! have node; then echo "node not installed"; return 1; fi
  local out
  if ! out=$(node -e "
    const s=require('./package.json').scripts||{};
    process.exit(s['$1']?0:1)" 2>&1); then
    case "$out" in
      "") echo "script not defined" ;;
      *)  echo "package.json unreadable: $(printf '%s' "$out" | head -1)" ;;
    esac
    return 1
  fi
  return 0
}

count() { local n=0 s; for s in "$@"; do [ -n "$s" ] && n=$((n+1)); done; echo "$n"; }

summary() {
  printf '\n\033[1m════ verify summary ════\033[0m\n'
  local s
  for s in "${PASSED[@]:-}";   do [ -n "$s" ] && printf '  \033[32mPASS\033[0m  %s\n' "$s"; done
  for s in "${OPTIONAL[@]:-}"; do [ -n "$s" ] && printf '  \033[2mN/A \033[0m  %s\n' "$s"; done
  for s in "${SKIPPED[@]:-}";  do [ -n "$s" ] && printf '  \033[33mSKIP\033[0m  %s\n' "$s"; done
  for s in "${FAILED[@]:-}";   do [ -n "$s" ] && printf '  \033[31mFAIL\033[0m  %s\n' "$s"; done

  local nf ns
  nf=$(count "${FAILED[@]:-}")
  ns=$(count "${SKIPPED[@]:-}")

  if [ "$RAN" -eq 0 ] && [ "$nf" -eq 0 ]; then
    printf '\n\033[31mVERIFY FAILED\033[0m — no check actually executed.\n'
    printf 'A gate that runs nothing is not a gate. Do not push.\n'
    exit 1
  fi

  if [ "$nf" -gt 0 ]; then
    printf '\n\033[31mVERIFY FAILED\033[0m — %d step(s). Do not push.\n' "$nf"
    exit 1
  fi

  if [ "$ns" -gt 0 ]; then
    printf '\n\033[33mVERIFY PASSED, %d CHECK(S) SKIPPED\033[0m\n' "$ns"
    printf 'These are gaps, not passes. Name them when you report this run.\n'
  else
    printf '\n\033[32mVERIFY PASSED\033[0m — %d checks ran.\n' "$RAN"
  fi
  exit 0
}
