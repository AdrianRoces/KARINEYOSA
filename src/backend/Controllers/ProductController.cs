using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPT101.Data;
using IPT101.Models;
using IPT101.Services;
using System.IO;
using System.ComponentModel.DataAnnotations;

namespace IPT101.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly CustomerService _customerService;

        public ProductController(ApplicationDbContext context, IWebHostEnvironment environment, CustomerService customerService)
        {
            _context = context;
            _environment = environment;
            _customerService = customerService;
        }

        [HttpPost]
        public async Task<IActionResult> AddProduct([FromForm] ProductViewModel model)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var product = new Product
                {
                    Name = model.Name,
                    VariantName = model.VariantName,
                    Category = model.Category,
                    Price = model.Price,
                    ActualCost = model.ActualCost,
                    // Profit is computed as Price - ActualCost
                    ProductSetId = model.ProductSetId
                };

                // Handle image upload
                if (model.Image != null && model.Image.Length > 0)
                {
                    var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads");
                    Directory.CreateDirectory(uploadsFolder);
                    var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(model.Image.FileName)}";
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await model.Image.CopyToAsync(stream);
                    }
                    product.ImagePath = $"/uploads/{uniqueFileName}";
                }

                _context.Products.Add(product);
                await _context.SaveChangesAsync();

                // Create initial stock transaction if stock is provided
                if (model.TotalStock > 0)
                {
                    var stockTx = new StockTransaction
                    {
                        ProductId = product.Id,
                        ProductName = product.Name,
                        QuantityAdded = model.TotalStock,
                        DateAdded = DateTime.Now,
                        Note = "Initial stock",
                        Username = HttpContext.Session.GetString("Username") ?? "System"
                    };
                    _context.StockTransactions.Add(stockTx);
                    await _context.SaveChangesAsync();
                }

                // Reload product with navigation properties
                var prodWithTx = await _context.Products
                    .Include(p => p.StockTransactions)
                    .Include(p => p.Orders)
                    .FirstOrDefaultAsync(p => p.Id == product.Id);

                return Ok(new {
                    message = "Product added successfully",
                    product = new {
                        id = prodWithTx.Id,
                        name = prodWithTx.Name,
                        variantName = prodWithTx.VariantName,
                        category = prodWithTx.Category,
                        totalStock = prodWithTx.TotalStock,
                        remainingStock = prodWithTx.RemainingStock,
                        price = prodWithTx.Price,
                        imagePath = prodWithTx.ImagePath,
                        productSetId = prodWithTx.ProductSetId,
                        orderedFromInstagram = prodWithTx.OrderedFromInstagram,
                        orderedFromFacebook = prodWithTx.OrderedFromFacebook
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error adding product", error = ex.Message });
            }
        }

        // Add stock to a product
        [HttpPost("{id}/addStock")]
        public async Task<IActionResult> AddStock(int id, [FromBody] AddStockRequest request)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return NotFound();
            // Require a note for audit purposes
            if (string.IsNullOrWhiteSpace(request.Note))
            {
                return BadRequest(new { message = "Note is required when adding stock" });
            }

            // Get username from request body, fallback to session, then "Unknown"
            var username = !string.IsNullOrWhiteSpace(request.Username) 
                ? request.Username 
                : (HttpContext.Session.GetString("Username") ?? "Unknown");
            var userId = HttpContext.Session.GetInt32("UserId");
            
            // Debug logging
            Console.WriteLine($"[AddStock] UserId: {userId}, Username: {username}, SessionId: {HttpContext.Session.Id}");
            
            var stockTx = new StockTransaction
            {
                ProductId = id,
                ProductName = product.Name,
                QuantityAdded = request.Quantity,
                DateAdded = DateTime.Now,
                Note = request.Note,
                Username = username
            };
            _context.StockTransactions.Add(stockTx);
            await _context.SaveChangesAsync();

            // Reload product with navigation properties
            var prodWithTx = await _context.Products
                .Include(p => p.StockTransactions)
                .Include(p => p.Orders)
                .FirstOrDefaultAsync(p => p.Id == id);

            return Ok(new {
                message = "Stock added successfully",
                product = new {
                    id = prodWithTx.Id,
                    name = prodWithTx.Name,
                    totalStock = prodWithTx.TotalStock,
                    remainingStock = prodWithTx.RemainingStock
                }
            });
        }

        // Deduct stock for rejected or damaged products
        [HttpPost("{id}/deductStock")]
        public async Task<IActionResult> DeductStock(int id, [FromBody] AddStockRequest request)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return NotFound();

            if (request.Quantity <= 0)
            {
                return BadRequest(new { message = "Quantity must be greater than zero" });
            }

            if (string.IsNullOrWhiteSpace(request.Note))
            {
                return BadRequest(new { message = "Note is required when deducting stock" });
            }

            var totalStock = await _context.StockTransactions.Where(st => st.ProductId == id).SumAsync(st => (int?)st.QuantityAdded) ?? 0;
            var soldQuantity = await _context.Orders.Where(o => o.ProductId == id && o.Status != "Cancelled").SumAsync(o => (int?)o.Quantity) ?? 0;
            var remainingStock = totalStock - soldQuantity;
            if (remainingStock < request.Quantity)
            {
                return BadRequest(new { message = $"Insufficient stock to deduct. Only {remainingStock} remaining." });
            }

            var username = !string.IsNullOrWhiteSpace(request.Username) 
                ? request.Username 
                : (HttpContext.Session.GetString("Username") ?? "Unknown");
            var stockTx = new StockTransaction
            {
                ProductId = id,
                ProductName = product.Name,
                QuantityAdded = -request.Quantity,
                DateAdded = DateTime.Now,
                Note = request.Note,
                Username = username
            };
            _context.StockTransactions.Add(stockTx);
            await _context.SaveChangesAsync();

            var prodWithTx = await _context.Products
                .Include(p => p.StockTransactions)
                .Include(p => p.Orders)
                .FirstOrDefaultAsync(p => p.Id == id);

            return Ok(new {
                message = "Stock deducted successfully",
                product = new {
                    id = prodWithTx.Id,
                    name = prodWithTx.Name,
                    totalStock = prodWithTx.TotalStock,
                    remainingStock = prodWithTx.RemainingStock
                }
            });
        }

        // Get all stock activity across products (admin)
        [HttpGet("stockActivity/all")]
        public async Task<IActionResult> GetAllStockActivity()
        {
            var currentUserId = HttpContext.Session.GetInt32("UserId");
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            var currentUser = _context.Users.FirstOrDefault(u => u.Id == currentUserId);
            if (currentUser?.Role != UserRole.Admin)
            {
                return Forbid();
            }

            var activity = await _context.StockTransactions
                .Include(st => st.Product)
                .OrderByDescending(st => st.DateAdded)
                .Select(st => new {
                    id = st.Id,
                    productId = st.ProductId,
                    productName = st.ProductName ?? (st.Product != null ? st.Product.Name : "Unknown Product"),
                    quantityAdded = st.QuantityAdded,
                    note = st.Note,
                    username = st.Username,
                    dateAdded = st.DateAdded
                })
                .ToListAsync();

            return Ok(activity);
        }

        // Get stock transactions for a product
        [HttpGet("{id}/stockTransactions")]
        public async Task<IActionResult> GetStockTransactions(int id)
        {
            try
            {
                var txs = await _context.StockTransactions
                    .Where(st => st.ProductId == id)
                    .OrderByDescending(st => st.DateAdded)
                    .ToListAsync();
                return Ok(txs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching stock transactions", error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetProducts()
        {
            try
            {
                // Build product list with aggregate stock/order values using subqueries
                var products = await _context.Products
                    .Include(p => p.ProductSet)
                    .Select(p => new
                    {
                        id = p.Id,
                        name = p.Name,
                        variantName = p.VariantName,
                        category = p.Category,
                        totalStock = _context.StockTransactions.Where(st => st.ProductId == p.Id).Sum(st => (int?)st.QuantityAdded) ?? 0,
                        soldQuantity = _context.Orders.Where(o => o.ProductId == p.Id && o.Status != "Cancelled").Sum(o => (int?)o.Quantity) ?? 0,
                        remainingStock = (_context.StockTransactions.Where(st => st.ProductId == p.Id).Sum(st => (int?)st.QuantityAdded) ?? 0) - (_context.Orders.Where(o => o.ProductId == p.Id && o.Status != "Cancelled").Sum(o => (int?)o.Quantity) ?? 0),
                        price = p.Price,
                        actualCost = p.ActualCost,
                        imagePath = p.ImagePath,
                        productSetId = p.ProductSetId,
                        productSetName = p.ProductSet != null ? p.ProductSet.Name : null,
                        orderedFromInstagram = p.OrderedFromInstagram,
                        orderedFromFacebook = p.OrderedFromFacebook
                    })
                    .OrderBy(p => p.productSetName)
                    .ThenBy(p => p.name)
                    .ToListAsync();

                return Ok(products);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching products", error = ex.Message });
            }
        }

        [HttpPost("{id}/updateStock")]
        public async Task<IActionResult> UpdateStock(int id, [FromBody] UpdateStockRequest request)
        {
            try
            {
                var product = await _context.Products
                    .Include(p => p.StockTransactions)
                    .Include(p => p.Orders)
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (product == null)
                    return NotFound(new { message = "Product not found" });

                // Validate stock availability
                if (product.RemainingStock < request.Quantity)
                {
                    return BadRequest(new { 
                        message = $"Insufficient stock. Only {product.RemainingStock} items remaining." 
                    });
                }

                // Handle customer tracking
                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Name.ToLower() == request.CustomerName.ToLower());

                // Compute profit based on actual cost (Price - ActualCost)
                decimal profitPerUnit = Math.Round(product.Price - product.ActualCost, 2);
                decimal subtotal = product.Price * request.Quantity;
                decimal totalAmount = subtotal + request.ShippingFee; // Revenue includes shipping fee
                decimal totalProfit = profitPerUnit * request.Quantity;
                
                // Capture employee name from session
                var employeeName = HttpContext.Session.GetString("Username") ?? "System";

                if (customer == null)
                {
                    // New customer
                    customer = new Customer
                    {
                        Name = request.CustomerName,
                        TotalOrders = 1,
                        TotalSpent = totalAmount,
                        IsRepeatCustomer = false,
                        CancelledOrderCount = 0,
                        FirstOrderDate = DateTime.Now,
                        LastOrderDate = DateTime.Now
                    };
                    _context.Customers.Add(customer);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    // Repeat customer
                    customer.TotalOrders++;
                    customer.TotalSpent += totalAmount;
                    customer.IsRepeatCustomer = true;
                    customer.LastOrderDate = DateTime.Now;
                }

                // Create new order
                var order = new Order
                {
                    CustomerId = customer.Id,
                    CustomerName = request.CustomerName,
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Quantity = request.Quantity,
                    Platform = request.Platform,
                    UnitPrice = product.Price,
                    ProfitPerUnit = profitPerUnit,
                    TotalAmount = totalAmount,
                    TotalProfit = totalProfit,
                    Status = "Active",
                    OrderDate = DateTime.Now,
                    ContactNumber = request.ContactNumber,
                    Address = request.Address,
                    ShippingMethod = request.ShippingMethod,
                    PaymentMethod = request.PaymentMethod,
                    ShippingFee = request.ShippingFee,
                    EmployeeName = employeeName
                };

                _context.Orders.Add(order);

                // Update remaining stock
                // product.RemainingStock -= request.Quantity; // No longer needed, RemainingStock is computed

                // Track platform-specific orders
                if (request.Platform.ToLower() == "instagram")
                {
                    product.OrderedFromInstagram += request.Quantity;
                }
                else if (request.Platform.ToLower() == "facebook")
                {
                    product.OrderedFromFacebook += request.Quantity;
                }

                await _context.SaveChangesAsync();

                return Ok(new { 
                    message = "Order placed successfully",
                    order = new {
                        id = order.Id,
                        transactionId = order.TransactionId,
                        customerId = order.CustomerId,
                        customerName = order.CustomerName,
                        quantity = order.Quantity,
                        platform = order.Platform,
                        unitPrice = order.UnitPrice,
                        profitPerUnit = order.ProfitPerUnit,
                        totalAmount = order.TotalAmount,
                        totalProfit = order.TotalProfit,
                        isPaid = order.IsPaid,
                        status = order.Status,
                        orderDate = order.OrderDate,
                        contactNumber = order.ContactNumber,
                        address = order.Address,
                        shippingMethod = order.ShippingMethod,
                        paymentMethod = order.PaymentMethod
                    },
                    customer = new {
                        id = customer.Id,
                        name = customer.Name,
                        totalOrders = customer.TotalOrders,
                        isRepeatCustomer = customer.IsRepeatCustomer,
                        status = customer.CancelledOrderCount >= 2 ? "Bogus" : (customer.IsRepeatCustomer ? "Loyal" : "New")
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating stock", error = ex.Message });
            }
        }

        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] CartCheckoutRequest request)
        {
            try
            {
                if (request.Items == null || !request.Items.Any())
                    return BadRequest(new { message = "Cart must contain at least one item." });

                var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
                var products = await _context.Products
                    .Include(p => p.StockTransactions)
                    .Include(p => p.Orders)
                    .Where(p => productIds.Contains(p.Id))
                    .ToListAsync();

                if (products.Count != productIds.Count)
                    return BadRequest(new { message = "One or more products in the cart cannot be found." });

                foreach (var item in request.Items)
                {
                    var product = products.FirstOrDefault(p => p.Id == item.ProductId);
                    if (product == null)
                        return BadRequest(new { message = $"Product ID {item.ProductId} not found." });

                    if (product.RemainingStock < item.Quantity)
                        return BadRequest(new { message = $"Insufficient stock for {product.Name}. Only {product.RemainingStock} remaining." });
                }

                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Name.ToLower() == request.CustomerName.ToLower());

                var transactionId = string.IsNullOrWhiteSpace(request.TransactionId)
                    ? Guid.NewGuid().ToString()
                    : request.TransactionId.Trim();

                var shippingFee = request.ShippingFee;
                decimal transactionTotal = 0;

                if (customer == null)
                {
                    customer = new Customer
                    {
                        Name = request.CustomerName,
                        TotalOrders = 1,
                        TotalSpent = 0,
                        IsRepeatCustomer = false,
                        CancelledOrderCount = 0,
                        FirstOrderDate = DateTime.Now,
                        LastOrderDate = DateTime.Now
                    };
                    _context.Customers.Add(customer);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    customer.TotalOrders++;
                    customer.IsRepeatCustomer = true;
                    customer.LastOrderDate = DateTime.Now;
                }

                // ✅ FIX: FIRST PASS - Calculate total items subtotal for proportional distribution
                decimal totalItemsSubtotal = 0;
                foreach (var item in request.Items)
                {
                    var product = products.First(p => p.Id == item.ProductId);
                    totalItemsSubtotal += product.Price * item.Quantity;
                }

                // ✅ FIX: SECOND PASS - Create orders with proportionally distributed shipping fee
                decimal accumulatedShipping = 0;
                int itemIndex = 0;

                foreach (var item in request.Items)
                {
                    var product = products.First(p => p.Id == item.ProductId);
                    var profitPerUnit = Math.Round(product.Price - product.ActualCost, 2);
                    var subtotal = product.Price * item.Quantity;

                    // ✅ Distribute shipping proportionally based on item's subtotal percentage
                    decimal itemShipping;
                    if (itemIndex == request.Items.Count - 1)
                    {
                        // Last item gets any remaining shipping due to rounding
                        itemShipping = shippingFee - accumulatedShipping;
                    }
                    else
                    {
                        // Calculate this item's proportion of total shipping
                        itemShipping = Math.Round((subtotal / totalItemsSubtotal) * shippingFee, 2);
                        accumulatedShipping += itemShipping;
                    }

                    var totalAmount = subtotal + itemShipping;
                    var totalProfit = profitPerUnit * item.Quantity;

                    var order = new Order
                    {
                        TransactionId = transactionId,
                        CustomerId = customer.Id,
                        CustomerName = request.CustomerName,
                        ProductId = product.Id,
                        ProductName = product.Name,
                        Quantity = item.Quantity,
                        Platform = request.Platform,
                        UnitPrice = product.Price,
                        ProfitPerUnit = profitPerUnit,
                        TotalAmount = totalAmount,
                        TotalProfit = totalProfit,
                        Status = "Active",
                        OrderDate = DateTime.Now,
                        ContactNumber = request.ContactNumber,
                        Address = request.Address,
                        ShippingMethod = request.ShippingMethod,
                        PaymentMethod = request.PaymentMethod,
                        ShippingFee = itemShipping,
                        EmployeeName = request.EmployeeName ?? HttpContext.Session.GetString("Username") ?? "System"
                    };

                    _context.Orders.Add(order);
                    transactionTotal += totalAmount;

                    if (request.Platform?.ToLower() == "instagram")
                    {
                        product.OrderedFromInstagram += item.Quantity;
                    }
                    else if (request.Platform?.ToLower() == "facebook")
                    {
                        product.OrderedFromFacebook += item.Quantity;
                    }

                    itemIndex++;
                }

                customer.TotalSpent += transactionTotal;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Checkout completed successfully",
                    transactionId,
                    totalAmount = transactionTotal,
                    shippingFee,
                    itemCount = request.Items.Sum(i => i.Quantity)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error processing checkout", error = ex.Message });
            }
        }

        [HttpGet("orders")]
        public async Task<IActionResult> GetAllOrders()
        {
            try
            {
                var orders = await _context.Orders
                    .Include(o => o.Product)
                    .Include(o => o.Customer)
                    .OrderByDescending(o => o.OrderDate)
                    .Select(o => new
                    {
                        id = o.Id,
                        transactionId = o.TransactionId,
                        customerId = o.CustomerId,
                        customerName = o.CustomerName,
                        quantity = o.Quantity,
                        platform = o.Platform,
                        unitPrice = o.UnitPrice,
                        profitPerUnit = o.ProfitPerUnit,
                        totalAmount = o.TotalAmount,
                        totalProfit = o.TotalProfit,
                        shippingFee = o.ShippingFee,
                        employeeName = o.EmployeeName,
                        contactNumber = o.ContactNumber,
                        address = o.Address,
                        shippingMethod = o.ShippingMethod,
                        paymentMethod = o.PaymentMethod,
                        isPaid = o.IsPaid,
                        status = o.Status,
                        orderDate = o.OrderDate,
                        cancelledDate = o.CancelledDate,
                        cancellationReason = o.CancellationReason,
                        productId = o.ProductId,
                        productName = o.ProductName ?? (o.Product != null ? o.Product.Name : "Unknown Product"),
                        productCategory = o.Product != null ? o.Product.Category : "Deleted",
                        isRepeatCustomer = o.Customer != null && o.Customer.IsRepeatCustomer
                    })
                    .ToListAsync();

                return Ok(orders);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching all orders", error = ex.Message });
            }
        }

        [HttpGet("orders/{productId}")]
        public async Task<IActionResult> GetOrders(int productId)
        {
            try
            {
                var orders = await _context.Orders
                    .Where(o => o.ProductId == productId)
                    .Include(o => o.Customer)
                    .OrderByDescending(o => o.OrderDate)
                    .Select(o => new
                    {
                        id = o.Id,
                        transactionId = o.TransactionId,
                        customerId = o.CustomerId,
                        customerName = o.CustomerName,
                        quantity = o.Quantity,
                        platform = o.Platform,
                        unitPrice = o.UnitPrice,
                        profitPerUnit = o.ProfitPerUnit,
                        totalAmount = o.TotalAmount,
                        totalProfit = o.TotalProfit,
                        shippingFee = o.ShippingFee,
                        employeeName = o.EmployeeName,
                        contactNumber = o.ContactNumber,
                        address = o.Address,
                        shippingMethod = o.ShippingMethod,
                        paymentMethod = o.PaymentMethod,
                        isPaid = o.IsPaid,
                        status = o.Status,
                        orderDate = o.OrderDate,
                        isRepeatCustomer = o.Customer != null && o.Customer.IsRepeatCustomer
                    })
                    .ToListAsync();

                return Ok(orders);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching orders", error = ex.Message });
            }
        }

        [HttpPut("orders/{orderId}/updatePayment")]
        public async Task<IActionResult> UpdatePaymentStatus(int orderId, [FromBody] UpdatePaymentRequest request)
        {
            try
            {
                var order = await _context.Orders.FindAsync(orderId);
                
                if (order == null)
                    return NotFound(new { message = "Order not found" });

                order.IsPaid = request.IsPaid;
                await _context.SaveChangesAsync();

                return Ok(new { 
                    message = "Payment status updated successfully",
                    isPaid = order.IsPaid 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating payment status", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromForm] ProductViewModel model)
        {
            try
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (product == null)
                    return NotFound(new { message = "Product not found" });

                // Update product properties
                product.Name = model.Name;
                product.VariantName = model.VariantName;
                product.Category = model.Category;
                // product.TotalStock = model.TotalStock; // No longer needed, TotalStock is computed
                product.Price = model.Price;
                product.ActualCost = model.ActualCost;
                // Profit is computed as Price - ActualCost

                // Handle image update if provided
                if (model.Image != null && model.Image.Length > 0)
                {
                    // Delete old image if exists
                    if (!string.IsNullOrEmpty(product.ImagePath))
                    {
                        var oldImagePath = Path.Combine(_environment.WebRootPath, product.ImagePath.TrimStart('/'));
                        if (System.IO.File.Exists(oldImagePath))
                        {
                            System.IO.File.Delete(oldImagePath);
                        }
                    }

                    var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads");
                    var uniqueFileName = $"{Guid.NewGuid()}_{model.Image.FileName}";
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await model.Image.CopyToAsync(stream);
                    }

                    product.ImagePath = $"/uploads/{uniqueFileName}";
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Product updated successfully",
                    product = new
                    {
                        id = product.Id,
                        name = product.Name,
                        variantName = product.VariantName,
                        category = product.Category,
                        totalStock = product.TotalStock,
                        remainingStock = product.RemainingStock,
                        price = product.Price,
                        imagePath = product.ImagePath,
                        productSetId = product.ProductSetId,
                        orderedFromInstagram = product.OrderedFromInstagram,
                        orderedFromFacebook = product.OrderedFromFacebook
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating product", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            try
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (product == null)
                    return NotFound(new { message = "Product not found" });

                // Preserve existing historical orders and stock transactions.
                // The Order.ProductId and StockTransaction.ProductId relationships are configured
                // with SetNull so history remains while the product record is removed.
                var relatedOrders = await _context.Orders.Where(o => o.ProductId == id).ToListAsync();
                var relatedStockTxs = await _context.StockTransactions.Where(st => st.ProductId == id).ToListAsync();

                foreach (var order in relatedOrders)
                {
                    order.ProductId = null;
                }

                foreach (var stockTx in relatedStockTxs)
                {
                    stockTx.ProductId = null;
                }

                // Delete the product image if it exists
                if (!string.IsNullOrEmpty(product.ImagePath))
                {
                    var imagePath = Path.Combine(_environment.WebRootPath, product.ImagePath.TrimStart('/'));
                    if (System.IO.File.Exists(imagePath))
                    {
                        System.IO.File.Delete(imagePath);
                    }
                }

                _context.Products.Remove(product);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Product deleted successfully. Historical orders were preserved." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting product", error = ex.Message });
            }
        }

        // ===== CUSTOMER ENDPOINTS =====
        [HttpGet("customers")]
        public async Task<IActionResult> GetAllCustomers()
        {
            try
            {
                // Project customer data with last-known contact info from their most recent order
                var customers = await _context.Customers
                    .Include(c => c.Orders)
                    .OrderByDescending(c => c.LastOrderDate)
                    .Select(c => new
                    {
                        id = c.Id,
                        name = c.Name,
                        totalOrders = c.TotalOrders,
                        totalSpent = c.TotalSpent,
                        isRepeatCustomer = c.IsRepeatCustomer,
                        firstOrderDate = c.FirstOrderDate,
                        lastOrderDate = c.LastOrderDate,
                        cancelledOrderCount = c.CancelledOrderCount,
                        completedTransactions = c.Orders.Count(o => o.Status == "Completed" || o.Status == "Active"),
                        // Last known contact/shipping/payment from the most recent order (if any)
                        contactNumber = c.Orders.OrderByDescending(o => o.OrderDate).Select(o => o.ContactNumber).FirstOrDefault(),
                        address = c.Orders.OrderByDescending(o => o.OrderDate).Select(o => o.Address).FirstOrDefault(),
                        shippingMethod = c.Orders.OrderByDescending(o => o.OrderDate).Select(o => o.ShippingMethod).FirstOrDefault(),
                        paymentMethod = c.Orders.OrderByDescending(o => o.OrderDate).Select(o => o.PaymentMethod).FirstOrDefault(),
                        // Preserve all existing customer fields for compatibility
                        computedTag = c.ComputedTag,
                        finalTag = c.FinalTag,
                        status = c.FinalTag,
                        isManuallyOverridden = c.IsManuallyOverridden,
                        manualBogus = c.ManualBogus,
                        availableOptions = new List<string> { c.ManualBogus ? "Restore" : "MarkBogus" }
                    })
                    .ToListAsync();

                return Ok(customers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching customers", error = ex.Message });
            }
        }

        [HttpGet("customers/{customerId}/last-order")]
        public async Task<IActionResult> GetLastOrderForCustomer(int customerId)
        {
            try
            {
                var lastOrder = await _context.Orders
                    .Where(o => o.CustomerId == customerId)
                    .OrderByDescending(o => o.OrderDate)
                    .Select(o => new
                    {
                        contactNumber = o.ContactNumber,
                        address = o.Address,
                        shippingMethod = o.ShippingMethod,
                        paymentMethod = o.PaymentMethod
                    })
                    .FirstOrDefaultAsync();

                return Ok(lastOrder);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching last order for customer", error = ex.Message });
            }
        }

        [HttpGet("customers/search/{query}")]
        public async Task<IActionResult> SearchCustomers(string query)
        {
            try
            {
                var customers = await _context.Customers
                    .Include(c => c.Orders)
                    .Where(c => c.Name.ToLower().Contains(query.ToLower()))
                    .OrderByDescending(c => c.TotalOrders)
                    .Take(10)
                    .Select(c => new
                    {
                        id = c.Id,
                        name = c.Name,
                        totalOrders = c.TotalOrders,
                        totalSpent = c.TotalSpent,
                        isRepeatCustomer = c.IsRepeatCustomer,
                        cancelledOrderCount = c.Orders.Count(o => o.Status == "Cancelled"),
                        completedTransactions = c.Orders.Count(o => o.Status == "Completed" || o.Status == "Active"),
                        // Simplified: use the FinalTag property from model
                        status = c.FinalTag,
                        finalTag = c.FinalTag,
                        computedTag = c.ComputedTag,
                        isManuallyOverridden = c.IsManuallyOverridden,
                        manualBogus = c.ManualBogus,
                        availableOptions = new List<string> { c.ManualBogus ? "Restore" : "MarkBogus" },
                        // Last known contact/shipping/payment from the most recent order (for autofill in OrderForm)
                        contactNumber = c.Orders.OrderByDescending(o => o.OrderDate).Select(o => o.ContactNumber).FirstOrDefault(),
                        address = c.Orders.OrderByDescending(o => o.OrderDate).Select(o => o.Address).FirstOrDefault(),
                        shippingMethod = c.Orders.OrderByDescending(o => o.OrderDate).Select(o => o.ShippingMethod).FirstOrDefault(),
                        paymentMethod = c.Orders.OrderByDescending(o => o.OrderDate).Select(o => o.PaymentMethod).FirstOrDefault()
                    })
                    .ToListAsync();

                return Ok(customers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error searching customers", error = ex.Message });
            }
        }

        // ===== ORDER MANAGEMENT ENDPOINTS =====
        [HttpPut("orders/{orderId}")]
        public async Task<IActionResult> UpdateOrder(int orderId, [FromBody] UpdateOrderRequest request)
        {
            try
            {
                var order = await _context.Orders
                    .Include(o => o.Product)
                    .FirstOrDefaultAsync(o => o.Id == orderId);

                if (order == null)
                    return NotFound(new { message = "Order not found" });

                // If cancelled, restore inventory
                if (request.Status == "Cancelled" && order.Status != "Cancelled")
                {
                    var product = order.Product;
                    // product.RemainingStock += order.Quantity; // No longer needed, RemainingStock is computed

                    // Update platform tracking
                    if (order.Platform.ToLower() == "facebook")
                    {
                        product.OrderedFromFacebook -= order.Quantity;
                    }
                    else if (order.Platform.ToLower() == "instagram")
                    {
                        product.OrderedFromInstagram -= order.Quantity;
                    }
                }

                // Update price if provided and recompute profit per unit (20% of unit price)
                if (request.UnitPrice.HasValue)
                {
                    order.UnitPrice = request.UnitPrice.Value;
                    order.ProfitPerUnit = Math.Round(order.UnitPrice * 0.20m, 2);
                }

                // Recalculate totals (profit per unit is server-controlled)
                order.TotalAmount = (order.UnitPrice * order.Quantity) + order.ShippingFee;
                order.TotalProfit = order.ProfitPerUnit * order.Quantity;

                // Update contact/shipping/payment if provided
                if (request.ContactNumber != null) order.ContactNumber = request.ContactNumber;
                if (request.Address != null) order.Address = request.Address;
                if (request.ShippingMethod != null) order.ShippingMethod = request.ShippingMethod;
                if (request.PaymentMethod != null) order.PaymentMethod = request.PaymentMethod;

                // Update payment status if provided
                if (request.IsPaid.HasValue)
                {
                    order.IsPaid = request.IsPaid.Value;
                }

                order.Status = request.Status;
                if (request.Status == "Cancelled")
                {
                    order.CancelledDate = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Order updated successfully",
                    order = new
                    {
                        id = order.Id,
                        customerName = order.CustomerName,
                        quantity = order.Quantity,
                        platform = order.Platform,
                        unitPrice = order.UnitPrice,
                        profitPerUnit = order.ProfitPerUnit,
                        totalAmount = order.TotalAmount,
                        totalProfit = order.TotalProfit,
                        isPaid = order.IsPaid,
                        status = order.Status,
                        orderDate = order.OrderDate,
                        contactNumber = order.ContactNumber,
                        address = order.Address,
                        shippingMethod = order.ShippingMethod,
                        paymentMethod = order.PaymentMethod
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating order", error = ex.Message });
            }
        }

        [HttpDelete("orders/{orderId}")]
        public async Task<IActionResult> CancelOrder(int orderId, [FromBody] CancelOrderRequest request)
        {
            try
            {
                var order = await _context.Orders
                    .Include(o => o.Product)
                    .Include(o => o.Customer)
                    .FirstOrDefaultAsync(o => o.Id == orderId);

                if (order == null)
                    return NotFound(new { message = "Order not found" });

                if (order.Status == "Cancelled")
                    return BadRequest(new { message = "Order is already cancelled" });

                if (request == null || string.IsNullOrWhiteSpace(request.Reason))
                    return BadRequest(new { message = "Cancellation reason is required." });

                // Restore inventory
                var product = order.Product;
                // product.RemainingStock += order.Quantity; // No longer needed, RemainingStock is computed

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
                order.CancellationReason = request.Reason;

                // Increment customer's cancelled order count
                if (order.Customer != null)
                {
                    order.Customer.CancelledOrderCount++;
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Order cancelled successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error cancelling order", error = ex.Message });
            }
        }

        [HttpGet("orders/cancelled/all")]
        public async Task<IActionResult> GetAllCancelledOrders()
        {
            try
            {
                var orders = await _context.Orders
                    .Where(o => o.Status == "Cancelled")
                    .Include(o => o.Product)
                    .Include(o => o.Customer)
                    .OrderByDescending(o => o.CancelledDate)
                    .Select(o => new
                    {
                        id = o.Id,
                        customerId = o.CustomerId,
                        customerName = o.CustomerName,
                        quantity = o.Quantity,
                        platform = o.Platform,
                        unitPrice = o.UnitPrice,
                        profitPerUnit = o.ProfitPerUnit,
                        totalAmount = o.TotalAmount,
                        totalProfit = o.TotalProfit,
                        isPaid = o.IsPaid,
                        status = o.Status,
                        orderDate = o.OrderDate,
                        cancelledDate = o.CancelledDate,
                        cancellationReason = o.CancellationReason,
                        productId = o.ProductId,
                        productName = o.ProductName ?? (o.Product != null ? o.Product.Name : "Unknown Product"),
                        isRepeatCustomer = o.Customer != null && o.Customer.IsRepeatCustomer
                    })
                    .ToListAsync();

                return Ok(orders);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching cancelled orders", error = ex.Message });
            }
        }

        [HttpGet("orders/{productId}/cancelled")]
        public async Task<IActionResult> GetCancelledOrdersByProduct(int productId)
        {
            try
            {
                var orders = await _context.Orders
                    .Where(o => o.ProductId == productId && o.Status == "Cancelled")
                    .Include(o => o.Customer)
                    .OrderByDescending(o => o.CancelledDate)
                    .Select(o => new
                    {
                        id = o.Id,
                        customerId = o.CustomerId,
                        customerName = o.CustomerName,
                        quantity = o.Quantity,
                        platform = o.Platform,
                        unitPrice = o.UnitPrice,
                        profitPerUnit = o.ProfitPerUnit,
                        totalAmount = o.TotalAmount,
                        totalProfit = o.TotalProfit,
                        isPaid = o.IsPaid,
                        status = o.Status,
                        orderDate = o.OrderDate,
                        cancelledDate = o.CancelledDate,
                        cancellationReason = o.CancellationReason,
                        isRepeatCustomer = o.Customer != null && o.Customer.IsRepeatCustomer
                    })
                    .ToListAsync();

                return Ok(orders);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching cancelled orders", error = ex.Message });
            }
        }

        [HttpPut("orders/{orderId}/restore")]
        public async Task<IActionResult> RestoreOrder(int orderId)
        {
            try
            {
                var order = await _context.Orders
                    .Include(o => o.Product)
                    .FirstOrDefaultAsync(o => o.Id == orderId);

                if (order == null)
                    return NotFound(new { message = "Order not found" });

                if (order.Status != "Cancelled")
                    return BadRequest(new { message = "Only cancelled orders can be restored" });

                // Restore inventory
                var product = order.Product;
                // product.RemainingStock -= order.Quantity; // No longer needed, RemainingStock is computed

                // Update platform tracking
                if (order.Platform.ToLower() == "facebook")
                {
                    product.OrderedFromFacebook += order.Quantity;
                }
                else if (order.Platform.ToLower() == "instagram")
                {
                    product.OrderedFromInstagram += order.Quantity;
                }

                order.Status = "Active";
                order.CancelledDate = null;
                order.CancellationReason = null;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Order restored successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error restoring order", error = ex.Message });
            }
        }

        [HttpPatch("orders/{orderId}")]
        public async Task<IActionResult> UpdateOrderStatus(int orderId, [FromBody] UpdateOrderRequest request)
        {
            try
            {
                var order = await _context.Orders.FindAsync(orderId);

                if (order == null)
                    return NotFound(new { message = "Order not found" });

                // Update status if provided
                if (!string.IsNullOrEmpty(request.Status))
                {
                    order.Status = request.Status;
                }

                // Update isPaid if provided
                if (request.IsPaid.HasValue)
                {
                    order.IsPaid = request.IsPaid.Value;
                }

                _context.Orders.Update(order);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Order updated successfully", order });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating order", error = ex.Message });
            }
        }

        [HttpDelete("orders/{orderId}/permanent")]
        public async Task<IActionResult> DeleteOrderPermanently(int orderId)
        {
            try
            {
                var order = await _context.Orders.FindAsync(orderId);

                if (order == null)
                    return NotFound(new { message = "Order not found" });

                if (order.Status != "Cancelled")
                    return BadRequest(new { message = "Only cancelled orders can be permanently deleted" });

                _context.Orders.Remove(order);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Order permanently deleted" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting order", error = ex.Message });
            }
        }

        [HttpGet("customers/summary")]
        public async Task<IActionResult> GetCustomersSummary()
        {
            try
            {
                var customers = await _context.Customers
                    .Include(c => c.Orders)
                    .ToListAsync();

                var result = customers.Select(c => new
                {
                    id = c.Id,
                    name = c.Name,
                    totalOrders = c.TotalOrders,
                    totalSpent = c.TotalSpent,
                    isRepeatCustomer = c.IsRepeatCustomer,
                    firstOrderDate = c.FirstOrderDate,
                    lastOrderDate = c.LastOrderDate,
                    cancelledOrderCount = c.CancelledOrderCount,
                    completedTransactions = c.TotalOrders - c.CancelledOrderCount,
                    computedTag = c.ComputedTag,
                    finalTag = c.FinalTag,
                    status = c.FinalTag, // For backward compatibility with frontend
                    isManuallyOverridden = c.IsManuallyOverridden,
                    manualBogus = c.ManualBogus,
                    availableOptions = _customerService.GetAvailableOptions(c.ManualBogus),
                    // Last known contact/shipping/payment from the most recent order (if any)
                    contactNumber = c.Orders.OrderByDescending(o => o.OrderDate).Select(o => o.ContactNumber).FirstOrDefault(),
                    address = c.Orders.OrderByDescending(o => o.OrderDate).Select(o => o.Address).FirstOrDefault(),
                    shippingMethod = c.Orders.OrderByDescending(o => o.OrderDate).Select(o => o.ShippingMethod).FirstOrDefault(),
                    paymentMethod = c.Orders.OrderByDescending(o => o.OrderDate).Select(o => o.PaymentMethod).FirstOrDefault()
                })
                .OrderByDescending(c => c.lastOrderDate)
                .ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching customers", error = ex.Message });
            }
        }

        [HttpPut("customers/{id}/tag-action")]
        public async Task<IActionResult> UpdateCustomerTag(int id, [FromBody] UpdateCustomerTagRequest request)
        {
            try
            {
                var customer = await _context.Customers
                    .Include(c => c.Orders)
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (customer == null)
                    return NotFound(new { message = "Customer not found" });

                // Simplified logic: only two actions
                // 1. MarkBogus: set ManualBogus = true
                // 2. Restore: set ManualBogus = false

                if (request.Action == "MarkBogus")
                {
                    customer.ManualBogus = true;
                }
                else if (request.Action == "Restore")
                {
                    customer.ManualBogus = false;
                }
                else
                {
                    return BadRequest(new { message = "Invalid action. Use 'MarkBogus' or 'Restore'." });
                }

                _context.Customers.Update(customer);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    id = customer.Id,
                    name = customer.Name,
                    computedTag = customer.ComputedTag,
                    finalTag = customer.FinalTag,
                    status = customer.FinalTag,
                    isManuallyOverridden = customer.IsManuallyOverridden,
                    manualBogus = customer.ManualBogus,
                    availableOptions = _customerService.GetAvailableOptions(customer.ManualBogus),
                    message = request.Action == "MarkBogus" ? "Customer marked as Bogus" : "Customer restored to original status"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating customer tag", error = ex.Message });
            }
        }

        [HttpDelete("customers/{id}")]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            try
            {
                var customer = await _context.Customers.FindAsync(id);

                if (customer == null)
                    return NotFound(new { message = "Customer not found" });

                // Preserve all historical orders and leave their customer reference intact
                // by clearing the CustomerId on any related orders.
                var relatedOrders = await _context.Orders.Where(o => o.CustomerId == id).ToListAsync();
                foreach (var order in relatedOrders)
                {
                    order.CustomerId = null;
                }

                _context.Customers.Remove(customer);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Customer deleted successfully. Orders remain intact." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting customer", error = ex.Message });
            }
        }

        // ===== EMPLOYEE PERFORMANCE ENDPOINTS =====
        [HttpGet("employees/performance")]
        public async Task<IActionResult> GetEmployeePerformance(string? startDate = null, string? endDate = null)
        {
            try
            {
                var query = _context.Orders
                    .Where(o => o.EmployeeName != null && o.Status != "Cancelled" && o.IsPaid)
                    .AsQueryable();

                // Apply date filters if provided
                if (!string.IsNullOrEmpty(startDate) && DateTime.TryParse(startDate, out var start))
                {
                    query = query.Where(o => o.OrderDate >= start);
                }

                if (!string.IsNullOrEmpty(endDate) && DateTime.TryParse(endDate, out var end))
                {
                    end = end.AddDays(1).AddTicks(-1); // End of day
                    query = query.Where(o => o.OrderDate <= end);
                }

                var orders = await query.ToListAsync();

                // Group by employee and calculate stats
                var employeeStats = orders
                    .GroupBy(o => o.EmployeeName)
                    .Select(g => new
                    {
                        employeeName = g.Key,
                        totalOrders = g.Count(),
                        totalQuantitySold = g.Sum(o => o.Quantity),
                        totalRevenue = g.Sum(o => o.TotalAmount),
                        totalProfit = g.Sum(o => o.TotalProfit),
                        avgOrderValue = g.Count() > 0 ? g.Sum(o => o.TotalAmount) / g.Count() : 0,
                        profitMargin = g.Sum(o => o.TotalAmount) > 0 
                            ? Math.Round((g.Sum(o => o.TotalProfit) / g.Sum(o => o.TotalAmount)) * 100, 2)
                            : 0
                    })
                    .OrderByDescending(e => e.totalProfit)
                    .ToList();

                return Ok(new
                {
                    totalEmployees = employeeStats.Count,
                    employees = employeeStats,
                    summary = new
                    {
                        totalRevenue = employeeStats.Sum(e => e.totalRevenue),
                        totalProfit = employeeStats.Sum(e => e.totalProfit),
                        totalOrders = employeeStats.Sum(e => e.totalOrders),
                        totalQuantity = employeeStats.Sum(e => e.totalQuantitySold)
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching employee performance", error = ex.Message });
            }
        }

        [HttpGet("stock-activity")]
        public async Task<IActionResult> GetStockActivity(string? employeeName = null, string? startDate = null, string? endDate = null)
        {
            try
            {
                // Get stock transactions
                var stockQuery = _context.StockTransactions.AsQueryable();
                
                if (!string.IsNullOrEmpty(startDate) && DateTime.TryParse(startDate, out var start))
                {
                    stockQuery = stockQuery.Where(st => st.DateAdded >= start);
                }

                if (!string.IsNullOrEmpty(endDate) && DateTime.TryParse(endDate, out var end))
                {
                    end = end.AddDays(1).AddTicks(-1);
                    stockQuery = stockQuery.Where(st => st.DateAdded <= end);
                }

                var stockActivity = await stockQuery
                    .Include(st => st.Product)
                    .OrderByDescending(st => st.DateAdded)
                    .Select(st => new
                    {
                        id = st.Id,
                        productId = st.ProductId,
                        productName = st.ProductName ?? (st.Product != null ? st.Product.Name : "Unknown Product"),
                        quantityAdded = st.QuantityAdded,
                        note = st.Note,
                        username = st.Username,
                        dateAdded = st.DateAdded,
                        type = "stock"
                    })
                    .ToListAsync();

                return Ok(stockActivity);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching stock activity", error = ex.Message });
            }
        }

        [HttpDelete("stock-activity/{id}")]
        public async Task<IActionResult> DeleteStockActivity(int id)
        {
            try
            {
                var stockTransaction = await _context.StockTransactions.FindAsync(id);
                if (stockTransaction == null)
                {
                    return NotFound(new { message = "Stock transaction not found" });
                }

                _context.StockTransactions.Remove(stockTransaction);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Stock transaction deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting stock transaction", error = ex.Message });
            }
        }
    }

    public class UpdateCustomerTagRequest
    {
        public string Action { get; set; } = ""; // "MarkBogus" or "Restore"
    }

    public class UpdatePaymentRequest
    {
        public bool IsPaid { get; set; }
    }

    public class UpdateOrderRequest
    {
        [Required]
        public required string Status { get; set; }
        
        public string? CancellationReason { get; set; }
        
        public bool? IsPaid { get; set; }
        
        [Range(0.01, double.MaxValue)]
        public decimal? UnitPrice { get; set; }
        
        // Allow updating contact details if needed
        public string? ContactNumber { get; set; }
        public string? Address { get; set; }
        public string? ShippingMethod { get; set; }
        public string? PaymentMethod { get; set; }
    }

    public class CancelOrderRequest
    {
        public string? Reason { get; set; }
    }
}