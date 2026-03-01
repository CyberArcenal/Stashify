// electron-app/main/ipc/handlers/orderExportHandler.js
// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const Order = require("../../../../entities/Order");
const { AppDataSource } = require("../../../db/datasource");

class OrderExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "Stashify",
      "order_exports",
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

      console.log(`OrderExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          // @ts-ignore
          return await this.exportOrders(params);
        case "getExportPreview":
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
      console.error("OrderExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export orders in specified format
   * @param {{ format: string; status?: string; start_date?: string; end_date?: string; search?: string; }} params
   */
  async exportOrders(params) {
    try {
      const format = params.format || "csv";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get order data
      const orders = await this._getBaseOrdersData(params);

      let result;
      switch (format) {
        case "csv":
          result = await this._exportCSV(orders, params);
          break;
        case "excel":
          result = await this._exportExcel(orders, params);
          break;
        case "pdf":
          result = await this._exportPDF(orders, params);
          break;
      }

      // Save export history
      await this._saveExportHistory({
        // @ts-ignore
        filename: result.filename,
        format: format,
        record_count: orders.length,
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
      console.error("exportOrders error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export orders: ${error.message}`,
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
      const orders = await this._getBaseOrdersData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          orders: orders.slice(0, 10), // Limit preview to 10 items
          totalCount: orders.length,
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
   * Get base orders data with essential fields using TypeORM
   * @param {{ status?: string; start_date?: string; end_date?: string; search?: string; }} params
   */
  async _getBaseOrdersData(params) {
    const orderRepo = AppDataSource.getRepository(Order);

    // Build query builder - join with customer (not user)
    const queryBuilder = orderRepo
      .createQueryBuilder("o")
      .leftJoinAndSelect("o.customer", "c") // customer relation
      .select([
        "o.id",
        "o.order_number",
        "o.status",
        "o.subtotal",
        "o.tax_amount",
        "o.total",
        "o.created_at",
        "o.updated_at",
        "o.inventory_processed",
        "c.name as customer_name",
        "c.email as customer_email",
        // Subquery for items count
        "(SELECT COUNT(*) FROM order_items oi WHERE oi.orderId = o.id AND oi.is_deleted = 0) as items_count",
      ])
      .where("o.is_deleted = 0");

    // Apply filters
    if (params.status) {
      queryBuilder.andWhere("o.status = :status", { status: params.status });
    }
    if (params.start_date) {
      queryBuilder.andWhere("DATE(o.created_at) >= :start_date", {
        start_date: params.start_date,
      });
    }
    if (params.end_date) {
      queryBuilder.andWhere("DATE(o.created_at) <= :end_date", {
        end_date: params.end_date,
      });
    }
    if (params.search) {
      const searchTerm = `%${params.search}%`;
      queryBuilder.andWhere(
        "(o.order_number LIKE :search OR c.name LIKE :search OR c.email LIKE :search)",
        { search: searchTerm },
      );
    }

    queryBuilder.orderBy("o.created_at", "DESC");

    const orders = await queryBuilder.getRawMany();

    // Process orders
    const processedOrders = [];
    for (const order of orders) {
      processedOrders.push({
        "Order Number": order.o_order_number,
        Customer: order.customer_name || "N/A",
        Email: order.customer_email || "N/A",
        Status: this._getStatusDisplay(order.o_status),
        Subtotal: parseFloat(order.o_subtotal || 0).toFixed(2),
        Tax: parseFloat(order.o_tax_amount || 0).toFixed(2),
        Total: parseFloat(order.o_total || 0).toFixed(2),
        "Date Created": new Date(order.o_created_at).toLocaleDateString(),
        "Items Count": order.items_count || 0,
        "Inventory Processed": order.o_inventory_processed === 1 ? "Yes" : "No",
        "Processed By": "System", // offline, default
      });
    }

    return processedOrders;
  }

  /**
   * Export data as CSV
   * @param {any[]} orders
   * @param {any} params
   */
  // @ts-ignore
  async _exportCSV(orders, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `order_list_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Title
    csvContent.push("Order List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Orders: ${orders.length}`);
    csvContent.push("");

    // Headers
    const headers = Object.keys(orders[0] || {});
    csvContent.push(headers.join(","));

    // Data rows
    orders.forEach((order) => {
      const row = headers.map((header) => {
        const value = order[header];
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
   * Export data as Excel
   * @param {any[]} orders
   * @param {any} params
   */
  async _exportExcel(orders, params) {
    try {
      if (!this.excelJS) {
        throw new Error(
          "ExcelJS library not available. Please install: npm install exceljs",
        );
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `order_list_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Order Management System";
      workbook.created = new Date();

      // Create worksheet
      const worksheet = workbook.addWorksheet("Order List");

      // Title
      worksheet.mergeCells("A1:K1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "Order List";
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: "center" };

      // Metadata
      worksheet.getCell("A2").value =
        `Generated: ${new Date().toLocaleString()}`;
      worksheet.getCell("A3").value = `Total Orders: ${orders.length}`;
      worksheet.mergeCells("A3:K3");

      // Headers (starting from row 5)
      const headers = orders.length > 0 ? Object.keys(orders[0]) : [];
      worksheet.addRow(headers);

      // Style header row
      const headerRow = worksheet.getRow(5);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F2F2F2" },
      };
      headerRow.border = {
        bottom: { style: "thin" },
      };

      // Add data rows with zebra striping
      orders.forEach((order, index) => {
        const row = worksheet.addRow(Object.values(order));

        // Apply zebra striping
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F9F9F9" },
          };
        }

        // Format currency columns
        const subtotalCell = row.getCell(5); // Subtotal column
        const taxCell = row.getCell(6); // Tax column
        const totalCell = row.getCell(7); // Total column

        if (subtotalCell.value && subtotalCell.value !== "N/A") {
          subtotalCell.numFmt = '"$"#,##0.00';
        }

        if (taxCell.value && taxCell.value !== "N/A") {
          taxCell.numFmt = '"$"#,##0.00';
        }

        if (totalCell.value && totalCell.value !== "N/A") {
          totalCell.numFmt = '"$"#,##0.00';
        }

        // Center align numeric columns
        row.getCell(9).alignment = { horizontal: "center" }; // Items Count
        row.getCell(10).alignment = { horizontal: "center" }; // Inventory Processed

        // Color code status column
        const statusCell = row.getCell(4);
        const statusValue = statusCell.value;
        if (statusValue === "Completed") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "C6EFCE" }, // Green for completed
          };
        } else if (statusValue === "Pending") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEB9C" }, // Yellow for pending
          };
        } else if (statusValue === "Cancelled") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" }, // Red for cancelled
          };
        }
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        // @ts-ignore
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      // Freeze header row
      worksheet.views = [{ state: "frozen", ySplit: 5 }];

      // Add auto-filter for easy filtering
      worksheet.autoFilter = {
        from: { row: 5, column: 1 },
        to: { row: 5 + orders.length, column: headers.length },
      };

      // Save workbook
      await workbook.xlsx.writeFile(filepath);

      // Get file stats
      const stats = fs.statSync(filepath);

      return {
        filename: filename,
        fileSize: this._formatFileSize(stats.size),
      };
    } catch (error) {
      console.error("Excel export error:", error);
      // Fallback to CSV if Excel fails
      console.warn("Falling back to CSV export");
      return await this._exportCSV(orders, params);
    }
  }

  /**
   * Export data as PDF with improved compact layout
   * @param {any[]} orders
   * @param {any} params
   */
  async _exportPDF(orders, params) {
    try {
      let PDFKit;
      try {
        PDFKit = require("pdfkit");
      } catch (error) {
        console.warn("PDFKit not available, falling back to CSV");
        return await this._exportCSV(orders, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `order_list_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create a PDF document with landscape orientation
      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margin: 20,
        info: {
          Title: "Order List",
          Author: "Order Management System",
          CreationDate: new Date(),
        },
        bufferPages: true,
      });

      // Pipe to file
      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Title
      doc.fontSize(14).font("Helvetica-Bold").text("Order List", {
        align: "center",
      });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${orders.length} orders`,
          { align: "center" },
        );

      doc.moveDown(0.5);

      if (orders.length === 0) {
        doc.fontSize(11).text("No orders found.", { align: "center" });
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
      const pageWidth = 842; // A4 landscape width
      const pageHeight = 595;
      const leftMargin = 20;
      const rightMargin = 20;
      const topMargin = doc.y;
      const availableWidth = pageWidth - leftMargin - rightMargin;

      // Define column widths (11 columns)
      const columnWidths = [
        availableWidth * 0.1, // Order Number
        availableWidth * 0.15, // Customer
        availableWidth * 0.12, // Email
        availableWidth * 0.08, // Status
        availableWidth * 0.07, // Subtotal
        availableWidth * 0.06, // Tax
        availableWidth * 0.07, // Total
        availableWidth * 0.08, // Date Created
        availableWidth * 0.06, // Items Count
        availableWidth * 0.08, // Inventory Processed
        availableWidth * 0.13, // Processed By
      ];

      const rowHeight = 15;
      let currentY = topMargin;
      const headers = Object.keys(orders[0]);

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

      // Data rows
      doc.fontSize(8).font("Helvetica");

      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];

        // New page if needed
        if (currentY + rowHeight > pageHeight - 20) {
          doc.addPage({
            size: "A4",
            layout: "landscape",
            margin: 20,
          });
          currentY = 20;

          // Redraw header
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

        headers.forEach((header, j) => {
          let cellValue = String(order[header]);

          // Truncate text if too long
          if (header === "Customer" && cellValue.length > 20) {
            cellValue = cellValue.substring(0, 17) + "...";
          } else if (header === "Email" && cellValue.length > 20) {
            cellValue = cellValue.substring(0, 17) + "...";
          } else if (header === "Processed By" && cellValue.length > 15) {
            cellValue = cellValue.substring(0, 12) + "...";
          }

          // Format currency
          if (
            (header === "Subtotal" || header === "Tax" || header === "Total") &&
            cellValue !== "N/A"
          ) {
            cellValue = "$" + cellValue;
          }

          // Color code status
          if (header === "Status") {
            if (cellValue === "Completed") {
              doc.fillColor("#2E7D32");
            } else if (cellValue === "Pending") {
              doc.fillColor("#F57C00");
            } else if (cellValue === "Cancelled") {
              doc.fillColor("#C62828");
            } else {
              doc.fillColor("#000000");
            }
          } else {
            doc.fillColor("#000000");
          }

          doc.text(cellValue, xPos + 3, currentY + 4, {
            width: columnWidths[j] - 6,
            align: this._getColumnAlignment(header),
          });

          xPos += columnWidths[j];
        });

        currentY += rowHeight;
      }

      // ✅ FIXED: Footer with 1‑based page numbers
      const range = doc.bufferedPageRange();
      const start = range.start || 0;
      const count = range.count || 0;
      for (let p = start; p < start + count; p++) {
        doc.switchToPage(p);
        doc
          .fontSize(7)
          .fillColor("#666666")
          .text(
            `Page ${p - start + 1} of ${count}`,
            leftMargin,
            pageHeight - 15,
            {
              align: "right",
              width: availableWidth,
            },
          );
      }

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
    } catch (error) {
      console.error("PDF export error:", error);
      return await this._exportCSV(orders, params);
    }
  }

  /**
   * Helper to determine column alignment based on content type
   * @param {string} header
   */
  _getColumnAlignment(header) {
    const centerAlign = ["Items Count", "Inventory Processed"];
    const rightAlign = ["Subtotal", "Tax", "Total"];

    if (centerAlign.includes(header)) return "center";
    if (rightAlign.includes(header)) return "right";
    return "left";
  }

  /**
   * Save export history using TypeORM raw query
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
          export_type TEXT DEFAULT 'order',
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
          "order",
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
   * Get export history using TypeORM raw query
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
          export_type TEXT DEFAULT 'order',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const history = await AppDataSource.query(
        "SELECT * FROM export_history WHERE export_type = 'order' ORDER BY generated_at DESC LIMIT 50",
      );

      // Parse filters_json
      // @ts-ignore
      const parsedHistory = history.map((item) => ({
        ...item,
        filters: item.filters_json ? JSON.parse(item.filters_json) : {},
      }));

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

  /**
   * Get export templates
   */
  async getExportTemplates() {
    try {
      // Ensure table exists
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS export_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          filters_json TEXT,
          export_type TEXT DEFAULT 'order',
          created_by TEXT DEFAULT 'system',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add default templates if none exist
      const templateCount = await AppDataSource.query(
        "SELECT COUNT(*) as count FROM export_templates WHERE export_type = 'order'",
      );

      if (templateCount[0].count === 0) {
        const defaultTemplates = [
          {
            name: "Pending Orders",
            description: "Orders that are pending processing",
            filters_json: JSON.stringify({
              status: "pending",
            }),
          },
          {
            name: "Completed Orders",
            description: "Orders that have been completed",
            filters_json: JSON.stringify({
              status: "completed",
            }),
          },
          {
            name: "Recent Orders (Last 30 Days)",
            description: "Orders from the last 30 days",
            filters_json: JSON.stringify({
              start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            }),
          },
        ];

        for (const template of defaultTemplates) {
          await AppDataSource.query(
            "INSERT INTO export_templates (name, description, filters_json, export_type) VALUES (?, ?, ?, ?)",
            [
              template.name,
              template.description,
              template.filters_json,
              "order",
            ],
          );
        }
      }

      const templates = await AppDataSource.query(
        "SELECT * FROM export_templates WHERE export_type = 'order' ORDER BY name",
      );

      // Parse filters_json
      // @ts-ignore
      const parsedTemplates = templates.map((template) => ({
        ...template,
        filters: template.filters_json ? JSON.parse(template.filters_json) : {},
      }));

      return {
        status: true,
        message: "Export templates fetched successfully",
        data: parsedTemplates,
      };
    } catch (error) {
      console.error("getExportTemplates error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to fetch export templates: ${error.message}`,
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

  /**
   * Get status display text
   * @param {string} status
   */
  _getStatusDisplay(status) {
    const statusMap = {
      pending: "Pending",
      confirmed: "Confirmed",
      completed: "Completed",
      cancelled: "Cancelled",
      refunded: "Refunded",
    };
    return (
      // @ts-ignore
      statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1)
    );
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
   * Get order status filter options
   */
  getOrderStatusOptions() {
    return [
      { value: "pending", label: "Pending" },
      { value: "confirmed", label: "Confirmed" },
      { value: "completed", label: "Completed" },
      { value: "cancelled", label: "Cancelled" },
      { value: "refunded", label: "Refunded" },
    ];
  }

  /**
   * Get time range options
   */
  getTimeRangeOptions() {
    return [
      { value: "24h", label: "Last 24 Hours" },
      { value: "7d", label: "Last 7 Days" },
      { value: "30d", label: "Last 30 Days" },
      { value: "90d", label: "Last 90 Days" },
    ];
  }
}

// Create and export handler instance
const orderExportHandler = new OrderExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("orderExport", async (event, payload) => {
    return await orderExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

// Export for use in other modules
module.exports = { OrderExportHandler, orderExportHandler };
