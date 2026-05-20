#!/usr/bin/env bash
# dld-catalogue-refresh.sh — orchestrate the dld-catalogue-build edge
# function across multiple offsets to refresh the building catalogue.
#
# Usage:
#   SUPABASE_URL=https://<ref>.supabase.co \
#   SUPABASE_ANON_KEY=eyJ... \
#   ./scripts/dld-catalogue-refresh.sh [--start-offset N] [--max-rounds N]
#
# Each "round" processes 5000 DLD transactions and upserts unique
# (building, area) tuples into public.dld_building_catalogue.
#
# The DLD relay is ~4 s/page so each round takes ~25 s. The full feed
# is ~3 M rows but only ~5–10 k unique residential buildings — most
# new value lands in the first 30–50 rounds (150k–250k rows).

set -euo pipefail

START_OFFSET=0
MAX_ROUNDS=30  # 30 rounds × 5000 rows = 150 000 rows; deep enough for ~5k buildings

while [[ $# -gt 0 ]]; do
  case "$1" in
    --start-offset) START_OFFSET="$2"; shift 2 ;;
    --max-rounds)   MAX_ROUNDS="$2";   shift 2 ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done

: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY is required}"

OFFSET=$START_OFFSET
for (( ROUND=1; ROUND<=MAX_ROUNDS; ROUND++ )); do
  echo "=== round $ROUND / $MAX_ROUNDS  (offset=$OFFSET) ==="
  resp=$(curl -sS -X POST "$SUPABASE_URL/functions/v1/dld-catalogue-build" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"offset\": $OFFSET, \"batches\": 5, \"pageSize\": 1000}")
  echo "$resp"

  done_flag=$(echo "$resp" | python3 -c "import json,sys; print(json.loads(sys.stdin.read()).get('done', False))" 2>/dev/null || echo "False")
  next=$(echo "$resp" | python3 -c "import json,sys; v=json.loads(sys.stdin.read()).get('next_offset'); print(v if v is not None else '')" 2>/dev/null || echo "")

  if [[ "$done_flag" == "True" || -z "$next" ]]; then
    echo "done."
    break
  fi
  OFFSET=$next
done

echo "refresh complete."
