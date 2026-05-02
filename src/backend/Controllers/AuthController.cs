using Microsoft.AspNetCore.Mvc;
using IPT101.Models;
using IPT101.Data;
using IPT101.Services;

namespace IPT101.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IPasswordService _passwordService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(ApplicationDbContext context, IPasswordService passwordService, ILogger<AuthController> logger)
        {
            _context = context;
            _passwordService = passwordService;
            _logger = logger;
        }

        [HttpPost("login")]
        public ActionResult<LoginResponse> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest(new LoginResponse
                    {
                        Success = false,
                        Message = "Username and password are required"
                    });
                }

                var user = _context.Users.FirstOrDefault(u => u.Username == request.Username);

                if (user == null || !_passwordService.VerifyPassword(request.Password, user.PasswordHash))
                {
                    return Unauthorized(new LoginResponse
                    {
                        Success = false,
                        Message = "Invalid username or password"
                    });
                }

                // Check if user is approved
                if (user.Status != UserStatus.Approved)
                {
                    return Unauthorized(new LoginResponse
                    {
                        Success = false,
                        Message = $"Account {user.Status.ToString().ToLower()}. Please wait for admin approval."
                    });
                }

                // Check if user is active
                if (!user.IsActive)
                {
                    return Unauthorized(new LoginResponse
                    {
                        Success = false,
                        Message = "Account is inactive"
                    });
                }

                // Set session
                HttpContext.Session.SetInt32("UserId", user.Id);
                HttpContext.Session.SetString("Username", user.Username);
                HttpContext.Session.SetString("Role", user.Role.ToString());
                
                Console.WriteLine($"[Login] SessionId: {HttpContext.Session.Id}, UserId: {user.Id}, Username: {user.Username}, Role: {user.Role}");

                return Ok(new LoginResponse
                {
                    Success = true,
                    Message = "Login successful",
                    User = new UserDto
                    {
                        Id = user.Id,
                        Username = user.Username,
                        Role = user.Role.ToString(),
                        Status = user.Status.ToString()
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login error");
                return StatusCode(500, new LoginResponse
                {
                    Success = false,
                    Message = "An error occurred during login"
                });
            }
        }

        [HttpPost("register")]
        public ActionResult<RegisterResponse> Register([FromBody] RegisterRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest(new RegisterResponse
                    {
                        Success = false,
                        Message = "Username and password are required"
                    });
                }

                if (request.Password != request.ConfirmPassword)
                {
                    return BadRequest(new RegisterResponse
                    {
                        Success = false,
                        Message = "Passwords do not match"
                    });
                }

                if (request.Password.Length < 6)
                {
                    return BadRequest(new RegisterResponse
                    {
                        Success = false,
                        Message = "Password must be at least 6 characters long"
                    });
                }

                // Check if username already exists
                if (_context.Users.Any(u => u.Username == request.Username))
                {
                    return BadRequest(new RegisterResponse
                    {
                        Success = false,
                        Message = "Username already exists"
                    });
                }

                // Check if this is the first user - if so, make them admin and auto-approve
                bool isFirstUser = !_context.Users.Any();
                var userRole = isFirstUser ? UserRole.Admin : UserRole.User;
                var userStatus = isFirstUser ? UserStatus.Approved : UserStatus.Pending;

                var user = new User
                {
                    Username = request.Username,
                    PasswordHash = _passwordService.HashPassword(request.Password),
                    Role = userRole,
                    Status = userStatus,
                    CreatedAt = DateTime.UtcNow,
                    ApprovedAt = isFirstUser ? DateTime.UtcNow : null,
                    IsActive = true
                };

                _context.Users.Add(user);
                _context.SaveChanges();

                return Ok(new RegisterResponse
                {
                    Success = true,
                    Message = isFirstUser 
                        ? "Admin account created successfully. You can now log in." 
                        : "Registration successful. Please wait for admin approval."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Registration error");
                return StatusCode(500, new RegisterResponse
                {
                    Success = false,
                    Message = "An error occurred during registration"
                });
            }
        }

        [HttpPost("logout")]
        public ActionResult Logout()
        {
            HttpContext.Session.Clear();
            return Ok(new { message = "Logout successful" });
        }

        [HttpPost("temp-admin")]
        public ActionResult<CreateTempAdminResponse> CreateTemporaryAdmin([FromBody] CreateTempAdminRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new CreateTempAdminResponse
                {
                    Success = false,
                    Message = "Username and password are required"
                });
            }

            var username = request.Username.Trim();
            if (_context.Users.Any(u => u.Username == username && u.Role == UserRole.Admin))
            {
                var existingAdmin = _context.Users.First(u => u.Username == username && u.Role == UserRole.Admin);
                existingAdmin.PasswordHash = _passwordService.HashPassword(request.Password);
                existingAdmin.Status = UserStatus.Approved;
                existingAdmin.IsActive = true;
                existingAdmin.ApprovedAt = DateTime.UtcNow;
                _context.SaveChanges();

                return Ok(new CreateTempAdminResponse
                {
                    Success = true,
                    Message = "Temporary admin account updated successfully.",
                    User = new UserDto
                    {
                        Id = existingAdmin.Id,
                        Username = existingAdmin.Username,
                        Role = existingAdmin.Role.ToString(),
                        Status = existingAdmin.Status.ToString()
                    }
                });
            }

            var tempAdmin = new User
            {
                Username = username,
                PasswordHash = _passwordService.HashPassword(request.Password),
                Role = UserRole.Admin,
                Status = UserStatus.Approved,
                CreatedAt = DateTime.UtcNow,
                ApprovedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Users.Add(tempAdmin);
            _context.SaveChanges();

            return Ok(new CreateTempAdminResponse
            {
                Success = true,
                Message = "Temporary admin account created successfully.",
                User = new UserDto
                {
                    Id = tempAdmin.Id,
                    Username = tempAdmin.Username,
                    Role = tempAdmin.Role.ToString(),
                    Status = tempAdmin.Status.ToString()
                }
            });
        }

        [HttpPost("setup-user-as-admin")]
        public ActionResult<CreateTempAdminResponse> SetupUserAsAdmin([FromBody] CreateTempAdminRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new CreateTempAdminResponse
                {
                    Success = false,
                    Message = "Username and password are required"
                });
            }

            var username = request.Username.Trim();
            var existingUser = _context.Users.FirstOrDefault(u => u.Username == username);

            if (existingUser != null)
            {
                // Update existing user to be admin
                existingUser.PasswordHash = _passwordService.HashPassword(request.Password);
                existingUser.Role = UserRole.Admin;
                existingUser.Status = UserStatus.Approved;
                existingUser.IsActive = true;
                existingUser.ApprovedAt = DateTime.UtcNow;
                _context.SaveChanges();

                return Ok(new CreateTempAdminResponse
                {
                    Success = true,
                    Message = $"User '{username}' has been promoted to admin.",
                    User = new UserDto
                    {
                        Id = existingUser.Id,
                        Username = existingUser.Username,
                        Role = existingUser.Role.ToString(),
                        Status = existingUser.Status.ToString()
                    }
                });
            }

            // Create new admin user
            var newAdmin = new User
            {
                Username = username,
                PasswordHash = _passwordService.HashPassword(request.Password),
                Role = UserRole.Admin,
                Status = UserStatus.Approved,
                CreatedAt = DateTime.UtcNow,
                ApprovedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Users.Add(newAdmin);
            _context.SaveChanges();

            return Ok(new CreateTempAdminResponse
            {
                Success = true,
                Message = $"Admin account '{username}' created successfully.",
                User = new UserDto
                {
                    Id = newAdmin.Id,
                    Username = newAdmin.Username,
                    Role = newAdmin.Role.ToString(),
                    Status = newAdmin.Status.ToString()
                }
            });
        }

        [HttpPost("forgot-password")]
        public ActionResult<ForgotPasswordResponse> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Username))
                {
                    return BadRequest(new ForgotPasswordResponse
                    {
                        Success = false,
                        Message = "Username is required"
                    });
                }

                var user = _context.Users.FirstOrDefault(u => u.Username == request.Username);
                if (user == null)
                {
                    return BadRequest(new ForgotPasswordResponse
                    {
                        Success = false,
                        Message = "User not found"
                    });
                }

                // Generate reset token (valid for 24 hours)
                var resetToken = Guid.NewGuid().ToString().Replace("-", "").Substring(0, 32);
                user.ResetToken = resetToken;
                user.ResetTokenExpiry = DateTime.UtcNow.AddHours(24);
                _context.SaveChanges();

                return Ok(new ForgotPasswordResponse
                {
                    Success = true,
                    Message = "Password reset token generated. Use this token to reset your password.",
                    ResetToken = resetToken
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in forgot password");
                return StatusCode(500, new ForgotPasswordResponse
                {
                    Success = false,
                    Message = "An error occurred"
                });
            }
        }

        [HttpPost("reset-password")]
        public ActionResult<ResetPasswordResponse> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.ResetToken) || string.IsNullOrWhiteSpace(request.NewPassword))
                {
                    return BadRequest(new ResetPasswordResponse
                    {
                        Success = false,
                        Message = "All fields are required"
                    });
                }

                if (request.NewPassword.Length < 6)
                {
                    return BadRequest(new ResetPasswordResponse
                    {
                        Success = false,
                        Message = "Password must be at least 6 characters"
                    });
                }

                var user = _context.Users.FirstOrDefault(u => u.Username == request.Username);
                if (user == null)
                {
                    return BadRequest(new ResetPasswordResponse
                    {
                        Success = false,
                        Message = "User not found"
                    });
                }

                if (user.ResetToken != request.ResetToken || user.ResetTokenExpiry == null || user.ResetTokenExpiry < DateTime.UtcNow)
                {
                    return Unauthorized(new ResetPasswordResponse
                    {
                        Success = false,
                        Message = "Invalid or expired reset token"
                    });
                }

                user.PasswordHash = _passwordService.HashPassword(request.NewPassword);
                user.ResetToken = null;
                user.ResetTokenExpiry = null;
                _context.SaveChanges();

                return Ok(new ResetPasswordResponse
                {
                    Success = true,
                    Message = "Password reset successfully. You can now log in with your new password."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in reset password");
                return StatusCode(500, new ResetPasswordResponse
                {
                    Success = false,
                    Message = "An error occurred"
                });
            }
        }

        [HttpPost("admin/promote-user")]
        public ActionResult PromoteUser([FromBody] PromoteUserRequest request)
        {
            try
            {
                var currentUserId = HttpContext.Session.GetInt32("UserId");
                if (currentUserId == null)
                {
                    return Unauthorized(new { success = false, message = "Not logged in" });
                }

                var currentUser = _context.Users.FirstOrDefault(u => u.Id == currentUserId);
                if (currentUser?.Role != UserRole.Admin)
                {
                    return StatusCode(403, new { success = false, message = "Only admins can promote users" });
                }

                var userToPromote = _context.Users.FirstOrDefault(u => u.Id == request.UserId);
                if (userToPromote == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                userToPromote.Role = request.NewRole;
                _context.SaveChanges();

                return Ok(new 
                { 
                    success = true,
                    message = $"User promoted to {request.NewRole}",
                    user = new 
                    {
                        id = userToPromote.Id,
                        username = userToPromote.Username,
                        role = userToPromote.Role.ToString(),
                        status = userToPromote.Status.ToString()
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error promoting user");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPost("admin/change-user-status")]
        public ActionResult ChangeUserStatus([FromBody] ChangeUserStatusRequest request)
        {
            try
            {
                var currentUserId = HttpContext.Session.GetInt32("UserId");
                if (currentUserId == null)
                {
                    return Unauthorized(new { success = false, message = "Not logged in" });
                }

                var currentUser = _context.Users.FirstOrDefault(u => u.Id == currentUserId);
                if (currentUser?.Role != UserRole.Admin)
                {
                    return StatusCode(403, new { success = false, message = "Only admins can change user status" });
                }

                var userToUpdate = _context.Users.FirstOrDefault(u => u.Id == request.UserId);
                if (userToUpdate == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                userToUpdate.Status = request.NewStatus;
                if (request.NewStatus == UserStatus.Approved && userToUpdate.ApprovedAt == null)
                {
                    userToUpdate.ApprovedAt = DateTime.UtcNow;
                }
                _context.SaveChanges();

                return Ok(new 
                { 
                    success = true,
                    message = $"User status changed to {request.NewStatus}",
                    user = new 
                    {
                        id = userToUpdate.Id,
                        username = userToUpdate.Username,
                        role = userToUpdate.Role.ToString(),
                        status = userToUpdate.Status.ToString()
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing user status");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpGet("current-user")]
        public ActionResult<UserDto> GetCurrentUser()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var username = HttpContext.Session.GetString("Username");
            var role = HttpContext.Session.GetString("Role");
            
            Console.WriteLine($"[GetCurrentUser] SessionId: {HttpContext.Session.Id}, UserId: {userId}, Username: {username}, Role: {role}");
            
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = _context.Users.FirstOrDefault(u => u.Id == userId);
            if (user == null)
            {
                return NotFound();
            }

            return Ok(new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Role = user.Role.ToString(),
                Status = user.Status.ToString()
            });
        }

        // Admin endpoints
        [HttpGet("admin/users")]
        public ActionResult<List<UserDto>> GetAllUsers()
        {
            var currentUserId = HttpContext.Session.GetInt32("UserId");
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            var currentUser = _context.Users.FirstOrDefault(u => u.Id == currentUserId);
            if (currentUser?.Role != UserRole.Admin)
            {
                return Forbid();
            }

            var users = _context.Users.Select(u => new UserDto
            {
                Id = u.Id,
                Username = u.Username,
                Role = u.Role.ToString(),
                Status = u.Status.ToString()
            }).ToList();

            return Ok(users);
        }

        [HttpGet("admin/pending-users")]
        public ActionResult<List<UserDto>> GetPendingUsers()
        {
            var currentUserId = HttpContext.Session.GetInt32("UserId");
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            var currentUser = _context.Users.FirstOrDefault(u => u.Id == currentUserId);
            if (currentUser?.Role != UserRole.Admin)
            {
                return Forbid();
            }

            var users = _context.Users
                .Where(u => u.Status == UserStatus.Pending)
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    Role = u.Role.ToString(),
                    Status = u.Status.ToString()
                })
                .ToList();

            return Ok(users);
        }

        [HttpPost("admin/approve-user")]
        public ActionResult ApproveUser([FromBody] ApproveUserRequest request)
        {
            try
            {
                var currentUserId = HttpContext.Session.GetInt32("UserId");
                if (currentUserId == null)
                {
                    return Unauthorized();
                }

                var currentUser = _context.Users.FirstOrDefault(u => u.Id == currentUserId);
                if (currentUser?.Role != UserRole.Admin)
                {
                    return Forbid();
                }

                var userToApprove = _context.Users.FirstOrDefault(u => u.Id == request.UserId);
                if (userToApprove == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                if (request.Approve)
                {
                    userToApprove.Status = UserStatus.Approved;
                    userToApprove.ApprovedAt = DateTime.UtcNow;
                    userToApprove.ApprovalNotes = request.Notes;
                    // Set role to Employee for approved users (not Admin)
                    if (userToApprove.Role == UserRole.User)
                    {
                        userToApprove.Role = UserRole.Employee;
                    }
                }
                else
                {
                    userToApprove.Status = UserStatus.Rejected;
                    userToApprove.ApprovalNotes = request.Notes;
                }

                _context.SaveChanges();

                return Ok(new { message = request.Approve ? "User approved successfully" : "User rejected successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving user");
                return StatusCode(500, new { message = "An error occurred" });
            }
        }

        // Validate admin credentials without creating a session (for override flows)
        [HttpPost("admin/validate")]
        public ActionResult ValidateAdmin([FromBody] LoginRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                    return BadRequest(new { message = "Username and password are required" });

                var user = _context.Users.FirstOrDefault(u => u.Username == request.Username);
                if (user == null || !_passwordService.VerifyPassword(request.Password, user.PasswordHash))
                    return Unauthorized(new { message = "Invalid credentials" });

                if (user.Role != UserRole.Admin)
                    return Forbid();

                if (user.Status != UserStatus.Approved || !user.IsActive)
                    return Unauthorized(new { message = "Admin account not active or approved" });

                return Ok(new { message = "Valid admin credentials" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating admin");
                return StatusCode(500, new { message = "An error occurred" });
            }
        }

        [HttpPut("admin/users/{id}")]
        public ActionResult UpdateUser(int id, [FromBody] UpdateUserRequest request)
        {
            var currentUserId = HttpContext.Session.GetInt32("UserId");
            if (currentUserId == null)
                return Unauthorized();

            var currentUser = _context.Users.FirstOrDefault(u => u.Id == currentUserId);
            if (currentUser?.Role != UserRole.Admin)
                return Forbid();

            var user = _context.Users.FirstOrDefault(u => u.Id == id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            if (!string.IsNullOrWhiteSpace(request.Username))
            {
                // Check for username collision
                if (_context.Users.Any(u => u.Username == request.Username && u.Id != id))
                {
                    return BadRequest(new { message = "Username already in use" });
                }
                user.Username = request.Username;
            }

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                user.PasswordHash = _passwordService.HashPassword(request.Password);
            }

            if (request.IsActive.HasValue)
            {
                user.IsActive = request.IsActive.Value;
            }

            if (request.Role.HasValue)
            {
                user.Role = request.Role.Value;
            }

            _context.SaveChanges();

            return Ok(new { message = "User updated successfully" });
        }

        [HttpDelete("admin/users/{id}")]
        public ActionResult DeleteUser(int id)
        {
            var currentUserId = HttpContext.Session.GetInt32("UserId");
            if (currentUserId == null)
                return Unauthorized();

            var currentUser = _context.Users.FirstOrDefault(u => u.Id == currentUserId);
            if (currentUser?.Role != UserRole.Admin)
                return Forbid();

            var user = _context.Users.FirstOrDefault(u => u.Id == id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            _context.Users.Remove(user);
            _context.SaveChanges();

            return Ok(new { message = "User deleted successfully" });
        }
    }
}
