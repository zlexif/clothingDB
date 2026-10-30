namespace PedExport.Cli;

public sealed class CommandLineException(string message) : ArgumentException(message);
