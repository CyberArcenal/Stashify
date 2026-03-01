// electron-app/main/ipc/handlers/customerExportHandler.js
//@ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { AppDataSource } = require("../../../db/datasource");
const Customer = require("../../../../entities/Customer");

class CustomerExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "Stashify",
      "customer_exports",
    );

    if (!fs.existsSync(this.EXPORT_DIR)) {
      fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
    }

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

  // @ts-ignore
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      console.log(`CustomerExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          return await this.exportCustomers(params);
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
      console.error("CustomerExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  // @ts-ignore
  async exportCustomers(params) {
    try {
      const format = params.format || "csv";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      const customers = await this._getBaseCustomersData(params);
      let result;

      switch (format) {
        case "csv":
          result = await this._exportCSV(customers, params);
          break;
        case "excel":
          result = await this._exportExcel(customers, params);
          break;
        case "pdf":
          result = await this._exportPDF(customers, params);
          break;
      }

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
      console.error("exportCustomers error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export customers: ${error.message}`,
        data: null,
      };
    }
  }

  // @ts-ignore
  async getExportPreview(params) {
    try {
      const customers = await this._getBaseCustomersData(params);
      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          customers: customers.slice(0, 10),
          totalCount: customers.length,
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

  // @ts-ignore
  async _getBaseCustomersData(params) {
    const customerRepo = AppDataSource.getRepository(Customer);

    const queryBuilder = customerRepo
      .createQueryBuilder("c")
      .select([
        "c.id",
        "c.name",
        "c.email",
        "c.phone",
        "c.status",
        "c.loyaltyPointsBalance",
        "c.lifetimePointsEarned",
        "c.createdAt",
        "c.updatedAt",
      ])
      // ❌ Removed the non‑existent "c.deletedAt" condition
      .where("1 = 1"); // no soft delete

    if (params.status && params.status !== "all") {
      queryBuilder.andWhere("c.status = :status", { status: params.status });
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      queryBuilder.andWhere(
        "(c.name LIKE :search OR c.email LIKE :search OR c.phone LIKE :search)",
        { search: searchTerm },
      );
    }

    if (params.start_date) {
      queryBuilder.andWhere("c.createdAt >= :startDate", {
        startDate: params.start_date,
      });
    }

    if (params.end_date) {
      const endDate = new Date(params.end_date);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere("c.createdAt <= :endDate", {
        endDate: endDate.toISOString(),
      });
    }

    queryBuilder.orderBy("c.createdAt", "DESC");

    const customers = await queryBuilder.getRawMany();

    const processedCustomers = [];
    for (const customer of customers) {
      const joinedDate = new Date(customer.c_createdAt);
      const now = new Date();
      // @ts-ignore
      const accountAge = Math.floor((now - joinedDate) / (1000 * 60 * 60 * 24));

      processedCustomers.push({
        ID: customer.c_id,
        Name: customer.c_name || "",
        Email: customer.c_email || "",
        Phone: customer.c_phone || "N/A",
        Status: this._getStatusDisplay(customer.c_status),
        "Loyalty Points": customer.c_loyaltyPointsBalance || 0,
        "Lifetime Points": customer.c_lifetimePointsEarned || 0,
        "Joined Date": customer.c_createdAt
          ? new Date(customer.c_createdAt).toISOString().split("T")[0]
          : "",
        "Last Updated": customer.c_updatedAt
          ? new Date(customer.c_updatedAt).toISOString().split("T")[0]
          : "",
        "Account Age (days)": accountAge,
      });
    }

    return processedCustomers;
  }

  // @ts-ignore
  async _exportCSV(customers, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `customer_list_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    let csvContent = [];
    csvContent.push("Customer List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Customers: ${customers.length}`);
    csvContent.push("");

    if (customers.length > 0) {
      const headers = Object.keys(customers[0]);
      csvContent.push(headers.join(","));
    }

    // @ts-ignore
    customers.forEach((customer) => {
      const row = Object.values(customer).map((value) =>
        typeof value === "string" && value.includes(",") ? `"${value}"` : value,
      );
      csvContent.push(row.join(","));
    });

    fs.writeFileSync(filepath, csvContent.join("\n"), "utf8");
    const stats = fs.statSync(filepath);

    return {
      filename: filename,
      fileSize: this._formatFileSize(stats.size),
    };
  }

  // @ts-ignore
  async _exportExcel(customers, params) {
    try {
      if (!this.excelJS) throw new Error("ExcelJS not available");

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `customer_list_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Customer Management System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Customers");

      worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Name", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Status", key: "status", width: 12 },
        { header: "Loyalty Points", key: "loyalty_points", width: 15 },
        { header: "Lifetime Points", key: "lifetime_points", width: 15 },
        { header: "Joined Date", key: "joined_date", width: 12 },
        { header: "Last Updated", key: "last_updated", width: 12 },
        { header: "Account Age", key: "account_age", width: 12 },
      ];

      const titleRow = worksheet.addRow(["Customer List"]);
      titleRow.font = { bold: true, size: 14 };
      titleRow.height = 20;
      worksheet.mergeCells("A1:J1");

      const subtitleRow = worksheet.addRow([
        `Generated: ${new Date().toLocaleString()} | Total: ${customers.length} customers`,
      ]);
      worksheet.mergeCells("A2:J2");
      subtitleRow.font = { size: 9, italic: true };
      subtitleRow.height = 15;

      worksheet.addRow([]);

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

      // @ts-ignore
      customers.forEach((customer, index) => {
        const row = worksheet.addRow([
          customer["ID"],
          customer["Name"],
          customer["Email"],
          customer["Phone"],
          customer["Status"],
          customer["Loyalty Points"],
          customer["Lifetime Points"],
          customer["Joined Date"],
          customer["Last Updated"],
          customer["Account Age (days)"],
        ]);

        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }

        row.getCell(1).alignment = { horizontal: "center" };
        row.getCell(6).alignment = { horizontal: "center" };
        row.getCell(7).alignment = { horizontal: "center" };
        row.getCell(10).alignment = { horizontal: "center" };

        // ✅ Fix: use lowercase comparison on the displayed status
        const statusCell = row.getCell(5);
        const status = customer["Status"].toLowerCase();
        if (status === "regular") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "C6EFCE" }, // Green
          };
        } else if (status === "vip") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD700" }, // Gold
          };
        } else if (status === "elite") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "C0C0C0" }, // Silver
          };
        }
      });

      worksheet.views = [{ state: "frozen", ySplit: 4 }];

      if (customers.length > 0) {
        worksheet.autoFilter = {
          from: { row: 4, column: 1 },
          to: { row: 4 + customers.length, column: 10 },
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
      return await this._exportCSV(customers, params);
    }
  }

  // @ts-ignore
  async _exportPDF(customers, params) {
    try {
      let PDFKit;
      try {
        PDFKit = require("pdfkit");
      } catch (error) {
        console.warn("PDFKit not available, falling back to CSV");
        return await this._exportCSV(customers, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `customer_list_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margin: 20,
        info: {
          Title: "Customer List",
          Author: "Customer Management System",
          CreationDate: new Date(),
        },
      });

      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      doc.fontSize(14).font("Helvetica-Bold").text("Customer List", {
        align: "center",
      });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${customers.length} customers`,
          { align: "center" },
        );

      doc.moveDown(0.5);

      if (customers.length === 0) {
        doc.fontSize(11).text("No customers found.", { align: "center" });
        doc.end();
        await new Promise((resolve, reject) => {
          // @ts-ignore
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });
        const stats = fs.statSync(filepath);
        return { filename, fileSize: this._formatFileSize(stats.size) };
      }

      const pageWidth = 842;
      const leftMargin = 20;
      const rightMargin = 20;
      const topMargin = doc.y;
      const availableWidth = pageWidth - leftMargin - rightMargin;

      // ✅ Added column for Account Age (now 10 columns)
      const columnWidths = [
        availableWidth * 0.06, // ID
        availableWidth * 0.14, // Name
        availableWidth * 0.16, // Email
        availableWidth * 0.09, // Phone
        availableWidth * 0.07, // Status
        availableWidth * 0.09, // Loyalty Points
        availableWidth * 0.09, // Lifetime Points
        availableWidth * 0.07, // Joined Date
        availableWidth * 0.07, // Last Updated
        availableWidth * 0.07, // Account Age
      ];

      const rowHeight = 15;
      let currentY = topMargin;
      const headers = [
        "ID",
        "Name",
        "Email",
        "Phone",
        "Status",
        "Loyalty",
        "Lifetime",
        "Joined",
        "Updated",
        "Age (days)",
      ];

      // Header row
      doc
        .rect(leftMargin, currentY, availableWidth, rowHeight)
        .fillColor("#4A6FA5")
        .fill();

      doc.fillColor("white").fontSize(8).font("Helvetica-Bold");

      let xPos = leftMargin;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 3, currentY + 4, {
          width: columnWidths[i] - 6,
          align: i >= 8 ? "center" : "left", // age column centered
        });
        xPos += columnWidths[i];
      });

      currentY += rowHeight;
      doc.fontSize(8).font("Helvetica");

      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];

        if (currentY + rowHeight > 575) {
          doc.addPage({ size: "A4", layout: "landscape", margin: 20 });
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
              align: j >= 8 ? "center" : "left",
            });
            xPos += columnWidths[j];
          });
          currentY += rowHeight;
          doc.fontSize(8).font("Helvetica");
        }

        if (i % 2 === 0) {
          doc
            .rect(leftMargin, currentY, availableWidth, rowHeight)
            .fillColor("#F8F9FA")
            .fill();
        }

        doc.fillColor("#000000");
        xPos = leftMargin;

        // Data array now includes Account Age
        const customerData = [
          customer["ID"],
          customer["Name"],
          customer["Email"],
          customer["Phone"],
          customer["Status"],
          customer["Loyalty Points"],
          customer["Lifetime Points"],
          customer["Joined Date"],
          customer["Last Updated"],
          customer["Account Age (days)"],
        ];

        customerData.forEach((value, j) => {
          let cellValue = String(value);

          if (j === 2 && cellValue.length > 25)
            cellValue = cellValue.substring(0, 22) + "..."; // Email
          if (j === 1 && cellValue.length > 20)
            cellValue = cellValue.substring(0, 17) + "..."; // Name

          // ✅ Fix status color using lowercase
          if (j === 4) {
            const status = cellValue.toLowerCase();
            if (status === "regular") doc.fillColor("green");
            else if (status === "vip") doc.fillColor("gold");
            else if (status === "elite") doc.fillColor("silver");
            else doc.fillColor("#000000");
          } else {
            doc.fillColor("#000000");
          }

          doc.text(cellValue, xPos + 3, currentY + 4, {
            width: columnWidths[j] - 6,
            align: j >= 8 ? "center" : "left",
          });

          doc.fillColor("#000000");
          xPos += columnWidths[j];
        });

        currentY += rowHeight;
      }

      // ✅ Fixed footer loop (1‑based pages)
      const pageCount = doc.bufferedPageRange().count;
      for (let page = 1; page <= pageCount; page++) {
        doc.switchToPage(page);
        doc
          .fontSize(7)
          .fillColor("#666666")
          .text(`Page ${page} of ${pageCount}`, leftMargin, 575, {
            align: "right",
            width: availableWidth,
          });
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
      return await this._exportCSV(customers, params);
    }
  }

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

  getStatusOptions() {
    return [
      { value: "all", label: "All Statuses" },
      { value: "regular", label: "Regular" },
      { value: "vip", label: "VIP" },
      { value: "elite", label: "Elite" },
    ];
  }

  // @ts-ignore
  _getStatusDisplay(status) {
    const displayMap = {
      regular: "Regular",
      vip: "VIP",
      elite: "Elite",
    };
    // @ts-ignore
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

const customerExportHandler = new CustomerExportHandler();

if (ipcMain) {
  ipcMain.handle("customerExport", async (event, payload) => {
    return await customerExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

module.exports = { CustomerExportHandler, customerExportHandler };
