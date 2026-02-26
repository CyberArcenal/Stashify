// electron-app/main/ipc/handlers/ProductVariantExportHandler.js
// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { AppDataSource } = require("../../../db/datasource");
const ProductVariant = require("../../../../entities/ProductVariant");
const StockItem = require("../../../../entities/StockItem");

class ProductVariantExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "stashly",
      "product_variant_exports",
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
   * @param {{ method: any; params: {}; }} payload
   */
  // @ts-ignore
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      console.log(`ProductVariantExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          // @ts-ignore
          return await this.exportVariants(params);
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
      console.error("ProductVariantExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export variants in specified format
   * @param {{ format: string; }} params
   */
  async exportVariants(params) {
    try {
      const format = params.format || "csv";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get variant data
      // @ts-ignore
      const variants = await this._getBaseVariantsData(params);

      let result;
      switch (format) {
        case "csv":
          result = await this._exportCSV(variants, params);
          break;
        case "excel":
          result = await this._exportExcel(variants, params);
          break;
        case "pdf":
          result = await this._exportPDF(variants, params);
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
      console.error("exportVariants error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export variants: ${error.message}`,
        data: null,
      };
    }
  }

  /**
   * Get export preview data
   * @param {any} params
   */
  async getExportPreview(params) {
    try {
      const variants = await this._getBaseVariantsData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          variants: variants.slice(0, 10), // Limit preview to 10 items
          totalCount: variants.length,
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
   * Get base variants data with essential fields using TypeORM
   * @param {{ product: any; category: any; search: any; low_stock: string; }} params
   */
  async _getBaseVariantsData(params) {
    const variantRepo = AppDataSource.getRepository(ProductVariant);

    // Subquery for total stock per variant
    const stockSubQuery = variantRepo
      .createQueryBuilder()
      .subQuery()
      .select("COALESCE(SUM(si.quantity), 0)")
      .from(StockItem, "si")
      .where("si.variantId = pv.id")
      .andWhere("si.is_deleted = 0")
      .getQuery();

    // Build main query
    const queryBuilder = variantRepo
      .createQueryBuilder("pv")
      .leftJoinAndSelect("pv.product", "p")
      .leftJoinAndSelect("p.category", "c")
      .select([
        "pv.id",
        "pv.sku",
        "pv.name",
        "p.name as product_name",
        "p.sku as product_sku",
        "c.name as category_name",
        "pv.net_price",
        "pv.cost_per_item",
        "pv.barcode",
        "p.low_stock_threshold as product_low_stock_threshold",
        "pv.created_at",
      ])
      .addSelect(`(${stockSubQuery})`, "total_stock")
      .where("pv.is_deleted = 0")
      .andWhere("p.is_deleted = 0");

    // Apply filters
    if (params.product) {
      queryBuilder.andWhere("pv.productId = :productId", {
        productId: params.product,
      });
    }

    if (params.category) {
      queryBuilder.andWhere("p.categoryId = :categoryId", {
        categoryId: params.category,
      });
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      queryBuilder.andWhere(
        "(pv.name LIKE :search OR pv.sku LIKE :search OR p.name LIKE :search OR pv.barcode LIKE :search)",
        { search: searchTerm },
      );
    }

    queryBuilder.orderBy("p.name").addOrderBy("pv.name");

    const variants = await queryBuilder.getRawMany();

    // Process variants to match original output
    const processedVariants = [];
    for (const variant of variants) {
      // Determine stock status
      let status = "In Stock";
      const totalStock = parseInt(variant.total_stock) || 0;
      const lowStockThreshold = variant.product_low_stock_threshold || 0;
      if (totalStock === 0) {
        status = "Out of Stock";
      } else if (totalStock <= lowStockThreshold) {
        status = "Low Stock";
      }

      processedVariants.push({
        SKU: variant.pv_sku || "",
        Name: variant.pv_name || "",
        "Product Name": variant.product_name || "",
        "Product SKU": variant.product_sku || "",
        Category: variant.category_name || "Uncategorized",
        "Net Price": parseFloat(variant.pv_net_price || 0).toFixed(2),
        Cost:
          variant.pv_cost_per_item > 0
            ? parseFloat(variant.pv_cost_per_item).toFixed(2)
            : "N/A",
        Stock: totalStock,
        Status: status,
        Barcode: variant.pv_barcode || "",
        "Created Date": new Date(variant.pv_created_at).toLocaleDateString(),
      });
    }

    // Apply low stock filter after processing
    let filteredVariants = processedVariants;
    if (params.low_stock === "true") {
      filteredVariants = processedVariants.filter(
        (v) => v.Status === "Low Stock",
      );
    }

    return filteredVariants;
  }

  /**
   * Export data as CSV
   * @param {any[]} variants
   * @param {any} params
   */
  // @ts-ignore
  async _exportCSV(variants, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `product_variants_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Title
    csvContent.push("Product Variants List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Variants: ${variants.length}`);
    csvContent.push("");

    // Headers
    if (variants.length > 0) {
      const headers = Object.keys(variants[0]);
      csvContent.push(headers.join(","));

      // Data rows
      variants.forEach((/** @type {{ [x: string]: any; }} */ variant) => {
        const row = headers.map((header) => {
          const value = variant[header];
          // Handle values with commas by wrapping in quotes
          return typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value;
        });
        csvContent.push(row.join(","));
      });
    }

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
   * Export data as Excel
   * @param {any[]} variants
   * @param {any} params
   */
  async _exportExcel(variants, params) {
    try {
      if (!this.excelJS) {
        throw new Error("ExcelJS not available");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `product_variants_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Product Management System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Variants");

      // Set default column widths
      worksheet.columns = [
        { header: "SKU", key: "sku", width: 15 },
        { header: "Name", key: "name", width: 25 },
        { header: "Product Name", key: "product_name", width: 20 },
        { header: "Product SKU", key: "product_sku", width: 15 },
        { header: "Category", key: "category", width: 15 },
        { header: "Net Price", key: "net_price", width: 12 },
        { header: "Cost", key: "cost", width: 10 },
        { header: "Stock", key: "stock", width: 8 },
        { header: "Status", key: "status", width: 12 },
        { header: "Barcode", key: "barcode", width: 15 },
        { header: "Created Date", key: "created_date", width: 12 },
      ];

      // Add title row
      const titleRow = worksheet.addRow(["Product Variants List"]);
      titleRow.font = { bold: true, size: 14 };
      titleRow.height = 20;
      worksheet.mergeCells(`A1:K1`);

      // Add subtitle
      const subtitleRow = worksheet.addRow([
        `Generated: ${new Date().toLocaleString()} | Total: ${variants.length} variants`,
      ]);
      worksheet.mergeCells(`A2:K2`);
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
        fgColor: { argb: "4472C4" },
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 20;
      headerRow.border = {
        bottom: { style: "thin", color: { argb: "000000" } },
      };

      // Add data rows
      variants.forEach(
        (
          /** @type {{ [x: string]: any; SKU: any; Name: any; Category: any; Cost: string; Stock: string; Status: string; Barcode: any; }} */ variant,
          /** @type {number} */ index,
        ) => {
          const row = worksheet.addRow([
            variant.SKU,
            variant.Name,
            variant["Product Name"],
            variant["Product SKU"],
            variant.Category,
            variant["Net Price"] !== "N/A"
              ? parseFloat(variant["Net Price"])
              : "N/A",
            variant.Cost !== "N/A" ? parseFloat(variant.Cost) : "N/A",
            parseInt(variant.Stock),
            variant.Status,
            variant.Barcode,
            variant["Created Date"],
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
          const netPriceCell = row.getCell(6);
          const costCell = row.getCell(7);

          if (netPriceCell.value && netPriceCell.value !== "N/A") {
            netPriceCell.numFmt = '"$"#,##0.00';
            netPriceCell.alignment = { horizontal: "right" };
          }

          if (costCell.value && costCell.value !== "N/A") {
            costCell.numFmt = '"$"#,##0.00';
            costCell.alignment = { horizontal: "right" };
          }

          // Center align numeric columns
          row.getCell(8).alignment = { horizontal: "center" }; // Stock

          // Color code status
          const statusCell = row.getCell(9);
          if (variant.Status === "Out of Stock") {
            statusCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFC7CE" },
            };
          } else if (variant.Status === "Low Stock") {
            statusCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFEB9C" },
            };
          }
        },
      );

      // Freeze header row
      worksheet.views = [{ state: "frozen", ySplit: 4 }];

      // Add auto-filter if there are rows
      if (variants.length > 0) {
        worksheet.autoFilter = {
          from: { row: 4, column: 1 },
          to: { row: 4 + variants.length, column: 11 },
        };
      }

      await workbook.xlsx.writeFile(filepath);
      const stats = fs.statSync(filepath);

      return {
        filename: filename,
        fileSize: this._formatFileSize(stats.size),
      };
    } catch (error) {
      console.error("Excel export error:", error);
      return await this._exportCSV(variants, params);
    }
  }

  /**
   * Export data as PDF
   * @param {string | any[]} variants
   * @param {any} params
   */
  async _exportPDF(variants, params) {
    try {
      let PDFKit;
      try {
        PDFKit = require("pdfkit");
      } catch (error) {
        console.warn("PDFKit not available, falling back to CSV");
        // @ts-ignore
        return await this._exportCSV(variants, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `product_variants_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create a PDF document with landscape orientation
      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margin: 20,
        info: {
          Title: "Product Variants List",
          Author: "Product Management System",
          CreationDate: new Date(),
        },
      });

      // Pipe to file
      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Title
      doc.fontSize(14).font("Helvetica-Bold").text("Product Variants List", {
        align: "center",
      });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${variants.length} variants`,
          {
            align: "center",
          },
        );

      doc.moveDown(0.5);

      if (variants.length === 0) {
        doc.fontSize(11).text("No variants found.", { align: "center" });
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
      const leftMargin = 20;
      const rightMargin = 20;
      const topMargin = doc.y;
      const availableWidth = pageWidth - leftMargin - rightMargin;

      // Define column widths
      const columnWidths = [
        availableWidth * 0.12, // SKU
        availableWidth * 0.18, // Name
        availableWidth * 0.15, // Product Name
        availableWidth * 0.12, // Product SKU
        availableWidth * 0.1, // Category
        availableWidth * 0.08, // Net Price
        availableWidth * 0.07, // Cost
        availableWidth * 0.06, // Stock
        availableWidth * 0.08, // Status
        availableWidth * 0.1, // Barcode
        availableWidth * 0.1, // Created Date
      ];

      const rowHeight = 15;
      let currentY = topMargin;
      const headers = [
        "SKU",
        "Name",
        "Product Name",
        "Product SKU",
        "Category",
        "Net Price",
        "Cost",
        "Stock",
        "Status",
        "Barcode",
        "Created Date",
      ];

      // Draw header row
      doc
        .rect(leftMargin, currentY, availableWidth, rowHeight)
        .fillColor("#4A6FA5")
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

      // Draw data rows
      doc.fontSize(8).font("Helvetica");

      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];

        // Check if we need a new page
        if (currentY + rowHeight > 595 - 20) {
          // A4 landscape height
          doc.addPage({
            size: "A4",
            layout: "landscape",
            margin: 20,
          });
          currentY = 20;

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
            .fillColor("#F8F9FA")
            .fill();
        } else {
          doc
            .rect(leftMargin, currentY, availableWidth, rowHeight)
            .fillColor("#FFFFFF")
            .fill();
        }

        // Draw cell borders
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

        doc
          .moveTo(leftMargin, currentY + rowHeight)
          .lineTo(leftMargin + availableWidth, currentY + rowHeight)
          .strokeColor("#CCCCCC")
          .stroke();

        // Draw cell content
        doc.fillColor("#000000");
        xPos = leftMargin;

        const variantData = [
          variant.SKU,
          variant.Name,
          variant["Product Name"],
          variant["Product SKU"],
          variant.Category,
          variant["Net Price"],
          variant.Cost,
          variant.Stock.toString(),
          variant.Status,
          variant.Barcode,
          variant["Created Date"],
        ];

        variantData.forEach((cellValue, j) => {
          // Truncate long text
          let displayValue = String(cellValue);
          if (j === 1 && displayValue.length > 20) {
            // Name
            displayValue = displayValue.substring(0, 17) + "...";
          } else if (j === 2 && displayValue.length > 15) {
            // Product Name
            displayValue = displayValue.substring(0, 12) + "...";
          }

          // Format currency
          if ((j === 5 || j === 6) && displayValue !== "N/A") {
            displayValue = "$" + displayValue;
          }

          doc.text(displayValue, xPos + 3, currentY + 4, {
            width: columnWidths[j] - 6,
            align: this._getColumnAlignment(headers[j]),
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
          .text(`Page ${i + 1} of ${pageCount}`, leftMargin, 595 - 15, {
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
      // @ts-ignore
      return await this._exportCSV(variants, params);
    }
  }

  /**
   * Helper to determine column alignment
   * @param {string} header
   */
  _getColumnAlignment(header) {
    const centerAlign = ["Stock"];
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
        description: "Compact table layout optimized for printing",
      },
    ];
  }

  // HELPER METHODS

  /**
   * Get MIME type for format
   * @param {string | number} format
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
const productVariantExportHandler = new ProductVariantExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("productVariantExport", async (event, payload) => {
    return await productVariantExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

// Export for use in other modules
module.exports = { ProductVariantExportHandler, productVariantExportHandler };
