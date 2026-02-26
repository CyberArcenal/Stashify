// electron-app/main/ipc/handlers/stockMovementExportHandler.js
// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { AppDataSource } = require("../../../db/datasource");
const StockMovement = require("../../../../entities/StockMovement");

class StockMovementExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "stashly",
      "stock_movement_exports",
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

      console.log(`StockMovementExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          return await this.exportMovements(params);
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
      console.error("StockMovementExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export stock movements in specified format
   * @param {{ format: string; warehouse?: string; movement_type?: string; date_from?: string; date_to?: string; search?: string; }} params
   */
  async exportMovements(params) {
    try {
      const format = params.format || "csv";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get stock movement data
      const movements = await this._getMovementData(params);

      let result;
      switch (format) {
        case "csv":
          result = await this._exportCSV(movements, params);
          break;
        case "excel":
          result = await this._exportExcel(movements, params);
          break;
        case "pdf":
          result = await this._exportPDF(movements, params);
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
      console.error("exportMovements error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export stock movements: ${error.message}`,
        data: null,
      };
    }
  }

  /**
   * Get export preview data
   * @param {{ warehouse?: string; movement_type?: string; date_from?: string; date_to?: string; search?: string; }} params
   */
  async getExportPreview(params) {
    try {
      const movements = await this._getMovementData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          movements: movements.slice(0, 10), // Limit preview to 10 items
          totalCount: movements.length,
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
   * Get stock movement data with essential fields using TypeORM
   * @param {{ warehouse?: string; movement_type?: string; date_from?: string; date_to?: string; search?: string; }} params
   */
  async _getMovementData(params) {
    const movementRepo = AppDataSource.getRepository(StockMovement);

    const queryBuilder = movementRepo
      .createQueryBuilder("sm")
      .leftJoinAndSelect("sm.stockItem", "si")
      .leftJoinAndSelect("si.product", "p")
      .leftJoinAndSelect("si.variant", "pv")
      .leftJoinAndSelect("sm.warehouse", "w")
      .leftJoinAndSelect("sm.createdBy", "u")
      .select([
        "sm.id",
        "p.name as product_name",
        "p.sku as product_sku",
        "pv.name as variant_name",
        "pv.sku as variant_sku",
        "sm.movement_type",
        "sm.change",
        "w.name as warehouse_name",
        "u.username as user_name",
        "sm.reference_code",
        "sm.reason",
        "sm.created_at",
      ])
      .where("sm.is_deleted = 0");

    // Apply filters
    if (params.warehouse) {
      queryBuilder.andWhere("sm.warehouseId = :warehouseId", {
        warehouseId: params.warehouse,
      });
    }

    if (params.movement_type && params.movement_type !== "all") {
      queryBuilder.andWhere("sm.movement_type = :movementType", {
        movementType: params.movement_type,
      });
    }

    if (params.date_from) {
      queryBuilder.andWhere("sm.created_at >= :dateFrom", {
        dateFrom: params.date_from,
      });
    }

    if (params.date_to) {
      // Add time to end of day
      const endDate = new Date(params.date_to);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere("sm.created_at <= :dateTo", {
        dateTo: endDate.toISOString(),
      });
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      queryBuilder.andWhere(
        "(p.name LIKE :search OR p.sku LIKE :search OR w.name LIKE :search OR u.username LIKE :search OR sm.reference_code LIKE :search)",
        { search: searchTerm },
      );
    }

    queryBuilder.orderBy("sm.created_at", "DESC");

    const movements = await queryBuilder.getRawMany();

    // Process movements
    const processedMovements = [];
    for (const movement of movements) {
      const productName = movement.variant_name
        ? `${movement.product_name} - ${movement.variant_name}`
        : movement.product_name;

      const sku = movement.variant_sku || movement.product_sku || "N/A";
      const movementTypeDisplay = this._getMovementTypeDisplay(
        movement.sm_movement_type,
      );
      const direction = movement.sm_change > 0 ? "IN" : "OUT";

      processedMovements.push({
        Date: movement.sm_created_at
          ? new Date(movement.sm_created_at).toLocaleString()
          : "N/A",
        Product: productName || "",
        SKU: sku,
        Type: movementTypeDisplay,
        Quantity: Math.abs(movement.sm_change) || 0,
        Direction: direction,
        Warehouse: movement.warehouse_name || "N/A",
        User: movement.user_name || "System",
        Reference: movement.sm_reference_code || "",
        Reason: movement.sm_reason || "",
      });
    }

    return processedMovements;
  }

  /**
   * Export data as CSV
   * @param {any[]} movements
   * @param {any} params
   */
  // @ts-ignore
  // @ts-ignore
  async _exportCSV(movements, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `stock_movements_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Title
    csvContent.push("Stock Movements List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Movements: ${movements.length}`);
    csvContent.push("");

    // Headers
    if (movements.length > 0) {
      const headers = Object.keys(movements[0]);
      csvContent.push(headers.join(","));

      // Data rows
      movements.forEach((item) => {
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
   * @param {any[]} movements
   * @param {{ format: string; warehouse?: string; movement_type?: string; date_from?: string; date_to?: string; search?: string; }} params
   */
  async _exportExcel(movements, params) {
    try {
      if (!this.excelJS) {
        throw new Error("ExcelJS not available");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `stock_movements_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Inventory Management System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Stock Movements");

      // Set default column widths
      worksheet.columns = [
        { header: "Date", key: "date", width: 20 },
        { header: "Product", key: "product", width: 30 },
        { header: "SKU", key: "sku", width: 15 },
        { header: "Type", key: "type", width: 15 },
        { header: "Quantity", key: "quantity", width: 12 },
        { header: "Direction", key: "direction", width: 10 },
        { header: "Warehouse", key: "warehouse", width: 20 },
        { header: "User", key: "user", width: 15 },
        { header: "Reference", key: "reference", width: 20 },
        { header: "Reason", key: "reason", width: 25 },
      ];

      // Add title row
      const titleRow = worksheet.addRow(["Stock Movements List"]);
      titleRow.font = { bold: true, size: 14 };
      titleRow.height = 20;
      worksheet.mergeCells(`A1:J1`);

      // Add subtitle
      const subtitleRow = worksheet.addRow([
        `Generated: ${new Date().toLocaleString()} | Total: ${movements.length} movements`,
      ]);
      worksheet.mergeCells(`A2:J2`);
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
      movements.forEach((item, index) => {
        const row = worksheet.addRow([
          item.Date,
          item.Product,
          item.SKU,
          item.Type,
          item.Quantity,
          item.Direction,
          item.Warehouse,
          item.User,
          item.Reference,
          item.Reason,
        ]);

        // Zebra striping
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }

        // Center align numeric and direction columns
        row.getCell(5).alignment = { horizontal: "center" }; // Quantity
        row.getCell(6).alignment = { horizontal: "center" }; // Direction

        // Color code direction
        const directionCell = row.getCell(6);
        if (item.Direction === "IN") {
          directionCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "C6EFCE" }, // Green for IN
          };
        } else {
          directionCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" }, // Red for OUT
          };
        }
      });

      // Freeze header row
      worksheet.views = [{ state: "frozen", ySplit: 4 }];

      // Add auto-filter
      if (movements.length > 0) {
        worksheet.autoFilter = {
          from: { row: 4, column: 1 },
          to: { row: 4 + movements.length, column: 10 },
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
      return await this._exportCSV(movements, params);
    }
  }

  /**
   * Export data as PDF with improved compact layout
   * @param {any[]} movements
   * @param {any} params
   */
  async _exportPDF(movements, params) {
    try {
      let PDFKit;
      try {
        PDFKit = require("pdfkit");
      } catch (error) {
        console.warn("PDFKit not available, falling back to CSV");
        return await this._exportCSV(movements, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `stock_movements_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margin: 20,
        info: {
          Title: "Stock Movements List",
          Author: "Inventory Management System",
          CreationDate: new Date(),
        },
        bufferPages: true,
      });

      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Page metrics
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 20;
      const availableWidth = pageWidth - margin * 2;
      const headerFontSize = 8;
      const bodyFontSize = 9;
      const minRowHeight = 18;
      const cellPaddingV = 4;
      const cellPaddingH = 6;

      // Columns (tweak widths to give more room to Product and Reference)
      const columnWidths = [
        Math.floor(availableWidth * 0.12), // Date
        Math.floor(availableWidth * 0.28), // Product (wider)
        Math.floor(availableWidth * 0.1), // SKU
        Math.floor(availableWidth * 0.08), // Type
        Math.floor(availableWidth * 0.08), // Quantity
        Math.floor(availableWidth * 0.06), // Direction
        Math.floor(availableWidth * 0.12), // Warehouse
        Math.floor(availableWidth * 0.06), // User
        Math.floor(availableWidth * 0.1), // Reference
      ];
      // Adjust last column to fill rounding gaps
      const totalColsW = columnWidths.reduce((s, w) => s + w, 0);
      if (totalColsW < availableWidth) {
        columnWidths[columnWidths.length - 1] += availableWidth - totalColsW;
      }

      const headers = [
        "Date",
        "Product",
        "SKU",
        "Type",
        "Quantity",
        "Direction",
        "Warehouse",
        "User",
        "Reference",
      ];

      // Helpers
      // @ts-ignore
      const drawHeader = (y) => {
        doc.save();
        doc.rect(margin, y, availableWidth, minRowHeight).fill("#4A6FA5");
        doc.fillColor("white").font("Helvetica-Bold").fontSize(headerFontSize);
        let x = margin;
        for (let i = 0; i < headers.length; i++) {
          doc.text(headers[i], x + cellPaddingH, y + 4, {
            width: columnWidths[i] - cellPaddingH * 2,
            align: this._getColumnAlignment(headers[i]),
          });
          x += columnWidths[i];
        }
        doc.restore();
      };

      // @ts-ignore
      const drawFooter = (pageIndex, totalPages) => {
        const footerY = pageHeight - 18;
        doc.font("Helvetica").fontSize(7).fillColor("#666666");
        doc.text(`Page ${pageIndex} of ${totalPages}`, margin, footerY, {
          width: availableWidth,
          align: "right",
        });
      };

      // Title
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("Stock Movements List", {
          align: "center",
        });
      doc.moveDown(0.2);
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#333333")
        .text(
          `Generated: ${new Date().toLocaleString()} | Total: ${Array.isArray(movements) ? movements.length : 0} movements`,
          { align: "center" },
        );
      doc.moveDown(0.5);

      if (!Array.isArray(movements) || movements.length === 0) {
        doc.fontSize(11).text("No stock movements found.", { align: "center" });
        doc.end();
        await new Promise((resolve, reject) => {
          // @ts-ignore
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });
        const stats = fs.statSync(filepath);
        return { filename, fileSize: this._formatFileSize(stats.size) };
      }

      // Start table at current y
      let cursorY = doc.y;
      // Draw first header
      drawHeader(cursorY);
      cursorY += minRowHeight;

      // Render rows with dynamic height
      doc.font("Helvetica").fontSize(bodyFontSize).fillColor("#000000");

      for (let idx = 0; idx < movements.length; idx++) {
        const item = movements[idx];

        // Prepare cell texts
        const cells = [
          item.Date ?? "",
          item.Product ?? "",
          item.SKU ?? "",
          item.Type ?? "",
          item.Quantity != null ? String(item.Quantity) : "0",
          item.Direction ?? "",
          item.Warehouse ?? "",
          item.User ?? "",
          item.Reference ?? "",
        ];

        // Compute required height per cell using heightOfString
        let maxCellHeight = 0;
        for (let c = 0; c < cells.length; c++) {
          const w = columnWidths[c] - cellPaddingH * 2;
          const h = doc.heightOfString(String(cells[c]), {
            width: Math.max(10, w),
            align: this._getColumnAlignment(headers[c]),
            continued: false,
          });
          maxCellHeight = Math.max(maxCellHeight, h);
        }
        const requiredRowHeight = Math.max(
          minRowHeight,
          Math.ceil(maxCellHeight + cellPaddingV * 2),
        );

        // Page break if not enough space
        if (cursorY + requiredRowHeight > pageHeight - 40) {
          // draw footer for current page later after buffering pages; but to ensure visible footer per page, we can write footer now
          doc.addPage({ size: "A4", layout: "landscape", margin: 20 });
          cursorY = margin;
          drawHeader(cursorY);
          cursorY += minRowHeight;
          doc.font("Helvetica").fontSize(bodyFontSize).fillColor("#000000");
        }

        // Zebra background
        if (idx % 2 === 0) {
          doc
            .rect(margin, cursorY, availableWidth, requiredRowHeight)
            .fill("#F8F9FA");
        } else {
          doc
            .rect(margin, cursorY, availableWidth, requiredRowHeight)
            .fill("#FFFFFF");
        }

        // Cell borders (vertical lines)
        doc.lineWidth(0.3).strokeColor("#CCCCCC");
        let x = margin;
        for (let c = 0; c < columnWidths.length; c++) {
          doc
            .moveTo(x, cursorY)
            .lineTo(x, cursorY + requiredRowHeight)
            .stroke();
          x += columnWidths[c];
        }
        // rightmost vertical line
        doc
          .moveTo(margin + availableWidth, cursorY)
          .lineTo(margin + availableWidth, cursorY + requiredRowHeight)
          .stroke();
        // bottom border
        doc
          .moveTo(margin, cursorY + requiredRowHeight)
          .lineTo(margin + availableWidth, cursorY + requiredRowHeight)
          .stroke();

        // Render cell text with wrapping and vertical centering
        x = margin;
        for (let c = 0; c < cells.length; c++) {
          const cellText = String(cells[c]);
          const cw = columnWidths[c] - cellPaddingH * 2;
          const textHeight = doc.heightOfString(cellText, {
            width: Math.max(10, cw),
          });
          // compute top offset to vertically center text
          const topOffset = Math.max(0, (requiredRowHeight - textHeight) / 2);
          doc
            .fillColor("#000000")
            .font("Helvetica")
            .fontSize(bodyFontSize)
            .text(cellText, x + cellPaddingH, cursorY + topOffset, {
              width: Math.max(10, cw),
              align: this._getColumnAlignment(headers[c]),
              continued: false,
            });
          x += columnWidths[c];
        }

        // Color direction cell overlay (draw after text so color is visible)
        const dirIndex = 5;
        const dirX =
          margin + columnWidths.slice(0, dirIndex).reduce((s, v) => s + v, 0);
        if (cells[dirIndex] === "IN") {
          doc
            .rect(dirX, cursorY, columnWidths[dirIndex], requiredRowHeight)
            .fill("#C6EFCE");
          doc
            .fillColor("#000000")
            .font("Helvetica-Bold")
            .text(
              cells[dirIndex],
              dirX + cellPaddingH,
              cursorY + (requiredRowHeight - bodyFontSize) / 2,
              {
                width: columnWidths[dirIndex] - cellPaddingH * 2,
                align: "center",
              },
            );
        } else if (cells[dirIndex] === "OUT") {
          doc
            .rect(dirX, cursorY, columnWidths[dirIndex], requiredRowHeight)
            .fill("#FFC7CE");
          doc
            .fillColor("#000000")
            .font("Helvetica-Bold")
            .text(
              cells[dirIndex],
              dirX + cellPaddingH,
              cursorY + (requiredRowHeight - bodyFontSize) / 2,
              {
                width: columnWidths[dirIndex] - cellPaddingH * 2,
                align: "center",
              },
            );
        }

        // restore fill color for next row
        doc.fillColor("#000000").font("Helvetica").fontSize(bodyFontSize);

        cursorY += requiredRowHeight;
      }

      // Add footers for all pages using bufferedPageRange
      const range = doc.bufferedPageRange();
      const start = range.start || 0;
      const count = range.count || 0;
      for (let p = start; p < start + count; p++) {
        doc.switchToPage(p);
        drawFooter(p - start + 1, count);
      }

      // Finalize
      doc.end();
      await new Promise((resolve, reject) => {
        // @ts-ignore
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      const stats = fs.statSync(filepath);
      return { filename, fileSize: this._formatFileSize(stats.size) };
    } catch (error) {
      console.error("PDF export error:", error);
      return await this._exportCSV(movements, params);
    }
  }

  /**
   * Helper to determine column alignment based on content type
   * @param {string} header
   */
  _getColumnAlignment(header) {
    const centerAlign = ["Quantity", "Direction"];
    /**
     * @type {string | string[]}
     */
    const rightAlign = [];

    if (centerAlign.includes(header)) return "center";
    if (rightAlign.includes(header)) return "right";
    return "left";
  }

  /**
   * Get movement type display name
   * @param {string} movementType
   */
  _getMovementTypeDisplay(movementType) {
    const displayNames = {
      in: "Stock In",
      out: "Stock Out",
      transfer_out: "Transfer Out",
      transfer_in: "Transfer In",
      adjustment: "Adjustment",
    };
    // @ts-ignore
    return displayNames[movementType] || movementType;
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
   * Get movement type options
   */
  getMovementTypeOptions() {
    return [
      { value: "in", label: "Stock In" },
      { value: "out", label: "Stock Out" },
      { value: "transfer_out", label: "Transfer Out" },
      { value: "transfer_in", label: "Transfer In" },
      { value: "adjustment", label: "Adjustment" },
      { value: "all", label: "All Types" },
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
const stockMovementExportHandler = new StockMovementExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("stockMovementExport", async (event, payload) => {
    return await stockMovementExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

// Export for use in other modules
module.exports = { StockMovementExportHandler, stockMovementExportHandler };
