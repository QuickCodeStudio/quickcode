using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

namespace QuickCode.QuickCode.EventListenerService;

/// <summary>
/// User-owned HTTP pipeline hooks. QuickCode never overwrites this file on regen.
/// Called from Program.qc.cs — do not edit Program.qc.cs; add middleware here instead.
/// </summary>
public static class SitePipelineConfiguration
{
    /// <summary>
    /// Runs at startup, before Swagger and health checks.
    /// </summary>
    public static IApplicationBuilder ConfigureSitePipelineEarly(this IApplicationBuilder app, IHostEnvironment env)
    {
        return app;
    }

    /// <summary>
    /// Runs before minimal API routes are mapped.
    /// </summary>
    public static IApplicationBuilder ConfigureSitePipeline(this IApplicationBuilder app, IHostEnvironment env)
    {
        return app;
    }

    /// <summary>
    /// Runs after all endpoints are mapped.
    /// </summary>
    public static IApplicationBuilder ConfigureSitePipelineLate(this IApplicationBuilder app, IHostEnvironment env)
    {
        return app;
    }
}
