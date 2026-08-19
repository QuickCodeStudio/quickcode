# Source code

> **AI agents / developers:** read **[AGENTS.md](../AGENTS.md)** before adding or changing files.  
> It defines what QuickCode regenerates (`*.g.cs`, `*.qc.cs`, `Views/Generated/`) and **exactly where to put new user code**.

## Layout

- `Common/` — shared libraries
- `Modules/{Module}/` — microservice modules (Core / Infrastructure / Presentation)
- `Presentation/` — Gateway & Portal
- `Services/` — background services
- `dbml_files/` — module schemas (edit → regenerate)

Full documentation: [README.md](../README.md)
