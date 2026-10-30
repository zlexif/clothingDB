using System.Text.Json;
using CodeWalker.GameFiles;
using Microsoft.Extensions.Logging;
using PedExport.Game;

namespace PedExport.Export;

public sealed class PedExporter(IGameData game, ILogger<PedExporter> logger)
{
    private readonly IGameData _game = game ?? throw new ArgumentNullException(nameof(game));
    private readonly ILogger<PedExporter> _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    private Dictionary<string, List<RpfDirectoryEntry>> _dirs;

    private sealed record Collection(
        string Name, int Order, PedFile File,
        Dictionary<uint, RpfFileEntry> Drawables, Dictionary<uint, RpfFileEntry> Textures,
        Dictionary<uint, List<RpfFileEntry>> PropDrawables, Dictionary<uint, RpfFileEntry> PropTextures);

    public async Task ExportAsync(string gender, string outDir, ExportScope scope, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(outDir);
        ArgumentNullException.ThrowIfNull(scope);
        var model = GameNames.ModelFor(gender);
        using var logScope = _logger.BeginScope("{Gender}", gender);

        var cache = _game.Cache;
        var ped = _game.LoadPed(model);
        var skeleton = ped.Skeleton;
        Gltf.WriteSkeleton(skeleton, Path.Combine(outDir, gender, "skeleton.glb"));
        _logger.LogInformation("Skeleton written, {Bones} bones", skeleton.Bones.Items.Length);

        var slugs = GameNames.ComponentSlugs;
        var counters = new int[slugs.Count];
        var propCounters = new int[GameNames.AnchorNames.Count];
        var propTextures = GameNames.PropSlugs.Values.ToDictionary(s => s, _ => new List<int>());
        var textures = slugs.Select(_ => new List<int>()).ToArray();
        var sources = slugs.Select(_ => new List<string>()).ToArray();
        var written = 0;

        foreach (var col in Collections(model))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var vi = col.File.VariationInfo;
            if (vi == null) continue;
            var added = new int[slugs.Count];

            for (var comp = 0; comp < slugs.Count; comp++)
            {
                var cd = vi.GetComponentData(comp);
                if (cd?.DrawblData3 == null) continue;
                foreach (var d in cd.DrawblData3)
                {
                    var number = counters[comp]++;
                    added[comp]++;
                    var texCount = d.TexData?.Length ?? 0;
                    textures[comp].Add(texCount);
                    sources[comp].Add($"{col.Name}:{d.DrawableIndex}");

                    if (!scope.Includes(slugs[comp], number)) continue;
                    var dir = Path.Combine(outDir, gender, slugs[comp], number.ToString());
                    if (File.Exists(Path.Combine(dir, "mesh.glb"))) continue;
                    cancellationToken.ThrowIfCancellationRequested();

                    if (ExportComponent(col, d, comp, number, texCount, skeleton, dir) && ++written % 50 == 0)
                        _logger.LogInformation("{Written} items written", written);
                }
            }

            foreach (var pm in vi.PropInfo?.PropMetaData ?? [])
            {
                int anchor = pm.Data.anchorId;
                if (!GameNames.PropSlugs.TryGetValue(anchor, out var slug)) continue;
                var number = propCounters[anchor]++;
                var texCount = pm.TexData?.Length ?? 0;
                propTextures[slug].Add(texCount);

                if (!scope.Includes(slug, number)) continue;
                var dir = Path.Combine(outDir, gender, slug, number.ToString());
                if (File.Exists(Path.Combine(dir, "mesh.glb"))) continue;
                cancellationToken.ThrowIfCancellationRequested();

                if (ExportProp(col, pm, anchor, slug, number, texCount, skeleton, dir) && ++written % 50 == 0)
                    _logger.LogInformation("{Written} items written", written);
            }

            _logger.LogInformation("Collection {Collection}: {Added}", col.Name,
                string.Join(" ", added.Select((n, i) => n > 0 ? $"{slugs[i]} {n}" : null).Where(x => x != null)));
        }

        var manifest = new
        {
            model,
            bones = skeleton.Bones.Items.Select(b => b.Name).ToArray(),
            slots = slugs.Select((slug, i) => new { slug, component = i, drawables = textures[i], sources = sources[i] })
                .Concat(GameNames.PropSlugs.Select(p => new { slug = p.Value, component = -1 - p.Key, drawables = propTextures[p.Value], sources = new List<string>() }))
                .ToDictionary(s => s.slug),
        };
        await File.WriteAllTextAsync(Path.Combine(outDir, gender, "manifest.json"), JsonSerializer.Serialize(manifest), cancellationToken)
            .ConfigureAwait(false);
        _logger.LogInformation("Totals: {Totals}", string.Join(", ", slugs.Select((s, i) => $"{s} {counters[i]}")));
    }

    private bool ExportComponent(Collection col, MCPVDrawblData d, int comp, int number, int texCount, Skeleton skeleton, string dir)
    {
        var slug = GameNames.ComponentSlugs[comp];
        var cache = _game.Cache;
        var name = d.GetDrawableName(0)?.ToLowerInvariant();
        if (!Find(col.Drawables, name, comp, out var entry, out name))
        {
            _logger.LogDebug("Skip {Slug} {Number}: no file for '{Name}' in {Collection}", slug, number, name, col.Name);
            return false;
        }
        var ydd = cache.RpfMan.GetFile<YddFile>(entry);
        var drawable = ydd?.Drawables?.FirstOrDefault(x => x.Name?.ToLowerInvariant() == name) ?? ydd?.Drawables?.FirstOrDefault();
        if (drawable == null || !Gltf.WriteDrawable(drawable, skeleton, name, Path.Combine(dir, "mesh.glb")))
        {
            _logger.LogDebug("Skip {Slug} {Number}: {Reason} ({Path})", slug, number,
                drawable == null ? "file did not load" : "no geometry in any LOD", entry.Path);
            return false;
        }

        for (var t = 0; t < texCount; t++)
        {
            var tname = d.GetTextureName(t)?.ToLowerInvariant();
            if (!Find(col.Textures, tname, comp, out var tentry, out tname)) continue;
            WriteTextureFrom(tentry, tname, Path.Combine(dir, $"{t}.png"));
        }
        return true;
    }

    private bool ExportProp(Collection col, MCPedPropMetaData pm, int anchor, string slug, int number, int texCount, Skeleton skeleton, string dir)
    {
        var cache = _game.Cache;
        var name = GameNames.PropModel(anchor, pm.Data.propId);
        if (!col.PropDrawables.TryGetValue(JenkHash.GenHash(name), out var copies))
        {
            _logger.LogDebug("Skip {Slug} {Number}: no file for '{Name}' in {Collection}", slug, number, name, col.Name);
            return false;
        }
        var bone = BoneIndex(skeleton, GameNames.AnchorBone(anchor));
        var written = copies.Any(entry =>
        {
            var ydd = cache.RpfMan.GetFile<YddFile>(entry);
            var drawable = ydd?.Drawables?.FirstOrDefault(x => x.Name?.ToLowerInvariant() == name) ?? ydd?.Drawables?.FirstOrDefault();
            return drawable != null && Gltf.WriteDrawable(drawable, skeleton, name, Path.Combine(dir, "mesh.glb"), bone);
        });
        if (!written)
        {
            _logger.LogDebug("Skip {Slug} {Number}: no geometry in {Copies} copies ({Path})", slug, number, copies.Count, copies[0].Path);
            return false;
        }

        for (var t = 0; t < texCount; t++)
        {
            var tname = GameNames.PropTexture(anchor, pm.Data.propId, pm.TexData[t].texId);
            if (col.PropTextures.TryGetValue(JenkHash.GenHash(tname), out var tentry))
                WriteTextureFrom(tentry, tname, Path.Combine(dir, $"{t}.png"));
        }
        return true;
    }

    private void WriteTextureFrom(RpfFileEntry entry, string name, string path)
    {
        var ytd = _game.Cache.RpfMan.GetFile<YtdFile>(entry);
        var tex = ytd?.TextureDict?.Lookup(JenkHash.GenHash(name)) ?? ytd?.TextureDict?.Dict?.Values.FirstOrDefault();
        Gltf.WriteTexture(tex, path);
    }

    private static bool Find(Dictionary<uint, RpfFileEntry> files, string name, int comp, out RpfFileEntry entry, out string used)
    {
        used = name;
        entry = null;
        if (name == null) return false;
        if (files.TryGetValue(JenkHash.GenHash(name), out entry)) return true;
        used = GameNames.WithComponentPrefix(name, comp);
        return files.TryGetValue(JenkHash.GenHash(used), out entry);
    }

    private List<RpfDirectoryEntry> DirsNamed(string name)
    {
        _dirs ??= _game.Entries
            .OfType<RpfDirectoryEntry>()
            .GroupBy(d => d.NameLower)
            .ToDictionary(g => g.Key, g => g.ToList());
        return _dirs.TryGetValue(name, out var l) ? l : [];
    }

    private static void AddFiles(IEnumerable<RpfFileEntry> files, Dictionary<uint, RpfFileEntry> ydd, Dictionary<uint, RpfFileEntry> ytd)
    {
        foreach (var f in files)
        {
            var stem = JenkHash.GenHash(Path.GetFileNameWithoutExtension(f.NameLower));
            if (f.NameLower.EndsWith(".ydd", StringComparison.Ordinal)) ydd[stem] = f;
            else if (f.NameLower.EndsWith(".ytd", StringComparison.Ordinal)) ytd[stem] = f;
        }
    }

    private List<Collection> Collections(string model)
    {
        var cache = _game.Cache;
        var dlcs = cache.DlcNameList.Select(d => d.ToLowerInvariant()).ToList();
        var ymts = _game.Entries
            .OfType<RpfFileEntry>()
            .Where(e => e.NameLower.EndsWith(".ymt", StringComparison.Ordinal))
            .Where(e =>
            {
                var n = e.NameLower[..^4];
                return n == model || n.StartsWith(model + "_", StringComparison.Ordinal);
            })
            .GroupBy(e => e.NameLower[..^4]);

        var list = new List<Collection>();
        foreach (var group in ymts)
        {
            var copies = group
                .Select(e =>
                {
                    var path = e.Path.ToLowerInvariant();
                    return (entry: e, pack: GameNames.PackOf(path), patch: path.Contains("dlc_patch") || path.StartsWith(@"update\", StringComparison.Ordinal));
                })
                .ToList();
            int Rank(string pack) => pack == null ? -1 : dlcs.IndexOf(pack) is var i && i >= 0 ? i : int.MaxValue / 2;
            var origins = copies.Where(c => c.pack == null || !c.pack.Contains("patch")).ToList();
            if (origins.Count == 0) continue;
            if (origins.All(c => c.pack != null && c.pack.Contains("g9ec"))) continue;
            var order = origins.Min(c => Rank(c.pack));
            var ordered = copies.OrderBy(c => c.patch).ThenBy(c => Rank(c.pack)).ToList();

            var drawables = new Dictionary<uint, RpfFileEntry>();
            var textures = new Dictionary<uint, RpfFileEntry>();
            foreach (var (entry, _, _) in ordered)
            {
                var folder = entry.Parent?.Directories?.FirstOrDefault(d => d.NameLower == group.Key);
                AddFiles(folder?.Files ?? [], drawables, textures);
            }

            var propDrawables = new Dictionary<uint, List<RpfFileEntry>>();
            var propTextures = new Dictionary<uint, RpfFileEntry>();
            foreach (var dir in DirsNamed(model + "_p" + group.Key[model.Length..]))
            {
                var ydds = new Dictionary<uint, RpfFileEntry>();
                AddFiles(dir.Files ?? [], ydds, propTextures);
                foreach (var (k, v) in ydds)
                {
                    if (!propDrawables.TryGetValue(k, out var l)) propDrawables[k] = l = [];
                    l.Insert(0, v);
                }
            }

            _logger.LogTrace("Collection {Collection} order {Order} packs {Packs}", group.Key, order, string.Join(',', copies.Select(c => c.pack ?? "base")));
            var pedFile = cache.RpfMan.GetFile<PedFile>(ordered[^1].entry);
            if (pedFile?.VariationInfo == null) continue;
            list.Add(new Collection(group.Key, order, pedFile, drawables, textures, propDrawables, propTextures));
        }
        return list.OrderBy(c => c.Order).ThenBy(c => c.Name, StringComparer.Ordinal).ToList();
    }

    private static int BoneIndex(Skeleton skeleton, string name)
    {
        var bones = skeleton.Bones.Items;
        for (var i = 0; i < bones.Length; i++)
            if (string.Equals(bones[i].Name, name, StringComparison.OrdinalIgnoreCase)) return i;
        return 0;
    }
}
