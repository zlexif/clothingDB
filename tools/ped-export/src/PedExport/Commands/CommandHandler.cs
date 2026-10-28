using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Logging;
using PedExport.Cli;

namespace PedExport.Commands;

public interface ICommandHandler
{
    Task<int> RunAsync(CommandLine commandLine, CancellationToken cancellationToken);
}

public abstract class CommandHandler<TOptions>(ILogger logger) : ICommandHandler
    where TOptions : class
{
    protected ILogger Logger { get; } = logger ?? throw new ArgumentNullException(nameof(logger));

    public async Task<int> RunAsync(CommandLine commandLine, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(commandLine);
        var options = ParseOptions(commandLine) ?? throw new InvalidOperationException($"{GetType().Name} returned no options.");
        Validator.ValidateObject(options, new ValidationContext(options), validateAllProperties: true);
        return await ExecuteAsync(options, cancellationToken).ConfigureAwait(false);
    }

    protected abstract TOptions ParseOptions(CommandLine commandLine);

    protected abstract Task<int> ExecuteAsync(TOptions options, CancellationToken cancellationToken);
}
