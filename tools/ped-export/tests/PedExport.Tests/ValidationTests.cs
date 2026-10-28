using System.ComponentModel.DataAnnotations;
using PedExport.Commands;
using PedExport.Configuration;
using PedExport.Export;

namespace PedExport.Tests;

[TestClass]
public sealed class ValidationTests
{
    private static bool IsValid(object instance) =>
        Validator.TryValidateObject(instance, new ValidationContext(instance), [], validateAllProperties: true);

    [TestMethod]
    public void Settings_WithGtaPath_AreValid()
    {
        var settings = new PedExportSettings { GtaPath = @"C:\Games\GTAV" };

        IsValid(settings).Should().BeTrue();
    }

    [DataTestMethod]
    [DataRow(null)]
    [DataRow("")]
    [DataRow("   ")]
    public void Settings_WithoutGtaPath_AreInvalid(string gtaPath)
    {
        var settings = new PedExportSettings { GtaPath = gtaPath };

        IsValid(settings).Should().BeFalse();
    }

    [TestMethod]
    public void Settings_ShortTimeout_AreInvalid()
    {
        var settings = new PedExportSettings { GtaPath = @"C:\Games\GTAV", ContentTimeoutMs = 10 };

        IsValid(settings).Should().BeFalse();
    }

    [TestMethod]
    public void Settings_EmptyOutputDir_ResolvesToUserProfileFolder()
    {
        var settings = new PedExportSettings { GtaPath = @"C:\Games\GTAV", OutputDir = "" };

        var dir = settings.ResolveOutputDir();

        dir.Should().EndWith("clothingdb-peds").And.StartWith(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile));
    }

    [TestMethod]
    public void ExportOptions_NegativeFrom_AreInvalid()
    {
        var options = new ExportOptions { From = -1 };

        IsValid(options).Should().BeFalse();
    }

    [TestMethod]
    public void ExportOptions_ZeroLimit_AreInvalid()
    {
        var options = new ExportOptions { Limit = 0 };

        IsValid(options).Should().BeFalse();
    }

    [TestMethod]
    public void FindOptions_OnlyBlankTerms_AreInvalid()
    {
        var options = new FindOptions { Terms = ["  "] };

        IsValid(options).Should().BeFalse();
    }

    [TestMethod]
    public void ExtractOptions_WithoutTarget_AreInvalid()
    {
        var options = new ExtractOptions { ArchivePath = @"common.rpf\data\x.meta" };

        IsValid(options).Should().BeFalse();
    }

    [DataTestMethod]
    [DataRow("tops", 5, true)]
    [DataRow("tops", 2, false)]
    [DataRow("tops", 12, false)]
    [DataRow("legs", 5, false)]
    public void ExportScope_Includes_RespectsSlotsAndRange(string slug, int number, bool included)
    {
        var scope = new ExportScope(new HashSet<string> { "tops" }, From: 3, Limit: 9);

        scope.Includes(slug, number).Should().Be(included);
    }
}
