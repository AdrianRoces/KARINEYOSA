using Microsoft.AspNetCore.Mvc;
using IPT101.Data;
using IPT101.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace IPT101.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExpenseController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ExpenseController> _logger;

        public ExpenseController(ApplicationDbContext context, ILogger<ExpenseController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/expense
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Expense>>> GetExpenses()
        {
            try
            {
                var expenses = await _context.Expenses
                    .OrderByDescending(e => e.CreatedDate)
                    .ToListAsync();
                return Ok(expenses);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching expenses");
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/expense/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Expense>> GetExpense(int id)
        {
            try
            {
                var expense = await _context.Expenses.FindAsync(id);
                if (expense == null)
                {
                    return NotFound();
                }
                return Ok(expense);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching expense");
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/expense
        [HttpPost]
        public async Task<ActionResult<Expense>> CreateExpense([FromBody] Expense expense)
        {
            try
            {
                if (string.IsNullOrEmpty(expense.Name))
                {
                    return BadRequest("Expense name is required");
                }

                if (expense.Amount <= 0)
                {
                    return BadRequest("Expense amount must be greater than 0");
                }

                expense.CreatedDate = DateTime.Now;
                _context.Expenses.Add(expense);
                await _context.SaveChangesAsync();
                return CreatedAtAction("GetExpense", new { id = expense.Id }, expense);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating expense");
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/expense/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<Expense>> UpdateExpense(int id, [FromBody] Expense expenseUpdate)
        {
            try
            {
                var expense = await _context.Expenses.FindAsync(id);
                if (expense == null)
                {
                    return NotFound();
                }

                if (string.IsNullOrEmpty(expenseUpdate.Name))
                {
                    return BadRequest("Expense name is required");
                }

                if (expenseUpdate.Amount <= 0)
                {
                    return BadRequest("Expense amount must be greater than 0");
                }

                expense.Name = expenseUpdate.Name;
                expense.Amount = expenseUpdate.Amount;
                expense.Description = expenseUpdate.Description;
                expense.UpdatedDate = DateTime.Now;

                _context.Expenses.Update(expense);
                await _context.SaveChangesAsync();
                return Ok(expense);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating expense");
                return StatusCode(500, "Internal server error");
            }
        }

        // DELETE: api/expense/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExpense(int id)
        {
            try
            {
                var expense = await _context.Expenses.FindAsync(id);
                if (expense == null)
                {
                    return NotFound();
                }

                _context.Expenses.Remove(expense);
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting expense");
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/expense/total/summary
        [HttpGet("total/summary")]
        public async Task<ActionResult<object>> GetExpensesSummary()
        {
            try
            {
                var totalExpenses = await _context.Expenses
                    .Select(e => e.Amount)
                    .ToListAsync();

                var expenseCount = await _context.Expenses.CountAsync();
                var totalExpensesSum = totalExpenses.Sum();

                return Ok(new
                {
                    totalExpenses = totalExpensesSum,
                    expenseCount = expenseCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching expenses summary");
                return StatusCode(500, "Internal server error");
            }
        }
    }
}
