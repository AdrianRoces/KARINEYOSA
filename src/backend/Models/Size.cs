using System.ComponentModel.DataAnnotations;

namespace IPT101.Models
{
    public class Size
    {
        [Key]
        public int Id { get; set; }
        
        public int ProductId { get; set; }
        
        [Required]
        public required string Name { get; set; } // e.g., "Small", "Medium", "Large", "XL", etc.
        
        public int Quantity { get; set; } = 0;
        
        public int TotalQuantity { get; set; } = 0;
        
        public int RemainingQuantity { get; set; } = 0;
        
        // Platform-specific tracking
        public int FacebookQuantity { get; set; } = 0;
        public int InstagramQuantity { get; set; } = 0;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public virtual Product Product { get; set; } = null!;
    }
}
