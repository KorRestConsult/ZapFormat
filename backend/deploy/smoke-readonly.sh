#!/usr/bin/env bash
set -Eeuo pipefail

BASE="${ZAPFORMAT_LOCAL_API:-http://127.0.0.1:3000}"

echo "=== ZapFormat read-only smoke test ==="
for path in   /api/health   /api/supplier/capabilities   /api/supplier/basket   /api/supplier/order-statuses   /api/supplier/orders?limit=5   /api/supplier/checkout-options
do
  echo
  echo "GET $path"
  curl -fsS "${BASE}${path}" | python3 -m json.tool
done

echo
echo "=== DONE ==="
