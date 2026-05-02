using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPT101.Data;
using IPT101.Models;
using IPT101.Services;

namespace IPT101.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomerController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICustomerTaggingService _taggingService;

        public CustomerController(ApplicationDbContext context, ICustomerTaggingService taggingService)
        {
            _context = context;
            _taggingService = taggingService;
        }

        // GET: api/customer
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomers()
        {
            var customers = await _context.Customers
                .Include(c => c.Orders)
                .ToListAsync();

            var dtos = customers.Select(c => new CustomerDto
            {
                Id = c.Id,
                Name = c.Name,
                TotalOrders = c.TotalOrders,
                TotalSpent = c.TotalSpent,
                IsRepeatCustomer = c.IsRepeatCustomer,
                CancelledOrderCount = c.CancelledOrderCount,
                FirstOrderDate = c.FirstOrderDate,
                LastOrderDate = c.LastOrderDate,
                ManualBogus = c.ManualBogus,
                FinalTag = _taggingService.GetFinalTag(c),
                ComputedTag = _taggingService.ComputeTag(c.TotalOrders),
                AvailableActions = _taggingService.GetAvailableActions(c)
            }).ToList();

            return Ok(dtos);
        }

        // GET: api/customer/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<CustomerDto>> GetCustomer(int id)
        {
            var customer = await _context.Customers
                .Include(c => c.Orders)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (customer == null)
            {
                return NotFound();
            }

            var dto = new CustomerDto
            {
                Id = customer.Id,
                Name = customer.Name,
                TotalOrders = customer.TotalOrders,
                TotalSpent = customer.TotalSpent,
                IsRepeatCustomer = customer.IsRepeatCustomer,
                CancelledOrderCount = customer.CancelledOrderCount,
                FirstOrderDate = customer.FirstOrderDate,
                LastOrderDate = customer.LastOrderDate,
                ManualBogus = customer.ManualBogus,
                FinalTag = _taggingService.GetFinalTag(customer),
                ComputedTag = _taggingService.ComputeTag(customer.TotalOrders),
                AvailableActions = _taggingService.GetAvailableActions(customer)
            };

            return Ok(dto);
        }

        // PUT: api/customer/{id}/tag-action
        // Perform an action on customer tag (MarkBogus or Restore)
        [HttpPut("{id}/tag-action")]
        public async Task<IActionResult> UpdateCustomerTagAction(int id, [FromBody] UpdateTagActionRequest request)
        {
            var customer = await _context.Customers.FindAsync(id);

            if (customer == null)
            {
                return NotFound();
            }

            // Validate the action
            var validActions = new[] { "MarkBogus", "Restore" };
            if (!validActions.Contains(request.Action))
            {
                return BadRequest(new { message = "Invalid action. Use 'MarkBogus' or 'Restore'." });
            }

            // Perform the action
            if (request.Action == "MarkBogus")
            {
                customer.ManualBogus = true;
            }
            else if (request.Action == "Restore")
            {
                customer.ManualBogus = false;
            }

            _context.Customers.Update(customer);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = request.Action == "MarkBogus" ? "Customer marked as Bogus" : "Customer restored to original status",
                finalTag = _taggingService.GetFinalTag(customer),
                manualBogus = customer.ManualBogus,
                availableActions = _taggingService.GetAvailableActions(customer)
            });
        }
    }

    // DTOs for API communication
    public class CustomerDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int TotalOrders { get; set; }
        public decimal TotalSpent { get; set; }
        public bool IsRepeatCustomer { get; set; }
        public int CancelledOrderCount { get; set; }
        public DateTime FirstOrderDate { get; set; }
        public DateTime LastOrderDate { get; set; }
        public bool ManualBogus { get; set; }
        public string FinalTag { get; set; } = string.Empty;
        public string ComputedTag { get; set; } = string.Empty;
        public List<string> AvailableActions { get; set; } = new();
    }

    public class UpdateTagActionRequest
    {
        public string Action { get; set; } = string.Empty; // "MarkBogus" or "Restore"
    }
}
