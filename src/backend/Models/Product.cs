using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPT101.Models
{
    public class Product
    {
        public int Id { get; set; }
        
        [Required]
        public required string Name { get; set; }
        
        // Variant name format: "(Color) - (Product Name)" e.g., "Red - Dress"
        // Used for grouping related variants together
        public string? VariantName { get; set; }
        
        [Required]
        public required string Category { get; set; }
        
        public string? ImagePath { get; set; }
        
        // Deprecated: TotalStock and RemainingStock are now computed
        // public int TotalStock { get; set; } = 0;
        // public int RemainingStock { get; set; } = 0;

        // Navigation property for stock transactions
        public virtual ICollection<StockTransaction> StockTransactions { get; set; } = new List<StockTransaction>();

        // Helper: Compute total stock ever added
        [NotMapped]
        public int TotalStock => StockTransactions?.Sum(st => st.QuantityAdded) ?? 0;

        // Helper: Compute remaining stock (stock-in minus sold)
        [NotMapped]
        public int RemainingStock
        {
            get
            {
                int sold = Orders?.Where(o => o.Status != "Cancelled").Sum(o => o.Quantity) ?? 0;
                int added = StockTransactions?.Sum(st => st.QuantityAdded) ?? 0;
                return added - sold;
            }
        }
        
        // Fixed price for this product (selling price shown to customers)
        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; } = 0;
        
        // Actual cost to owner
        [Column(TypeName = "decimal(18,2)")]
        public decimal ActualCost { get; set; } = 0;
        
        // Profit per unit (computed: Price - ActualCost)
        [NotMapped]
        public decimal Profit => Price - ActualCost;
        
        // Platform-specific tracking
        public int OrderedFromInstagram { get; set; } = 0;
        
        public int OrderedFromFacebook { get; set; } = 0;
        
        // Group variants by product name using ProductSet
        public int? ProductSetId { get; set; }
        
        public virtual ProductSet? ProductSet { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}