namespace PedExport.Game;

public static class GameNames
{
    public static readonly IReadOnlyList<string> ComponentSlugs =
    [
        "head", "masks", "hair", "torsos", "legs", "bags", "shoes",
        "accessories", "undershirts", "armor", "decals", "tops",
    ];

    public static readonly IReadOnlyList<string> ComponentPrefixes =
    [
        "head", "berd", "hair", "uppr", "lowr", "hand", "feet",
        "teef", "accs", "task", "decl", "jbib",
    ];

    public static readonly IReadOnlyDictionary<int, string> PropSlugs = new Dictionary<int, string>
    {
        [0] = "hats",
        [1] = "glasses",
        [2] = "ears",
        [6] = "watches",
        [7] = "bracelets",
    };

    public static readonly IReadOnlyList<string> AnchorNames =
    [
        "head", "eyes", "ears", "mouth", "lhand", "rhand", "lwrist", "rwrist", "hip", "lfoot", "rfoot", "ph_lhand", "ph_rhand",
    ];

    public static readonly IReadOnlyList<string> Genders = ["male", "female"];

    public static string ModelFor(string gender) => gender switch
    {
        "male" => "mp_m_freemode_01",
        "female" => "mp_f_freemode_01",
        _ => throw new ArgumentOutOfRangeException(nameof(gender), gender, "Expected 'male' or 'female'."),
    };

    public static string AnchorBone(int anchor) => anchor switch
    {
        6 => "RB_L_ForeArmRoll",
        7 => "RB_R_ForeArmRoll",
        _ => "SKEL_Head",
    };

    public static string WithComponentPrefix(string name, int component)
    {
        var cut = name?.IndexOf('_') ?? -1;
        return cut > 0 ? ComponentPrefixes[component] + name[cut..] : name;
    }

    public static string PackOf(string path)
    {
        ArgumentNullException.ThrowIfNull(path);
        foreach (var marker in new[] { @"dlc_patch\", @"dlcpacks\" })
        {
            var at = path.IndexOf(marker, StringComparison.Ordinal);
            if (at >= 0) return path[(at + marker.Length)..].Split('\\')[0];
        }
        return null;
    }

    public static string PropModel(int anchor, int propId) => $"p_{AnchorNames[anchor]}_{propId:000}";

    public static string PropTexture(int anchor, int propId, int texId) =>
        $"p_{AnchorNames[anchor]}_diff_{propId:000}_{(char)('a' + texId)}";
}
