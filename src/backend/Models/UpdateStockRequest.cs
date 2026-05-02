using System.ComponentModel.DataAnnotations;

namespace IPT101.Models
{
    public class UpdateStockRequest
    {
        [Required]
        public required string CustomerName { get; set; }
        
        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
        
        [Required]
        public required string Platform { get; set; }
        
        [Required]
        public required string ContactNumber { get; set; }

        [Required]
        public required string Address { get; set; }

        // Shipping method: e.g., J&T, Other, Pickup
        public string? ShippingMethod { get; set; }

        // Payment method: COD, Bank Transfer, GCash, Maya, Other
        public string? PaymentMethod { get; set; }
        
        // Shipping fee for delivery (0 if pickup)
        public decimal ShippingFee { get; set; } = 0;
    }
}