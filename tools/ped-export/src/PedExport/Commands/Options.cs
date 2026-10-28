using System.ComponentModel.DataAnnotations;
using PedExport.Cli;
using PedExport.Configuration;
using PedExport.Game;

namespace PedExport.Commands;

public static class GenderOption
{
    public static IReadOnlyList<string> Parse(CommandLine commandLine)
    {
        ArgumentNullException.ThrowIfNull(commandLine);
        return commandLine.Value("--gender", "both") switch
        {
            "both" => GameNames.Genders,
            "male" => ["male"],
            "female" => ["female"],
            var other => throw new CommandLineException($"--gender expects male, female or both, got '{other}'."),
        };
    }
}

public sealed class ExportOptions
{
    [Required, MinLength(1)]
    public IReadOnlyList<string> Genders { get; init; } = GameNames.Genders;

    [NotEmptyOrWhitespace]
    public IReadOnlyList<string> Slots { get; init; }

    [Range(0, int.MaxValue)]
    public int From { get; init; }

    [Range(1, int.MaxValue)]
    public int Limit { get; init; } = int.MaxValue;
}

public sealed class OverlaysOptions
{
    [Required, MinLength(1)]
    public IReadOnlyList<string> Genders { get; init; } = GameNames.Genders;

    [NotEmptyOrWhitespace]
    public IReadOnlyList<string> Slots { get; init; }
}

public sealed class FindOptions
{
    [Required, MinLength(1), NotEmptyOrWhitespace]
    public IReadOnlyList<string> Terms { get; init; }

    [Range(1, 100_000)]
    public int Max { get; init; } = 60;
}

public sealed class ExtractOptions
{
    [Required, NotEmptyOrWhitespace]
    public string ArchivePath { get; init; }

    [Required, NotEmptyOrWhitespace]
    public string OutputFile { get; init; }
}

public sealed class ProbeOptions
{
    [Required, MinLength(1), NotEmptyOrWhitespace]
    public IReadOnlyList<string> TypeNames { get; init; }
}

public sealed class NoOptions
{
    public static readonly NoOptions Instance = new();
}
