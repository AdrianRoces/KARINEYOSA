using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPT101.Models
{
    public class Expense
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        [Required]
        public decimal Amount { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public DateTime? UpdatedDate { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }
    }
}
