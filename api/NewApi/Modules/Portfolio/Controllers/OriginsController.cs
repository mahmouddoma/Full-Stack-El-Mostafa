using API.Modules.Portfolio.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Modules.Portfolio.Controllers;

[ApiController]
[Route("api/v1/origins")]
public class OriginsController : ControllerBase
{
    private readonly DataContext _db;

    public OriginsController(DataContext db) => _db = db;

    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<List<OriginDto>>> GetAll(CancellationToken ct)
    {
        var origins = await _db.Origins
            .AsNoTracking()
            .OrderBy(x => x.Country)
            .ToListAsync(ct);

        return Ok(origins.Select(ToDto).ToList());
    }

    [Authorize(Roles = "Admin,Editor")]
    [HttpPost]
    public async Task<ActionResult<OriginDto>> Create([FromBody] OriginCreateDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        if (!PortfolioConstants.IsValidContentStatus(dto.Status))
        {
            return BadRequest(new { message = "Invalid origin status" });
        }

        var id = dto.Id.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { message = "Origin id is required" });
        }

        var exists = await _db.Origins.AnyAsync(x => x.Id == id, ct);
        if (exists)
        {
            return Conflict(new { message = "Origin already exists" });
        }

        var now = DateTimeOffset.UtcNow;
        var origin = new Entities.Origin
        {
            Id = id,
            Flag = dto.Flag.Trim().ToUpperInvariant(),
            Country = dto.Country.Trim(),
            CountryAr = PortfolioJson.TrimToNull(dto.CountryAr),
            Focus = PortfolioJson.TrimToNull(dto.Focus),
            FeaturedItems = Math.Max(0, dto.FeaturedItems),
            Status = PortfolioConstants.NormalizeContentStatus(dto.Status),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Origins.Add(origin);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetAll), ToDto(origin));
    }

    [Authorize(Roles = "Admin,Editor")]
    [HttpPut("{id}")]
    public async Task<ActionResult<OriginDto>> Update(string id, [FromBody] OriginUpdateDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var origin = await _db.Origins.SingleOrDefaultAsync(x => x.Id == id.ToUpper(), ct);
        if (origin is null) return NotFound();

        if (dto.Status is not null)
        {
            if (!PortfolioConstants.IsValidContentStatus(dto.Status))
            {
                return BadRequest(new { message = "Invalid origin status" });
            }

            origin.Status = PortfolioConstants.NormalizeContentStatus(dto.Status);
        }

        if (dto.Flag is not null)
        {
            if (string.IsNullOrWhiteSpace(dto.Flag)) return BadRequest(new { message = "Flag cannot be empty" });
            origin.Flag = dto.Flag.Trim().ToUpperInvariant();
        }

        if (dto.Country is not null)
        {
            if (string.IsNullOrWhiteSpace(dto.Country)) return BadRequest(new { message = "Country cannot be empty" });
            origin.Country = dto.Country.Trim();
        }

        if (dto.CountryAr is not null) origin.CountryAr = PortfolioJson.TrimToNull(dto.CountryAr);
        if (dto.Focus is not null) origin.Focus = PortfolioJson.TrimToNull(dto.Focus);
        if (dto.FeaturedItems is not null) origin.FeaturedItems = Math.Max(0, dto.FeaturedItems.Value);

        origin.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(ToDto(origin));
    }

    [Authorize(Roles = "Admin,Editor")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var origin = await _db.Origins.SingleOrDefaultAsync(x => x.Id == id.ToUpperInvariant(), ct);
        if (origin is null) return NotFound();

        _db.Origins.Remove(origin);
        await _db.SaveChangesAsync(ct);

        return NoContent();
    }

    private static OriginDto ToDto(Entities.Origin origin) => new()
    {
        Id = origin.Id,
        Flag = origin.Flag,
        Country = origin.Country,
        CountryAr = origin.CountryAr,
        Focus = origin.Focus,
        FeaturedItems = origin.FeaturedItems,
        Status = origin.Status
    };
}
