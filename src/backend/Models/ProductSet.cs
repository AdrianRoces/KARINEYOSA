using System.ComponentModel.DataAnnotations;

namespace IPT101.Models
{
    public class ProductSet
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public required string Name { get; set; }
        
        [Required]
        public required string Category { get; set; }
        
        public string? Description { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public virtual ICollection<Product> Products { get; set; } = new List<Product>();
    }
}
