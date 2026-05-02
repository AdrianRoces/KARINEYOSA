using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace IPT101.Models
{
    public class ProductViewModel
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        
        // Optional: For variant naming format "(Color) - (Product Name)"
        public string? VariantName { get; set; }
        
        [Required]
        public string Category { get; set; } = string.Empty;
        
        public IFormFile? Image { get; set; }
        
        [Range(0, int.MaxValue)]
        public int TotalStock { get; set; } = 0;
        
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0")]
        public decimal Price { get; set; }
        
        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Actual cost must be 0 or greater")]
        public decimal ActualCost { get; set; }
        
        // Group variants by product name
        public int? ProductSetId { get; set; }
    }
}