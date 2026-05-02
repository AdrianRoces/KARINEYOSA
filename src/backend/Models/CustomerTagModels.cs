namespace IPT101.Models
{
    /// <summary>
    /// Request model for updating a customer's tag (manual override).
    /// </summary>
    public class UpdateCustomerTagRequest
    {
        /// <summary>
        /// The new manual tag value.
        /// Valid values: "New", "Regular", "Loyal", "Bogus", or null (to restore computed tag).
        /// </summary>
        public string? ManualTag { get; set; }
    }

    /// <summary>
    /// DTO for customer tag edit options.
    /// </summary>
    public class TagEditOptionsDto
    {
        public int CustomerId { get; set; }
        public string CurrentTag { get; set; } = string.Empty;
        public string ComputedTag { get; set; } = string.Empty;
        public bool IsManuallyOverridden { get; set; }
        public int TotalOrders { get; set; }
        public int CancelledOrderCount { get; set; }
        public List<string> AvailableOptions { get; set; } = new List<string>();
    }

    /// <summary>
    /// DTO for customer summary with tag information.
    /// </summary>
    public class CustomerSummaryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int TotalOrders { get; set; }
        public decimal TotalSpent { get; set; }
        public int CancelledOrderCount { get; set; }
        public DateTime FirstOrderDate { get; set; }
        public DateTime LastOrderDate { get; set; }
        public string ComputedTag { get; set; } = string.Empty;
        public string? ManualTag { get; set; }
        public string FinalTag { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // For backward compatibility
        public bool IsManuallyOverridden { get; set; }
        public int CompletedTransactions { get; set; }
        public List<string> AvailableOptions { get; set; } = new List<string>();
    }
}
