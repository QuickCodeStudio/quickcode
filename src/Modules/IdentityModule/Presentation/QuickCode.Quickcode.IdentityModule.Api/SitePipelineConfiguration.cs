using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

namespace QuickCode.Quickcode.IdentityModule.Api;

/// <summary>
/// User-owned HTTP pipeline hooks. QuickCode never overwrites this file on regen.
/// Called from Program.qc.cs — do not edit Program.qc.cs; add middleware here instead.
/// </summary>
public static class SitePipelineConfiguration
{
    /// <summary>
    /// Runs after the exception handler, before QuickCode security middleware.
    /// </summary>
    public static IApplicationBuilder ConfigureSitePipelineEarly(this IApplicationBuilder app, IHostEnvironment env)
    {
        return app;
    }

    /// <summary>
    /// Runs after auth/routing, before controllers are mapped.
    /// </summary>
    public static IApplicationBuilder ConfigureSitePipeline(this IApplicationBuilder app, IHostEnvironment env)
    {
        return app;
    }

    /// <summary>
    /// Runs after all endpoints are mapped (before migrations on startup).
    /// </summary>
    public static IApplicationBuilder ConfigureSitePipelineLate(this IApplicationBuilder app, IHostEnvironment env)
    {
        return app;
    }
}
