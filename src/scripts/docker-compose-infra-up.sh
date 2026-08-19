#!/usr/bin/env bash
set -euo pipefail

# Starts databases, Elasticsearch, and Kafka only — use with host-side dotnet debug.
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
  fi
fi

INFRA_SERVICES=(
  quickcode-pg-data
  quickcode-mysql-data
  quickcode-sql-data
  quickcode-elasticsearch
  quickcode-kibana
  quickcode-zookeeper
  quickcode-kafka
  quickcode-kafdrop
)

COMPOSE_SERVICES="$(docker compose --env-file .env config --services 2>/dev/null || true)"
AVAILABLE=()
for svc in "${INFRA_SERVICES[@]}"; do
  if printf '%s\n' "$COMPOSE_SERVICES" | grep -qx "$svc"; then
    AVAILABLE+=("$svc")
  fi
done

if [[ ${#AVAILABLE[@]} -eq 0 ]]; then
  echo "No database / Elasticsearch / Kafka services in this compose file (shared VM infrastructure)."
  exit 0
fi

docker compose --env-file .env up -d "${AVAILABLE[@]}" "$@"

echo ""
echo "Infrastructure containers started. Debug a single service on the host via LaunchSettings,"
