using Microsoft.EntityFrameworkCore;
using IPT101.Data;

namespace IPT101.Services
{
    public class TransactionCancellationService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<TransactionCancellationService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1); // Check every minute for testing

        public TransactionCancellationService(IServiceProvider serviceProvider, ILogger<TransactionCancellationService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Transaction Cancellation Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckAndCancelOldTransactionsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while checking for old transactions.");
                }

                await Task.Delay(_checkInterval, stoppingToken);
            }

            _logger.LogInformation("Transaction Cancellation Service is stopping.");
        }

        private async Task CheckAndCancelOldTransactionsAsync()
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                // Cancel transactions older than 3 days
                var cutoffTime = DateTime.UtcNow.AddDays(-3);

                var oldTransactions = await dbContext.Orders
                    .Where(o => (o.Status == "Active" || o.Status == "Pending") && o.OrderDate < cutoffTime)
                    .Include(o => o.Product)
                    .ToListAsync();

                if (oldTransactions.Any())
                {
                    _logger.LogInformation($"Found {oldTransactions.Count} old transactions to cancel.");

                    foreach (var order in oldTransactions)
                    {
                        // Restore inventory
                        var product = order.Product;
                        // product.RemainingStock += order.Quantity; // Computed field

                        // Update platform tracking
                        if (order.Platform.ToLower() == "facebook")
                        {
                            product.OrderedFromFacebook -= order.Quantity;
                        }
                        else if (order.Platform.ToLower() == "instagram")
                        {
                            product.OrderedFromInstagram -= order.Quantity;
                        }

                        order.Status = "Cancelled";
                        order.CancelledDate = DateTime.UtcNow;
                        order.CancellationReason = "Auto-cancelled: Transaction inactive for too long";
                    }

                    await dbContext.SaveChangesAsync();
                    _logger.LogInformation($"Cancelled {oldTransactions.Count} old transactions.");
                }
            }
        }
    }
}