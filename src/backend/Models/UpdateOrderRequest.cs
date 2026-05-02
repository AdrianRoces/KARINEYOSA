using System.ComponentModel.DataAnnotations;

namespace IPT101.Models
{
    public class UpdateOrderRequest
    {
        public string? Status { get; set; }
        
        public bool? IsPaid { get; set; }
        
        [Range(0.01, double.MaxValue)]
        public decimal? UnitPrice { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? ProfitPerUnit { get; set; }
        
        public string? ContactNumber { get; set; }
        
        public string? Address { get; set; }
        
        public string? ShippingMethod { get; set; }
        
        public string? PaymentMethod { get; set; }
    }
}
