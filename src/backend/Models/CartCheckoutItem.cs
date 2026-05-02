using System.ComponentModel.DataAnnotations;

namespace IPT101.Models
{
    public class CartCheckoutItem
    {
        [Required]
        public int ProductId { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }
}
