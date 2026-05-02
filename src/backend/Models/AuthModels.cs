namespace IPT101.Models
{
    public class LoginRequest
    {
        public required string Username { get; set; }
        public required string Password { get; set; }
    }

    public class LoginResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public UserDto? User { get; set; }
    }

    public class RegisterRequest
    {
        public required string Username { get; set; }
        public required string Password { get; set; }
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public class RegisterResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class UserDto
    {
        public int Id { get; set; }
        public required string Username { get; set; }
        public required string Role { get; set; }
        public required string Status { get; set; }
    }

    public class CreateTempAdminRequest
    {
        public required string Username { get; set; }
        public required string Password { get; set; }
    }

    public class CreateTempAdminResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public UserDto? User { get; set; }
    }

    public class ApproveUserRequest
    {
        public int UserId { get; set; }
        public bool Approve { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateUserRequest
    {
        public string? Username { get; set; }
        public string? Password { get; set; }
        public bool? IsActive { get; set; }
        public UserRole? Role { get; set; }
    }

    public class ForgotPasswordRequest
    {
        public required string Username { get; set; }
    }

    public class ForgotPasswordResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? ResetToken { get; set; }
    }

    public class ResetPasswordRequest
    {
        public required string Username { get; set; }
        public required string ResetToken { get; set; }
        public required string NewPassword { get; set; }
    }

    public class ResetPasswordResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class PromoteUserRequest
    {
        public int UserId { get; set; }
        public UserRole NewRole { get; set; }
    }

    public class PromoteUserResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public UserDto? User { get; set; }
    }

    public class ChangeUserStatusRequest
    {
        public int UserId { get; set; }
        public UserStatus NewStatus { get; set; }
    }

    public class ChangeUserStatusResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public UserDto? User { get; set; }
    }
}
