using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddActualCostToProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Profit",
                table: "Products",
                newName: "ActualCost");

            migrationBuilder.AddColumn<string>(
                name: "Username",
                table: "StockTransactions",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Username",
                table: "StockTransactions");

            migrationBuilder.RenameColumn(
                name: "ActualCost",
                table: "Products",
                newName: "Profit");
        }
    }
}
