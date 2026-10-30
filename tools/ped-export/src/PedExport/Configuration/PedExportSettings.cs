using System.ComponentModel.DataAnnotations;

namespace PedExport.Configuration;

public sealed class PedExportSettings
{
    public const string Section = "PedExport";

    [Required]
    [NotEmptyOrWhitespace]
    public string GtaPath { get; set; }

    public string OutputDir { get; set; }

    [Range(1_000, int.MaxValue)]
    public int ContentTimeoutMs { get; set; } = 120_000;

    public string ResolveOutputDir() =>
        Path.GetFullPath(string.IsNullOrWhiteSpace(OutputDir)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "clothingdb-peds")
            : OutputDir);
}
