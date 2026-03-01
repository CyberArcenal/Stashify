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
      "Stashify",
      "warehouse_exports",
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

  // @ts-ignore
  async getExportPreview(params) {
    try {
      const warehouseData = await this._getWarehouseData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          warehouses: warehouseData.warehouses.slice(0, 10),
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

  // @ts-ignore
  async _getWarehouseData(params) {
    const warehouseRepo = AppDataSource.getRepository(Warehouse);
    const stockRepo = AppDataSource.getRepository(StockItem);

    // Subquery for total stock items count per warehouse
    const stockItemsCountSubQuery = stockRepo
      .createQueryBuilder("si")
      .select("COUNT(DISTINCT si.id)")
      .where("si.warehouseId = w.id")
      .andWhere("si.is_deleted = 0");

    // Subquery for total quantity per warehouse
    const totalQuantitySubQuery = stockRepo
      .createQueryBuilder("si")
      .select("COALESCE(SUM(si.quantity), 0)")
      .where("si.warehouseId = w.id")
      .andWhere("si.is_deleted = 0");

    // Subquery for low stock count per warehouse
    const lowStockSubQuery = stockRepo
      .createQueryBuilder("si")
      .select("COUNT(DISTINCT si.id)")
      .where("si.warehouseId = w.id")
      .andWhere("si.quantity > 0")
      .andWhere("si.quantity <= si.reorder_level")
      .andWhere("si.is_deleted = 0");

    // Subquery for out of stock count per warehouse
    const outOfStockSubQuery = stockRepo
      .createQueryBuilder("si")
      .select("COUNT(DISTINCT si.id)")
      .where("si.warehouseId = w.id")
      .andWhere("si.quantity = 0")
      .andWhere("si.is_deleted = 0");

    // Build main query – no leftJoinAndSelect on stockItems to avoid errors
    const queryBuilder = warehouseRepo
      .createQueryBuilder("w")
      .select([
        "w.id",
        "w.name",
        "w.location",
        "w.type",
        "w.is_active",
        "w.created_at",
        "w.updated_at",
      ])
      .addSelect(`(${stockItemsCountSubQuery.getQuery()})`, "stock_items_count")
      .addSelect(`(${totalQuantitySubQuery.getQuery()})`, "total_quantity")
      .addSelect(`(${lowStockSubQuery.getQuery()})`, "low_stock_count")
      .addSelect(`(${outOfStockSubQuery.getQuery()})`, "out_of_stock_count")
      .where("w.is_deleted = 0");

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
        { search: searchTerm },
      );
    }

    queryBuilder.orderBy("w.name");

    const warehouses = await queryBuilder.getRawMany();

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

      totalStockItems += stockItemsCount;
      totalQuantity += quantity;
      totalLowStock += lowStockCount;
      totalOutOfStock += outOfStockCount;

      if (warehouse.w_is_active === 1) {
        activeWarehouses++;
      } else {
        inactiveWarehouses++;
      }

      const type = warehouse.w_type || "unknown";
      // @ts-ignore
      typeCounts[type] = (typeCounts[type] || 0) + 1;

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

    const totalWarehouses = warehouses.length;
    const averageStockItems =
      totalWarehouses > 0 ? (totalStockItems / totalWarehouses).toFixed(1) : 0;
    const averageQuantity =
      totalWarehouses > 0 ? (totalQuantity / totalWarehouses).toFixed(1) : 0;

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

  // @ts-ignore
  async _exportCSV(data, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `warehouse_list_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    let csvContent = [];
    csvContent.push("Warehouse List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Warehouses: ${data.analytics.totalWarehouses}`);
    csvContent.push(
      `Active: ${data.analytics.activeWarehouses} | Inactive: ${data.analytics.inactiveWarehouses}`,
    );
    csvContent.push(`Total Stock Items: ${data.analytics.totalStockItems}`);
    csvContent.push(`Total Quantity: ${data.analytics.totalQuantity}`);
    csvContent.push(`Low Stock Items: ${data.analytics.totalLowStock}`);
    csvContent.push(`Out of Stock Items: ${data.analytics.totalOutOfStock}`);
    csvContent.push("");

    if (data.analytics.typeBreakdown.length > 0) {
      csvContent.push("Type Breakdown");
      csvContent.push("Type,Count,Percentage");
      // @ts-ignore
      data.analytics.typeBreakdown.forEach((item) => {
        csvContent.push(`${item.type},${item.count},${item.percentage}%`);
      });
      csvContent.push("");
    }

    if (data.warehouses.length > 0) {
      const headers = Object.keys(data.warehouses[0]);
      csvContent.push(headers.join(","));
    }

    // @ts-ignore
    data.warehouses.forEach((warehouse) => {
      const row = Object.values(warehouse).map((value) => {
        return typeof value === "string" && value.includes(",")
          ? `"${value}"`
          : value;
      });
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
  async _exportExcel(data, params) {
    try {
      if (!this.excelJS) throw new Error("ExcelJS not available");

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `warehouse_list_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Warehouse Management System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Warehouses");

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

      const titleRow = worksheet.addRow(["Warehouse List"]);
      titleRow.font = { bold: true, size: 14 };
      titleRow.height = 20;
      worksheet.mergeCells("A1:K1");

      const subtitleRow = worksheet.addRow([
        `Generated: ${new Date().toLocaleString()} | Total: ${data.analytics.totalWarehouses} warehouses | Active: ${data.analytics.activeWarehouses} | Inactive: ${data.analytics.inactiveWarehouses}`,
      ]);
      worksheet.mergeCells("A2:K2");
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
        fgColor: { argb: "366092" },
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 20;
      headerRow.border = {
        bottom: { style: "thin", color: { argb: "000000" } },
      };

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

        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }

        row.getCell(6).alignment = { horizontal: "center" };
        row.getCell(7).alignment = { horizontal: "center" };
        row.getCell(8).alignment = { horizontal: "center" };
        row.getCell(9).alignment = { horizontal: "center" };

        const statusCell = row.getCell(5);
        if (warehouse["Status"] === "Active") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "C6EFCE" },
          };
        } else {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" },
          };
        }

        if (warehouse["Low Stock Items"] > 0) {
          row.getCell(8).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEB9C" },
          };
        }

        if (warehouse["Out of Stock Items"] > 0) {
          row.getCell(9).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" },
          };
        }
      });

      worksheet.views = [{ state: "frozen", ySplit: 4 }];

      if (data.warehouses.length > 0) {
        worksheet.autoFilter = {
          from: { row: 4, column: 1 },
          to: { row: 4 + data.warehouses.length, column: 11 },
        };
      }

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

      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margin: 20,
        info: {
          Title: "Warehouse List",
          Author: "Warehouse Management System",
          CreationDate: new Date(),
        },
        bufferPages: true,
      });

      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      doc.fontSize(14).font("Helvetica-Bold").text("Warehouse List", {
        align: "center",
      });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${data.analytics.totalWarehouses} warehouses`,
          { align: "center" },
        );

      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica-Bold").text("Summary:");
      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Active: ${data.analytics.activeWarehouses} | Inactive: ${data.analytics.inactiveWarehouses} | ` +
            `Stock Items: ${data.analytics.totalStockItems} | Low Stock: ${data.analytics.totalLowStock} | ` +
            `Out of Stock: ${data.analytics.totalOutOfStock}`,
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

      const pageWidth = 842;
      const pageHeight = 595;
      const leftMargin = 20;
      const rightMargin = 20;
      const topMargin = doc.y;
      const availableWidth = pageWidth - leftMargin - rightMargin;

      // ✅ Enhanced column widths – total = 100%
      const columnWidths = [
        availableWidth * 0.05, // ID
        availableWidth * 0.14, // Name
        availableWidth * 0.12, // Location
        availableWidth * 0.08, // Type
        availableWidth * 0.06, // Status
        availableWidth * 0.08, // Stock Items
        availableWidth * 0.08, // Total Quantity
        availableWidth * 0.07, // Low Stock
        availableWidth * 0.08, // Out of Stock
        availableWidth * 0.07, // Created Date
        availableWidth * 0.07, // Updated Date
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
        "Total Qty",
        "Low Stock",
        "Out of Stock",
        "Created",
        "Updated",
      ];

      // Draw header
      doc
        .rect(leftMargin, currentY, availableWidth, rowHeight)
        .fillColor("#366092")
        .fill();

      doc.fillColor("white").fontSize(8).font("Helvetica-Bold");

      let xPos = leftMargin;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 3, currentY + 4, {
          width: columnWidths[i] - 6,
          align: i === 0 ? "center" : "left", // ID centered
        });
        xPos += columnWidths[i];
      });

      currentY += rowHeight;
      doc.fontSize(8).font("Helvetica");

      for (let i = 0; i < data.warehouses.length; i++) {
        const warehouse = data.warehouses[i];

        if (currentY + rowHeight > pageHeight - 20) {
          doc.addPage({ size: "A4", layout: "landscape", margin: 20 });
          currentY = 20;

          // Redraw header
          doc
            .rect(leftMargin, currentY, availableWidth, rowHeight)
            .fillColor("#366092")
            .fill();

          doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
          xPos = leftMargin;
          headers.forEach((header, j) => {
            doc.text(header, xPos + 3, currentY + 4, {
              width: columnWidths[j] - 6,
              align: j === 0 ? "center" : "left",
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

        // Cell borders
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

        // Cell content
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
          warehouse["Updated Date"],
        ];

        warehouseData.forEach((value, j) => {
          let cellValue = String(value);

          // Truncate long text
          if (j === 1 && cellValue.length > 20) {
            cellValue = cellValue.substring(0, 17) + "...";
          } else if (j === 2 && cellValue.length > 18) {
            cellValue = cellValue.substring(0, 15) + "...";
          }

          // Color coding
          if (j === 4) {
            // Status
            if (cellValue === "Active") {
              doc.fillColor("green");
            } else {
              doc.fillColor("red");
            }
          } else if (j === 7 && parseInt(cellValue) > 0) {
            // Low Stock
            doc.fillColor("orange");
          } else if (j === 8 && parseInt(cellValue) > 0) {
            // Out of Stock
            doc.fillColor("red");
          } else {
            doc.fillColor("#000000");
          }

          doc.text(cellValue, xPos + 3, currentY + 4, {
            width: columnWidths[j] - 6,
            align: j === 0 ? "center" : "left",
          });

          doc.fillColor("#000000");
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
      return await this._exportCSV(data, params);
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
          "Microsoft Excel format with formatting and analytics summary",
      },
      {
        value: "pdf",
        label: "PDF (Landscape)",
        description: "Compact table layout optimized for printing",
      },
    ];
  }

  getWarehouseTypeOptions() {
    return [
      { value: "all", label: "All Types" },
      { value: "warehouse", label: "Warehouse" },
      { value: "store", label: "Store" },
      { value: "online", label: "Online" },
    ];
  }

  getStatusOptions() {
    return [
      { value: "all", label: "All Statuses" },
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ];
  }

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

const warehouseExportHandler = new WarehouseExportHandler();

if (ipcMain) {
  ipcMain.handle("warehouseExport", async (event, payload) => {
    return await warehouseExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

module.exports = { WarehouseExportHandler, warehouseExportHandler };
