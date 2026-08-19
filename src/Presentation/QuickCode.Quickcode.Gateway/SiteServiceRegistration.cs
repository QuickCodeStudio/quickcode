using Microsoft.Extensions.DependencyInjection;
using QuickCode.Quickcode.Infrastructure.Integration.ApiKeys;

namespace QuickCode.Quickcode.Gateway;

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
