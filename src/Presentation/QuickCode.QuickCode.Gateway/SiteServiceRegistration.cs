using Microsoft.Extensions.DependencyInjection;
using QuickCode.QuickCode.Infrastructure.Integration.ApiKeys;

namespace QuickCode.QuickCode.Gateway;

/// <summary>
/// User-owned DI registrations for the gateway. QuickCode never overwrites this file on regen.
/// </summary>
public static class SiteServiceRegistration
{
    public static IServiceCollection AddSiteCustomizations(this IServiceCollection services)
    {
        services.AddApiKeyAuthClient();
        return services;
    }
}
