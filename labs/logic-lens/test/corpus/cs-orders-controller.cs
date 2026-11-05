using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly ShopDb _db;
    private readonly IMemoryCache _cache;
    private readonly IPaymentGateway _payments;

    public OrdersController(ShopDb db, IMemoryCache cache, IPaymentGateway payments)
    {
        _db = db; _cache = cache; _payments = payments;
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        if (_cache.TryGetValue($"order:{id}", out OrderDto cached))
            return Ok(cached);

        var order = await _db.Orders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound();
        if (order.CustomerId != User.GetCustomerId()) return Forbid();

        var dto = OrderDto.From(order);
        _cache.Set($"order:{id}", dto, TimeSpan.FromMinutes(5));
        return Ok(dto);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderRequest req)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var order = Order.Create(User.GetCustomerId(), req.Lines);
            _db.Orders.Add(order);
            await _db.SaveChangesAsync();

            var charge = await _payments.ChargeAsync(req.CardToken, order.Total);
            if (!charge.Succeeded)
            {
                await tx.RollbackAsync();
                return StatusCode(402, new { error = charge.Reason });
            }
            order.MarkPaid(charge.Id);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return CreatedAtAction(nameof(Get), new { id = order.Id }, OrderDto.From(order));
        }
        catch (DbUpdateConcurrencyException)
        {
            await tx.RollbackAsync();
            return Conflict();
        }
    }
}
