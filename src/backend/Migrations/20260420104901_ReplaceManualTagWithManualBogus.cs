using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceManualTagWithManualBogus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ManualTag",
                table: "Customers");

            migrationBuilder.AddColumn<bool>(
                name: "ManualBogus",
                table: "Customers",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ManualBogus",
                table: "Customers");

            migrationBuilder.AddColumn<string>(
                name: "ManualTag",
                table: "Customers",
                type: "TEXT",
                nullable: true);
        }
    }
}
