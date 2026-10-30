using System.IO.Compression;
using PedExport.Export;

namespace PedExport.Tests;

[TestClass]
public sealed class PngTests
{
    private string _file;

    [TestInitialize]
    public void CreateFile() => _file = Path.Combine(Path.GetTempPath(), $"pedexport-{Guid.NewGuid():N}.png");

    [TestCleanup]
    public void DeleteFile()
    {
        if (File.Exists(_file)) File.Delete(_file);
    }

    [TestMethod]
    public void Write_TwoByOneImage_WritesSignatureSizeAndPixels()
    {
        byte[] pixels = [255, 0, 0, 255, 0, 0, 255, 128];

        Png.Write(_file, 2, 1, pixels);

        var bytes = File.ReadAllBytes(_file);
        bytes.Take(8).Should().Equal(137, 80, 78, 71, 13, 10, 26, 10);
        ReadBigEndian(bytes, 16).Should().Be(2);
        ReadBigEndian(bytes, 20).Should().Be(1);
        Inflate(bytes).Should().Equal([0, .. pixels]);
    }

    [TestMethod]
    public void Write_TooFewPixelBytes_ThrowsArgumentException()
    {
        var act = () => Png.Write(_file, 2, 2, new byte[4]);

        act.Should().Throw<ArgumentException>().WithParameterName("rgba");
    }

    [TestMethod]
    public void Write_ZeroWidth_ThrowsArgumentOutOfRange()
    {
        var act = () => Png.Write(_file, 0, 1, new byte[4]);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [TestMethod]
    public void Write_NullPixels_ThrowsArgumentNull()
    {
        var act = () => Png.Write(_file, 1, 1, null);

        act.Should().Throw<ArgumentNullException>();
    }

    [TestMethod]
    public void Write_BlankPath_ThrowsArgumentException()
    {
        var act = () => Png.Write(" ", 1, 1, new byte[4]);

        act.Should().Throw<ArgumentException>();
    }

    private static int ReadBigEndian(byte[] b, int offset) =>
        (b[offset] << 24) | (b[offset + 1] << 16) | (b[offset + 2] << 8) | b[offset + 3];

    private static byte[] Inflate(byte[] png)
    {
        var at = 8;
        while (at < png.Length)
        {
            var length = ReadBigEndian(png, at);
            var type = System.Text.Encoding.ASCII.GetString(png, at + 4, 4);
            if (type == "IDAT")
            {
                using var z = new ZLibStream(new MemoryStream(png, at + 8, length), CompressionMode.Decompress);
                using var raw = new MemoryStream();
                z.CopyTo(raw);
                return raw.ToArray();
            }
            at += 12 + length;
        }
        return [];
    }
}
