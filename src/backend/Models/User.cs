using System.ComponentModel.DataAnnotations;

namespace IPT101.Models
{
    public enum UserRole
    {
        Admin,
        Employee,
        User
    }

    public enum UserStatus
    {
        Pending,
        Approved,
        Rejected
    }

    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public required string Username { get; set; }

        [Required]
        public required string PasswordHash { get; set; }

        [Required]
        public UserRole Role { get; set; } = UserRole.User;

        [Required]
        public UserStatus Status { get; set; } = UserStatus.Pending;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ApprovedAt { get; set; }

        [StringLength(500)]
        public string? ApprovalNotes { get; set; }

        public bool IsActive { get; set; } = true;

        // Password reset fields
        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpiry { get; set; }
    }
}
