using CodeWalker.GameFiles;
using CodeWalker.World;

namespace PedExport.Game;

public interface IGameData : IDisposable
{
    GameFileCache Cache { get; }

    IEnumerable<RpfEntry> Entries { get; }

    Ped LoadPed(string model);

    byte[] ReadFile(string archivePath);
}
