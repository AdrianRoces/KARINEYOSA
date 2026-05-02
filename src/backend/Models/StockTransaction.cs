using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPT101.Models
{
    public class StockTransaction
    {
        [Key]
        public int Id { get; set; }

        public int? ProductId { get; set; }

        public string? ProductName { get; set; }

        [ForeignKey("ProductId")]
        public Product? Product { get; set; }

        [Required]
        public int QuantityAdded { get; set; }

        public DateTime DateAdded { get; set; } = DateTime.UtcNow;

        public string? Note { get; set; }

        // Username of the user who performed the stock action
        public string? Username { get; set; }
    }
}
