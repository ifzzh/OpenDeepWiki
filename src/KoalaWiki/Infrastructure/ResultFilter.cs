using Microsoft.AspNetCore.Mvc;

namespace KoalaWiki.Infrastructure;

public class ResultFilter : IEndpointFilter
{
    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var value = next(context);

        if (value is EmptyResult)
        {
            return new ValueTask<object?>(null);
        }

        return new ValueTask<object?>(new
        {
            code = 200,
            data = value,
        });
    }
}