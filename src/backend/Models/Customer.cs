using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPT101.Models
{
    public class Customer
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public required string Name { get; set; }
        
        public int TotalOrders { get; set; } = 0;
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalSpent { get; set; } = 0;
        
        public bool IsRepeatCustomer { get; set; } = false;
        
        public int CancelledOrderCount { get; set; } = 0;
        
        public DateTime FirstOrderDate { get; set; } = DateTime.UtcNow;
        
        public DateTime LastOrderDate { get; set; } = DateTime.UtcNow;

        // Manual Bogus override (true = customer marked as Bogus, false/default = use computed tag)
        public bool ManualBogus { get; set; } = false;
        
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

        /// <summary>
        /// Computes the tag automatically based on completed transactions ONLY.
        /// Rules:
        /// - 1 completed transaction → "New"
        /// - 2 completed transactions → "Regular"
        /// - 3+ completed transactions → "Loyal"
        /// 
        /// Note: Cancelled orders do NOT automatically create Bogus tag.
        /// Bogus is only assigned manually via ManualBogus flag.
        /// </summary>
        [NotMapped]
        public string ComputedTag
        {
            get
            {
                // Determine tag solely by completed transaction count
                return TotalOrders switch
                {
                    1 => "New",
                    2 => "Regular",
                    >= 3 => "Loyal",
                    _ => "New" // Default for 0 orders
                };
            }
        }

        /// <summary>
        /// Returns the final tag to be displayed.
        /// If ManualBogus is true, display "Bogus".
        /// Otherwise, use ComputedTag (automatic based on transaction count).
        /// </summary>
        [NotMapped]
        public string FinalTag
        {
            get => ManualBogus ? "Bogus" : ComputedTag;
        }

        /// <summary>
        /// Indicates if the customer is manually marked as Bogus.
        /// </summary>
        [NotMapped]
        public bool IsManuallyOverridden
        {
            get => ManualBogus;
        }
    }
}
