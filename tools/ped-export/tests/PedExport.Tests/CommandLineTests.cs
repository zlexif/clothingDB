using PedExport.Cli;
using PedExport.Commands;

namespace PedExport.Tests;

[TestClass]
public sealed class CommandLineTests
{
    [TestMethod]
    public void Constructor_NullArgs_Throws()
    {
        var act = () => new CommandLine(null);

        act.Should().Throw<ArgumentNullException>();
    }

    [TestMethod]
    public void Command_NoCommandFlag_IsExport()
    {
        var cli = new CommandLine(["--gender", "male"]);

        cli.Command.Should().Be(CommandLine.DefaultCommand);
    }

    [TestMethod]
    public void Command_OverlaysFlag_IsOverlays()
    {
        var cli = new CommandLine(["--overlays", "--gender", "both"]);

        cli.Command.Should().Be("overlays");
    }

    [TestMethod]
    public void Value_FlagFollowedByFlag_ReturnsFallback()
    {
        var cli = new CommandLine(["--to", "--verbose"]);

        cli.Value("--to", "default").Should().Be("default");
    }

    [TestMethod]
    public void Int_NotANumber_ThrowsWithTheFlagInTheMessage()
    {
        var cli = new CommandLine(["--limit", "ten"]);

        var act = () => cli.Int("--limit", 1);

        act.Should().Throw<ArgumentException>().WithMessage("*--limit*ten*");
    }

    [TestMethod]
    public void List_CommaSeparated_TrimsAndDropsEmpties()
    {
        var cli = new CommandLine(["--slots", "tops, legs,,hats"]);

        cli.List("--slots").Should().Equal("tops", "legs", "hats");
    }

    [TestMethod]
    public void WordsAfter_StopsAtTheNextFlag()
    {
        var cli = new CommandLine(["--probe", "TypeA", "TypeB", "--verbose"]);

        cli.WordsAfter("--probe").Should().Equal("TypeA", "TypeB");
    }

    [DataTestMethod]
    [DataRow("both", new[] { "male", "female" })]
    [DataRow("female", new[] { "female" })]
    public void GenderOption_KnownValue_ReturnsGenders(string value, string[] expected)
    {
        var cli = new CommandLine(["--gender", value]);

        GenderOption.Parse(cli).Should().Equal(expected);
    }

    [TestMethod]
    public void GenderOption_UnknownValue_Throws()
    {
        var cli = new CommandLine(["--gender", "alien"]);

        var act = () => GenderOption.Parse(cli);

        act.Should().Throw<ArgumentException>().WithMessage("*alien*");
    }
}
