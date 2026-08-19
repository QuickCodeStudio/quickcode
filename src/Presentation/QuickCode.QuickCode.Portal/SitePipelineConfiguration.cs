using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

namespace QuickCode.QuickCode.Portal;

/// <summary>
/// User-owned HTTP pipeline hooks. QuickCode never overwrites this file on regen.
/// Called from Startup.qc.cs — do not edit Startup.qc.cs; add middleware here instead.
/// </summary>
public static class SitePipelineConfiguration
{
    /// <summary>
    /// Runs early (after dev exception page, before QuickCode security middleware).
    /// Example: <c>app.UseForwardedHeaders();</c> for Cloud Run / reverse proxy.
    /// </summary>
    public static IApplicationBuilder ConfigureSitePipelineEarly(this IApplicationBuilder app, IHostEnvironment env)
    {
        return app;
    }

    /// <summary>
    /// Runs after auth/routing, before status-code pages and endpoints.
    /// Example: custom session-expired redirect middleware.
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
