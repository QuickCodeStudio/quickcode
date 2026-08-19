# Claude — QuickCode project instructions

**Full guide:** read [AGENTS.md](./AGENTS.md) at repo root.

## Never edit

- `*.g.cs`, `*.qc.cs`, `*.g.sql`
- `Views/Generated/**`

## Put new code here

| Task | Location |
|------|----------|
| Schema / API / queries | `src/dbml_files/*.dbml` → regenerate |
| Extend generated type | Same folder as `.g.cs`, new `*Extensions.cs`, `partial class` |
| Register DI | `SiteServiceRegistration.cs` in host project → `AddSiteCustomizations()` |
| Custom middleware | `SitePipelineConfiguration.cs` in host project → `ConfigureSitePipeline*` |
| Business logic | `src/Modules/{Module}/Core/QuickCode.{Project}.{Module}.Application/` |
| Custom persistence | `src/Modules/{Module}/Infrastructure/QuickCode.{Project}.{Module}.Persistence/` |
| Custom API controller | `src/Modules/{Module}/Presentation/QuickCode.{Project}.{Module}.Api/Controllers/` |
| Custom portal views | `src/Presentation/QuickCode.{Project}.Portal/Views/` (not `Generated/`) |
| Gateway | `src/Presentation/QuickCode.{Project}.Gateway/` |
| Shared | `src/Common/QuickCode.{Project}.Common/` |

Replace `{Project}` / `{Module}` with this repo's names. User files = plain `.cs` only.
