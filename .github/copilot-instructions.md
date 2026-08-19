# Copilot — QuickCode generated project

Read `AGENTS.md` at repo root before editing.

## Do not modify

`*.g.cs`, `*.qc.cs`, `*.g.sql`, anything under `Views/Generated/`.

## Where to put new code

- **Schema/API changes:** `src/dbml_files/*.dbml` then QuickCode generate.
- **Extend generated type:** new `.cs` in same layer, `partial class`, same name as `.g.cs` type.
- **Register DI:** edit `SiteServiceRegistration.cs` in the host project — `AddSiteCustomizations()`. Do not edit `Program.qc.cs`.
- **Middleware / pipeline:** edit `SitePipelineConfiguration.cs` — `ConfigureSitePipelineEarly` / `ConfigureSitePipeline` / `ConfigureSitePipelineLate`. Do not edit `Program.qc.cs`.
- **Business logic:** `src/Modules/{Module}/Core/QuickCode.{Project}.{Module}.Application/`
- **Custom persistence:** `src/Modules/{Module}/Infrastructure/QuickCode.{Project}.{Module}.Persistence/`
- **Custom API:** `src/Modules/{Module}/Presentation/QuickCode.{Project}.{Module}.Api/Controllers/`
- **Custom portal views:** `src/Presentation/QuickCode.{Project}.Portal/Views/` (never `Views/Generated/`)
- **Gateway:** `src/Presentation/QuickCode.{Project}.Gateway/`
- **Shared:** `src/Common/QuickCode.{Project}.Common/`

User code = plain `.cs` only. Regen does not overwrite existing user files.
