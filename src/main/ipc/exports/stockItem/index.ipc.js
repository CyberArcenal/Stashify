// electron-app/main/ipc/handlers/stockItemExportHandler.js
// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { AppDataSource } = require("../../../db/datasource");
const StockItem = require("../../../../entities/StockItem");


class StockItemExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "InventoryPro",
      "stock_item_exports"
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
        error.message
      );
    }
  }

  /**
   * Main request handler
   * @param {Electron.IpcMainInvokeEvent} event
   * @param {{ method: string; params: any; }} payload
   */
  // @ts-ignore
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      console.log(`StockItemExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          return await this.exportStockItems(params);
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
      console.error("StockItemExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export stock items in specified format
   * @param {{ format: string; warehouse?: string; stock_status?: string; search?: string; }} params
   */
  async exportStockItems(params) {
    try {
      const format = params.format || "csv";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get stock item data
      const stockItems = await this._getStockItemsData(params);

      let result;
      switch (format) {
        case "csv":
          result = await this._exportCSV(stockItems, params);
          break;
        case "excel":
          result = await this._exportExcel(stockItems, params);
          break;
        case "pdf":
          result = await this._exportPDF(stockItems, params);
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
      console.error("exportStockItems error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export stock items: ${error.message}`,
        data: null,
      };
    }
  }

  /**
   * Get export preview data
   * @param {{ warehouse?: string; stock_status?: string; search?: string; }} params
   */
  async getExportPreview(params) {
    try {
      const stockItems = await this._getStockItemsData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          stockItems: stockItems.slice(0, 10), // Limit preview to 10 items
          totalCount: stockItems.length,
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
   * Get stock items data with essential fields using TypeORM
   * @param {{ warehouse?: string; stock_status?: string; search?: string; }} params
   */
  async _getStockItemsData(params) {
    const stockItemRepo = AppDataSource.getRepository(StockItem);

    const queryBuilder = stockItemRepo
      .createQueryBuilder("si")
      .leftJoinAndSelect("si.product", "p")
      .leftJoinAndSelect("si.variant", "pv")
      .leftJoinAndSelect("si.warehouse", "w")
      .select([
        "si.id",
        "p.name as product_name",
        "p.sku as product_sku",
        "pv.name as variant_name",
        "pv.sku as variant_sku",
        "w.name as warehouse_name",
        "si.quantity",
        "si.reorder_level",
        "COALESCE(pv.cost_per_item, p.cost_per_item, 0) as cost_per_item",
        "si.created_at",
        "si.updated_at",
      ])
      .where("si.is_deleted = 0");

    // Apply filters
    if (params.warehouse) {
      queryBuilder.andWhere("si.warehouse_id = :warehouseId", { warehouseId: params.warehouse });
    }

    if (params.stock_status) {
      switch (params.stock_status) {
        case "low_stock":
          queryBuilder.andWhere("si.quantity > 0 AND si.quantity <= si.reorder_level");
          break;
        case "out_of_stock":
          queryBuilder.andWhere("si.quantity = 0");
          break;
        case "normal":
          queryBuilder.andWhere("si.quantity > si.reorder_level");
          break;
      }
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      queryBuilder.andWhere(
        "(p.name LIKE :search OR p.sku LIKE :search OR w.name LIKE :search OR pv.name LIKE :search OR pv.sku LIKE :search)",
        { search: searchTerm }
      );
    }

    queryBuilder.orderBy("p.name").addOrderBy("w.name");

    const stockItems = await queryBuilder.getRawMany();

    // Process stock items
    const processedItems = [];
    for (const item of stockItems) {
      const productName = item.variant_name
        ? `${item.product_name} - ${item.variant_name}`
        : item.product_name;

      const sku = item.variant_sku || item.product_sku || "N/A";
      const quantity = parseInt(item.si_quantity) || 0;
      const reorderLevel = parseInt(item.si_reorder_level) || 0;
      const costPerItem = parseFloat(item.cost_per_item) || 0;
      const totalValue = costPerItem * quantity;
      const stockStatus = this._getStockStatus(quantity, reorderLevel);

      processedItems.push({
        Product: productName || "",
        SKU: sku,
        Warehouse: item.warehouse_name || "N/A",
        Quantity: quantity,
        "Reorder Level": reorderLevel,
        Status: stockStatus,
        "Cost per Item": costPerItem.toFixed(2),
        "Total Value": totalValue.toFixed(2),
        "Last Updated": item.si_updated_at
          ? new Date(item.si_updated_at).toLocaleDateString()
          : "N/A",
      });
    }

    return processedItems;
  }

  /**
   * Export data as CSV
   * @param {any[]} stockItems
   * @param {any} params
   */
  // @ts-ignore
  async _exportCSV(stockItems, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `stock_items_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Title
    csvContent.push("Stock Items List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Items: ${stockItems.length}`);
    csvContent.push("");

    // Headers
    if (stockItems.length > 0) {
      const headers = Object.keys(stockItems[0]);
      csvContent.push(headers.join(","));

      // Data rows
      stockItems.forEach((item) => {
        const row = headers.map((header) => {
          const value = item[header];
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
   * Export data as Excel with compact styling
   * @param {any[]} stockItems
   * @param {{ format: string; warehouse?: string; stock_status?: string; search?: string; }} params
   */
  async _exportExcel(stockItems, params) {
    try {
      if (!this.excelJS) {
        throw new Error("ExcelJS not available");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `stock_items_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Inventory Management System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Stock Items");

      // Set default column widths
      worksheet.columns = [
        { header: "Product", key: "product", width: 35 },
        { header: "SKU", key: "sku", width: 15 },
        { header: "Warehouse", key: "warehouse", width: 20 },
        { header: "Quantity", key: "quantity", width: 12 },
        { header: "Reorder Level", key: "reorder_level", width: 12 },
        { header: "Status", key: "status", width: 12 },
        { header: "Cost per Item", key: "cost_per_item", width: 15 },
        { header: "Total Value", key: "total_value", width: 15 },
        { header: "Last Updated", key: "last_updated", width: 15 },
      ];

      // Add title row
      const titleRow = worksheet.addRow(["Stock Items List"]);
      titleRow.font = { bold: true, size: 14 };
      titleRow.height = 20;
      worksheet.mergeCells(`A1:I1`);

      // Add subtitle
      const subtitleRow = worksheet.addRow([
        `Generated: ${new Date().toLocaleString()} | Total: ${stockItems.length} items`,
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
      stockItems.forEach((item, index) => {
        const row = worksheet.addRow([
          item.Product,
          item.SKU,
          item.Warehouse,
          item.Quantity,
          item["Reorder Level"],
          item.Status,
          item["Cost per Item"] !== "N/A"
            ? parseFloat(item["Cost per Item"])
            : "N/A",
          item["Total Value"] !== "N/A"
            ? parseFloat(item["Total Value"])
            : "N/A",
          item["Last Updated"],
        ]);

        // Zebra striping
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }

        // Format currency columns
        const costCell = row.getCell(7);
        const valueCell = row.getCell(8);

        if (costCell.value && costCell.value !== "N/A") {
          costCell.numFmt = '"$"#,##0.00';
          costCell.alignment = { horizontal: "right" };
        }

        if (valueCell.value && valueCell.value !== "N/A") {
          valueCell.numFmt = '"$"#,##0.00';
          valueCell.alignment = { horizontal: "right" };
        }

        // Center align numeric columns
        row.getCell(4).alignment = { horizontal: "center" }; // Quantity
        row.getCell(5).alignment = { horizontal: "center" }; // Reorder Level

        // Color code status
        const statusCell = row.getCell(6);
        if (item.Status === "Out of Stock") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" },
          };
        } else if (item.Status === "Low Stock") {
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
      if (stockItems.length > 0) {
        worksheet.autoFilter = {
          from: { row: 4, column: 1 },
          to: { row: 4 + stockItems.length, column: 9 },
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
      return await this._exportCSV(stockItems, params);
    }
  }

  /**
   * Export data as PDF with improved compact layout
   * @param {any[]} stockItems
   * @param {any} params
   */
  async _exportPDF(stockItems, params) {
    try {
      let PDFKit;
      try {
        PDFKit = require("pdfkit");
      } catch (error) {
        console.warn("PDFKit not available, falling back to CSV");
        return await this._exportCSV(stockItems, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `stock_items_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create a PDF document with landscape orientation for better table fit
      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margin: 20,
        info: {
          Title: "Stock Items List",
          Author: "Inventory Management System",
          CreationDate: new Date(),
        },
      });

      // Pipe to file
      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Title - more compact
      doc.fontSize(14).font("Helvetica-Bold").text("Stock Items List", {
        align: "center",
      });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${stockItems.length} items`,
          {
            align: "center",
          }
        );

      doc.moveDown(0.5);

      if (stockItems.length === 0) {
        doc.fontSize(11).text("No stock items found.", { align: "center" });
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
      const columnWidths = [
        availableWidth * 0.25, // Product (25%)
        availableWidth * 0.12, // SKU (12%)
        availableWidth * 0.15, // Warehouse (15%)
        availableWidth * 0.08, // Quantity (8%)
        availableWidth * 0.1, // Reorder Level (10%)
        availableWidth * 0.1, // Status (10%)
        availableWidth * 0.1, // Cost per Item (10%)
        availableWidth * 0.1, // Total Value (10%)
      ];

      const rowHeight = 15;
      let currentY = topMargin;
      const headers = [
        "Product",
        "SKU",
        "Warehouse",
        "Quantity",
        "Reorder Level",
        "Status",
        "Cost",
        "Total Value",
      ];

      // Draw header row with background
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

      // Draw data rows with zebra striping
      doc.fontSize(8).font("Helvetica");

      for (let i = 0; i < stockItems.length; i++) {
        const item = stockItems[i];

        // Check if we need a new page
        if (currentY + rowHeight > pageHeight - 20) {
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
        // Bottom border
        doc
          .moveTo(leftMargin, currentY + rowHeight)
          .lineTo(leftMargin + availableWidth, currentY + rowHeight)
          .strokeColor("#CCCCCC")
          .stroke();

        // Draw cell content
        doc.fillColor("#000000");
        xPos = leftMargin;

        const rowData = [
          item.Product,
          item.SKU,
          item.Warehouse,
          item.Quantity.toString(),
          item["Reorder Level"].toString(),
          item.Status,
          item["Cost per Item"],
          item["Total Value"],
        ];

        rowData.forEach((cellValue, j) => {
          // Truncate text if too long
          let displayValue = String(cellValue);
          if (j === 0 && displayValue.length > 30) {
            displayValue = displayValue.substring(0, 27) + "...";
          } else if (j === 2 && displayValue.length > 15) {
            displayValue = displayValue.substring(0, 12) + "...";
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
      return await this._exportCSV(stockItems, params);
    }
  }

  /**
   * Helper to determine column alignment based on content type
   * @param {string} header
   */
  _getColumnAlignment(header) {
    const centerAlign = ["Quantity", "Reorder Level", "Status"];
    const rightAlign = ["Cost", "Total Value"];

    if (centerAlign.includes(header)) return "center";
    if (rightAlign.includes(header)) return "right";
    return "left";
  }

  /**
   * Get stock status based on quantity and reorder level
   * @param {number} quantity
   * @param {number} reorder_level
   */
  _getStockStatus(quantity, reorder_level) {
    if (quantity === 0) {
      return "Out of Stock";
    } else if (quantity <= reorder_level) {
      return "Low Stock";
    } else {
      return "Normal";
    }
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

  /**
   * Get stock status filter options
   */
  getStockStatusOptions() {
    return [
      { value: "low_stock", label: "Low Stock" },
      { value: "out_of_stock", label: "Out of Stock" },
      { value: "normal", label: "Normal Stock" },
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
}

// Create and export handler instance
const stockItemExportHandler = new StockItemExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("stockItemExport", async (event, payload) => {
    return await stockItemExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment"
  );
}

// Export for use in other modules
module.exports = { StockItemExportHandler, stockItemExportHandler };