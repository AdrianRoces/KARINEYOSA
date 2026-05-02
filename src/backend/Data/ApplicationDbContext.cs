using Microsoft.EntityFrameworkCore;
using IPT101.Models;

namespace IPT101.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Product> Products { get; set; }
        public DbSet<ProductSet> ProductSets { get; set; }
        public DbSet<ProductSizes> ProductSizes { get; set; }
        public DbSet<Size> Sizes { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<StockTransaction> StockTransactions { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Expense> Expenses { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Product>()
                .HasOne(p => p.ProductSet)
                .WithMany(ps => ps.Products)
                .HasForeignKey(p => p.ProductSetId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ProductSizes>()
                .HasOne(ps => ps.Product)
                .WithMany()
                .HasForeignKey(ps => ps.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Size>()
                .HasOne(s => s.Product)
                .WithMany()
                .HasForeignKey(s => s.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Order>()
                .HasOne(o => o.Product)
                .WithMany(p => p.Orders)
                .HasForeignKey(o => o.ProductId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Order>()
                .HasOne(o => o.Customer)
                .WithMany(c => c.Orders)
                .HasForeignKey(o => o.CustomerId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<StockTransaction>()
                .HasOne(st => st.Product)
                .WithMany(p => p.StockTransactions)
                .HasForeignKey(st => st.ProductId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}