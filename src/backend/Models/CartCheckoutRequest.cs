using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace IPT101.Models
{
    public class CartCheckoutRequest
    {
        [Required]
        public required string CustomerName { get; set; }

        public string? EmployeeName { get; set; }

        [Required]
        public required string Platform { get; set; }

        [Required]
        public required string ContactNumber { get; set; }

        [Required]
        public required string Address { get; set; }

        public string? ShippingMethod { get; set; }

        public string? PaymentMethod { get; set; }

        public decimal ShippingFee { get; set; } = 0;

        public string? TransactionId { get; set; }

        [Required]
        public List<CartCheckoutItem> Items { get; set; } = new List<CartCheckoutItem>();
    }
}
