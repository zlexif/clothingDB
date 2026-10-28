using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using CodeWalker.GameFiles;
using Microsoft.Extensions.Logging;
using PedExport.Game;

namespace PedExport.Export;

public sealed partial class OverlayExporter(IGameData game, ILogger<OverlayExporter> logger)
{
    public static readonly IReadOnlyList<string> MetaPaths =
    [
        @"update\update.rpf\common\data\effects\peds\facial_overlays.meta",
        @"common.rpf\data\effects\peds\facial_overlays.meta",
    ];

    public static readonly IReadOnlyList<(string Tag, string Slug, string Target)> Lists =
    [
        ("blemishes", "blemishes", "head"),
        ("facialHair", "facial-hair", "head"),
        ("eyebrow", "eyebrows", "head"),
        ("aging", "ageing", "head"),
        ("makeup", "makeup", "head"),
        ("blusher", "blush", "head"),
        ("damage", "complexion", "head"),
        ("baseDetail", "sun-damage", "head"),
        ("skinDetail1", "lipstick", "head"),
        ("skinDetail2", "moles", "head"),
        ("bodyOverlay1", "chest-hair", "torsos"),
        ("bodyOverlay2", "body-blemishes", "torsos"),
    ];

    public static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> DlcAdditions = new Dictionary<string, IReadOnlyList<string>>
    {
        ["makeup"] = ["mp_heist4_facepaint", "mp_security_facepaint"],
        ["blusher"] = ["mp_christmas2017_facepaint"],
    };

    private readonly IGameData _game = game ?? throw new ArgumentNullException(nameof(game));
    private readonly ILogger<OverlayExporter> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

    public static IReadOnlyDictionary<string, IReadOnlyList<string>> ParseLists(string xml)
    {
        ArgumentNullException.ThrowIfNull(xml);
        return Lists.ToDictionary(
            l => l.Tag,
            l => (IReadOnlyList<string>)ItemPattern()
                .Matches(Regex.Match(xml, $"<{l.Tag}>(.*?)</{l.Tag}>", RegexOptions.Singleline).Groups[1].Value)
                .Select(m => m.Groups[1].Value.Trim().ToLowerInvariant())
                .ToList());
    }

    public static IReadOnlyDictionary<string, IReadOnlyList<string>> WithDlcAdditions(
        IReadOnlyDictionary<string, IReadOnlyList<string>> lists, IEnumerable<string> textureNames)
    {
        ArgumentNullException.ThrowIfNull(lists);
        ArgumentNullException.ThrowIfNull(textureNames);
        var names = textureNames.ToList();
        return lists.ToDictionary(
            l => l.Key,
            l => DlcAdditions.TryGetValue(l.Key, out var families)
                ? (IReadOnlyList<string>)l.Value.Concat(families.SelectMany(f => names
                    .Where(n => n.StartsWith(f + "_", StringComparison.Ordinal) && int.TryParse(n[(f.Length + 1)..], out _))
                    .OrderBy(n => int.Parse(n[(f.Length + 1)..])))).ToList()
                : l.Value);
    }

    public async Task ExportAsync(string gender, string outDir, IReadOnlySet<string> slots, CancellationToken cancellationToken)
    {
        GameNames.ModelFor(gender);
        ArgumentException.ThrowIfNullOrWhiteSpace(outDir);
        using var logScope = _logger.BeginScope("{Gender}", gender);

        var meta = MetaPaths.Select(_game.ReadFile).FirstOrDefault(d => d != null)
            ?? throw new FileNotFoundException("facial_overlays.meta not found in the game archives.", MetaPaths[^1]);
        var ytds = _game.Entries
            .OfType<RpfFileEntry>()
            .Where(e => e.NameLower.EndsWith(".ytd", StringComparison.Ordinal) && e.Path.Contains("ped_mp_overlay_txds", StringComparison.OrdinalIgnoreCase))
            .GroupBy(e => e.NameLower[..^4])
            .ToDictionary(g => g.Key, g => g.Last());
        var lists = WithDlcAdditions(ParseLists(Encoding.UTF8.GetString(meta)), ytds.Keys);

        var summary = new Dictionary<string, object>();
        foreach (var (tag, slug, target) in Lists)
        {
            var items = lists[tag];
            summary[slug] = new { target, count = items.Count, sources = items };
            if (slots != null && !slots.Contains(slug)) continue;

            var written = 0;
            for (var i = 0; i < items.Count; i++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var file = Path.Combine(outDir, gender, slug, i.ToString(), "0.png");
                if (File.Exists(file)) continue;
                if (!ytds.TryGetValue(items[i], out var entry))
                {
                    _logger.LogWarning("Overlay {Slug} {Index}: no texture '{Texture}'", slug, i, items[i]);
                    continue;
                }
                var dict = _game.Cache.RpfMan.GetFile<YtdFile>(entry)?.TextureDict;
                var tex = dict?.Lookup(JenkHash.GenHash(items[i]))
                    ?? dict?.Dict?.Values.FirstOrDefault(t => !t.Name.EndsWith("_n", StringComparison.OrdinalIgnoreCase) && !t.Name.EndsWith("_s", StringComparison.OrdinalIgnoreCase))
                    ?? dict?.Dict?.Values.FirstOrDefault();
                if (Gltf.WriteTexture(tex, file)) written++;
            }
            _logger.LogInformation("{Slug}: {Written} new of {Count}", slug, written, items.Count);
        }

        Directory.CreateDirectory(Path.Combine(outDir, gender));
        await File.WriteAllTextAsync(Path.Combine(outDir, gender, "overlays.json"), JsonSerializer.Serialize(summary), cancellationToken)
            .ConfigureAwait(false);
    }

    [GeneratedRegex("<Item>(.*?)</Item>")]
    private static partial Regex ItemPattern();
}
