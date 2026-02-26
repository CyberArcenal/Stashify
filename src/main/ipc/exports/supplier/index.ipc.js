// electron-app/main/ipc/handlers/supplierExportHandler.js
//@ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const Supplier = require("../../../../entities/Supplier");
const { AppDataSource } = require("../../../db/datasource");

class SupplierExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "stashly",
      "supplier_exports",
    );

    // Create export directory if it doesn't exist
    if (!fs.existsSync(this.EXPORT_DIR)) {
      fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
    }

    // Initialize ExcelJS if available
    this.excelJS = null;
    this._initializeExcelJS();

    // Supplier status constants
    this.SUPPLIER_STATUS = {
      PENDING: "pending",
      APPROVED: "approved",
      REJECTED: "rejected",
    };
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
   */
  // @ts-ignore
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      console.log(`SupplierExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          return await this.exportSuppliers(params);
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
      console.error("SupplierExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export suppliers in specified format
   */
  // @ts-ignore
  async exportSuppliers(params) {
    try {
      const format = params.format || "csv";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get supplier data
      const suppliers = await this._getBaseSuppliersData(params);

      let result;
      switch (format) {
        case "csv":
          result = await this._exportCSV(suppliers, params);
          break;
        case "excel":
          result = await this._exportExcel(suppliers, params);
          break;
        case "pdf":
          result = await this._exportPDF(suppliers, params);
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
      console.error("exportSuppliers error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export suppliers: ${error.message}`,
        data: null,
      };
    }
  }

  /**
   * Get export preview data
   */
  // @ts-ignore
  async getExportPreview(params) {
    try {
      const suppliers = await this._getBaseSuppliersData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          suppliers: suppliers.slice(0, 10), // Limit preview to 10 items
          totalCount: suppliers.length,
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
   * Get base suppliers data with essential fields using TypeORM
   */
  // @ts-ignore
  async _getBaseSuppliersData(params) {
    const supplierRepo = AppDataSource.getRepository(Supplier);

    const queryBuilder = supplierRepo
      .createQueryBuilder("s")
      .select([
        "s.id",
        "s.name",
        "s.contact_person",
        "s.email",
        "s.phone",
        "s.address",
        "s.tax_id",
        "s.status",
        "s.is_active",
        "s.notes",
        "s.created_at",
        "s.updated_at",
      ])
      .where("s.is_deleted = 0");

    // Apply filters
    if (params.status && params.status !== "all") {
      queryBuilder.andWhere("s.status = :status", { status: params.status });
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      queryBuilder.andWhere(
        "(s.name LIKE :search OR s.contact_person LIKE :search OR s.email LIKE :search OR s.phone LIKE :search OR s.tax_id LIKE :search)",
        { search: searchTerm },
      );
    }

    if (params.is_active !== undefined) {
      // Convert string "true"/"false" to boolean if needed
      const isActive = params.is_active === "true" || params.is_active === true;
      queryBuilder.andWhere("s.is_active = :isActive", { isActive });
    }

    if (params.start_date) {
      queryBuilder.andWhere("s.created_at >= :startDate", {
        startDate: params.start_date,
      });
    }

    if (params.end_date) {
      // Add time to end of day
      const endDate = new Date(params.end_date);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere("s.created_at <= :endDate", {
        endDate: endDate.toISOString(),
      });
    }

    queryBuilder.orderBy("s.name");

    const suppliers = await queryBuilder.getRawMany();

    // Process suppliers
    const processedSuppliers = [];
    for (const supplier of suppliers) {
      processedSuppliers.push({
        ID: supplier.s_id,
        Name: supplier.s_name || "",
        "Contact Person": supplier.s_contact_person || "N/A",
        Email: supplier.s_email || "N/A",
        Phone: supplier.s_phone || "N/A",
        Address: supplier.s_address || "N/A",
        "Tax ID": supplier.s_tax_id || "N/A",
        Status: this._getStatusDisplay(supplier.s_status),
        Active: supplier.s_is_active === 1 ? "Yes" : "No",
        Notes: supplier.s_notes || "",
        "Created Date": supplier.s_created_at
          ? supplier.s_created_at.split("T")[0]
          : "",
        "Updated Date": supplier.s_updated_at
          ? supplier.s_updated_at.split("T")[0]
          : "",
      });
    }

    return processedSuppliers;
  }

  /**
   * Export data as CSV
   */
  // @ts-ignore
  async _exportCSV(suppliers, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `supplier_list_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Title
    csvContent.push("Supplier List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Suppliers: ${suppliers.length}`);
    csvContent.push("");

    // Headers
    if (suppliers.length > 0) {
      const headers = Object.keys(suppliers[0]);
      csvContent.push(headers.join(","));
    }

    // Data rows
    // @ts-ignore
    suppliers.forEach((supplier) => {
      const row = Object.values(supplier).map((value) => {
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
   */
  // @ts-ignore
  async _exportExcel(suppliers, params) {
    try {
      if (!this.excelJS) {
        throw new Error("ExcelJS not available");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `supplier_list_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Supplier Management System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Suppliers");

      // Set default column widths
      worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Name", key: "name", width: 25 },
        { header: "Contact Person", key: "contact_person", width: 20 },
        { header: "Email", key: "email", width: 25 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Address", key: "address", width: 30 },
        { header: "Tax ID", key: "tax_id", width: 15 },
        { header: "Status", key: "status", width: 12 },
        { header: "Active", key: "active", width: 10 },
        { header: "Created Date", key: "created_date", width: 12 },
        { header: "Updated Date", key: "updated_date", width: 12 },
      ];

      // Add title row
      const titleRow = worksheet.addRow(["Supplier List"]);
      titleRow.font = { bold: true, size: 14 };
      titleRow.height = 20;
      worksheet.mergeCells(`A1:K1`);

      // Add subtitle
      const subtitleRow = worksheet.addRow([
        `Generated: ${new Date().toLocaleString()} | Total: ${suppliers.length} suppliers`,
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
      // @ts-ignore
      suppliers.forEach((supplier, index) => {
        const row = worksheet.addRow([
          supplier["ID"],
          supplier["Name"],
          supplier["Contact Person"],
          supplier["Email"],
          supplier["Phone"],
          supplier["Address"],
          supplier["Tax ID"],
          supplier["Status"],
          supplier["Active"],
          supplier["Created Date"],
          supplier["Updated Date"],
        ]);

        // Zebra striping
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }

        // Center align ID and Active status
        row.getCell(1).alignment = { horizontal: "center" }; // ID
        row.getCell(9).alignment = { horizontal: "center" }; // Active

        // Color code status
        const statusCell = row.getCell(8);
        if (supplier["Status"] === "Approved") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "C6EFCE" }, // Green
          };
        } else if (supplier["Status"] === "Pending") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEB9C" }, // Yellow
          };
        } else if (supplier["Status"] === "Rejected") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" }, // Red
          };
        }
      });

      // Freeze header row
      worksheet.views = [{ state: "frozen", ySplit: 4 }];

      // Add auto-filter
      if (suppliers.length > 0) {
        worksheet.autoFilter = {
          from: { row: 4, column: 1 },
          to: { row: 4 + suppliers.length, column: 11 },
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
      return await this._exportCSV(suppliers, params);
    }
  }

  /**
   * Export data as PDF
   */
  // @ts-ignore
  async _exportPDF(suppliers, params) {
    try {
      let PDFKit;
      try {
        PDFKit = require("pdfkit");
      } catch (error) {
        console.warn("PDFKit not available, falling back to CSV");
        return await this._exportCSV(suppliers, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `supplier_list_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create a PDF document
      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margin: 20,
        info: {
          Title: "Supplier List",
          Author: "Supplier Management System",
          CreationDate: new Date(),
        },
      });

      // Pipe to file
      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Title
      doc.fontSize(14).font("Helvetica-Bold").text("Supplier List", {
        align: "center",
      });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${suppliers.length} suppliers`,
          {
            align: "center",
          },
        );

      doc.moveDown(0.5);

      if (suppliers.length === 0) {
        doc.fontSize(11).text("No suppliers found.", { align: "center" });
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
      const pageWidth = 842;
      const leftMargin = 20;
      const rightMargin = 20;
      const topMargin = doc.y;
      const availableWidth = pageWidth - leftMargin - rightMargin;

      // Define column widths
      const columnWidths = [
        availableWidth * 0.07, // ID
        availableWidth * 0.15, // Name
        availableWidth * 0.12, // Contact Person
        availableWidth * 0.15, // Email
        availableWidth * 0.1, // Phone
        availableWidth * 0.1, // Status
        availableWidth * 0.08, // Active
        availableWidth * 0.1, // Created Date
        availableWidth * 0.13, // Notes (simplified)
      ];

      const rowHeight = 15;
      let currentY = topMargin;
      const headers = [
        "ID",
        "Name",
        "Contact",
        "Email",
        "Phone",
        "Status",
        "Active",
        "Created",
        "Notes",
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
          align: "left",
        });
        xPos += columnWidths[i];
      });

      currentY += rowHeight;

      // Draw data rows
      doc.fontSize(8).font("Helvetica");

      for (let i = 0; i < suppliers.length; i++) {
        const supplier = suppliers[i];

        // Check if we need a new page
        if (currentY + rowHeight > 575) {
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
              align: "left",
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
        }

        // Draw cell content
        doc.fillColor("#000000");
        xPos = leftMargin;

        const supplierData = [
          supplier["ID"],
          supplier["Name"],
          supplier["Contact Person"],
          supplier["Email"],
          supplier["Phone"],
          supplier["Status"],
          supplier["Active"],
          supplier["Created Date"],
          supplier["Notes"] || "",
        ];

        supplierData.forEach((value, j) => {
          let cellValue = String(value);

          // Truncate text if too long
          if (j === 1 && cellValue.length > 20) {
            // Name
            cellValue = cellValue.substring(0, 17) + "...";
          } else if (j === 2 && cellValue.length > 15) {
            // Contact
            cellValue = cellValue.substring(0, 12) + "...";
          } else if (j === 3 && cellValue.length > 20) {
            // Email
            cellValue = cellValue.substring(0, 17) + "...";
          } else if (j === 8 && cellValue.length > 25) {
            // Notes
            cellValue = cellValue.substring(0, 22) + "...";
          }

          // Status color coding
          if (j === 5) {
            // Status column
            if (cellValue === "Approved") {
              doc.fillColor("green");
            } else if (cellValue === "Pending") {
              doc.fillColor("orange");
            } else if (cellValue === "Rejected") {
              doc.fillColor("red");
            }
          }

          doc.text(cellValue, xPos + 3, currentY + 4, {
            width: columnWidths[j] - 6,
            align: "left",
          });

          // Reset color
          doc.fillColor("#000000");

          xPos += columnWidths[j];
        });

        currentY += rowHeight;
      }

      // Add footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(7)
          .fillColor("#666666")
          .text(`Page ${i + 1} of ${pageCount}`, leftMargin, 575, {
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
      return await this._exportCSV(suppliers, params);
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
        description: "Compact table layout optimized for printing",
      },
    ];
  }

  /**
   * Get status filter options
   */
  getStatusOptions() {
    return [
      { value: "all", label: "All Statuses" },
      { value: this.SUPPLIER_STATUS.APPROVED, label: "Approved" },
      { value: this.SUPPLIER_STATUS.PENDING, label: "Pending" },
      { value: this.SUPPLIER_STATUS.REJECTED, label: "Rejected" },
    ];
  }

  /**
   * Get active status filter options
   */
  getActiveOptions() {
    return [
      { value: "all", label: "All" },
      { value: "true", label: "Active Only" },
      { value: "false", label: "Inactive Only" },
    ];
  }

  // HELPER METHODS

  // @ts-ignore
  _getStatusDisplay(status) {
    const displayMap = {
      [this.SUPPLIER_STATUS.APPROVED]: "Approved",
      [this.SUPPLIER_STATUS.PENDING]: "Pending",
      [this.SUPPLIER_STATUS.REJECTED]: "Rejected",
    };
    return displayMap[status] || status;
  }

  // @ts-ignore
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

  // @ts-ignore
  _formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

// Create and export handler instance
const supplierExportHandler = new SupplierExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("supplierExport", async (event, payload) => {
    return await supplierExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

// Export for use in other modules
module.exports = { SupplierExportHandler, supplierExportHandler };
