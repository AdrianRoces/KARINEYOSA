using IPT101.Data;
using IPT101.Models;
using Microsoft.EntityFrameworkCore;

namespace IPT101.Services
{
    /// <summary>
    /// Service for handling customer-related operations with simplified tagging rules.
    /// 
    /// Tagging Rules:
    /// - Automatic tags (New/Regular/Loyal) are ALWAYS system-computed based on transaction count
    /// - Bogus is ONLY a manual override flag (ManualBogus = true)
    /// - Users can only "Mark as Bogus" or "Restore to Original"
    /// - No manual switching between New/Regular/Loyal
    /// </summary>
    public class CustomerService
    {
        private readonly ApplicationDbContext _context;

        public CustomerService(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Computes the tag automatically based on completed transaction count ONLY.
        /// Rules:
        /// - 1 transaction → "New"
        /// - 2 transactions → "Regular"
        /// - 3+ transactions → "Loyal"
        /// </summary>
        public string ComputeTag(int totalOrders)
        {
            return totalOrders switch
            {
                1 => "New",
                2 => "Regular",
                >= 3 => "Loyal",
                _ => "New"
            };
        }

        /// <summary>
        /// Gets available actions for a customer.
        /// - If not Bogus: only "Mark as Bogus"
        /// - If Bogus: only "Restore to Original Status"
        /// </summary>
        public List<string> GetAvailableOptions(bool isManuallyBogus)
        {
            var options = new List<string>();
            
            if (isManuallyBogus)
            {
                options.Add("Restore");
            }
            else
            {
                options.Add("MarkBogus");
            }

            return options;
        }

        /// <summary>
        /// Marks a customer as Bogus (manual override).
        /// </summary>
        public async Task<Customer?> MarkAsBogusAsync(int customerId)
        {
            var customer = await _context.Customers.FindAsync(customerId);
            if (customer == null)
            {
                return null;
            }

            customer.ManualBogus = true;
            _context.Customers.Update(customer);
            await _context.SaveChangesAsync();

            return customer;
        }

        /// <summary>
        /// Restores a customer to their computed tag (removes Bogus override).
        /// </summary>
        public async Task<Customer?> RestoreOriginalTagAsync(int customerId)
        {
            var customer = await _context.Customers.FindAsync(customerId);
            if (customer == null)
            {
                return null;
            }

            customer.ManualBogus = false;
            _context.Customers.Update(customer);
            await _context.SaveChangesAsync();

            return customer;
        }

        /// <summary>
        /// Gets a customer summary with tag information.
        /// </summary>
        public async Task<dynamic?> GetCustomerSummaryAsync(int customerId)
        {
            var customer = await _context.Customers
                .Include(c => c.Orders)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer == null)
            {
                return null;
            }

            return new
            {
                customer.Id,
                customer.Name,
                customer.TotalOrders,
                customer.TotalSpent,
                customer.CancelledOrderCount,
                computedTag = customer.ComputedTag,
                finalTag = customer.FinalTag,
                isManuallyOverridden = customer.IsManuallyOverridden,
                availableOptions = GetAvailableOptions(customer.ManualBogus)
            };
        }

        /// <summary>
        /// Gets all customers with their tag information.
        /// </summary>
        public async Task<List<dynamic>> GetAllCustomersWithTagsAsync()
        {
            var customers = await _context.Customers
                .Include(c => c.Orders)
                .ToListAsync();

            return customers.Select<Customer, dynamic>(c => new
            {
                c.Id,
                c.Name,
                c.TotalOrders,
                c.TotalSpent,
                c.CancelledOrderCount,
                computedTag = c.ComputedTag,
                finalTag = c.FinalTag,
                status = c.FinalTag, // For backward compatibility
                isManuallyOverridden = c.IsManuallyOverridden,
                manualBogus = c.ManualBogus,
                availableOptions = GetAvailableOptions(c.ManualBogus)
            }).ToList<dynamic>();
        }
    }
}
