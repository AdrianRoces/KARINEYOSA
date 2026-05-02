using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateProductWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Sizes_Products_ProductId1",
                table: "Sizes");

            migrationBuilder.DropIndex(
                name: "IX_Sizes_ProductId1",
                table: "Sizes");

            migrationBuilder.DropIndex(
                name: "IX_ProductSizes_ProductId",
                table: "ProductSizes");

            migrationBuilder.DropColumn(
                name: "ProductId1",
                table: "Sizes");

            migrationBuilder.DropColumn(
                name: "Price",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Size",
                table: "Orders");

            migrationBuilder.AddColumn<int>(
                name: "OrderedFromFacebook",
                table: "Products",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "OrderedFromInstagram",
                table: "Products",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ProductSetId",
                table: "Products",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RemainingStock",
                table: "Products",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TotalStock",
                table: "Products",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "VariantName",
                table: "Products",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ProfitPerUnit",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalProfit",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "CancelledOrderCount",
                table: "Customers",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "ProductSets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Category = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductSets", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductSizes_ProductId",
                table: "ProductSizes",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_ProductSetId",
                table: "Products",
                column: "ProductSetId");

            migrationBuilder.AddForeignKey(
                name: "FK_Products_ProductSets_ProductSetId",
                table: "Products",
                column: "ProductSetId",
                principalTable: "ProductSets",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_ProductSets_ProductSetId",
                table: "Products");

            migrationBuilder.DropTable(
                name: "ProductSets");

            migrationBuilder.DropIndex(
                name: "IX_ProductSizes_ProductId",
                table: "ProductSizes");

            migrationBuilder.DropIndex(
                name: "IX_Products_ProductSetId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "OrderedFromFacebook",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "OrderedFromInstagram",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ProductSetId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "RemainingStock",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "TotalStock",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "VariantName",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ProfitPerUnit",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "TotalProfit",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CancelledOrderCount",
                table: "Customers");

            migrationBuilder.AddColumn<int>(
                name: "ProductId1",
                table: "Sizes",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                table: "Products",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Size",
                table: "Orders",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Sizes_ProductId1",
                table: "Sizes",
                column: "ProductId1");

            migrationBuilder.CreateIndex(
                name: "IX_ProductSizes_ProductId",
                table: "ProductSizes",
                column: "ProductId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Sizes_Products_ProductId1",
                table: "Sizes",
                column: "ProductId1",
                principalTable: "Products",
                principalColumn: "Id");
        }
    }
}
