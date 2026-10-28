using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PedExport.Cli;
using PedExport.Configuration;
using PedExport.Export;

namespace PedExport.Commands;

public sealed class ExportCommand(PedExporter exporter, IOptions<PedExportSettings> settings, ILogger<ExportCommand> logger)
    : CommandHandler<ExportOptions>(logger)
{
    private readonly PedExporter _exporter = exporter ?? throw new ArgumentNullException(nameof(exporter));
    private readonly IOptions<PedExportSettings> _settings = settings ?? throw new ArgumentNullException(nameof(settings));

    protected override ExportOptions ParseOptions(CommandLine commandLine) => new()
    {
        Genders = GenderOption.Parse(commandLine),
        Slots = commandLine.List("--slots"),
        From = commandLine.Int("--from", 0),
        Limit = commandLine.Int("--limit", int.MaxValue),
    };

    protected override async Task<int> ExecuteAsync(ExportOptions options, CancellationToken cancellationToken)
    {
        var outDir = _settings.Value.ResolveOutputDir();
        var scope = new ExportScope(options.Slots?.ToHashSet(), options.From, options.Limit);
        foreach (var gender in options.Genders)
            await _exporter.ExportAsync(gender, outDir, scope, cancellationToken).ConfigureAwait(false);
        Logger.LogInformation("Done: {OutputDir}", outDir);
        return 0;
    }
}

public sealed class OverlaysCommand(OverlayExporter exporter, IOptions<PedExportSettings> settings, ILogger<OverlaysCommand> logger)
    : CommandHandler<OverlaysOptions>(logger)
{
    private readonly OverlayExporter _exporter = exporter ?? throw new ArgumentNullException(nameof(exporter));
    private readonly IOptions<PedExportSettings> _settings = settings ?? throw new ArgumentNullException(nameof(settings));

    protected override OverlaysOptions ParseOptions(CommandLine commandLine) => new()
    {
        Genders = GenderOption.Parse(commandLine),
        Slots = commandLine.List("--slots"),
    };

    protected override async Task<int> ExecuteAsync(OverlaysOptions options, CancellationToken cancellationToken)
    {
        var outDir = _settings.Value.ResolveOutputDir();
        foreach (var gender in options.Genders)
            await _exporter.ExportAsync(gender, outDir, options.Slots?.ToHashSet(), cancellationToken).ConfigureAwait(false);
        Logger.LogInformation("Done: {OutputDir}", outDir);
        return 0;
    }
}
