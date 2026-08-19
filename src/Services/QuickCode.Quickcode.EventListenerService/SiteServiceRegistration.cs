using Microsoft.Extensions.DependencyInjection;

namespace QuickCode.Quickcode.EventListenerService;

/// <summary>
/// User-owned DI registrations for the event listener service. QuickCode never overwrites this file on regen.
/// </summary>
public static class SiteServiceRegistration
{
    public static IServiceCollection AddSiteCustomizations(this IServiceCollection services)
    {
        // Example: services.AddHostedService<MyBackgroundWorker>();
        return services;
    }
}
