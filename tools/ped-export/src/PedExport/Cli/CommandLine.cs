using System.Globalization;

namespace PedExport.Cli;

public sealed class CommandLine(IReadOnlyList<string> args)
{
    public static readonly IReadOnlyList<string> Commands = ["probe", "extract", "find", "collections", "inspect", "overlays"];

    public const string DefaultCommand = "export";

    private readonly IReadOnlyList<string> _args = args ?? throw new ArgumentNullException(nameof(args));

    public IReadOnlyList<string> Arguments => _args;

    public string Command => Commands.FirstOrDefault(c => Has($"--{c}")) ?? DefaultCommand;

    public bool Has(string flag) => _args.Contains(flag);

    public string Value(string flag, string fallback = null)
    {
        for (var i = 0; i < _args.Count - 1; i++)
            if (_args[i] == flag && !_args[i + 1].StartsWith("--", StringComparison.Ordinal))
                return _args[i + 1];
        return fallback;
    }

    public int Int(string flag, int fallback)
    {
        var raw = Value(flag);
        if (raw == null) return fallback;
        return int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var n)
            ? n
            : throw new CommandLineException($"{flag} expects a whole number, got '{raw}'.");
    }

    public IReadOnlyList<string> List(string flag) =>
        Value(flag)?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public IReadOnlyList<string> WordsAfter(string flag) =>
        _args.SkipWhile(a => a != flag).Skip(1).TakeWhile(a => !a.StartsWith("--", StringComparison.Ordinal)).ToList();
}
