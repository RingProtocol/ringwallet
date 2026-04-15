#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILE="${ROOT}/src/config/chaindata.md"

if [[ ! -f "$FILE" ]]; then
  echo "error: ${FILE} not found" >&2
  exit 1
fi

sed -nE 's/.*https:\/\/([-a-zA-Z0-9]+)\.g\.alchemy\.com.*/\1/p' "$FILE"
