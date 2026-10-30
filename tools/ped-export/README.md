# ped-export

Exports the freemode peds (`mp_m_freemode_01`, `mp_f_freemode_01`) from a local GTA V
install for the clothingDB Creator Lab and picture pipeline, using CodeWalker's engine
(`CodeWalker.Core.dll`). Clothing and props become skinned glTF meshes with PNG
textures; head overlays become PNG textures.

## Requirements

- Windows, with a legacy GTA V install (Steam by default).
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0).
- A [CodeWalker](https://github.com/dexyfex/CodeWalker) folder. Default:
  `%USERPROFILE%\OneDrive\Documents\CodeWalker30_dev48\CodeWalker30_dev48`; override with
  `dotnet build -p:CodeWalkerDir=...`.

## Run

From the repository root:

```sh
bun run export-peds        # clothing and props, both peds
bun run export-overlays    # head overlays (beards, makeup…)
bun run test-exporter      # unit tests
```

Or directly:

```sh
dotnet run --project tools/ped-export/src/PedExport -c Release -- --gender male --slots tops --from 240 --limit 20
```

| Option                        | Meaning                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `--gender male\|female\|both` | Which peds (default both)                                  |
| `--slots a,b`                 | Only these slots, by slug                                  |
| `--from N` `--limit N`        | Only item numbers `N` to `N + limit - 1`                   |
| `--gta DIR`                   | GTA V folder (overrides settings)                          |
| `--out DIR`                   | Output folder (overrides settings)                         |
| `--verbose`                   | Debug logging, including why each skipped item was skipped |
| `--overlays`                  | Export head overlays instead of clothing                   |
| `--find a,b [--max N]`        | List archive paths containing every term                   |
| `--extract PATH --to FILE`    | Copy one file out of the archives                          |
| `--collections`, `--inspect`  | Report how the freemode collections are laid out           |
| `--probe TypeA TypeB`         | Print the members of CodeWalker types (no game needed)     |

Press Ctrl+C to stop; items already exported are skipped, so running the same command
again resumes.

## Settings

`src/PedExport/appsettings.json`, overridable with environment variables
(`PedExport__GtaPath`, `PedExport__OutputDir`) and then `--gta` / `--out`:

| Setting            | Default                                                        |
| ------------------ | -------------------------------------------------------------- |
| `GtaPath`          | The Steam install folder                                       |
| `OutputDir`        | `%USERPROFILE%\clothingdb-peds` (outside OneDrive; several GB) |
| `ContentTimeoutMs` | 120000                                                         |

## Output

```
{gender}/skeleton.glb
{gender}/{slug}/{item}/mesh.glb          skinned to the ped skeleton, Y-up
{gender}/{slug}/{item}/{colour}.png      diffuse, top mip
{gender}/manifest.json                   colours per item, per slot (clothing and props)
{gender}/{overlay}/{index}/0.png         head overlay, painted onto the skin by the renderer
{gender}/overlays.json                   overlay slot -> { target, count }, in the game's order
```

Items are numbered the way FiveM numbers them: the base collection first, then every
DLC collection in the game's mount order. Collections that only exist in patch packs,
and GTA V Enhanced-only packs (`*g9ec*`), are skipped because the legacy game never
registers them. Props are placed on their anchor bone (the head, or the wrist roll
bones). Overlays follow `facial_overlays.meta` from `update.rpf`, the list the game uses.

Some items have no model in any LOD; the game ships them as invisible placeholders
(for example "no top"), so a few numbers in each slot have no folder. `--verbose` logs
every skip and its reason.

## Layout

```
ped-export.sln
src/PedExport/
  Program.cs                  entry point: builds services, runs the selected command
  ServiceProviderFactory.cs   configuration, logging and dependency injection
  Cli/                        command-line parsing
  Commands/                   one CommandHandler<TOptions> per command, validated options
  Configuration/              settings and validation attributes
  Game/                       IGameData, the CodeWalker loader, the game's naming rules
  Export/                     ped and overlay exporters, glTF and PNG writers
tests/PedExport.Tests/        MSTest + FluentAssertions + Moq
```
