using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

namespace QuickCode.QuickCode.Gateway;

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
    /// Runs after CORS/auth, before gateway routes and YARP are mapped.
    /// </summary>
    public static IApplicationBuilder ConfigureSitePipeline(this IApplicationBuilder app, IHostEnvironment env)
    {
        return app;
    }

    /// <summary>
    /// Runs after all routes (including reverse proxy) are mapped.
    /// </summary>
    public static IApplicationBuilder ConfigureSitePipelineLate(this IApplicationBuilder app, IHostEnvironment env)
    {
        return app;
    }
}
