// electron-app/main/ipc/handlers/warehouseExportHandler.js
//@ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { AppDataSource } = require("../../../db/datasource");
const Warehouse = require("../../../../entities/Warehouse");
const StockItem = require("../../../../entities/StockItem");

class WarehouseExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "InventoryPro",
      "warehouse_exports"
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
   */
  // @ts-ignore
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      console.log(`WarehouseExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          return await this.exportWarehouses(params);
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
      console.error("WarehouseExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export warehouses in specified format
   */
  // @ts-ignore
  async exportWarehouses(params) {
    try {
      const format = params.format || "csv";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get warehouse data with basic analytics
      const warehouseData = await this._getWarehouseData(params);

      let result;
      switch (format) {
        case "csv":
          result = await this._exportCSV(warehouseData, params);
          break;
        case "excel":
          result = await this._exportExcel(warehouseData, params);
          break;
        case "pdf":
          result = await this._exportPDF(warehouseData, params);
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
      console.error("exportWarehouses error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export warehouses: ${error.message}`,
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
      const warehouseData = await this._getWarehouseData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          warehouses: warehouseData.warehouses.slice(0, 10), // Limit preview to 10 items
          analytics: warehouseData.analytics,
          totalCount: warehouseData.warehouses.length,
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
   * Get warehouse data with basic analytics using TypeORM
   */
  // @ts-ignore
  async _getWarehouseData(params) {
    const warehouseRepo = AppDataSource.getRepository(Warehouse);
    const stockRepo = AppDataSource.getRepository(StockItem);

    // Subquery for low stock count per warehouse
    const lowStockSubQuery = stockRepo
      .createQueryBuilder("si")
      .select("COUNT(DISTINCT si.id)")
      .where("si.warehouse_id = w.id")
      .andWhere("si.quantity > 0")
      .andWhere("si.quantity <= si.reorder_level")
      .andWhere("si.is_deleted = 0");

    // Subquery for out of stock count per warehouse
    const outOfStockSubQuery = stockRepo
      .createQueryBuilder("si")
      .select("COUNT(DISTINCT si.id)")
      .where("si.warehouse_id = w.id")
      .andWhere("si.quantity = 0")
      .andWhere("si.is_deleted = 0");

    // Build main query
    const queryBuilder = warehouseRepo
      .createQueryBuilder("w")
      .leftJoinAndSelect("w.stockItems", "si") // assuming relation name is stockItems
      .select([
        "w.id",
        "w.name",
        "w.location",
        "w.type",
        "w.is_active",
        "w.created_at",
        "w.updated_at",
        "COUNT(DISTINCT si.id) as stock_items_count",
        "COALESCE(SUM(si.quantity), 0) as total_quantity",
      ])
      .addSelect(`(${lowStockSubQuery.getQuery()})`, "low_stock_count")
      .addSelect(`(${outOfStockSubQuery.getQuery()})`, "out_of_stock_count")
      .where("w.is_deleted = 0")
      .groupBy("w.id");

    // Apply filters
    if (params.type && params.type !== "all") {
      queryBuilder.andWhere("w.type = :type", { type: params.type });
    }

    if (params.status && params.status !== "all") {
      if (params.status === "active") {
        queryBuilder.andWhere("w.is_active = 1");
      } else if (params.status === "inactive") {
        queryBuilder.andWhere("w.is_active = 0");
      }
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      queryBuilder.andWhere(
        "(w.name LIKE :search OR w.location LIKE :search)",
        { search: searchTerm }
      );
    }

    queryBuilder.orderBy("w.name");

    const warehouses = await queryBuilder.getRawMany();

    // Process warehouses
    const processedWarehouses = [];
    let totalStockItems = 0;
    let totalQuantity = 0;
    let totalLowStock = 0;
    let totalOutOfStock = 0;
    let activeWarehouses = 0;
    let inactiveWarehouses = 0;
    const typeCounts = {};

    for (const warehouse of warehouses) {
      const stockItemsCount = parseInt(warehouse.stock_items_count) || 0;
      const quantity = parseFloat(warehouse.total_quantity) || 0;
      const lowStockCount = parseInt(warehouse.low_stock_count) || 0;
      const outOfStockCount = parseInt(warehouse.out_of_stock_count) || 0;

      // Update analytics
      totalStockItems += stockItemsCount;
      totalQuantity += quantity;
      totalLowStock += lowStockCount;
      totalOutOfStock += outOfStockCount;

      if (warehouse.w_is_active === 1) {
        activeWarehouses++;
      } else {
        inactiveWarehouses++;
      }

      // Count by type
      const type = warehouse.w_type || "unknown";
      // @ts-ignore
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      // Add to processed list
      processedWarehouses.push({
        ID: warehouse.w_id,
        Name: warehouse.w_name || "",
        Location: warehouse.w_location || "",
        Type: this._getTypeDisplay(warehouse.w_type),
        Status: warehouse.w_is_active === 1 ? "Active" : "Inactive",
        "Stock Items": stockItemsCount,
        "Total Quantity": quantity,
        "Low Stock Items": lowStockCount,
        "Out of Stock Items": outOfStockCount,
        "Created Date": warehouse.w_created_at
          ? warehouse.w_created_at.split("T")[0]
          : "",
        "Updated Date": warehouse.w_updated_at
          ? warehouse.w_updated_at.split("T")[0]
          : "",
      });
    }

    // Calculate basic analytics
    const totalWarehouses = warehouses.length;
    const averageStockItems =
      totalWarehouses > 0 ? (totalStockItems / totalWarehouses).toFixed(1) : 0;
    const averageQuantity =
      totalWarehouses > 0 ? (totalQuantity / totalWarehouses).toFixed(1) : 0;

    // Prepare type breakdown
    const typeBreakdown = Object.entries(typeCounts).map(([type, count]) => ({
      type: this._getTypeDisplay(type),
      count,
      percentage:
        totalWarehouses > 0 ? ((count / totalWarehouses) * 100).toFixed(1) : 0,
    }));

    return {
      warehouses: processedWarehouses,
      analytics: {
        totalWarehouses,
        activeWarehouses,
        inactiveWarehouses,
        totalStockItems,
        totalQuantity,
        totalLowStock,
        totalOutOfStock,
        averageStockItems,
        averageQuantity,
        typeBreakdown,
      },
    };
  }

  /**
   * Export data as CSV
   */
  // @ts-ignore
  async _exportCSV(data, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `warehouse_list_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Title and analytics summary
    csvContent.push("Warehouse List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Warehouses: ${data.analytics.totalWarehouses}`);
    csvContent.push(
      `Active: ${data.analytics.activeWarehouses} | Inactive: ${data.analytics.inactiveWarehouses}`
    );
    csvContent.push(`Total Stock Items: ${data.analytics.totalStockItems}`);
    csvContent.push(`Total Quantity: ${data.analytics.totalQuantity}`);
    csvContent.push(`Low Stock Items: ${data.analytics.totalLowStock}`);
    csvContent.push(`Out of Stock Items: ${data.analytics.totalOutOfStock}`);
    csvContent.push("");

    // Type breakdown
    if (data.analytics.typeBreakdown.length > 0) {
      csvContent.push("Type Breakdown");
      csvContent.push("Type,Count,Percentage");
      // @ts-ignore
      data.analytics.typeBreakdown.forEach((item) => {
        csvContent.push(`${item.type},${item.count},${item.percentage}%`);
      });
      csvContent.push("");
    }

    // Headers
    if (data.warehouses.length > 0) {
      const headers = Object.keys(data.warehouses[0]);
      csvContent.push(headers.join(","));
    }

    // Data rows
    // @ts-ignore
    data.warehouses.forEach((warehouse) => {
      const row = Object.values(warehouse).map((value) => {
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
  async _exportExcel(data, params) {
    try {
      if (!this.excelJS) {
        throw new Error("ExcelJS not available");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `warehouse_list_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Warehouse Management System";
      workbook.created = new Date();

      // Sheet 1: Warehouse Details
      const worksheet = workbook.addWorksheet("Warehouses");

      // Set default column widths
      worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Name", key: "name", width: 25 },
        { header: "Location", key: "location", width: 20 },
        { header: "Type", key: "type", width: 12 },
        { header: "Status", key: "status", width: 12 },
        { header: "Stock Items", key: "stock_items", width: 12 },
        { header: "Total Quantity", key: "total_quantity", width: 15 },
        { header: "Low Stock", key: "low_stock", width: 10 },
        { header: "Out of Stock", key: "out_of_stock", width: 12 },
        { header: "Created Date", key: "created_date", width: 12 },
        { header: "Updated Date", key: "updated_date", width: 12 },
      ];

      // Add title row
      const titleRow = worksheet.addRow(["Warehouse List"]);
      titleRow.font = { bold: true, size: 14 };
      titleRow.height = 20;
      worksheet.mergeCells(`A1:K1`);

      // Add subtitle with analytics
      const subtitleRow = worksheet.addRow([
        `Generated: ${new Date().toLocaleString()} | Total: ${data.analytics.totalWarehouses} warehouses | Active: ${data.analytics.activeWarehouses} | Inactive: ${data.analytics.inactiveWarehouses}`,
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
        fgColor: { argb: "366092" }, // Blue header
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 20;
      headerRow.border = {
        bottom: { style: "thin", color: { argb: "000000" } },
      };

      // Add data rows
      // @ts-ignore
      data.warehouses.forEach((warehouse, index) => {
        const row = worksheet.addRow([
          warehouse["ID"],
          warehouse["Name"],
          warehouse["Location"],
          warehouse["Type"],
          warehouse["Status"],
          warehouse["Stock Items"],
          warehouse["Total Quantity"],
          warehouse["Low Stock Items"],
          warehouse["Out of Stock Items"],
          warehouse["Created Date"],
          warehouse["Updated Date"],
        ]);

        // Zebra striping
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }

        // Center align numeric columns
        row.getCell(6).alignment = { horizontal: "center" }; // Stock Items
        row.getCell(7).alignment = { horizontal: "center" }; // Total Quantity
        row.getCell(8).alignment = { horizontal: "center" }; // Low Stock
        row.getCell(9).alignment = { horizontal: "center" }; // Out of Stock

        // Color code status
        const statusCell = row.getCell(5);
        if (warehouse["Status"] === "Active") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "C6EFCE" }, // Green
          };
        } else {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" }, // Red
          };
        }

        // Highlight low stock
        if (warehouse["Low Stock Items"] > 0) {
          row.getCell(8).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEB9C" }, // Yellow
          };
        }

        // Highlight out of stock
        if (warehouse["Out of Stock Items"] > 0) {
          row.getCell(9).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" }, // Red
          };
        }
      });

      // Freeze header row
      worksheet.views = [{ state: "frozen", ySplit: 4 }];

      // Add auto-filter
      if (data.warehouses.length > 0) {
        worksheet.autoFilter = {
          from: { row: 4, column: 1 },
          to: { row: 4 + data.warehouses.length, column: 11 },
        };
      }

      // Sheet 2: Analytics Summary
      const analyticsSheet = workbook.addWorksheet("Analytics");

      analyticsSheet.columns = [
        { header: "Metric", key: "metric", width: 25 },
        { header: "Value", key: "value", width: 15 },
        { header: "Details", key: "details", width: 30 },
      ];

      const analyticsData = [
        {
          metric: "Total Warehouses",
          value: data.analytics.totalWarehouses,
          details: "All warehouses in system",
        },
        {
          metric: "Active Warehouses",
          value: data.analytics.activeWarehouses,
          details: "Currently operational",
        },
        {
          metric: "Inactive Warehouses",
          value: data.analytics.inactiveWarehouses,
          details: "Not currently active",
        },
        {
          metric: "Total Stock Items",
          value: data.analytics.totalStockItems,
          details: "Across all warehouses",
        },
        {
          metric: "Total Quantity",
          value: data.analytics.totalQuantity,
          details: "Sum of all stock quantities",
        },
        {
          metric: "Low Stock Items",
          value: data.analytics.totalLowStock,
          details: "Items below reorder level",
        },
        {
          metric: "Out of Stock Items",
          value: data.analytics.totalOutOfStock,
          details: "Items with zero quantity",
        },
        {
          metric: "Avg Stock per Warehouse",
          value: data.analytics.averageStockItems,
          details: "Average items per warehouse",
        },
        {
          metric: "Avg Quantity per Warehouse",
          value: data.analytics.averageQuantity,
          details: "Average quantity per warehouse",
        },
      ];

      analyticsData.forEach((item) => {
        analyticsSheet.addRow([item.metric, item.value, item.details]);
      });

      // Add Type Breakdown section
      analyticsSheet.addRow([]);
      analyticsSheet.addRow(["Type Breakdown"]);
      const headerRow2 = analyticsSheet.addRow(["Type", "Count", "Percentage"]);
      headerRow2.font = { bold: true };

      // @ts-ignore
      data.analytics.typeBreakdown.forEach((item) => {
        analyticsSheet.addRow([item.type, item.count, `${item.percentage}%`]);
      });

      await workbook.xlsx.writeFile(filepath);
      const stats = fs.statSync(filepath);

      return {
        filename: filename,
        fileSize: this._formatFileSize(stats.size),
      };
    } catch (error) {
      console.error("Excel export error:", error);
      return await this._exportCSV(data, params);
    }
  }

  /**
   * Export data as PDF
   */
  // @ts-ignore
  async _exportPDF(data, params) {
    try {
      let PDFKit;
      try {
        PDFKit = require("pdfkit");
      } catch (error) {
        console.warn("PDFKit not available, falling back to CSV");
        return await this._exportCSV(data, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `warehouse_list_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create a PDF document
      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margin: 20,
        info: {
          Title: "Warehouse List",
          Author: "Warehouse Management System",
          CreationDate: new Date(),
        },
      });

      // Pipe to file
      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Title
      doc.fontSize(14).font("Helvetica-Bold").text("Warehouse List", {
        align: "center",
      });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${data.analytics.totalWarehouses} warehouses`,
          {
            align: "center",
          }
        );

      // Analytics summary
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica-Bold").text("Summary:");
      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Active: ${data.analytics.activeWarehouses} | Inactive: ${data.analytics.inactiveWarehouses} | ` +
            `Stock Items: ${data.analytics.totalStockItems} | Low Stock: ${data.analytics.totalLowStock} | ` +
            `Out of Stock: ${data.analytics.totalOutOfStock}`
        );

      doc.moveDown(0.5);

      if (data.warehouses.length === 0) {
        doc.fontSize(11).text("No warehouses found.", { align: "center" });
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
        availableWidth * 0.12, // Location
        availableWidth * 0.1, // Type
        availableWidth * 0.08, // Status
        availableWidth * 0.1, // Stock Items
        availableWidth * 0.1, // Total Quantity
        availableWidth * 0.08, // Low Stock
        availableWidth * 0.1, // Out of Stock
        availableWidth * 0.1, // Created Date
      ];

      const rowHeight = 15;
      let currentY = topMargin;
      const headers = [
        "ID",
        "Name",
        "Location",
        "Type",
        "Status",
        "Stock Items",
        "Total Quantity",
        "Low Stock",
        "Out of Stock",
        "Created",
      ];

      // Draw header row
      doc
        .rect(leftMargin, currentY, availableWidth, rowHeight)
        .fillColor("#366092")
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

      for (let i = 0; i < data.warehouses.length; i++) {
        const warehouse = data.warehouses[i];

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
            .fillColor("#366092")
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

        const warehouseData = [
          warehouse["ID"],
          warehouse["Name"],
          warehouse["Location"],
          warehouse["Type"],
          warehouse["Status"],
          warehouse["Stock Items"],
          warehouse["Total Quantity"],
          warehouse["Low Stock Items"],
          warehouse["Out of Stock Items"],
          warehouse["Created Date"],
        ];

        warehouseData.forEach((value, j) => {
          let cellValue = String(value);

          // Truncate text if too long
          if (j === 1 && cellValue.length > 20) {
            // Name
            cellValue = cellValue.substring(0, 17) + "...";
          } else if (j === 2 && cellValue.length > 15) {
            // Location
            cellValue = cellValue.substring(0, 12) + "...";
          }

          // Status color coding
          if (j === 4) {
            // Status column
            if (cellValue === "Active") {
              doc.fillColor("green");
            } else {
              doc.fillColor("red");
            }
          }

          // Highlight low stock in yellow
          if (j === 7 && parseInt(cellValue) > 0) {
            // Low Stock
            doc.fillColor("orange");
          }

          // Highlight out of stock in red
          if (j === 8 && parseInt(cellValue) > 0) {
            // Out of Stock
            doc.fillColor("red");
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
      return await this._exportCSV(data, params);
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
          "Microsoft Excel format with formatting and analytics summary",
      },
      {
        value: "pdf",
        label: "PDF (Landscape)",
        description: "Compact table layout optimized for printing",
      },
    ];
  }

  /**
   * Get warehouse type filter options
   */
  getWarehouseTypeOptions() {
    return [
      { value: "all", label: "All Types" },
      { value: "warehouse", label: "Warehouse" },
      { value: "store", label: "Store" },
      { value: "online", label: "Online" },
    ];
  }

  /**
   * Get status filter options
   */
  getStatusOptions() {
    return [
      { value: "all", label: "All Statuses" },
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ];
  }

  // HELPER METHODS

  // @ts-ignore
  _getTypeDisplay(type) {
    const displayMap = {
      warehouse: "Warehouse",
      store: "Store",
      online: "Online",
    };
    // @ts-ignore
    return displayMap[type] || type;
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
const warehouseExportHandler = new WarehouseExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("warehouseExport", async (event, payload) => {
    return await warehouseExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment"
  );
}

// Export for use in other modules
module.exports = { WarehouseExportHandler, warehouseExportHandler };