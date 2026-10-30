using System.Reflection;
using CodeWalker.GameFiles;
using Microsoft.Extensions.Logging;
using PedExport.Cli;
using PedExport.Game;

namespace PedExport.Commands;

public sealed class FindCommand(IGameData game, ILogger<FindCommand> logger) : CommandHandler<FindOptions>(logger)
{
    private readonly IGameData _game = game ?? throw new ArgumentNullException(nameof(game));

    protected override FindOptions ParseOptions(CommandLine commandLine) => new()
    {
        Terms = commandLine.List("--find")?.Select(t => t.ToLowerInvariant()).ToList(),
        Max = commandLine.Int("--max", 60),
    };

    protected override Task<int> ExecuteAsync(FindOptions options, CancellationToken cancellationToken)
    {
        var hits = _game.Entries
            .Where(e => options.Terms.All(t => e.Path.Contains(t, StringComparison.OrdinalIgnoreCase)))
            .Take(options.Max);
        foreach (var e in hits)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Logger.LogInformation("{Kind} {Path}", e is RpfDirectoryEntry ? "dir " : "file", e.Path);
        }
        return Task.FromResult(0);
    }
}

public sealed class ExtractCommand(IGameData game, ILogger<ExtractCommand> logger) : CommandHandler<ExtractOptions>(logger)
{
    private readonly IGameData _game = game ?? throw new ArgumentNullException(nameof(game));

    protected override ExtractOptions ParseOptions(CommandLine commandLine) => new()
    {
        ArchivePath = commandLine.Value("--extract"),
        OutputFile = commandLine.Value("--to"),
    };

    protected override async Task<int> ExecuteAsync(ExtractOptions options, CancellationToken cancellationToken)
    {
        var data = _game.ReadFile(options.ArchivePath)
            ?? throw new FileNotFoundException($"No file '{options.ArchivePath}' in the game archives.", options.ArchivePath);
        await File.WriteAllBytesAsync(options.OutputFile, data, cancellationToken).ConfigureAwait(false);
        Logger.LogInformation("Wrote {Bytes} bytes to {File}", data.Length, options.OutputFile);
        return 0;
    }
}

public sealed class CollectionsCommand(IGameData game, ILogger<CollectionsCommand> logger) : CommandHandler<NoOptions>(logger)
{
    private readonly IGameData _game = game ?? throw new ArgumentNullException(nameof(game));

    protected override NoOptions ParseOptions(CommandLine commandLine) => NoOptions.Instance;

    protected override Task<int> ExecuteAsync(NoOptions options, CancellationToken cancellationToken)
    {
        var c = _game.Cache;
        Logger.LogInformation("DLC packs: {Packs}", string.Join(" | ", c.DlcNameList.Take(25)));
        Logger.LogInformation("Variation dictionaries {Variations}, drawable dictionaries {Drawables}, DLC enabled {Dlc}",
            c.PedVariationsDict.Count, c.PedDrawableDicts.Count, c.EnableDlc);
        var ymts = _game.Entries.Where(e => e.NameLower.StartsWith("mp_m_freemode_01", StringComparison.Ordinal) && e.NameLower.EndsWith(".ymt", StringComparison.Ordinal)).ToList();
        Logger.LogInformation("Male freemode collections: {Count}", ymts.Count);
        foreach (var e in ymts.Take(8)) Logger.LogInformation("  {Path}", e.Path);
        var dirs = _game.Entries.Where(e => e is RpfDirectoryEntry && e.NameLower.StartsWith("mp_m_freemode_01", StringComparison.Ordinal)).ToList();
        Logger.LogInformation("Male freemode folders: {Count}", dirs.Count);
        foreach (var e in dirs.Take(5)) Logger.LogInformation("  {Path}", e.Path);
        return Task.FromResult(0);
    }
}

public sealed class InspectCommand(IGameData game, ILogger<InspectCommand> logger) : CommandHandler<NoOptions>(logger)
{
    private readonly IGameData _game = game ?? throw new ArgumentNullException(nameof(game));

    protected override NoOptions ParseOptions(CommandLine commandLine) => NoOptions.Instance;

    protected override Task<int> ExecuteAsync(NoOptions options, CancellationToken cancellationToken)
    {
        foreach (var gender in GameNames.Genders)
        {
            var model = GameNames.ModelFor(gender);
            var ped = _game.LoadPed(model);
            Logger.LogInformation("{Model}: {Bones} bones, {Drawables} drawable files, {Textures} texture files",
                model, ped.Skeleton?.Bones?.Items?.Length, ped.DrawableFilesDict?.Count, ped.TextureFilesDict?.Count);
            for (var i = 0; i < GameNames.ComponentSlugs.Count; i++)
            {
                var d = ped.Drawables?[i];
                var geos = (d?.DrawableModels?.High ?? []).SelectMany(m => m.Geometries ?? []).ToArray();
                Logger.LogInformation("  component {Index} {Name}: {Geometries} geometries, {Vertices} vertices, texture {Texture}",
                    i, ped.DrawableNames?[i] ?? "(none)", geos.Length, geos.Sum(g => g.VerticesCount), ped.Textures?[i]?.Name);
            }
        }
        return Task.FromResult(0);
    }
}

public sealed class ProbeCommand(ILogger<ProbeCommand> logger) : CommandHandler<ProbeOptions>(logger)
{
    private const BindingFlags Declared = BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly;

    protected override ProbeOptions ParseOptions(CommandLine commandLine) => new() { TypeNames = commandLine.WordsAfter("--probe") };

    protected override Task<int> ExecuteAsync(ProbeOptions options, CancellationToken cancellationToken)
    {
        var wanted = options.TypeNames.ToHashSet();
        foreach (var t in typeof(GameFileCache).Assembly.GetTypes().Where(t => wanted.Contains(t.Name)))
        {
            Logger.LogInformation("== {Type}", t.FullName);
            foreach (var m in t.GetMembers(Declared))
            {
                var line = m switch
                {
                    FieldInfo f => $"field {f.FieldType.Name} {f.Name}",
                    PropertyInfo p => $"prop  {p.PropertyType.Name} {p.Name}",
                    MethodInfo mi when !mi.IsSpecialName => $"meth  {mi.ReturnType.Name} {mi.Name}({string.Join(", ", mi.GetParameters().Select(x => $"{x.ParameterType.Name} {x.Name}"))})",
                    _ => null,
                };
                if (line != null && !line.Contains("Unknown_") && !line.Contains("Pointer"))
                    Logger.LogInformation("  {Member}", line);
            }
        }
        return Task.FromResult(0);
    }
}
