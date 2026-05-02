using Microsoft.EntityFrameworkCore;
using IPT101.Data;
using IPT101.Services;
using IPT101.Utilities;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(5231); // Listen on port 5231
});

// Add distributed memory cache (required by session) and session services
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
});

// Add CORS services (allow frontend dev server origins and credentials)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policyBuilder =>
        {
            policyBuilder
                .WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5174")
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        });
});

// Add logging
builder.Services.AddLogging(logging =>
{
    logging.ClearProviders();
    logging.AddConsole();
    logging.AddDebug();
});

// Add services to the container.
builder.Services.AddControllers().AddNewtonsoftJson(options =>
{
    options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
});

// SQLite configuration - Simple, no external dependencies needed
var dbPath = Path.Combine(AppContext.BaseDirectory, "sia102.db");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}")
);

// Register Customer Service
builder.Services.AddScoped<CustomerService>();

// Register Password Service
builder.Services.AddScoped<IPasswordService, PasswordService>();

// Register Transaction Cancellation Service
builder.Services.AddHostedService<TransactionCancellationService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Auto-create and migrate database on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var passwordService = scope.ServiceProvider.GetRequiredService<IPasswordService>();
    db.Database.Migrate();
    DatabaseSeeder.SeedAdminUser(db, passwordService);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseSession();
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAuthorization();
app.MapControllers();

app.Run();
