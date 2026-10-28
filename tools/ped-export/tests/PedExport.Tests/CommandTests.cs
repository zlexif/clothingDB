using System.ComponentModel.DataAnnotations;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using PedExport.Cli;
using PedExport.Commands;
using PedExport.Export;
using PedExport.Game;

namespace PedExport.Tests;

[TestClass]
public sealed class CommandTests
{
    private string _file;

    [TestInitialize]
    public void CreateFile() => _file = Path.Combine(Path.GetTempPath(), $"pedexport-{Guid.NewGuid():N}.bin");

    [TestCleanup]
    public void DeleteFile()
    {
        if (File.Exists(_file)) File.Delete(_file);
    }

    [TestMethod]
    public void CommandHandler_NullLogger_Throws()
    {
        var act = () => new ProbeCommand(null);

        act.Should().Throw<ArgumentNullException>().WithParameterName("logger");
    }

    [TestMethod]
    public async Task CommandHandler_InvalidOptions_ThrowsValidationAndDoesNotRun()
    {
        var game = new Mock<IGameData>(MockBehavior.Strict);
        var command = new ExtractCommand(game.Object, NullLogger<ExtractCommand>.Instance);
        var cli = new CommandLine(["--extract", @"common.rpf\data\x.meta"]);

        var act = () => command.RunAsync(cli, CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
        game.VerifyNoOtherCalls();
    }

    [TestMethod]
    public async Task ExtractCommand_FileInArchives_WritesItAndLogs()
    {
        var bytes = Encoding.UTF8.GetBytes("<CPedFacialOverlays />");
        var game = new Mock<IGameData>();
        game.Setup(g => g.ReadFile(@"common.rpf\data\x.meta")).Returns(bytes);
        var logger = new Mock<ILogger<ExtractCommand>>();
        var command = new ExtractCommand(game.Object, logger.Object);
        var cli = new CommandLine(["--extract", @"common.rpf\data\x.meta", "--to", _file]);

        var exitCode = await command.RunAsync(cli, CancellationToken.None);

        exitCode.Should().Be(0);
        (await File.ReadAllBytesAsync(_file)).Should().Equal(bytes);
        logger.Verify(l => l.Log(LogLevel.Information, It.IsAny<EventId>(), It.IsAny<It.IsAnyType>(), null, It.IsAny<Func<It.IsAnyType, Exception, string>>()), Times.Once);
    }

    [TestMethod]
    public async Task ExtractCommand_FileMissing_ThrowsFileNotFound()
    {
        var game = new Mock<IGameData>();
        game.Setup(g => g.ReadFile(It.IsAny<string>())).Returns((byte[])null);
        var command = new ExtractCommand(game.Object, NullLogger<ExtractCommand>.Instance);
        var cli = new CommandLine(["--extract", @"common.rpf\missing.meta", "--to", _file]);

        var act = () => command.RunAsync(cli, CancellationToken.None);

        await act.Should().ThrowAsync<FileNotFoundException>().WithMessage("*missing.meta*");
        File.Exists(_file).Should().BeFalse();
    }

    [TestMethod]
    public async Task OverlayExporter_NoMetaInArchives_ThrowsFileNotFound()
    {
        var game = new Mock<IGameData>();
        game.Setup(g => g.ReadFile(It.IsAny<string>())).Returns((byte[])null);
        var exporter = new OverlayExporter(game.Object, NullLogger<OverlayExporter>.Instance);

        var act = () => exporter.ExportAsync("male", Path.GetTempPath(), null, CancellationToken.None);

        await act.Should().ThrowAsync<FileNotFoundException>();
    }

    [TestMethod]
    public void OverlayExporter_ParseLists_ReadsItemsInGameOrder()
    {
        const string xml = "<CPedFacialOverlays><facialHair><Item>mp_fm_faov_beard_000</Item>\n<Item>MP_Hip_faov_beard_001</Item></facialHair></CPedFacialOverlays>";

        var lists = OverlayExporter.ParseLists(xml);

        lists["facialHair"].Should().Equal("mp_fm_faov_beard_000", "mp_hip_faov_beard_001");
        lists["makeup"].Should().BeEmpty();
    }

    [TestMethod]
    public void OverlayExporter_WithDlcAdditions_AppendsFacePaintsInMountAndNumberOrder()
    {
        var lists = OverlayExporter.ParseLists("<makeup><Item>mp_fm_faov_makeup_000</Item></makeup><blusher><Item>mp_fm_faov_blusher_000</Item></blusher>");
        string[] textures = ["mp_security_facepaint_001", "mp_heist4_facepaint_010", "mp_heist4_facepaint_002", "mp_security_facepaint_000", "mp_christmas2017_facepaint_000", "mp_heist4_facepaint_x"];

        var result = OverlayExporter.WithDlcAdditions(lists, textures);

        result["makeup"].Should().Equal("mp_fm_faov_makeup_000", "mp_heist4_facepaint_002", "mp_heist4_facepaint_010", "mp_security_facepaint_000", "mp_security_facepaint_001");
        result["blusher"].Should().Equal("mp_fm_faov_blusher_000", "mp_christmas2017_facepaint_000");
        result["eyebrow"].Should().BeEmpty();
    }

    [TestMethod]
    public void Exporters_NullGame_Throw()
    {
        var ped = () => new PedExporter(null, NullLogger<PedExporter>.Instance);
        var overlays = () => new OverlayExporter(null, NullLogger<OverlayExporter>.Instance);

        ped.Should().Throw<ArgumentNullException>().WithParameterName("game");
        overlays.Should().Throw<ArgumentNullException>().WithParameterName("game");
    }
}
