using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Console;
using PedExport.Cli;
using PedExport.Commands;
using PedExport.Configuration;
using PedExport.Export;
using PedExport.Game;

namespace PedExport;

public static class ServiceProviderFactory
{
    public static ServiceProvider Create(CommandLine commandLine)
    {
        ArgumentNullException.ThrowIfNull(commandLine);

        var overrides = new Dictionary<string, string>();
        if (commandLine.Value("--gta") is { } gta) overrides[$"{PedExportSettings.Section}:{nameof(PedExportSettings.GtaPath)}"] = gta;
        if (commandLine.Value("--out") is { } outDir) overrides[$"{PedExportSettings.Section}:{nameof(PedExportSettings.OutputDir)}"] = outDir;

        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .AddInMemoryCollection(overrides)
            .Build();

        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddLogging(logging =>
        {
            logging.AddConfiguration(configuration.GetSection("Logging"));
            logging.AddSimpleConsole(o =>
            {
                o.SingleLine = true;
                o.TimestampFormat = "HH:mm:ss ";
                o.IncludeScopes = true;
                o.ColorBehavior = LoggerColorBehavior.Enabled;
            });
            if (commandLine.Has("--verbose")) logging.SetMinimumLevel(LogLevel.Debug);
        });

        services.AddOptions<PedExportSettings>()
            .Bind(configuration.GetSection(PedExportSettings.Section))
            .ValidateDataAnnotations();

        services.AddSingleton<IGameData, GameLoader>();
        services.AddTransient<PedExporter>();
        services.AddTransient<OverlayExporter>();

        services.AddKeyedTransient<ICommandHandler, ExportCommand>(CommandLine.DefaultCommand);
        services.AddKeyedTransient<ICommandHandler, OverlaysCommand>("overlays");
        services.AddKeyedTransient<ICommandHandler, FindCommand>("find");
        services.AddKeyedTransient<ICommandHandler, ExtractCommand>("extract");
        services.AddKeyedTransient<ICommandHandler, CollectionsCommand>("collections");
        services.AddKeyedTransient<ICommandHandler, InspectCommand>("inspect");
        services.AddKeyedTransient<ICommandHandler, ProbeCommand>("probe");

        return services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true, ValidateOnBuild = true });
    }
}
