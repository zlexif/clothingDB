using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PedExport;
using PedExport.Cli;
using PedExport.Commands;

var commandLine = new CommandLine(args);
using var cancel = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    cancel.Cancel();
};

await using var services = ServiceProviderFactory.Create(commandLine);
var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("ped-export");

try
{
    var command = services.GetRequiredKeyedService<ICommandHandler>(commandLine.Command);
    return await command.RunAsync(commandLine, cancel.Token);
}
catch (ValidationException ex)
{
    logger.LogError("Invalid options: {Message}", ex.Message);
    return 1;
}
catch (OptionsValidationException ex)
{
    logger.LogError("Invalid settings: {Message}", ex.Message);
    return 1;
}
catch (CommandLineException ex)
{
    logger.LogError("{Message}", ex.Message);
    return 1;
}
catch (OperationCanceledException)
{
    logger.LogWarning("Stopped. Run the same command again to resume.");
    return 130;
}
catch (Exception ex) when (ex is DirectoryNotFoundException or FileNotFoundException or TimeoutException)
{
    logger.LogError("{Message}", ex.Message);
    return 2;
}
