using CodeWalker.GameFiles;
using CodeWalker.World;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PedExport.Configuration;

namespace PedExport.Game;

public sealed class GameLoader : IGameData
{
    private readonly ILogger<GameLoader> _logger;
    private readonly string _gtaPath;
    private readonly int _timeoutMs;
    private readonly Lazy<GameFileCache> _cache;
    private Thread _content;
    private volatile bool _running = true;

    public GameLoader(IOptions<PedExportSettings> settings, ILogger<GameLoader> logger)
    {
        ArgumentNullException.ThrowIfNull(settings);
        ArgumentNullException.ThrowIfNull(logger);
        _logger = logger;
        _gtaPath = settings.Value.GtaPath;
        _timeoutMs = settings.Value.ContentTimeoutMs;
        _cache = new Lazy<GameFileCache>(Load, LazyThreadSafetyMode.ExecutionAndPublication);
    }

    public GameFileCache Cache => _cache.Value;

    private GameFileCache Load()
    {
        var gta = _gtaPath;
        if (!Directory.Exists(gta))
            throw new DirectoryNotFoundException($"GTA V folder not found: '{gta}'. Set PedExport:GtaPath or pass --gta.");

        _logger.LogInformation("Reading keys from {GtaPath}", gta);
        GTA5Keys.LoadFromPath(gta, false, null);

        var cache = new GameFileCache(2L * 1024 * 1024 * 1024, 3600, gta, false, "", false, "")
        {
            LoadArchetypes = false,
            LoadVehicles = false,
            LoadAudio = false,
            LoadPeds = true,
        };
        _logger.LogInformation("Indexing archives");
        cache.Init(
            s => { if (!string.IsNullOrEmpty(s)) _logger.LogDebug("{Progress}", s); },
            e => _logger.LogWarning("{Error}", e));

        if (cache.DlcNameList.Count > 0)
        {
            _logger.LogInformation("Mounting DLC up to {Dlc} ({Count} packs)", cache.DlcNameList[^1], cache.DlcNameList.Count);
            cache.SetDlcLevel(cache.DlcNameList[^1], true);
            cache.InitPeds();
        }

        _content = new Thread(() =>
        {
            while (_running)
            {
                if (!cache.ContentThreadProc()) Thread.Sleep(5);
            }
        }) { IsBackground = true, Name = "cw-content" };
        _content.Start();
        return cache;
    }

    public IEnumerable<RpfEntry> Entries => Cache.RpfMan.AllRpfs.SelectMany(r => r.AllEntries ?? []);

    public Ped LoadPed(string model)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(model);
        var ped = new Ped();
        ped.Init(model, Cache);
        WaitFor(() => ped.Yft?.Loaded == true && ped.Ydd?.Loaded != false, $"{model} model files", _timeoutMs);
        ped.LoadDefaultComponents(Cache);
        return ped;
    }

    public byte[] ReadFile(string archivePath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(archivePath);
        var data = Cache.RpfMan.GetFileData(archivePath);
        return data is { Length: > 0 } ? data : null;
    }

    public static void WaitFor(Func<bool> ready, string what, int timeoutMs)
    {
        ArgumentNullException.ThrowIfNull(ready);
        var start = Environment.TickCount64;
        while (!ready())
        {
            if (Environment.TickCount64 - start > timeoutMs)
                throw new TimeoutException($"Timed out after {timeoutMs} ms loading {what}.");
            Thread.Sleep(20);
        }
    }

    public void Dispose()
    {
        _running = false;
        _content?.Join(1000);
    }
}
