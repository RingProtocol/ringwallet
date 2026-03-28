#!/usr/bin/env bash
set -e

VERSION_FILE="apps/pwa/version.ts"
if [[ ! -f "$VERSION_FILE" ]]; then
  echo "version file not found: $VERSION_FILE"
  exit 1
fi

# Bump patch: read current patch, increment, write back
patch=$(grep 'const patch = ' "$VERSION_FILE" | sed -n 's/.*const patch = \([0-9]*\).*/\1/p')
if [[ -z "$patch" ]]; then
  echo "could not read patch from $VERSION_FILE"
  exit 1
fi
next=$((patch + 1))
if [[ "$(uname)" = Darwin ]]; then
  sed -i '' "s/const patch = ${patch}/const patch = ${next}/" "$VERSION_FILE"
else
  sed -i "s/const patch = ${patch}/const patch = ${next}/" "$VERSION_FILE"
fi
echo "bumped patch: ${patch} -> ${next}"

msg="${1:-update}"
branch=$(git branch --show-current)
yarn run build || {
  echo "build failed, aborting commit"
  exit 1
}
git add .

staged_files=$(git diff --cached --name-only --diff-filter=ACMR -- '*.js' '*.jsx' '*.ts' '*.tsx' '*.mjs' '*.cjs')
if [[ -n "$staged_files" ]]; then
  console_matches=$(printf '%s\n' "$staged_files" | xargs grep -nH -E 'console\.log\s*\(' || true)
  if [[ -n "$console_matches" ]]; then
    echo "commit blocked: console.log found in staged files"
    echo "$console_matches"
    exit 1
  fi
fi

git commit -m "$msg"
git push origin "$branch"
