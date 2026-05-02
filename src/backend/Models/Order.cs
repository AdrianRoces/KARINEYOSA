using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPT101.Models
{
    public class Order
    {
        [Key]
        public int Id { get; set; }
        
        public int? CustomerId { get; set; }
        
        public required string CustomerName { get; set; }
        
        public int Quantity { get; set; }
        
        public required string Platform { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal ProfitPerUnit { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalProfit { get; set; }
        
        public bool IsPaid { get; set; } = false;
        
        public string? Status { get; set; } = "Active"; // Active, Cancelled, Completed
        
        public DateTime OrderDate { get; set; }
        
        public DateTime? CancelledDate { get; set; }
        
        public string? CancellationReason { get; set; }
        
        // New customer/order contact details
        public string? ContactNumber { get; set; }
        public string? Address { get; set; }
        public string? ShippingMethod { get; set; }
        public string? PaymentMethod { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal ShippingFee { get; set; } = 0; // Shipping/delivery fee
        
        public string? EmployeeName { get; set; } // Username of employee who created the order

        public string? TransactionId { get; set; }
        
        public int? ProductId { get; set; }

        public string? ProductName { get; set; }
        
        public virtual Product? Product { get; set; }
        
        public virtual Customer Customer { get; set; }
    }
}