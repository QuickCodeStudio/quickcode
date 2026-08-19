using Microsoft.Extensions.DependencyInjection;

namespace QuickCode.QuickCode.QuickCodeModule.Api;

/// <summary>
/// User-owned DI registrations for this module API. QuickCode never overwrites this file on regen.
/// </summary>
public static class SiteServiceRegistration
{
    public static IServiceCollection AddSiteCustomizations(this IServiceCollection services)
    {
        // Example: services.AddScoped<IMyService, MyService>();
        return services;
    }
}
