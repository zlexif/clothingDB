using PedExport.Game;

namespace PedExport.Tests;

[TestClass]
public sealed class GameNamesTests
{
    [TestMethod]
    public void WithComponentPrefix_MaskNamedAsHead_UsesBerdPrefix()
    {
        const string fromCodeWalker = "head_000_u";

        var name = GameNames.WithComponentPrefix(fromCodeWalker, 1);

        name.Should().Be("berd_000_u");
    }

    [TestMethod]
    public void WithComponentPrefix_TextureName_KeepsEverythingAfterThePrefix()
    {
        var name = GameNames.WithComponentPrefix("head_diff_003_b_uni", 11);

        name.Should().Be("jbib_diff_003_b_uni");
    }

    [TestMethod]
    public void WithComponentPrefix_NoUnderscore_ReturnsNameUnchanged()
    {
        var name = GameNames.WithComponentPrefix("berd", 1);

        name.Should().Be("berd");
    }

    [TestMethod]
    public void WithComponentPrefix_Null_ReturnsNull()
    {
        var name = GameNames.WithComponentPrefix(null, 1);

        name.Should().BeNull();
    }

    [TestMethod]
    public void PackOf_DlcPath_ReturnsPackFolder()
    {
        const string path = @"update\x64\dlcpacks\mpbeach\dlc.rpf\x64\models\cdimages\mpbeach_male.rpf\mp_m_freemode_01_male_freemode_beach.ymt";

        var pack = GameNames.PackOf(path);

        pack.Should().Be("mpbeach");
    }

    [TestMethod]
    public void PackOf_BaseGamePath_ReturnsNull()
    {
        var pack = GameNames.PackOf(@"x64v.rpf\models\cdimages\streamedpeds_mp.rpf\mp_m_freemode_01.ymt");

        pack.Should().BeNull();
    }

    [TestMethod]
    public void PackOf_NullPath_Throws()
    {
        var act = () => GameNames.PackOf(null);

        act.Should().Throw<ArgumentNullException>();
    }

    [DataTestMethod]
    [DataRow("male", "mp_m_freemode_01")]
    [DataRow("female", "mp_f_freemode_01")]
    public void ModelFor_KnownGender_ReturnsFreemodeModel(string gender, string model)
    {
        var result = GameNames.ModelFor(gender);

        result.Should().Be(model);
    }

    [TestMethod]
    public void ModelFor_UnknownGender_ThrowsWithTheValue()
    {
        var act = () => GameNames.ModelFor("alien");

        act.Should().Throw<ArgumentOutOfRangeException>().Which.ActualValue.Should().Be("alien");
    }

    [DataTestMethod]
    [DataRow(0, "SKEL_Head")]
    [DataRow(1, "SKEL_Head")]
    [DataRow(6, "RB_L_ForeArmRoll")]
    [DataRow(7, "RB_R_ForeArmRoll")]
    public void AnchorBone_Anchor_ReturnsTheBoneItRidesOn(int anchor, string bone)
    {
        var result = GameNames.AnchorBone(anchor);

        result.Should().Be(bone);
    }

    [TestMethod]
    public void PropNames_HatAndItsSecondTexture_MatchTheArchiveFiles()
    {
        var model = GameNames.PropModel(0, 3);
        var texture = GameNames.PropTexture(0, 3, 1);

        model.Should().Be("p_head_003");
        texture.Should().Be("p_head_diff_003_b");
    }
}
