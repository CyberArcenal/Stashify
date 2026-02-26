// electron-app/main/ipc/handlers/purchaseExportHandler.js
// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { AppDataSource } = require("../../../db/datasource");
const Purchase = require("../../../../entities/Purchase");

class PurchaseExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "stashly",
      "purchase_exports",
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

      console.log(`PurchaseExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          // @ts-ignore
          return await this.exportPurchases(params);
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
      console.error("PurchaseExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export purchases in specified format
   * @param {{ format: string; }} params
   */
  async exportPurchases(params) {
    try {
      const format = params.format || "csv";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get purchase data
      // @ts-ignore
      const purchases = await this._getBasePurchasesData(params);

      let result;
      switch (format) {
        case "csv":
          result = await this._exportCSV(purchases, params);
          break;
        case "excel":
          result = await this._exportExcel(purchases, params);
          break;
        case "pdf":
          result = await this._exportPDF(purchases, params);
          break;
      }

      // Save export history
      await this._saveExportHistory({
        // @ts-ignore
        filename: result.filename,
        format: format,
        record_count: purchases.length,
        generated_at: new Date().toISOString(),
        // @ts-ignore
        file_size: result.fileSize || "N/A",
        filters: JSON.stringify(params),
      });

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
      console.error("exportPurchases error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export purchases: ${error.message}`,
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
      const purchases = await this._getBasePurchasesData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          purchases: purchases.slice(0, 10), // Limit preview to 10 items
          totalCount: purchases.length,
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
   * Get base purchases data with essential fields using TypeORM
   * @param {{ status: any; supplier: any; warehouse: any; start_date: any; end_date: any; search: any; }} params
   */
  async _getBasePurchasesData(params) {
    const purchaseRepo = AppDataSource.getRepository(Purchase);

    const queryBuilder = purchaseRepo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.supplier", "s")
      .leftJoinAndSelect("p.warehouse", "w")
      .leftJoinAndSelect("p.proceedBy", "u") // assuming relation name is proceedBy
      .select([
        "p.id",
        "p.purchase_number",
        "s.name as supplier_name",
        "w.name as warehouse_name",
        "p.status",
        "p.subtotal",
        "p.tax_amount",
        "p.total",
        "p.is_received",
        "u.username as proceed_by_username",
        "p.created_at",
        "p.received_at",
      ])
      .where("p.is_deleted = 0");

    // Apply filters
    if (params.status) {
      queryBuilder.andWhere("p.status = :status", { status: params.status });
    }

    if (params.supplier) {
      queryBuilder.andWhere("p.supplier_id = :supplierId", {
        supplierId: params.supplier,
      });
    }

    if (params.warehouse) {
      queryBuilder.andWhere("p.warehouseId = :warehouseId", {
        warehouseId: params.warehouse,
      });
    }

    if (params.start_date) {
      queryBuilder.andWhere("DATE(p.created_at) >= DATE(:startDate)", {
        startDate: params.start_date,
      });
    }

    if (params.end_date) {
      queryBuilder.andWhere("DATE(p.created_at) <= DATE(:endDate)", {
        endDate: params.end_date,
      });
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      queryBuilder.andWhere(
        "(p.purchase_number LIKE :search OR s.name LIKE :search OR w.name LIKE :search OR u.username LIKE :search)",
        { search: searchTerm },
      );
    }

    queryBuilder.orderBy("p.created_at", "DESC");

    const purchases = await queryBuilder.getRawMany();

    // Process purchases
    const processedPurchases = [];
    for (const purchase of purchases) {
      // Get status display
      const statusDisplay = this._getStatusDisplay(purchase.p_status);

      processedPurchases.push({
        "Purchase Number": purchase.p_purchase_number || "",
        Supplier: purchase.supplier_name || "",
        Warehouse: purchase.warehouse_name || "",
        Status: statusDisplay,
        Subtotal: parseFloat(purchase.p_subtotal || 0).toFixed(2),
        Tax: parseFloat(purchase.p_tax_amount || 0).toFixed(2),
        Total: parseFloat(purchase.p_total || 0).toFixed(2),
        Received: purchase.p_is_received === 1 ? "Yes" : "No",
        "Proceed By": purchase.proceed_by_username || "",
        "Created Date": new Date(purchase.p_created_at).toLocaleDateString(),
        "Received Date": purchase.p_received_at
          ? new Date(purchase.p_received_at).toLocaleDateString()
          : "",
      });
    }

    return processedPurchases;
  }

  /**
   * Export data as CSV
   * @param {any[]} purchases
   * @param {any} params
   */
  // @ts-ignore
  async _exportCSV(purchases, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `purchase_list_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Title
    csvContent.push("Purchase List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Purchases: ${purchases.length}`);
    csvContent.push("");

    // Headers
    if (purchases.length > 0) {
      const headers = Object.keys(purchases[0]);
      csvContent.push(headers.join(","));

      // Data rows
      purchases.forEach((/** @type {{ [x: string]: any; }} */ purchase) => {
        const row = headers.map((header) => {
          const value = purchase[header];
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
   * @param {any[]} purchases
   * @param {any} params
   */
  async _exportExcel(purchases, params) {
    try {
      if (!this.excelJS) {
        throw new Error("ExcelJS not available");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `purchase_list_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Purchase Management System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Purchases");

      // Set default column widths
      worksheet.columns = [
        { header: "Purchase #", key: "purchase_number", width: 15 },
        { header: "Supplier", key: "supplier", width: 20 },
        { header: "Warehouse", key: "warehouse", width: 15 },
        { header: "Status", key: "status", width: 12 },
        { header: "Subtotal", key: "subtotal", width: 12 },
        { header: "Tax", key: "tax", width: 10 },
        { header: "Total", key: "total", width: 12 },
        { header: "Processed", key: "processed", width: 10 },
        { header: "Received", key: "received", width: 10 },
        { header: "Proceed By", key: "proceed_by", width: 15 },
        { header: "Created Date", key: "created_date", width: 12 },
        { header: "Received Date", key: "received_date", width: 12 },
      ];

      // Add title row
      const titleRow = worksheet.addRow(["Purchase List"]);
      titleRow.font = { bold: true, size: 14 };
      titleRow.height = 20;
      worksheet.mergeCells(`A1:L1`);

      // Add subtitle
      const subtitleRow = worksheet.addRow([
        `Generated: ${new Date().toLocaleString()} | Total: ${purchases.length} purchases`,
      ]);
      worksheet.mergeCells(`A2:L2`);
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
      purchases.forEach(
        (
          /** @type {{ [x: string]: any; }} */ purchase,
          /** @type {number} */ index,
        ) => {
          const row = worksheet.addRow([
            purchase["Purchase Number"],
            purchase["Supplier"],
            purchase["Warehouse"],
            purchase["Status"],
            parseFloat(purchase["Subtotal"]),
            parseFloat(purchase["Tax"]),
            parseFloat(purchase["Total"]),
            purchase["Processed"],
            purchase["Received"],
            purchase["Proceed By"],
            purchase["Created Date"],
            purchase["Received Date"] || "",
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
          const subtotalCell = row.getCell(5);
          const taxCell = row.getCell(6);
          const totalCell = row.getCell(7);

          subtotalCell.numFmt = '"$"#,##0.00';
          subtotalCell.alignment = { horizontal: "right" };

          taxCell.numFmt = '"$"#,##0.00';
          taxCell.alignment = { horizontal: "right" };

          totalCell.numFmt = '"$"#,##0.00';
          totalCell.alignment = { horizontal: "right" };

          // Color code status
          const statusCell = row.getCell(4);
          const statusValue = purchase["Status"];
          if (statusValue === "Cancelled") {
            statusCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFC7CE" },
            };
          } else if (statusValue === "Pending") {
            statusCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFEB9C" },
            };
          } else if (statusValue === "Received") {
            statusCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "C6EFCE" },
            };
          }
        },
      );

      // Freeze header row
      worksheet.views = [{ state: "frozen", ySplit: 4 }];

      // Add auto-filter if there are rows
      if (purchases.length > 0) {
        worksheet.autoFilter = {
          from: { row: 4, column: 1 },
          to: { row: 4 + purchases.length, column: 12 },
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
      return await this._exportCSV(purchases, params);
    }
  }

  /**
   * Export data as PDF
   * @param {string | any[]} purchases
   * @param {any} params
   */
  async _exportPDF(purchases, params) {
    try {
      let PDFKit;
      try {
        PDFKit = require("pdfkit");
      } catch (error) {
        console.warn("PDFKit not available, falling back to CSV");
        // @ts-ignore
        return await this._exportCSV(purchases, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `purchase_list_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create a PDF document with landscape orientation
      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margin: 20,
        info: {
          Title: "Purchase List",
          Author: "Purchase Management System",
          CreationDate: new Date(),
        },
      });

      // Pipe to file
      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Title
      doc.fontSize(14).font("Helvetica-Bold").text("Purchase List", {
        align: "center",
      });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${purchases.length} purchases`,
          {
            align: "center",
          },
        );

      doc.moveDown(0.5);

      if (purchases.length === 0) {
        doc.fontSize(11).text("No purchases found.", { align: "center" });
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
        availableWidth * 0.12, // Purchase #
        availableWidth * 0.15, // Supplier
        availableWidth * 0.12, // Warehouse
        availableWidth * 0.1, // Status
        availableWidth * 0.08, // Subtotal
        availableWidth * 0.07, // Tax
        availableWidth * 0.08, // Total
        availableWidth * 0.07, // Processed
        availableWidth * 0.07, // Received
        availableWidth * 0.1, // Proceed By
        availableWidth * 0.08, // Created Date
        availableWidth * 0.09, // Received Date
      ];

      const rowHeight = 15;
      let currentY = topMargin;
      const headers = [
        "Purchase #",
        "Supplier",
        "Warehouse",
        "Status",
        "Subtotal",
        "Tax",
        "Total",
        "Processed",
        "Received",
        "Proceed By",
        "Created Date",
        "Received Date",
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

      for (let i = 0; i < purchases.length; i++) {
        const purchase = purchases[i];

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

        const purchaseData = [
          purchase["Purchase Number"],
          purchase["Supplier"],
          purchase["Warehouse"],
          purchase["Status"],
          purchase["Subtotal"],
          purchase["Tax"],
          purchase["Total"],
          purchase["Processed"],
          purchase["Received"],
          purchase["Proceed By"],
          purchase["Created Date"],
          purchase["Received Date"] || "",
        ];

        purchaseData.forEach((cellValue, j) => {
          // Truncate long text
          let displayValue = String(cellValue);
          if (j === 0 && displayValue.length > 10) {
            // Purchase #
            displayValue = displayValue.substring(0, 8) + "...";
          } else if (j === 1 && displayValue.length > 15) {
            // Supplier
            displayValue = displayValue.substring(0, 12) + "...";
          }

          // Format currency
          if (j === 4 || j === 5 || j === 6) {
            // Subtotal, Tax, Total
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
      return await this._exportCSV(purchases, params);
    }
  }

  /**
   * Helper to determine column alignment
   * @param {string} header
   */
  _getColumnAlignment(header) {
    const centerAlign = ["Processed", "Received"];
    const rightAlign = ["Subtotal", "Tax", "Total"];

    if (centerAlign.includes(header)) return "center";
    if (rightAlign.includes(header)) return "right";
    return "left";
  }

  /**
   * Get status display name
   * @param {string | number} status
   */
  _getStatusDisplay(status) {
    const statusMap = {
      pending: "Pending",
      confirmed: "Confirmed",
      received: "Received",
      cancelled: "Cancelled",
    };
    // @ts-ignore
    return statusMap[status] || status;
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

  /**
   * Get purchase status filter options
   */
  getPurchaseStatusOptions() {
    return [
      { value: "pending", label: "Pending" },
      { value: "confirmed", label: "Confirmed" },
      { value: "received", label: "Received" },
      { value: "cancelled", label: "Cancelled" },
    ];
  }

  /**
   * Save export history using TypeORM
   * @param {{ filename: any; format: any; record_count: any; generated_at: any; file_size: any; filters: any; }} exportData
   */
  async _saveExportHistory(exportData) {
    try {
      // Create table if it doesn't exist
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS export_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          format TEXT NOT NULL,
          record_count INTEGER DEFAULT 0,
          generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          generated_by TEXT DEFAULT 'system',
          file_size TEXT,
          filters_json TEXT,
          export_type TEXT DEFAULT 'purchase',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await AppDataSource.query(
        `INSERT INTO export_history 
         (filename, format, record_count, generated_at, file_size, filters_json, export_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          exportData.filename,
          exportData.format,
          exportData.record_count,
          exportData.generated_at,
          exportData.file_size,
          exportData.filters || "{}",
          "purchase",
        ],
      );

      return true;
    } catch (error) {
      // @ts-ignore
      console.warn("Failed to save export history:", error.message);
      return false;
    }
  }

  /**
   * Get export history using TypeORM
   */
  async getExportHistory() {
    try {
      // Ensure table exists
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS export_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          format TEXT NOT NULL,
          record_count INTEGER DEFAULT 0,
          generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          generated_by TEXT DEFAULT 'system',
          file_size TEXT,
          filters_json TEXT,
          export_type TEXT DEFAULT 'purchase',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const history = await AppDataSource.query(
        "SELECT * FROM export_history WHERE export_type = 'purchase' ORDER BY generated_at DESC LIMIT 50",
      );

      // Parse filters_json
      const parsedHistory = history.map(
        (/** @type {{ filters_json: string; }} */ item) => ({
          ...item,
          filters: item.filters_json ? JSON.parse(item.filters_json) : {},
        }),
      );

      return {
        status: true,
        message: "Export history fetched successfully",
        data: parsedHistory,
      };
    } catch (error) {
      console.error("getExportHistory error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to fetch export history: ${error.message}`,
        data: [],
      };
    }
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
}

// Create and export handler instance
const purchaseExportHandler = new PurchaseExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("purchaseExport", async (event, payload) => {
    return await purchaseExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

// Export for use in other modules
module.exports = { PurchaseExportHandler, purchaseExportHandler };
