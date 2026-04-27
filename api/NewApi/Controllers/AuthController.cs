using System.Security.Cryptography;
using System.Text;
using API.Common.Email;
using API.Data;
using API.DTOs.Auth;
using API.Entities;
using API.Interfaces;
using API.Modules.Portfolio.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(14);
    private static readonly TimeSpan VerificationCodeLifetime = TimeSpan.FromMinutes(10);
    private const int MaxVerificationAttempts = 5;

    private readonly UserManager<AppUser> _userManager;
    private readonly SignInManager<AppUser> _signInManager;
    private readonly ITokenService _tokenService;
    private readonly IEmailSender _emailSender;
    private readonly DataContext _db;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        ITokenService tokenService,
        IEmailSender emailSender,
        DataContext db,
        IWebHostEnvironment environment,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _tokenService = tokenService;
        _emailSender = emailSender;
        _db = db;
        _environment = environment;
        _logger = logger;
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("request-code")]
    public async Task<IActionResult> RequestCode([FromBody] RequestVerificationCodeDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var email = NormalizeEmail(dto.Email);
        var user = await _userManager.FindByEmailAsync(email);
        string? devCode = null;

        if (user is not null && !user.IsDeleted)
        {
            var now = DateTimeOffset.UtcNow;
            var activeCodes = await _db.AuthVerificationCodes
                .Where(x => x.UserId == user.Id && x.UsedAt == null && x.ExpiresAt > now)
                .ToListAsync(ct);

            foreach (var activeCode in activeCodes)
            {
                activeCode.UsedAt = now;
            }

            var code = GenerateVerificationCode();
            if (_emailSender is LoggingEmailSender)
            {
                devCode = code;
            }

            _db.AuthVerificationCodes.Add(new AuthVerificationCode
            {
                UserId = user.Id,
                Email = email,
                CodeHash = HashVerificationCode(email, code),
                ExpiresAt = now.Add(VerificationCodeLifetime),
                CreatedAt = now,
                RequestedIp = HttpContext.Connection.RemoteIpAddress?.ToString()
            });

            await _db.SaveChangesAsync(ct);

            await _emailSender.SendAsync(new EmailMessage(
                email,
                "EL-MOSTAFA admin verification code",
                $"<p>Your EL-MOSTAFA admin verification code is <strong>{code}</strong>.</p><p>This code expires in 10 minutes.</p>"), ct);
        }
        else
        {
            _logger.LogWarning("Passwordless code requested for unknown admin email {Email}", email);

            return Ok(new RequestVerificationCodeResponseDto
            {
                Success = true,
                Message = _environment.IsDevelopment()
                    ? "No admin account exists for this email in the current database."
                    : "If the email is registered, a verification code has been sent.",
                CodeSent = _environment.IsDevelopment() ? false : null
            });
        }

        return Ok(new RequestVerificationCodeResponseDto
        {
            Success = true,
            Message = devCode is null
                ? "Verification code sent successfully"
                : "Development mode: email sending is disabled locally. Use the displayed verification code.",
            DevCode = devCode,
            CodeSent = true
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("verify-code")]
    public async Task<IActionResult> VerifyCode([FromBody] VerifyCodeDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var email = NormalizeEmail(dto.Email);
        var user = await _userManager.FindByEmailAsync(email);
        if (user is null || user.IsDeleted)
        {
            return Unauthorized(new { message = "Invalid or expired verification code" });
        }

        var now = DateTimeOffset.UtcNow;
        var verificationCode = await _db.AuthVerificationCodes
            .Where(x => x.UserId == user.Id && x.Email == email && x.UsedAt == null && x.ExpiresAt > now)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (verificationCode is null || verificationCode.AttemptCount >= MaxVerificationAttempts)
        {
            return Unauthorized(new { message = "Invalid or expired verification code" });
        }

        var requestedHash = HashVerificationCode(email, dto.Code.Trim());
        if (!FixedTimeEquals(requestedHash, verificationCode.CodeHash))
        {
            verificationCode.AttemptCount += 1;
            await _db.SaveChangesAsync(ct);
            return Unauthorized(new { message = "Invalid or expired verification code" });
        }

        verificationCode.UsedAt = now;
        await _db.SaveChangesAsync(ct);

        return Ok(await BuildPasswordlessAuthResponse(user));
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await _userManager.Users.SingleOrDefaultAsync(x => x.Email == email && !x.IsDeleted);
        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        var signInResult = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, false);
        if (!signInResult.Succeeded)
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        return Ok(await BuildAuthResponse(user));
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequestDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var existing = await _db.RefreshTokens
            .Include(x => x.User)
            .SingleOrDefaultAsync(x => x.Token == dto.RefreshToken);

        if (existing is null || !existing.IsActive || existing.User is null || existing.User.IsDeleted)
        {
            return Unauthorized(new { message = "Invalid or expired refresh token" });
        }

        existing.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(await BuildAuthResponse(existing.User));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequestDto dto)
    {
        var existing = await _db.RefreshTokens
            .SingleOrDefaultAsync(x => x.Token == dto.RefreshToken);

        if (existing is not null && existing.RevokedAt is null)
        {
            existing.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("users")]
    public async Task<IActionResult> ListUsers()
    {
        var users = await _userManager.Users
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Email)
            .ToListAsync();

        var result = new List<AdminUserDto>();
        foreach (var u in users)
        {
            result.Add(new AdminUserDto
            {
                Id = u.Id,
                Email = u.Email ?? string.Empty,
                FirstName = u.FirstName ?? string.Empty,
                LastName = u.LastName ?? string.Empty,
                Roles = await _userManager.GetRolesAsync(u),
                RegisterTime = u.RegisterTime
            });
        }

        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateEditorDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var email = dto.Email.Trim().ToLowerInvariant();
        if (await _userManager.Users.AnyAsync(x => x.Email == email))
        {
            return Conflict(new { message = "Email already exists" });
        }

        var user = new AppUser
        {
            UserName = email,
            Email = email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            EmailConfirmed = true,
            RegisterTime = DateTime.UtcNow
        };

        var createResult = await _userManager.CreateAsync(user, dto.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(new { message = string.Join("; ", createResult.Errors.Select(e => e.Description)) });
        }

        await _userManager.AddToRoleAsync(user, dto.Role);

        return CreatedAtAction(nameof(ListUsers), new AdminUserDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FirstName = user.FirstName ?? string.Empty,
            LastName = user.LastName ?? string.Empty,
            Roles = new[] { dto.Role },
            RegisterTime = user.RegisterTime
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var currentUserId = _userManager.GetUserId(User);
        if (currentUserId == id.ToString())
        {
            return BadRequest(new { message = "You cannot delete your own account" });
        }

        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null || user.IsDeleted) return NotFound();

        user.IsDeleted = true;
        await _userManager.UpdateAsync(user);

        var revokeTokens = _db.RefreshTokens.Where(x => x.UserId == id && x.RevokedAt == null);
        await revokeTokens.ForEachAsync(x => x.RevokedAt = DateTime.UtcNow);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private async Task<AuthResponseDto> BuildAuthResponse(AppUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var access = _tokenService.CreateToken(user, roles);
        var refresh = _tokenService.CreateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = refresh,
            ExpiresAt = DateTime.UtcNow.Add(RefreshTokenLifetime)
        });
        await _db.SaveChangesAsync();

        return new AuthResponseDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            Roles = roles,
            Token = access.Value,
            ExpiresAt = access.ExpiresAt,
            RefreshToken = refresh
        };
    }

    private async Task<PasswordlessAuthResponseDto> BuildPasswordlessAuthResponse(AppUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var access = _tokenService.CreateToken(user, roles);
        var refresh = _tokenService.CreateRefreshToken();
        var fullName = $"{user.FirstName} {user.LastName}".Trim();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = refresh,
            ExpiresAt = DateTime.UtcNow.Add(RefreshTokenLifetime)
        });
        await _db.SaveChangesAsync();

        return new PasswordlessAuthResponseDto
        {
            AccessToken = access.Value,
            Token = access.Value,
            RefreshToken = refresh,
            ExpiresAt = access.ExpiresAt,
            User = new PasswordlessUserDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FirstName = user.FirstName ?? string.Empty,
                LastName = user.LastName ?? string.Empty,
                FullName = string.IsNullOrWhiteSpace(fullName) ? user.Email ?? string.Empty : fullName,
                Role = roles.FirstOrDefault() ?? string.Empty,
                Roles = roles
            }
        };
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static string GenerateVerificationCode() =>
        RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

    private static string HashVerificationCode(string email, string code)
    {
        var input = Encoding.UTF8.GetBytes($"{email}:{code}");
        return Convert.ToHexString(SHA256.HashData(input));
    }

    private static bool FixedTimeEquals(string left, string right)
    {
        var leftBytes = Encoding.UTF8.GetBytes(left);
        var rightBytes = Encoding.UTF8.GetBytes(right);
        return leftBytes.Length == rightBytes.Length &&
               CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
    }
}
