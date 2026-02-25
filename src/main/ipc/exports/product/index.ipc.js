// electron-app/main/ipc/handlers/productExportHandler.js
// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { getGeneralCurrencySign } = require("../../../../utils/settings/system");
const { AppDataSource } = require("../../../db/datasource");
const Product = require("../../../../entities/Product");
const ProductVariant = require("../../../../entities/ProductVariant");
const StockItem = require("../../../../entities/StockItem");

let currency = "$";
(async () => {
  // @ts-ignore
  currency = await getGeneralCurrencySign();
})();

class ProductExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "InventoryPro",
      "product_exports",
    );

    // Create export directory if it doesn't exist
    if (!fs.existsSync(this.EXPORT_DIR)) {
      fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
    }

    // Initialize ExcelJS if available
    this.excelJS = null;
    this._initializeExcelJS();
  }

  async _initializeExcelJS() {
    try {
      this.excelJS = require("exceljs");
    } catch (error) {
      console.warn(
        "ExcelJS not available for enhanced Excel export:",
        // @ts-ignore
        error.message,
      );
    }
  }

  /**
   * Main request handler
   * @param {Electron.IpcMainInvokeEvent} event
   * @param {{ method: string; params: any; }} payload
   */
  // @ts-ignore
  // @ts-ignore
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      console.log(`ProductExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          return await this.exportProducts(params);
        case "exportPreview":
          return await this.getExportPreview(params);
        case "getSupportedFormats":
          return {
            status: true,
            message: "Supported formats fetched",
            data: this.getSupportedFormats(),
          };
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("ProductExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export products in specified format
   * @param {{ format: string; category?: string; status?: string; low_stock?: string; search?: string; }} params
   */
  async exportProducts(params) {
    try {
      const format = params.format || "csv";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get product data
      const products = await this._getBaseProductsData(params);

      let result;
      switch (format) {
        case "csv":
          result = await this._exportCSV(products, params);
          break;
        case "excel":
          result = await this._exportExcel(products, params);
          break;
        case "pdf":
          result = await this._exportPDF(products, params);
          break;
      }

      // Read file content as base64 for transmission
      // @ts-ignore
      const filepath = path.join(this.EXPORT_DIR, result.filename);
      const fileBuffer = fs.readFileSync(filepath);
      const base64Content = fileBuffer.toString("base64");

      return {
        status: true,
        // @ts-ignore
        message: `Export completed: ${result.filename}`,
        data: {
          content: base64Content,
          // @ts-ignore
          filename: result.filename,
          // @ts-ignore
          fileSize: result.fileSize,
          mimeType: this._getMimeType(format),
          fullPath: filepath,
        },
      };
    } catch (error) {
      console.error("exportProducts error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export products: ${error.message}`,
        data: null,
      };
    }
  }

  /**
   * Get export preview data
   * @param {{ category?: string; status?: string; low_stock?: string; search?: string; }} params
   */
  async getExportPreview(params) {
    try {
      const products = await this._getBaseProductsData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          products: products.slice(0, 10), // Limit preview to 10 items
          totalCount: products.length,
        },
      };
    } catch (error) {
      console.error("getExportPreview error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to generate preview: ${error.message}`,
        data: null,
      };
    }
  }

  /**
   * Get base products data with essential fields using TypeORM
   * @param {{ category?: string; status?: string; search?: string; low_stock?: string; }} params
   */
  async _getBaseProductsData(params) {
    const productRepo = AppDataSource.getRepository(Product);

    // Subquery for variants count
    const variantCountSubQuery = productRepo
      .createQueryBuilder()
      .subQuery()
      .select("COUNT(*)")
      .from(ProductVariant, "pv")
      .where("pv.product_id = p.id")
      .andWhere("pv.is_deleted = 0")
      .getQuery();

    // Subquery for base product stock (no variant)
    const productStockSubQuery = productRepo
      .createQueryBuilder()
      .subQuery()
      .select("COALESCE(SUM(si.quantity), 0)")
      .from(StockItem, "si")
      .where("si.product_id = p.id")
      .andWhere("si.variant_id IS NULL")
      .getQuery();

    // Subquery for variant stock (sum over all variants)
    const variantStockSubQuery = productRepo
      .createQueryBuilder()
      .subQuery()
      .select("COALESCE(SUM(si.quantity), 0)")
      .from(StockItem, "si")
      // @ts-ignore
      .innerJoin(ProductVariant, "pv", "si.variant_id = pv.id")
      .where("pv.product_id = p.id")
      .getQuery();

    // Build main query
    const queryBuilder = productRepo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.category", "c")
      .select([
        "p.id",
        "p.sku",
        "p.name",
        "c.name as category_name",
        "p.net_price",
        "p.cost_per_item",
        "p.is_published",
        "p.low_stock_threshold",
        "p.allow_backorder",
        "p.track_quantity",
      ])
      .addSelect(`(${variantCountSubQuery})`, "variants_count")
      .addSelect(`(${productStockSubQuery})`, "product_stock")
      .addSelect(`(${variantStockSubQuery})`, "variant_stock")
      .where("p.is_deleted = 0");

    // Apply filters
    if (params.category) {
      queryBuilder.andWhere("p.category_id = :categoryId", {
        categoryId: params.category,
      });
    }

    if (params.status) {
      if (params.status === "published") {
        queryBuilder.andWhere("p.is_published = 1");
      } else if (params.status === "unpublished") {
        queryBuilder.andWhere("p.is_published = 0");
      }
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      queryBuilder.andWhere(
        "(p.name LIKE :search OR p.sku LIKE :search OR c.name LIKE :search)",
        { search: searchTerm },
      );
    }

    queryBuilder.orderBy("p.name");

    const products = await queryBuilder.getRawMany();

    // Process products to match original output
    const processedProducts = [];
    for (const product of products) {
      const totalQuantity =
        (parseInt(product.product_stock) || 0) +
        (parseInt(product.variant_stock) || 0);
      const lowStock = totalQuantity <= (product.p_low_stock_threshold || 0);

      // Determine status
      let status = "In Stock";
      if (totalQuantity === 0) {
        status = product.p_allow_backorder ? "Backorder" : "Out of Stock";
      } else if (lowStock) {
        status = "Low Stock";
      }

      processedProducts.push({
        SKU: product.p_sku || "",
        Name: product.p_name || "",
        Category: product.category_name || "Uncategorized",
        "Net Price": parseFloat(product.p_net_price || 0).toFixed(2),
        Cost:
          product.p_cost_per_item > 0
            ? parseFloat(product.p_cost_per_item).toFixed(2)
            : "N/A",
        Stock: totalQuantity,
        Status: status,
        Published: product.p_is_published === 1 ? "Yes" : "No",
        "Variants Count": parseInt(product.variants_count) || 0,
      });
    }

    // Apply low stock filter after processing
    let filteredProducts = processedProducts;
    if (params.low_stock === "true") {
      filteredProducts = processedProducts.filter(
        (p) => p.Status === "Low Stock",
      );
    }

    return filteredProducts;
  }

  /**
   * Export data as CSV
   * @param {any[]} products
   * @param {any} params
   */
  // @ts-ignore
  async _exportCSV(products, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `product_list_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Title
    csvContent.push("Product List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Products: ${products.length}`);
    csvContent.push("");

    // Headers
    const headers = Object.keys(products[0] || {});
    csvContent.push(headers.join(","));

    // Data rows
    products.forEach((product) => {
      const row = headers.map((header) => {
        const value = product[header];
        // Handle values with commas by wrapping in quotes
        return typeof value === "string" && value.includes(",")
          ? `"${value}"`
          : value;
      });
      csvContent.push(row.join(","));
    });

    const csvString = csvContent.join("\n");

    // Save to file
    fs.writeFileSync(filepath, csvString, "utf8");

    // Get file stats
    const stats = fs.statSync(filepath);

    return {
      filename: filename,
      fileSize: this._formatFileSize(stats.size),
    };
  }

  /**
   * Export data as Excel with compact styling
   * @param {any[]} products
   * @param {{ format: string; category?: string; status?: string; low_stock?: string; search?: string; }} params
   */
  async _exportExcel(products, params) {
    try {
      if (!this.excelJS) {
        throw new Error("ExcelJS not available");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `product_list_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Product Management System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Products");

      // Set default column widths
      worksheet.columns = [
        { header: "SKU", key: "sku", width: 12 },
        { header: "Name", key: "name", width: 35 },
        { header: "Category", key: "category", width: 15 },
        { header: "Net Price", key: "net_price", width: 12 },
        { header: "Cost", key: "cost", width: 10 },
        { header: "Stock", key: "stock", width: 8 },
        { header: "Status", key: "status", width: 12 },
        { header: "Published", key: "published", width: 10 },
        { header: "Variants", key: "variants", width: 10 },
      ];

      // Add title row
      const titleRow = worksheet.addRow(["Product List"]);
      titleRow.font = { bold: true, size: 14 };
      titleRow.height = 20;
      worksheet.mergeCells(`A1:I1`);

      // Add subtitle
      const subtitleRow = worksheet.addRow([
        `Generated: ${new Date().toLocaleString()} | Total: ${products.length} products`,
      ]);
      worksheet.mergeCells(`A2:I2`);
      subtitleRow.font = { size: 9, italic: true };
      subtitleRow.height = 15;

      // Add empty row
      worksheet.addRow([]);

      // Add header row
      const headerRow = worksheet.getRow(4);
      // @ts-ignore
      headerRow.values = worksheet.columns.map((col) => col.header);
      headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" }, // Dark blue
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 20;
      headerRow.border = {
        bottom: { style: "thin", color: { argb: "000000" } },
      };

      // Add data rows
      products.forEach((product, index) => {
        const row = worksheet.addRow([
          product.SKU,
          product.Name,
          product.Category,
          product["Net Price"] !== "N/A"
            ? parseFloat(product["Net Price"])
            : "N/A",
          product.Cost !== "N/A" ? parseFloat(product.Cost) : "N/A",
          parseInt(product.Stock),
          product.Status,
          product.Published,
          parseInt(product["Variants Count"]),
        ]);

        // Zebra striping
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }

        // Format number columns
        const netPriceCell = row.getCell(4);
        const costCell = row.getCell(5);

        if (netPriceCell.value && netPriceCell.value !== "N/A") {
          netPriceCell.numFmt = '"$"#,##0.00';
          netPriceCell.alignment = { horizontal: "right" };
        }

        if (costCell.value && costCell.value !== "N/A") {
          costCell.numFmt = '"$"#,##0.00';
          costCell.alignment = { horizontal: "right" };
        }

        // Center align numeric columns
        row.getCell(6).alignment = { horizontal: "center" }; // Stock
        row.getCell(9).alignment = { horizontal: "center" }; // Variants

        // Color code status
        const statusCell = row.getCell(7);
        if (product.Status === "Out of Stock") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" },
          };
        } else if (product.Status === "Low Stock") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEB9C" },
          };
        }
      });

      // Freeze header row
      worksheet.views = [{ state: "frozen", ySplit: 4 }];

      // Add auto-filter
      worksheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + products.length, column: 9 },
      };

      await workbook.xlsx.writeFile(filepath);
      const stats = fs.statSync(filepath);

      return {
        filename: filename,
        fileSize: this._formatFileSize(stats.size),
      };
    } catch (error) {
      console.error("Excel export error:", error);
      return await this._exportCSV(products, params);
    }
  }

  /**
   * Export data as PDF with improved compact layout
   * @param {any[]} products
   * @param {any} params
   */
  async _exportPDF(products, params) {
    try {
      let PDFKit;
      try {
        PDFKit = require("pdfkit");
      } catch (error) {
        console.warn("PDFKit not available, falling back to CSV");
        return await this._exportCSV(products, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `product_list_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create a PDF document with landscape orientation for better table fit
      const doc = new PDFKit({
        size: "A4",
        layout: "landscape", // Use landscape for better table fit
        margin: 20,
        info: {
          Title: "Product List",
          Author: "Product Management System",
          CreationDate: new Date(),
        },
      });

      // Pipe to file
      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Title - more compact
      doc.fontSize(14).font("Helvetica-Bold").text("Product List", {
        align: "center",
      });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${products.length} products`,
          {
            align: "center",
          },
        );

      doc.moveDown(0.5);

      if (products.length === 0) {
        doc.fontSize(11).text("No products found.", { align: "center" });
        doc.end();
        await new Promise((resolve, reject) => {
          // @ts-ignore
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });

        const stats = fs.statSync(filepath);
        return {
          filename: filename,
          fileSize: this._formatFileSize(stats.size),
        };
      }

      // Calculate table dimensions
      const pageWidth = 842; // A4 landscape width in points
      const pageHeight = 595; // A4 landscape height in points
      const leftMargin = 20;
      const rightMargin = 20;
      const topMargin = doc.y;
      const availableWidth = pageWidth - leftMargin - rightMargin;

      // Define column widths as percentages of available width
      // Total of 9 columns - optimized for compactness
      const columnWidths = [
        availableWidth * 0.12, // SKU (12%)
        availableWidth * 0.25, // Name (25%)
        availableWidth * 0.12, // Category (12%)
        availableWidth * 0.09, // Net Price (9%)
        availableWidth * 0.07, // Cost (7%)
        availableWidth * 0.07, // Stock (7%)
        availableWidth * 0.1, // Status (10%)
        availableWidth * 0.08, // Published (8%)
        availableWidth * 0.1, // Variants Count (10%)
      ];

      const rowHeight = 15; // Reduced row height for compactness
      let currentY = topMargin;
      const headers = Object.keys(products[0]);

      // Draw header row with background
      doc
        .rect(leftMargin, currentY, availableWidth, rowHeight)
        .fillColor("#4A6FA5") // Blue header
        .fill();

      doc.fillColor("white").fontSize(8).font("Helvetica-Bold");

      let xPos = leftMargin;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 3, currentY + 4, {
          width: columnWidths[i] - 6,
          align: this._getColumnAlignment(header),
        });
        xPos += columnWidths[i];
      });

      currentY += rowHeight;

      // Draw data rows with zebra striping
      doc.fontSize(8).font("Helvetica");

      for (let i = 0; i < products.length; i++) {
        const product = products[i];

        // Check if we need a new page
        if (currentY + rowHeight > pageHeight - 20) {
          doc.addPage({
            size: "A4",
            layout: "landscape",
            margin: 20,
          });
          currentY = 20; // Reset Y position for new page

          // Redraw header on new page
          doc
            .rect(leftMargin, currentY, availableWidth, rowHeight)
            .fillColor("#4A6FA5")
            .fill();

          doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
          xPos = leftMargin;
          headers.forEach((header, j) => {
            doc.text(header, xPos + 3, currentY + 4, {
              width: columnWidths[j] - 6,
              align: this._getColumnAlignment(header),
            });
            xPos += columnWidths[j];
          });
          currentY += rowHeight;

          doc.fontSize(8).font("Helvetica");
        }

        // Zebra striping
        if (i % 2 === 0) {
          doc
            .rect(leftMargin, currentY, availableWidth, rowHeight)
            .fillColor("#F8F9FA") // Light gray for even rows
            .fill();
        } else {
          doc
            .rect(leftMargin, currentY, availableWidth, rowHeight)
            .fillColor("#FFFFFF") // White for odd rows
            .fill();
        }

        // Draw cell borders (thin lines)
        doc.lineWidth(0.2);
        xPos = leftMargin;
        for (let j = 0; j < columnWidths.length; j++) {
          doc
            .moveTo(xPos, currentY)
            .lineTo(xPos, currentY + rowHeight)
            .strokeColor("#CCCCCC")
            .stroke();
          xPos += columnWidths[j];
        }
        // Bottom border
        doc
          .moveTo(leftMargin, currentY + rowHeight)
          .lineTo(leftMargin + availableWidth, currentY + rowHeight)
          .strokeColor("#CCCCCC")
          .stroke();

        // Draw cell content
        doc.fillColor("#000000"); // Black text
        xPos = leftMargin;

        headers.forEach((header, j) => {
          let cellValue = String(product[header]);

          // Truncate text if too long
          if (header === "Name" && cellValue.length > 30) {
            cellValue = cellValue.substring(0, 27) + "...";
          } else if (header === "Category" && cellValue.length > 15) {
            cellValue = cellValue.substring(0, 12) + "...";
          }

          // Format currency values
          if (
            (header === "Net Price" || header === "Cost") &&
            cellValue !== "N/A"
          ) {
            cellValue = "$" + cellValue;
          }

          doc.text(cellValue, xPos + 3, currentY + 4, {
            width: columnWidths[j] - 6,
            align: this._getColumnAlignment(header),
          });

          xPos += columnWidths[j];
        });

        currentY += rowHeight;
      }

      // Add footer with page number
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(7)
          .fillColor("#666666")
          .text(`Page ${i + 1} of ${pageCount}`, leftMargin, pageHeight - 15, {
            align: "right",
            width: availableWidth,
          });
      }

      // Finalize PDF
      doc.end();

      // Wait for write to complete
      await new Promise((resolve, reject) => {
        // @ts-ignore
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      // Get file stats
      const stats = fs.statSync(filepath);

      return {
        filename: filename,
        fileSize: this._formatFileSize(stats.size),
      };
    } catch (error) {
      console.error("PDF export error:", error);
      // Fallback to CSV
      return await this._exportCSV(products, params);
    }
  }

  /**
   * Helper to determine column alignment based on content type
   * @param {string} header
   */
  _getColumnAlignment(header) {
    const centerAlign = ["Stock", "Published", "Variants Count"];
    const rightAlign = ["Net Price", "Cost"];

    if (centerAlign.includes(header)) return "center";
    if (rightAlign.includes(header)) return "right";
    return "left";
  }

  /**
   * Get supported formats for API compatibility
   */
  getSupportedFormats() {
    return [
      {
        value: "csv",
        label: "CSV",
        description:
          "Simple text format compatible with all spreadsheet software",
      },
      {
        value: "excel",
        label: "Excel",
        description:
          "Microsoft Excel format with formatting and auto-fit columns",
      },
      {
        value: "pdf",
        label: "PDF (Landscape)",
        description:
          "Compact table layout optimized for printing - uses landscape orientation",
      },
    ];
  }

  // HELPER METHODS

  /**
   * Get MIME type for format
   * @param {string} format
   */
  _getMimeType(format) {
    const mimeTypes = {
      csv: "text/csv",
      excel:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pdf: "application/pdf",
    };
    // @ts-ignore
    return mimeTypes[format] || "application/octet-stream";
  }

  /**
   * Format file size
   * @param {number} bytes
   */
  _formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Get product status filter options
   */
  getProductStatusOptions() {
    return [
      { value: "published", label: "Published" },
      { value: "unpublished", label: "Unpublished" },
    ];
  }

  /**
   * Get low stock filter options
   */
  getLowStockOptions() {
    return [
      { value: "true", label: "Low Stock Only" },
      { value: "false", label: "All Stock Levels" },
    ];
  }
}

// Create and export handler instance
const productExportHandler = new ProductExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("productExport", async (event, payload) => {
    return await productExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

// Export for use in other modules
module.exports = { ProductExportHandler, productExportHandler };
