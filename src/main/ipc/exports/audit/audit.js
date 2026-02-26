// electron-app/main/ipc/handlers/auditLogExportCRUD.js
// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { getDb } = require(
  path.join(__dirname, "..", "..", "models", "BaseQuerySet"),
);

class AuditLogExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "stashly",
      "audit_log_exports",
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
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      console.log(`AuditLogExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          return await this.exportAuditLogs(params);
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
      console.error("AuditLogExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export audit logs in specified format
   * @param {{ format: string; date_from?: string; date_to?: string; user_id?: string; action_type?: string; model_name?: string; suspicious?: boolean; }} params
   */
  async exportAuditLogs(params) {
    try {
      const format = params.format || "csv";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get audit log data
      const logs = await this._getBaseAuditLogsData(params);

      let result;
      switch (format) {
        case "csv":
          result = await this._exportCSV(logs, params);
          break;
        case "excel":
          result = await this._exportExcel(logs, params);
          break;
        case "pdf":
          result = await this._exportPDF(logs, params);
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
      console.error("exportAuditLogs error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export audit logs: ${error.message}`,
        data: null,
      };
    }
  }

  /**
   * Get export preview data
   * @param {{ date_from?: string; date_to?: string; user_id?: string; action_type?: string; model_name?: string; suspicious?: boolean; }} params
   */
  async getExportPreview(params) {
    try {
      const logs = await this._getBaseAuditLogsData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          logs: logs.slice(0, 10), // Limit preview to 10 items
          totalCount: logs.length,
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
   * Get base audit logs data with essential fields
   * @param {{ date_from?: string; date_to?: string; user_id?: string; action_type?: string; model_name?: string; suspicious?: boolean; }} params
   */
  async _getBaseAuditLogsData(params) {
    const db = getDb();

    // Build query for audit logs
    let query = `
      SELECT 
        a.id,
        a.created_at,
        a.action_type,
        a.model_name,
        a.object_id,
        a.ip_address,
        a.user_agent,
        a.is_suspicious,
        a.suspicious_reason,
        u.username as user_name,
        u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.is_deleted = 0
    `;

    const conditions = [];
    const values = [];

    // Apply date filters
    if (params.date_from) {
      conditions.push("DATE(a.created_at) >= ?");
      values.push(params.date_from);
    }

    if (params.date_to) {
      conditions.push("DATE(a.created_at) <= ?");
      values.push(params.date_to);
    }

    // Apply user filter
    if (params.user_id && params.user_id !== "all") {
      conditions.push("a.user_id = ?");
      values.push(params.user_id);
    }

    // Apply action type filter
    if (params.action_type && params.action_type !== "all") {
      conditions.push("a.action_type = ?");
      values.push(params.action_type);
    }

    // Apply model name filter
    if (params.model_name && params.model_name !== "all") {
      conditions.push("a.model_name LIKE ?");
      values.push(`%${params.model_name}%`);
    }

    // Apply suspicious filter
    if (params.suspicious === true) {
      conditions.push("a.is_suspicious = 1");
    } else if (params.suspicious === false) {
      conditions.push("a.is_suspicious = 0");
    }

    // Add WHERE conditions
    if (conditions.length > 0) {
      query += " AND " + conditions.join(" AND ");
    }

    query += " ORDER BY a.created_at DESC";

    // Get logs
    // @ts-ignore
    const logs = await db.all(query, values);

    // Process logs
    const processedLogs = [];
    for (const log of logs) {
      // Get action display name
      const actionDisplay = this._getActionDisplay(log.action_type);

      processedLogs.push({
        Date: new Date(log.created_at).toLocaleDateString(),
        Time: new Date(log.created_at).toLocaleTimeString(),
        User: log.user_name || "System",
        "User Email": log.user_email || "system@localhost",
        Action: actionDisplay,
        Model: log.model_name || "N/A",
        "Object ID": log.object_id || "N/A",
        "IP Address": log.ip_address || "N/A",
        Suspicious: log.is_suspicious === 1 ? "Yes" : "No",
        "Suspicious Reason": log.suspicious_reason || "",
        "User Agent": log.user_agent || "",
      });
    }

    return processedLogs;
  }

  /**
   * Export data as CSV
   * @param {any[]} logs
   * @param {any} params
   */
  // @ts-ignore
  async _exportCSV(logs, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `audit_log_list_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Title
    csvContent.push("Audit Log List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Logs: ${logs.length}`);
    csvContent.push("");

    // Headers
    if (logs.length > 0) {
      const headers = Object.keys(logs[0]);
      csvContent.push(headers.join(","));

      // Data rows
      logs.forEach((log) => {
        const row = headers.map((header) => {
          const value = log[header];
          return typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value;
        });
        csvContent.push(row.join(","));
      });
    } else {
      csvContent.push("No data available");
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
   * @param {any[]} logs
   * @param {any} params
   */
  async _exportExcel(logs, params) {
    try {
      if (!this.excelJS) {
        throw new Error("ExcelJS not available");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `audit_log_list_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Audit Log Management System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Audit Logs");

      // Set column widths
      worksheet.columns = [
        { header: "Date", key: "date", width: 12 },
        { header: "Time", key: "time", width: 10 },
        { header: "User", key: "user", width: 15 },
        { header: "User Email", key: "user_email", width: 20 },
        { header: "Action", key: "action", width: 15 },
        { header: "Model", key: "model", width: 15 },
        { header: "Object ID", key: "object_id", width: 12 },
        { header: "IP Address", key: "ip_address", width: 15 },
        { header: "Suspicious", key: "suspicious", width: 12 },
        { header: "Suspicious Reason", key: "suspicious_reason", width: 25 },
      ];

      // Add title row
      const titleRow = worksheet.addRow(["Audit Log List"]);
      titleRow.font = { bold: true, size: 14 };
      titleRow.height = 20;
      worksheet.mergeCells(`A1:J1`);

      // Add subtitle
      const subtitleRow = worksheet.addRow([
        `Generated: ${new Date().toLocaleString()} | Total: ${logs.length} logs`,
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
        fgColor: { argb: "4472C4" },
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 20;
      headerRow.border = {
        bottom: { style: "thin", color: { argb: "000000" } },
      };

      // Add data rows
      logs.forEach((log, index) => {
        const row = worksheet.addRow([
          log["Date"],
          log["Time"],
          log["User"],
          log["User Email"],
          log["Action"],
          log["Model"],
          log["Object ID"],
          log["IP Address"],
          log["Suspicious"],
          log["Suspicious Reason"],
        ]);

        // Zebra striping
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }

        // Color code suspicious rows
        const suspiciousCell = row.getCell(9);
        if (log["Suspicious"] === "Yes") {
          suspiciousCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" }, // Light red
          };
        }

        // Center align some columns
        suspiciousCell.alignment = { horizontal: "center" };
      });

      // Freeze header row
      worksheet.views = [{ state: "frozen", ySplit: 4 }];

      // Add auto-filter
      if (logs.length > 0) {
        worksheet.autoFilter = {
          from: { row: 4, column: 1 },
          to: { row: 4 + logs.length, column: 10 },
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
      return await this._exportCSV(logs, params);
    }
  }

  /**
   * Export data as PDF with compact layout
   * @param {any[]} logs
   * @param {any} params
   */
  async _exportPDF(logs, params) {
    try {
      let PDFKit;
      try {
        PDFKit = require("pdfkit");
      } catch (error) {
        console.warn("PDFKit not available, falling back to CSV");
        return await this._exportCSV(logs, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `audit_log_list_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create a PDF document with landscape orientation
      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margin: 20,
        info: {
          Title: "Audit Log List",
          Author: "Audit Log Management System",
          CreationDate: new Date(),
        },
      });

      // Pipe to file
      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Title
      doc.fontSize(14).font("Helvetica-Bold").text("Audit Log List", {
        align: "center",
      });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${logs.length} logs`,
          {
            align: "center",
          },
        );

      doc.moveDown(0.5);

      if (logs.length === 0) {
        doc.fontSize(11).text("No audit logs found.", { align: "center" });
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

      // Define column widths (10 columns)
      const columnWidths = [
        availableWidth * 0.08, // Date (8%)
        availableWidth * 0.06, // Time (6%)
        availableWidth * 0.1, // User (10%)
        availableWidth * 0.13, // User Email (13%)
        availableWidth * 0.1, // Action (10%)
        availableWidth * 0.1, // Model (10%)
        availableWidth * 0.08, // Object ID (8%)
        availableWidth * 0.1, // IP Address (10%)
        availableWidth * 0.08, // Suspicious (8%)
        availableWidth * 0.17, // Suspicious Reason (17%)
      ];

      const rowHeight = 15;
      let currentY = topMargin;
      const headers = [
        "Date",
        "Time",
        "User",
        "User Email",
        "Action",
        "Model",
        "Object ID",
        "IP Address",
        "Suspicious",
        "Suspicious Reason",
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
          align: "center",
        });
        xPos += columnWidths[i];
      });

      currentY += rowHeight;

      // Draw data rows
      doc.fontSize(8).font("Helvetica");

      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

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
              align: "center",
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
          log["Date"],
          log["Time"],
          log["User"],
          log["User Email"],
          log["Action"],
          log["Model"],
          log["Object ID"] || "",
          log["IP Address"],
          log["Suspicious"],
          log["Suspicious Reason"] || "",
        ];

        rowData.forEach((value, j) => {
          let cellValue = String(value);

          // Truncate text if too long
          if (j === 3 && cellValue.length > 20) {
            // User Email column
            cellValue = cellValue.substring(0, 17) + "...";
          } else if (j === 9 && cellValue.length > 25) {
            // Suspicious Reason column
            cellValue = cellValue.substring(0, 22) + "...";
          } else if (j === 4 && cellValue.length > 12) {
            // Action column
            cellValue = cellValue.substring(0, 9) + "...";
          }

          doc.text(cellValue, xPos + 3, currentY + 4, {
            width: columnWidths[j] - 6,
            align: j === 8 ? "center" : "left", // Center align suspicious column
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
      return await this._exportCSV(logs, params);
    }
  }

  // HELPER METHODS

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
   * Get action display name
   * @param {string} actionType
   */
  _getActionDisplay(actionType) {
    const actionMap = {
      create: "Create",
      update: "Update",
      delete: "Delete",
      read: "Read",
      login: "Login",
      logout: "Logout",
      login_failed: "Failed Login",
      password_change: "Password Change",
      password_reset: "Password Reset",
      user_create: "User Create",
      user_update: "User Update",
      user_delete: "User Delete",
      role_assign: "Role Assign",
      role_revoke: "Role Revoke",
    };

    // @ts-ignore
    return actionMap[actionType] || actionType.replace(/_/g, " ");
  }

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
   * Get filter options for UI
   */
  getActionTypeOptions() {
    return [
      { value: "all", label: "All Actions" },
      { value: "create", label: "Create" },
      { value: "update", label: "Update" },
      { value: "delete", label: "Delete" },
      { value: "login", label: "Login" },
      { value: "logout", label: "Logout" },
      { value: "login_failed", label: "Failed Login" },
      { value: "password_change", label: "Password Change" },
    ];
  }

  /**
   * Get model options for UI
   */
  getModelOptions() {
    return [
      { value: "all", label: "All Models" },
      { value: "User", label: "User" },
      { value: "Product", label: "Product" },
      { value: "Order", label: "Order" },
      { value: "Inventory", label: "Inventory" },
      { value: "Category", label: "Category" },
      { value: "Supplier", label: "Supplier" },
    ];
  }
}

// Create and export handler instance
const auditLogExportHandler = new AuditLogExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("auditExport", async (event, payload) => {
    return await auditLogExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

// Export for use in other modules
module.exports = { AuditLogExportHandler, auditLogExportHandler };
