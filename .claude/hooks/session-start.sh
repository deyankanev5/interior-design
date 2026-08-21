#!/usr/bin/env bash
# Kit SessionStart hook. Prints the orientation a session would otherwise spend
# several tool calls rediscovering. Fast, read-only, never fails the session.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

kit_json=".claude/kit.json"
trunk="main"
[ -f "$kit_json" ] && trunk=$(sed -n 's/.*"trunk"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$kit_json" | head -1)
[ -z "$trunk" ] && trunk="main"

echo "## Project orientation (kit)"
echo
echo "- trunk: \`$trunk\`"

branch=$(git branch --show-current 2>/dev/null | head -1)
[ -z "$branch" ] && branch="(detached or no commits)"
echo "- branch: \`$branch\`"

dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$dirty" != "0" ]; then
  echo "- **uncommitted files: $dirty** — this work exists only on this machine."
  git status --porcelain 2>/dev/null | head -10 | sed 's/^/      /'
else
  echo "- working tree clean"
fi

if [ -f docs/STATE.md ]; then
  echo
  echo "### docs/STATE.md (head)"
  sed -n '1,25p' docs/STATE.md
else
  echo
  echo "- no \`docs/STATE.md\` yet — run \`/handoff\` at the end of this session to create it."
fi

echo
echo "Protocol: \`.claude/kit/protocol.md\`. Before editing, claim scope (\`/build\`)."
echo "Commands: /kickoff /plan /build /ship /verify /review /handoff /standup /brief /draft /extract"
exit 0
