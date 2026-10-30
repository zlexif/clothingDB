using System.IO.Compression;

namespace PedExport.Export;

public static class Png
{
    private static readonly byte[] Signature = [137, 80, 78, 71, 13, 10, 26, 10];

    private static readonly uint[] CrcTable = Enumerable.Range(0, 256).Select(n =>
    {
        var c = (uint)n;
        for (var k = 0; k < 8; k++) c = (c & 1) != 0 ? 0xEDB88320 ^ (c >> 1) : c >> 1;
        return c;
    }).ToArray();

    public static void Write(string path, int width, int height, byte[] rgba)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        ArgumentNullException.ThrowIfNull(rgba);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(width);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(height);
        if (rgba.Length < (long)width * height * 4)
            throw new ArgumentException($"Expected {width * height * 4} RGBA bytes for {width}x{height}, got {rgba.Length}.", nameof(rgba));

        using var fs = File.Create(path);
        fs.Write(Signature);

        var ihdr = new byte[13];
        WriteBigEndian(ihdr, 0, (uint)width);
        WriteBigEndian(ihdr, 4, (uint)height);
        ihdr[8] = 8;
        ihdr[9] = 6;
        WriteChunk(fs, "IHDR", ihdr);

        using var raw = new MemoryStream();
        using (var z = new ZLibStream(raw, CompressionLevel.Optimal, leaveOpen: true))
        {
            var stride = width * 4;
            for (var y = 0; y < height; y++)
            {
                z.WriteByte(0);
                z.Write(rgba, y * stride, stride);
            }
        }
        WriteChunk(fs, "IDAT", raw.ToArray());
        WriteChunk(fs, "IEND", []);
    }

    private static void WriteChunk(Stream s, string type, byte[] data)
    {
        var len = new byte[4];
        WriteBigEndian(len, 0, (uint)data.Length);
        s.Write(len);
        var typed = new byte[4 + data.Length];
        for (var i = 0; i < 4; i++) typed[i] = (byte)type[i];
        Buffer.BlockCopy(data, 0, typed, 4, data.Length);
        s.Write(typed);
        var crc = new byte[4];
        WriteBigEndian(crc, 0, Crc(typed));
        s.Write(crc);
    }

    private static void WriteBigEndian(byte[] b, int offset, uint v)
    {
        b[offset] = (byte)(v >> 24);
        b[offset + 1] = (byte)(v >> 16);
        b[offset + 2] = (byte)(v >> 8);
        b[offset + 3] = (byte)v;
    }

    private static uint Crc(byte[] data)
    {
        var c = 0xFFFFFFFF;
        foreach (var b in data) c = CrcTable[(c ^ b) & 0xFF] ^ (c >> 8);
        return c ^ 0xFFFFFFFF;
    }
}
