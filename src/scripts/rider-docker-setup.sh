#!/usr/bin/env bash
set -euo pipefail

# Run from generated project src/ (same folder as docker-compose.yml).
cd "$(dirname "$0")/.."

mkdir -p .idea
cp rider/dockerSettings.xml .idea/dockerSettings.xml

# Stale Rider debug overrides replace dotnet entrypoints and break multi-service stacks on Docker for Mac.
find .idea -name 'docker-compose.generated.override.yml' -delete 2>/dev/null || true

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created .env from .env.example — run QuickCode generate again if secrets are missing."
  else
    echo "Warning: .env not found. Regenerate the project or copy .env.example to .env."
  fi
fi

mkdir -p .run
if [[ -d rider/run ]]; then
  cp rider/run/*.run.xml .run/ 2>/dev/null || true
  for sln in QuickCode.*.Docker.sln; do
    [[ -f "$sln" ]] || continue
    dest="${sln%.sln}.run"
    mkdir -p "$dest"
    cp rider/run/*.run.xml "$dest/" 2>/dev/null || true
  done
fi

echo "Rider Docker setup done."
echo "  1. Open QuickCode.QuickCode.Docker.sln in Rider"
echo "  2. Run → QuickCode Docker Compose (▶ Run or 🐛 Debug Portal breakpoints)"
echo "  3. View → Tool Windows → Services — containers"
