using System.Security.Cryptography;
using System.Text;

namespace IPT101.Services
{
    public interface IPasswordService
    {
        string HashPassword(string password);
        bool VerifyPassword(string password, string hash);
    }

    public class PasswordService : IPasswordService
    {
        public string HashPassword(string password)
        {
            // Using PBKDF2 for password hashing
            using (var rfc2898 = new Rfc2898DeriveBytes(password, 16, 10000, HashAlgorithmName.SHA256))
            {
                var hash = rfc2898.GetBytes(20);
                var salt = rfc2898.Salt;

                var hashBytes = new byte[36];
                Array.Copy(salt, 0, hashBytes, 0, 16);
                Array.Copy(hash, 0, hashBytes, 16, 20);

                return Convert.ToBase64String(hashBytes);
            }
        }

        public bool VerifyPassword(string password, string hash)
        {
            var hashBytes = Convert.FromBase64String(hash);
            var salt = new byte[16];
            Array.Copy(hashBytes, 0, salt, 0, 16);

            using (var rfc2898 = new Rfc2898DeriveBytes(password, salt, 10000, HashAlgorithmName.SHA256))
            {
                var hash2 = rfc2898.GetBytes(20);

                for (int i = 0; i < 20; i++)
                {
                    if (hashBytes[i + 16] != hash2[i])
                        return false;
                }

                return true;
            }
        }
    }
}
