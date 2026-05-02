using IPT101.Models;

namespace IPT101.Services
{
    public interface ICustomerTaggingService
    {
        /// <summary>
        /// Computes the automatic tag based on transaction logic
        /// </summary>
        string ComputeTag(int completedTransactions);

        /// <summary>
        /// Gets the final tag (manual Bogus override or computed)
        /// </summary>
        string GetFinalTag(Customer customer);

        /// <summary>
        /// Gets available actions for editing (simplified: only MarkBogus or Restore)
        /// </summary>
        List<string> GetAvailableActions(Customer customer);
    }

    public class CustomerTaggingService : ICustomerTaggingService
    {
        public const string TAG_NEW = "New";
        public const string TAG_REGULAR = "Regular";
        public const string TAG_LOYAL = "Loyal";
        public const string TAG_BOGUS = "Bogus";

        /// <summary>
        /// Computes the automatic tag based on COMPLETED TRANSACTIONS ONLY
        /// Logic (simplified):
        /// - 1 completed transaction = New
        /// - 2 completed transactions = Regular
        /// - 3+ completed transactions = Loyal
        /// 
        /// Note: Bogus is ONLY manual override via ManualBogus flag
        /// </summary>
        public string ComputeTag(int completedTransactions)
        {
            return completedTransactions switch
            {
                1 => TAG_NEW,
                2 => TAG_REGULAR,
                >= 3 => TAG_LOYAL,
                _ => TAG_NEW
            };
        }

        /// <summary>
        /// Gets the final tag (respects manual Bogus override)
        /// </summary>
        public string GetFinalTag(Customer customer)
        {
            // If manually marked as Bogus, return Bogus
            if (customer.ManualBogus)
            {
                return TAG_BOGUS;
            }

            // Otherwise return computed tag based on transaction count
            return ComputeTag(customer.TotalOrders);
        }

        /// <summary>
        /// Gets available actions for the customer (simplified)
        /// - If not Bogus: only "MarkBogus"
        /// - If Bogus: only "Restore"
        /// </summary>
        public List<string> GetAvailableActions(Customer customer)
        {
            var actions = new List<string>();
            
            if (customer.ManualBogus)
            {
                actions.Add("Restore");
            }
            else
            {
                actions.Add("MarkBogus");
            }

            return actions;
        }
    }

    public class TagEditOptions
    {
        public string CurrentTag { get; set; } = "";
        public string ComputedTag { get; set; } = "";
        public bool IsManuallyOverridden { get; set; }
        public List<string> AvailableTransitions { get; set; } = new();
    }
}

