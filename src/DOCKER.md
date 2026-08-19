# Docker Compose & Rider

Open **`QuickCode.QuickCode.Docker.sln`** in Rider (from the `src/` folder).

## First-time setup

```bash
./scripts/rider-docker-setup.sh
```

This configures Docker for Mac (`unix:///var/run/docker.sock`), ensures `.env` exists, and removes stale Rider debug override files.

## Run vs Debug (full stack)

| Button | Behavior |
|--------|----------|
| **Run** (▶) | `docker compose up -d` — all services start normally |
| **Debug** (🐛) on **QuickCode Docker Compose** | Detached compose + Rider fast-mode debugger on .NET services |

Set breakpoints, then Debug. For host-side debugging with infra in Docker, use a **Local Debug** compound config.

## Run configurations

| Config | Purpose |
|--------|---------|
| **QuickCode Docker Compose** | Full stack in Docker (default) |
| **Docker Compose Up (CLI)** | Same via shell script (no Docker plugin server) |
| **Docker Infra Only (CLI)** | Databases + Kafka + Elasticsearch only |
| **Local Debug Portal** | Infra in Docker + Portal on host |
| **Local Debug Gateway** | Infra in Docker + Gateway on host (`http` profile) |

## CLI

```bash
./scripts/docker-compose-up.sh
```

## Services

| Service | URL (default) |
|---------|----------------|
| Portal | http://localhost:6020 |
| Gateway | http://localhost:6060 |

Ports are in `src/.env` (auto-generated, gitignored).

## Troubleshooting

- **Services shows 🚫 Compose: docker-compose.yml / Debug does nothing:** That Services node is not the run config. Use the top toolbar dropdown → **QuickCode Docker Compose** → Debug (or **Local Debug Portal**). Do not Debug from the red Compose node.
- **Swagger fetch error:** A container is down — check **Services** tool window or `docker compose ps`.
- **Server Docker not found:** Re-run setup, or **Settings → Build, Execution, Deployment → Docker → + → Docker for Mac**.
