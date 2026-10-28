namespace PedExport.Export;

public sealed record ExportScope(IReadOnlySet<string> Slots, int From = 0, int Limit = int.MaxValue)
{
    public bool Includes(string slug, int number) =>
        (Slots == null || Slots.Contains(slug)) && number >= From && number - From < Limit;
}
