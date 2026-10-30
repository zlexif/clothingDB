using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace PedExport.Configuration;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class NotEmptyOrWhitespaceAttribute : ValidationAttribute
{
    public NotEmptyOrWhitespaceAttribute()
        : base("{0} must not be empty or whitespace.")
    {
    }

    public override bool IsValid(object value) => value switch
    {
        null => true,
        string s => !string.IsNullOrWhiteSpace(s),
        IEnumerable items => items.Cast<object>().Any(i => i is string s && !string.IsNullOrWhiteSpace(s)),
        _ => true,
    };
}
