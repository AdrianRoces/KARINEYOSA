using IPT101.Data;
using IPT101.Models;
using IPT101.Services;

namespace IPT101.Utilities
{
    public class DatabaseSeeder
    {
        public static void SeedAdminUser(ApplicationDbContext context, IPasswordService passwordService)
        {
            // Check if admin user already exists
            if (context.Users.Any(u => u.Username == "admin"))
            {
                return;
            }

            var adminUser = new User
            {
                Username = "admin",
                PasswordHash = passwordService.HashPassword("admin123"),
                Role = UserRole.Admin,
                Status = UserStatus.Approved,
                CreatedAt = DateTime.UtcNow,
                ApprovedAt = DateTime.UtcNow,
                IsActive = true
            };

            context.Users.Add(adminUser);
            context.SaveChanges();
        }
    }
}
