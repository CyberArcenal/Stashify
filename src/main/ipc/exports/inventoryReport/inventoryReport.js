// electron-app/main/handlers/InventoryReportExportHandler.js
// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { getGeneralCurrencySign } = require(
  path.join(__dirname, "..", "..", "utils", "settings", "system")
);
const { inventoryReportHandler } = require(
  path.join(__dirname, "..", "reports", "inventoryReport")
);


let currency = "$";
(async () => {
  currency = await getGeneralCurrencySign();
})();

class InventoryReportExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "InventoryPro",
      "inventory_report_exports"
    );

    // Create export directory if it doesn't exist
    if (!fs.existsSync(this.EXPORT_DIR)) {
      fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
    }

    // Initialize libraries if available
    this.excelJS = null;
    this.pdfKit = null;
    this._initializeLibraries();

    // Configuration constants
    this.STATUS_COLORS = {
      "Out of Stock": { argb: "FF5252" },
      Critical: { argb: "FF9800" },
      "Very Low": { argb: "FFEB3B" },
      "Low Stock": { argb: "8BC34A" },
      Adequate: { argb: "4CAF50" },
    };

    this.CHART_COLORS = {
      primary: "#3498db",
      secondary: "#2ecc71",
      danger: "#e74c3c",
      warning: "#f39c12",
      info: "#9b59b6",
      dark: "#2c3e50",
      light: "#ecf0f1",
    };
  }

  async _initializeLibraries() {
    try {
      this.excelJS = require("exceljs");
    } catch (error) {
      console.warn(
        "ExcelJS not available for enhanced Excel export:",
        // @ts-ignore
        error.message
      );
    }

    try {
      this.pdfKit = require("pdfkit");
    } catch (error) {
      // @ts-ignore
      console.warn("PDFKit not available for PDF export:", error.message);
    }
  }

  /**
   * Main request handler
   * @param {Electron.IpcMainInvokeEvent} event
   * @param {{ method: any; params: {}; }} payload
   */
  // @ts-ignore
  // @ts-ignore
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      console.log(`InventoryReportExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          // @ts-ignore
          return await this.exportInventoryReport(params);
        case "exportPreview":
          return await this.getExportPreview(params);
        case "getExportHistory":
          return await this.getExportHistory();
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
      console.error("InventoryReportExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export inventory report in specified format
   * @param {{ format: string; }} params
   */
  async exportInventoryReport(params) {
    try {
      const format = params.format || "pdf";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get inventory report data from the main handler
      const inventoryData = await this._getInventoryReportData(params);

      let exportResult;
      switch (format) {
        case "csv":
          exportResult = await this._exportCSV(inventoryData, params);
          break;
        case "excel":
          exportResult = await this._exportExcel(inventoryData, params);
          break;
        case "pdf":
          exportResult = await this._exportPDF(inventoryData, params);
          break;
      }

      // Handle case where export failed and returned null/undefined
      if (!exportResult || !exportResult.filename) {
        throw new Error(`Export failed for format: ${format}`);
      }

      // Read file content as base64 for transmission
      const filepath = path.join(this.EXPORT_DIR, exportResult.filename);

      // Check if file exists
      if (!fs.existsSync(filepath)) {
        throw new Error(`Export file not found: ${filepath}`);
      }

      const fileBuffer = fs.readFileSync(filepath);
      const base64Content = fileBuffer.toString("base64");

      // Save export history
      await this._saveExportHistory({
        filename: exportResult.filename,
        format: format,
        generated_at: new Date().toISOString(),
        file_size: exportResult.fileSize || "N/A",
        filters: JSON.stringify(params),
      });

      return {
        status: true,
        message: `Export completed: ${exportResult.filename}`,
        data: {
          content: base64Content,
          filename: exportResult.filename,
          fileSize: exportResult.fileSize,
          mimeType: this._getMimeType(format),
          fullPath: filepath,
        },
      };
    } catch (error) {
      console.error("exportInventoryReport error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export inventory report: ${error.message}`,
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
      const inventoryData = await this._getInventoryReportData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: inventoryData,
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
   * Get comprehensive inventory report data from InventoryReportHandler
   * @param {any} params
   */
  async _getInventoryReportData(params) {
    try {
      // Get data from the main inventory report handler
      const response = await inventoryReportHandler.getInventoryReport(params);

      // @ts-ignore
      if (!response.status) {
        throw new Error(response.message);
      }

      const reportData = response.data;

      // Transform the data to match the expected format
      const transformedData = await this._transformInventoryReportData(
        reportData,
        params
      );

      return transformedData;
    } catch (error) {
      console.error("_getInventoryReportData error:", error);
      throw error;
    }
  }

  /**
   * Transform InventoryReportHandler data to export format
   * @param {any} reportData
   * @param {any} params
   */
  async _transformInventoryReportData(reportData, params) {
    const {
      stockByCategory,
      lowStockProducts,
      stockMovements,
      summary,
      performanceMetrics,
      dateRange,
      metadata,
    } = reportData;

    // Transform stock by category
    const transformedCategories = stockByCategory.map(
      (
        /** @type {{ name: any; value: any; stockValue: any; color: any; percentage: any; }} */ item,
        /** @type {any} */ index
      ) => ({
        id: index,
        name: item.name,
        stock_quantity: item.value,
        stock_value: item.stockValue || 0,
        color: item.color,
        percentage: item.percentage || 0,
      })
    );

    // Transform low stock products
    const transformedLowStock = lowStockProducts.map(
      (
        /** @type {{ name: any; stock: number; reorderLevel: number; category: any; currentValue: any; productId: any; variantId: any; }} */ item,
        /** @type {any} */ index
      ) => ({
        id: index,
        product_name: item.name,
        current_stock: item.stock,
        reorder_level: item.reorderLevel,
        category: item.category,
        stock_value: item.currentValue || 0,
        product_id: item.productId,
        variant_id: item.variantId || null,
        stock_status: this._getStockStatus(item.stock, item.reorderLevel),
      })
    );

    // Calculate additional analytics
    const analytics = this._calculateAnalyticsFromReport(
      transformedCategories,
      transformedLowStock,
      stockMovements,
      summary
    );

    return {
      stock_by_category: transformedCategories,
      low_stock_products: transformedLowStock,
      stock_movements: stockMovements,
      summary: summary,
      performance_metrics: performanceMetrics,
      analytics: analytics,
      date_range: dateRange,
      filters: {
        period: params.period || "6months",
        category: params.category || null,
        low_stock_only: params.low_stock_only || false,
        group_by: params.group_by || "month",
      },
      metadata: {
        ...metadata,
        generated_at: new Date().toISOString(),
        total_categories: transformedCategories.length,
        low_stock_count: transformedLowStock.length,
        total_movements: stockMovements.length,
        currency: currency,
        report_type: "inventory_analysis",
      },
    };
  }

  /**
   * Calculate analytics from report data
   * @param {any[]} categories
   * @param {any[]} lowStock
   * @param {any[]} movements
   * @param {any} summary
   */
  _calculateAnalyticsFromReport(categories, lowStock, movements, summary) {
    // Category distribution
    const categoryDistribution = categories.map((cat) => ({
      name: cat.name,
      quantity: cat.stock_quantity,
      value: cat.stock_value,
      percentage: cat.percentage,
    }));

    // Movement trends
    const movementTrends = movements.map((mov) => ({
      period: mov.month,
      stock_in: mov.stockIn,
      stock_out: mov.stockOut,
      net_change: mov.netChange,
      trend:
        mov.netChange > 0
          ? "positive"
          : mov.netChange < 0
            ? "negative"
            : "neutral",
    }));

    // Low stock analysis
    const lowStockAnalysis = lowStock.reduce((acc, item) => {
      const status = item.stock_status;
      if (!acc[status]) acc[status] = 0;
      acc[status]++;
      return acc;
    }, {});

    // Value analysis
    const totalInventoryValue = categories.reduce(
      (sum, cat) => sum + cat.stock_value,
      0
    );
    const lowStockValue = lowStock.reduce(
      (sum, item) => sum + item.stock_value,
      0
    );

    return {
      category_distribution: categoryDistribution,
      movement_trends: movementTrends,
      low_stock_analysis: lowStockAnalysis,
      total_inventory_value: totalInventoryValue,
      low_stock_value: lowStockValue,
      low_stock_percentage:
        totalInventoryValue > 0
          ? (lowStockValue / totalInventoryValue) * 100
          : 0,
      average_stock_value:
        summary.totalStockValue / (summary.totalProducts || 1),
      stock_turnover_rate: summary.stockTurnoverRate,
      growth_rate: summary.growthRate,
    };
  }

  /**
   * Determine stock status based on stock level
   * @param {number} currentStock
   * @param {number} reorderLevel
   */
  _getStockStatus(currentStock, reorderLevel) {
    if (currentStock === 0) return "Out of Stock";
    if (currentStock <= reorderLevel * 0.2) return "Critical";
    if (currentStock <= reorderLevel * 0.5) return "Very Low";
    if (currentStock <= reorderLevel) return "Low Stock";
    return "Adequate";
  }

  /**
   * Export data as CSV with enhanced design
   * @param {any} data
   * @param {any} params
   */
  // @ts-ignore
  async _exportCSV(data, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `inventory_report_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Report Header
    csvContent.push("📊 INVENTORY ANALYSIS REPORT");
    csvContent.push(`Generated,${new Date().toISOString()}`);
    csvContent.push(`Report Type,${data.metadata.report_type}`);
    csvContent.push(
      `Date Range,${data.date_range.startDate} to ${data.date_range.endDate}`
    );
    csvContent.push(`Period,${data.filters.period}`);
    csvContent.push(`Currency,${data.metadata.currency}`);
    csvContent.push("");

    // Executive Summary
    csvContent.push("📈 EXECUTIVE SUMMARY");
    csvContent.push("Metric,Value,Status,Impact");

    const execSummary = [
      ["Total Products", data.summary.totalProducts, "All Items", "High"],
      ["Total Stock Quantity", data.summary.totalStock, "All Items", "High"],
      [
        "Total Stock Value",
        this._formatCurrency(data.summary.totalStockValue),
        "Financial",
        "Critical",
      ],
      [
        "Low Stock Items",
        data.summary.lowStockCount,
        "Action Required",
        "Medium",
      ],
      [
        "Total Categories",
        data.summary.totalCategories,
        "Classification",
        "Low",
      ],
      [
        "Growth Rate",
        `${data.summary.growthRate}%`,
        data.summary.growthRate > 0 ? "Positive" : "Negative",
        "Medium",
      ],
      [
        "Stock Turnover Rate",
        data.summary.stockTurnoverRate,
        data.summary.stockTurnoverRate > 3 ? "Good" : "Average",
        "High",
      ],
    ];

    execSummary.forEach((row) => csvContent.push(row.join(",")));
    csvContent.push("");

    // Performance Metrics
    csvContent.push("🎯 PERFORMANCE METRICS");
    csvContent.push("Metric,Value,Details");

    const perfMetrics = [
      [
        "Highest Stock Category",
        data.performance_metrics.highestStockCategory,
        "Category with most stock",
      ],
      [
        "Highest Stock Count",
        data.performance_metrics.highestStockCount,
        "Quantity in highest category",
      ],
      [
        "Highest Stock Value",
        this._formatCurrency(data.performance_metrics.highestStockValue),
        "Value in highest category",
      ],
      [
        "Average Stock Value",
        this._formatCurrency(data.performance_metrics.averageStockValue),
        "Per product average",
      ],
      [
        "Stock Turnover Rate",
        data.performance_metrics.stockTurnoverRate,
        "Times per year",
      ],
    ];

    perfMetrics.forEach((row) => csvContent.push(row.join(",")));
    csvContent.push("");

    // Stock by Category
    csvContent.push("📦 STOCK BY CATEGORY");
    csvContent.push("Category,Stock Quantity,Stock Value,Percentage,Color");

    data.stock_by_category.forEach(
      (
        /** @type {{ name: any; stock_quantity: any; stock_value: number; percentage: any; color: any; }} */ category
      ) => {
        csvContent.push(
          [
            category.name,
            category.stock_quantity,
            this._formatCurrency(category.stock_value),
            `${category.percentage || 0}%`,
            category.color,
          ].join(",")
        );
      }
    );
    csvContent.push("");

    // Low Stock Products
    csvContent.push("⚠️ LOW STOCK ALERTS");
    csvContent.push(
      "Product,Current Stock,Reorder Level,Category,Stock Value,Status,Product ID"
    );

    data.low_stock_products.forEach(
      (
        /** @type {{ product_name: any; current_stock: any; reorder_level: any; category: any; stock_value: number; stock_status: any; product_id: any; }} */ item
      ) => {
        csvContent.push(
          [
            `"${item.product_name}"`,
            item.current_stock,
            item.reorder_level,
            `"${item.category}"`,
            this._formatCurrency(item.stock_value),
            item.stock_status,
            item.product_id,
          ].join(",")
        );
      }
    );
    csvContent.push("");

    // Stock Movements
    csvContent.push("📈 STOCK MOVEMENTS");
    csvContent.push("Period,Stock In,Stock Out,Net Change,Trend");

    data.stock_movements.forEach(
      (
        /** @type {{ netChange: number; month: any; stockIn: any; stockOut: any; }} */ movement
      ) => {
        const trend =
          movement.netChange > 0
            ? "📈 Positive"
            : movement.netChange < 0
              ? "📉 Negative"
              : "➡️ Stable";
        csvContent.push(
          [
            movement.month,
            movement.stockIn,
            movement.stockOut,
            movement.netChange,
            trend,
          ].join(",")
        );
      }
    );
    csvContent.push("");

    // Analytics Summary
    csvContent.push("📊 ANALYTICS SUMMARY");
    csvContent.push("Metric,Value,Description");

    const analyticsSummary = [
      [
        "Total Inventory Value",
        this._formatCurrency(data.analytics.total_inventory_value),
        "Total value of all inventory",
      ],
      [
        "Low Stock Value",
        this._formatCurrency(data.analytics.low_stock_value),
        "Value of low stock items",
      ],
      [
        "Low Stock %",
        `${data.analytics.low_stock_percentage.toFixed(1)}%`,
        "Percentage of value at risk",
      ],
      [
        "Average Stock Value",
        this._formatCurrency(data.analytics.average_stock_value),
        "Average value per item",
      ],
      [
        "Stock Turnover Rate",
        data.analytics.stock_turnover_rate.toFixed(2),
        "Inventory turnover rate",
      ],
      [
        "Growth Rate",
        `${data.analytics.growth_rate.toFixed(1)}%`,
        "Inventory growth rate",
      ],
    ];

    analyticsSummary.forEach((row) => csvContent.push(row.join(",")));
    csvContent.push("");

    // Recommendations
    csvContent.push("💡 RECOMMENDATIONS");
    csvContent.push("Priority,Area,Recommendation,Expected Impact");

    const recommendations = this._generateRecommendations(data);
    recommendations.forEach((rec) => {
      csvContent.push(
        [
          rec.priority,
          rec.area,
          `"${rec.recommendation}"`,
          `"${rec.impact}"`,
        ].join(",")
      );
    });
    csvContent.push("");

    // Footer
    csvContent.push("🏁 REPORT FOOTER");
    csvContent.push("Generated by,InventoryPro Management System v2.0");
    csvContent.push("Data Source,Inventory Database");
    csvContent.push("Report Type,Comprehensive Inventory Analysis");
    csvContent.push("Confidentiality,Internal Use Only");
    csvContent.push("Next Review,Next 30 Days");
    csvContent.push("Contact,Inventory Manager");

    const csvString = csvContent.join("\n");
    fs.writeFileSync(filepath, csvString, "utf8");
    const stats = fs.statSync(filepath);

    return {
      filename: filename,
      fileSize: this._formatFileSize(stats.size),
    };
  }

  /**
   * Export data as Excel with enhanced design and charts
   * @param {any} data
   * @param {any} params
   */
  async _exportExcel(data, params) {
    try {
      if (!this.excelJS) {
        throw new Error("ExcelJS library not available");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `inventory_report_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "InventoryPro Management System";
      workbook.created = new Date();

      // ==================== COVER PAGE ====================
      const coverSheet = workbook.addWorksheet("Cover");

      // Add logo/header
      const logoRow = coverSheet.addRow(["INVENTORY MANAGEMENT SYSTEM"]);
      logoRow.font = { size: 24, bold: true, color: { argb: "2C3E50" } };
      logoRow.height = 40;
      coverSheet.mergeCells(`A1:E1`);
      logoRow.alignment = { horizontal: "center", vertical: "middle" };

      coverSheet.addRow([]);

      const titleRow = coverSheet.addRow(["INVENTORY ANALYSIS REPORT"]);
      titleRow.font = { size: 28, bold: true, color: { argb: "3498DB" } };
      titleRow.height = 50;
      coverSheet.mergeCells(`A3:E3`);
      titleRow.alignment = { horizontal: "center", vertical: "middle" };

      coverSheet.addRow([]);
      coverSheet.addRow([]);

      // Report Details
      const details = [
        ["Report ID", `INV-${Date.now()}`],
        ["Generated", new Date().toLocaleString()],
        [
          "Date Range",
          `${data.date_range.startDate} to ${data.date_range.endDate}`,
        ],
        ["Period", data.filters.period],
        ["Currency", data.metadata.currency],
        ["Total Products", data.summary.totalProducts],
        [
          "Total Stock Value",
          this._formatCurrency(data.summary.totalStockValue),
        ],
        ["Low Stock Items", data.summary.lowStockCount],
        ["Total Categories", data.summary.totalCategories],
        ["Growth Rate", `${data.summary.growthRate}%`],
      ];

      details.forEach(([label, value], index) => {
        const row = coverSheet.addRow([label, "", "", value]);
        row.getCell(1).font = { bold: true, size: 12 };
        row.getCell(4).font = { size: 12 };
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F8F9F9" },
          };
        }
      });

      coverSheet.addRow([]);
      coverSheet.addRow([]);

      // Executive Summary Box
      const summaryTitle = coverSheet.addRow(["EXECUTIVE SUMMARY"]);
      summaryTitle.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
      summaryTitle.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "3498DB" },
      };
      summaryTitle.alignment = { horizontal: "center" };
      coverSheet.mergeCells(`A${summaryTitle.number}:E${summaryTitle.number}`);

      const summaryContent = [
        ["📊 Total Products", data.summary.totalProducts],
        ["📦 Total Stock", data.summary.totalStock],
        ["💰 Total Value", this._formatCurrency(data.summary.totalStockValue)],
        ["⚠️ Low Stock Items", data.summary.lowStockCount],
        ["📈 Growth Rate", `${data.summary.growthRate}%`],
        ["🔄 Turnover Rate", data.summary.stockTurnoverRate],
        ["📂 Categories", data.summary.totalCategories],
      ];

      summaryContent.forEach(([label, value]) => {
        const row = coverSheet.addRow([label, "", "", value]);
        row.getCell(1).font = { bold: true, size: 11 };
        row.getCell(4).font = { size: 11, color: { argb: "2C3E50" } };
      });

      // Set column widths
      coverSheet.columns = [
        { width: 30 },
        { width: 5 },
        { width: 5 },
        { width: 30 },
        { width: 5 },
      ];

      // ==================== DASHBOARD PAGE ====================
      const dashboardSheet = workbook.addWorksheet("Dashboard");

      // KPI Cards
      const kpis = [
        {
          label: "Total Products",
          value: data.summary.totalProducts,
          color: "3498DB",
        },
        {
          label: "Total Stock",
          value: data.summary.totalStock,
          color: "2ECC71",
        },
        {
          label: "Total Value",
          value: this._formatCurrency(data.summary.totalStockValue),
          color: "9B59B6",
        },
        {
          label: "Low Stock",
          value: data.summary.lowStockCount,
          color: "E74C3C",
        },
        {
          label: "Categories",
          value: data.summary.totalCategories,
          color: "F39C12",
        },
        {
          label: "Growth Rate",
          value: `${data.summary.growthRate}%`,
          color: "1ABC9C",
        },
      ];

      // @ts-ignore
      let rowIndex = 1;
      kpis.forEach((kpi, index) => {
        const col = (index % 3) * 2 + 1;
        const row = Math.floor(index / 3) * 3 + 1;

        // KPI Card
        dashboardSheet.mergeCells(row, col, row, col + 1);
        const titleCell = dashboardSheet.getCell(row, col);
        titleCell.value = kpi.label;
        titleCell.font = { size: 11, bold: true, color: { argb: "FFFFFF" } };
        titleCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: kpi.color },
        };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        titleCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        dashboardSheet.mergeCells(row + 1, col, row + 1, col + 1);
        const valueCell = dashboardSheet.getCell(row + 1, col);
        valueCell.value = kpi.value;
        valueCell.font = { size: 16, bold: true };
        valueCell.alignment = { horizontal: "center", vertical: "middle" };
        valueCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // ==================== STOCK ANALYSIS PAGE ====================
      const analysisSheet = workbook.addWorksheet("Stock Analysis");

      // Column headers for category analysis
      analysisSheet.columns = [
        { header: "Category", key: "category", width: 25 },
        { header: "Stock Quantity", key: "quantity", width: 15 },
        { header: "Stock Value", key: "value", width: 15 },
        { header: "Percentage", key: "percentage", width: 12 },
        { header: "Color", key: "color", width: 10 },
      ];

      // Header styling
      const headerRow = analysisSheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "2C3E50" },
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 25;

      // Add data rows
      data.stock_by_category.forEach(
        (
          /** @type {{ name: any; stock_quantity: any; stock_value: number; percentage: any; color: string; }} */ category,
          /** @type {number} */ index
        ) => {
          const row = analysisSheet.addRow({
            category: category.name,
            quantity: category.stock_quantity,
            value: this._formatCurrency(category.stock_value),
            percentage: `${category.percentage || 0}%`,
            color: category.color,
          });

          // Zebra striping
          if (index % 2 === 0) {
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F8F9F9" },
            };
          }

          // Color cell background
          const colorCell = row.getCell("color");
          colorCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: category.color.replace("#", "") },
          };
        }
      );

      // ==================== LOW STOCK ALERTS PAGE ====================
      const alertsSheet = workbook.addWorksheet("Low Stock Alerts");

      // Column headers
      alertsSheet.columns = [
        { header: "Product", key: "product", width: 30 },
        { header: "Current Stock", key: "stock", width: 15 },
        { header: "Reorder Level", key: "reorder", width: 15 },
        { header: "Category", key: "category", width: 20 },
        { header: "Stock Value", key: "value", width: 15 },
        { header: "Status", key: "status", width: 12 },
      ];

      // Header styling
      const alertsHeaderRow = alertsSheet.getRow(1);
      alertsHeaderRow.font = { bold: true, color: { argb: "FFFFFF" } };
      alertsHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "E74C3C" },
      };
      alertsHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
      alertsHeaderRow.height = 25;

      // Add data rows
      data.low_stock_products.forEach(
        (
          /** @type {{ product_name: any; current_stock: any; reorder_level: any; category: any; stock_value: number; stock_status: string | number; }} */ item,
          /** @type {number} */ index
        ) => {
          const row = alertsSheet.addRow({
            product: item.product_name,
            stock: item.current_stock,
            reorder: item.reorder_level,
            category: item.category,
            value: this._formatCurrency(item.stock_value),
            status: item.stock_status,
          });

          // Zebra striping
          if (index % 2 === 0) {
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F8F9F9" },
            };
          }

          // Status color coding
          const statusCell = row.getCell("status");
          // @ts-ignore
          const statusColor = this.STATUS_COLORS[item.stock_status] || {
            argb: "CCCCCC",
          };
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: statusColor,
          };
          statusCell.font = { bold: true };
        }
      );

      // ==================== STOCK MOVEMENTS PAGE ====================
      const movementsSheet = workbook.addWorksheet("Stock Movements");

      // Column headers
      movementsSheet.columns = [
        { header: "Period", key: "period", width: 20 },
        { header: "Stock In", key: "in", width: 15 },
        { header: "Stock Out", key: "out", width: 15 },
        { header: "Net Change", key: "net", width: 15 },
        { header: "Trend", key: "trend", width: 12 },
      ];

      // Header styling
      const movementsHeaderRow = movementsSheet.getRow(1);
      movementsHeaderRow.font = { bold: true, color: { argb: "FFFFFF" } };
      movementsHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "3498DB" },
      };
      movementsHeaderRow.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      movementsHeaderRow.height = 25;

      // Add data rows
      data.stock_movements.forEach(
        (
          /** @type {{ netChange: number; month: any; stockIn: any; stockOut: any; }} */ movement,
          /** @type {number} */ index
        ) => {
          const trend =
            movement.netChange > 0
              ? "📈 Positive"
              : movement.netChange < 0
                ? "📉 Negative"
                : "➡️ Stable";
          const row = movementsSheet.addRow({
            period: movement.month,
            in: movement.stockIn,
            out: movement.stockOut,
            net: movement.netChange,
            trend: trend,
          });

          // Zebra striping
          if (index % 2 === 0) {
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F8F9F9" },
            };
          }

          // Color code net change
          const netCell = row.getCell("net");
          if (movement.netChange > 0) {
            netCell.font = { bold: true, color: { argb: "27AE60" } };
          } else if (movement.netChange < 0) {
            netCell.font = { bold: true, color: { argb: "E74C3C" } };
          }
        }
      );

      // ==================== ANALYTICS PAGE ====================
      const analyticsSheet = workbook.addWorksheet("Analytics");

      // Performance Metrics
      analyticsSheet.getCell("A1").value = "Performance Metrics";
      analyticsSheet.getCell("A1").font = { size: 16, bold: true };

      const perfData = [
        [
          "Highest Stock Category",
          data.performance_metrics.highestStockCategory,
        ],
        ["Highest Stock Count", data.performance_metrics.highestStockCount],
        [
          "Highest Stock Value",
          this._formatCurrency(data.performance_metrics.highestStockValue),
        ],
        [
          "Average Stock Value",
          this._formatCurrency(data.performance_metrics.averageStockValue),
        ],
        ["Stock Turnover Rate", data.performance_metrics.stockTurnoverRate],
      ];

      perfData.forEach(([label, value], index) => {
        analyticsSheet.getCell(`A${index + 3}`).value = label;
        analyticsSheet.getCell(`A${index + 3}`).font = { bold: true };
        analyticsSheet.getCell(`B${index + 3}`).value = value;
      });

      // Financial Analytics
      analyticsSheet.getCell("A10").value = "Financial Analytics";
      analyticsSheet.getCell("A10").font = { size: 16, bold: true };

      const financialData = [
        [
          "Total Inventory Value",
          this._formatCurrency(data.analytics.total_inventory_value),
        ],
        [
          "Low Stock Value",
          this._formatCurrency(data.analytics.low_stock_value),
        ],
        ["Low Stock %", `${data.analytics.low_stock_percentage.toFixed(1)}%`],
        ["Growth Rate", `${data.analytics.growth_rate.toFixed(1)}%`],
        ["Stock Turnover", data.analytics.stock_turnover_rate.toFixed(2)],
      ];

      financialData.forEach(([label, value], index) => {
        analyticsSheet.getCell(`A${index + 12}`).value = label;
        analyticsSheet.getCell(`A${index + 12}`).font = { bold: true };
        analyticsSheet.getCell(`B${index + 12}`).value = value;
      });

      // ==================== RECOMMENDATIONS PAGE ====================
      const recSheet = workbook.addWorksheet("Recommendations");

      recSheet.columns = [
        { header: "Priority", key: "priority", width: 10 },
        { header: "Area", key: "area", width: 15 },
        { header: "Recommendation", key: "recommendation", width: 50 },
        { header: "Expected Impact", key: "impact", width: 40 },
      ];

      const recommendations = this._generateRecommendations(data);
      // @ts-ignore
      recommendations.forEach((rec, index) => {
        const row = recSheet.addRow({
          priority: rec.priority,
          area: rec.area,
          recommendation: rec.recommendation,
          impact: rec.impact,
        });

        // Priority coloring
        const priorityCell = row.getCell("priority");
        if (rec.priority === "HIGH") {
          priorityCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE6E6" },
          };
          priorityCell.font = { bold: true, color: { argb: "E74C3C" } };
        } else if (rec.priority === "MEDIUM") {
          priorityCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF2E6" },
          };
          priorityCell.font = { bold: true, color: { argb: "F39C12" } };
        } else {
          priorityCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "E6FFE6" },
          };
          priorityCell.font = { bold: true, color: { argb: "27AE60" } };
        }
      });

      // Save workbook
      await workbook.xlsx.writeFile(filepath);
      const stats = fs.statSync(filepath);

      return {
        filename: filename,
        fileSize: this._formatFileSize(stats.size),
      };
    } catch (error) {
      console.error("Excel export error:", error);
      // Fallback to CSV
      return await this._exportCSV(data, params);
    }
  }

  /**
   * Export data as PDF with enhanced design
   * @param {any} data
   * @param {any} params
   */
  async _exportPDF(data, params) {
    try {
      if (!this.pdfKit) {
        console.warn("PDFKit not available, falling back to CSV");
        return await this._exportCSV(data, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `inventory_report_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create PDF document
      const doc = new this.pdfKit({
        size: "A4",
        margin: 40,
        info: {
          Title: "Inventory Analysis Report",
          Author: "InventoryPro Management System",
          Subject: "Inventory Analysis Report",
          Keywords: "inventory, stock, analysis, report",
          CreationDate: new Date(),
        },
      });

      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Track pages
      const pages = [];

      // ==================== COVER PAGE ====================
      this._createCoverPage(doc, data);
      pages.push(0);
      doc.addPage();

      // ==================== EXECUTIVE SUMMARY ====================
      this._createExecutiveSummary(doc, data);
      pages.push(1);
      doc.addPage();

      // ==================== PERFORMANCE METRICS ====================
      this._createPerformanceMetrics(doc, data);
      pages.push(2);
      doc.addPage();

      // ==================== STOCK ANALYSIS ====================
      this._createStockAnalysis(doc, data);
      pages.push(3);
      doc.addPage();

      // ==================== LOW STOCK ALERTS ====================
      this._createLowStockAlerts(doc, data);
      pages.push(4);
      doc.addPage();

      // ==================== STOCK MOVEMENTS ====================
      this._createStockMovements(doc, data);
      pages.push(5);
      doc.addPage();

      // ==================== RECOMMENDATIONS ====================
      this._createRecommendationsPage(doc, data);
      pages.push(6);

      // ==================== FOOTER ====================
      this._createFooter(doc, data, pages.length);

      // Finalize PDF
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

  /**
   * Create cover page for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createCoverPage(doc, data) {
    const pageWidth = doc.page.width;
    const margin = 40;
    const headerHeight = 180;
    const headerPaddingTop = 30;
    const panelTop = headerHeight - 20;
    const panelHeight = 300;
    // @ts-ignore
    const panelRadius = 6;

    // Header background
    doc.save();
    doc.rect(0, 0, pageWidth, headerHeight).fill(this.CHART_COLORS.dark);

    // Title block
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(32)
      .text("INVENTORY", margin, headerPaddingTop, {
        width: pageWidth - margin * 2,
        align: "center",
        lineGap: 2,
      });

    doc
      .font("Helvetica")
      .fontSize(20)
      .fillColor("white")
      .text("ANALYSIS REPORT", margin, headerPaddingTop + 44, {
        width: pageWidth - margin * 2,
        align: "center",
      });

    doc
      .fontSize(12)
      .fillColor(this.CHART_COLORS.light)
      .text(
        "Comprehensive Inventory Performance Analysis",
        margin,
        headerPaddingTop + 74,
        {
          width: pageWidth - margin * 2,
          align: "center",
        }
      );

    doc
      .fontSize(10)
      .fillColor(this.CHART_COLORS.light)
      .text("InventoryPro Management System", margin, headerPaddingTop + 92, {
        width: pageWidth - margin * 2,
        align: "center",
      });
    doc.restore();

    // White panel for main content
    doc.save();
    doc.fillColor("white");
    doc.rect(margin, panelTop, pageWidth - margin * 2, panelHeight).fill();
    doc
      .lineWidth(0.5)
      .strokeColor("#e6e6e6")
      .rect(margin, panelTop, pageWidth - margin * 2, panelHeight)
      .stroke();
    doc.restore();

    // Move cursor into the white panel
    const contentX = margin + 16;
    let cursorY = panelTop + 18;

    // Report Details heading
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(this.CHART_COLORS.dark)
      .text("REPORT DETAILS", contentX, cursorY);

    const headingWidth = doc.widthOfString("REPORT DETAILS");
    doc
      .moveTo(contentX, cursorY + 18)
      .lineTo(contentX + headingWidth, cursorY + 18)
      .lineWidth(1)
      .strokeColor(this.CHART_COLORS.dark)
      .stroke();

    cursorY += 28;

    // Details rows
    const details = [
      ["Report ID", `INV-${Date.now().toString().slice(-8)}`],
      ["Generated", new Date().toLocaleString()],
      [
        "Date Range",
        `${data.date_range.startDate} to ${data.date_range.endDate}`,
      ],
      ["Period", data.filters.period],
      ["Currency", data.metadata.currency],
      ["Total Products", data.summary.totalProducts],
      ["Total Stock Value", this._formatCurrency(data.summary.totalStockValue)],
      ["Low Stock Items", data.summary.lowStockCount],
    ];

    details.forEach(([label, value]) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(this.CHART_COLORS.dark)
        .text(label, contentX, cursorY, { continued: false });

      const valueX = contentX + 220;
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#666666")
        .text(String(value), valueX, cursorY);

      cursorY += 18;
    });

    // Risk Indicator
    cursorY += 12;
    const riskLevel = this._getRiskLevel(data);
    let riskColor;
    if (riskLevel === "HIGH") riskColor = this.CHART_COLORS.danger;
    else if (riskLevel === "MEDIUM") riskColor = this.CHART_COLORS.warning;
    else riskColor = this.CHART_COLORS.secondary;

    const riskBoxWidth = 220;
    const riskBoxHeight = 28;
    const riskBoxX = contentX;
    const riskBoxY = cursorY;

    doc.save();
    doc
      .roundedRect(riskBoxX, riskBoxY, riskBoxWidth, riskBoxHeight, 4)
      .fill(riskColor);

    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(`RISK LEVEL: ${riskLevel}`, riskBoxX, riskBoxY + 6, {
        width: riskBoxWidth,
        align: "center",
      });
    doc.restore();

    doc.y = panelTop + panelHeight + 20;
  }

  /**
   * Create executive summary for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createExecutiveSummary(doc, data = {}) {
    const pageWidth = doc.page.width;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    const startX = margin;

    // Safe helpers and defaults
    const colors = this.CHART_COLORS || { primary: "#1976D2", dark: "#263238" };
    const formatCurrency =
      typeof this._formatCurrency === "function"
        ? this._formatCurrency
        : (/** @type {any} */ v) => String(v ?? 0);
    const summary = data.summary || {};
    const performance = data.performance_metrics || {};
    const metadata = data.metadata || {};

    // Section header
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(colors.dark)
      .text("EXECUTIVE SUMMARY", startX, doc.y, { underline: true });

    doc.moveDown(0.8);

    // KPI Grid (emoji-free icons)
    const kpis = [
      { label: "Total Products", value: summary.totalProducts ?? 0, icon: "P" },
      { label: "Total Stock", value: summary.totalStock ?? 0, icon: "S" },
      {
        label: "Total Value",
        value: formatCurrency(summary.totalStockValue ?? 0),
        icon: "$",
      },
      {
        label: "Low Stock Items",
        value: summary.lowStockCount ?? 0,
        icon: "!",
      },
      { label: "Categories", value: summary.totalCategories ?? 0, icon: "C" },
      {
        label: "Growth Rate",
        value: summary.growthRate != null ? `${summary.growthRate}%` : "N/A",
        icon: "↑",
      },
      {
        label: "Turnover Rate",
        value: summary.stockTurnoverRate ?? 0,
        icon: "↻",
      },
      {
        label: "Stock Movements",
        value: metadata.total_movements ?? 0,
        icon: "M",
      },
    ];

    const maxCols = 3;
    const gap = 14;
    const colCount = Math.min(maxCols, kpis.length);
    const boxWidth = Math.floor(
      (contentWidth - gap * (colCount - 1)) / colCount
    );
    const boxHeight = 64;
    let cursorY = doc.y;

    // Draw KPI boxes with page-break safety
    const rows = Math.ceil(kpis.length / colCount);
    for (let idx = 0; idx < kpis.length; idx++) {
      const row = Math.floor(idx / colCount);
      const col = idx % colCount;
      const x = startX + col * (boxWidth + gap);
      const y = cursorY + row * (boxHeight + gap);

      // If next row would overflow page, add page and reset cursorY
      if (row > 0 && y + boxHeight > doc.page.height - 80) {
        doc.addPage();
        cursorY = margin;
      }

      // Box background and border
      doc
        .roundedRect(x, y, boxWidth, boxHeight, 6)
        .fill("#FFFFFF")
        .lineWidth(0.6)
        .strokeColor("#E6E6E6")
        .stroke();

      // Icon area (left)
      const iconX = x + 10;
      const iconY = y + 10;
      doc
        .font("Helvetica")
        .fontSize(16)
        .fillColor(colors.primary)
        .text(kpis[idx].icon, iconX, iconY);

      // Label
      const labelX = x + 44;
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#666666")
        .text(kpis[idx].label, labelX, y + 10, {
          width: boxWidth - 54,
          continued: false,
        });

      // Value
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor(colors.dark)
        .text(String(kpis[idx].value), labelX, y + 30, {
          width: boxWidth - 54,
        });
    }

    // Advance cursor below KPI grid
    doc.y = cursorY + rows * (boxHeight + gap) + 8;

    // Key Findings
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(colors.dark)
      .text("KEY FINDINGS", startX, doc.y, { underline: true });

    doc.moveDown(0.5);

    const findings = [
      `Total inventory value: ${formatCurrency(summary.totalStockValue ?? 0)}`,
      `${summary.lowStockCount ?? 0} items require attention (low stock)`,
      `Inventory growth rate: ${summary.growthRate != null ? `${summary.growthRate}%` : "N/A"}`,
      `Stock turnover rate: ${summary.stockTurnoverRate ?? "N/A"} times per year`,
      `Average stock value: ${formatCurrency(performance.averageStockValue ?? 0)} per product`,
    ];

    const bulletIndent = 18;
    const textWidth = contentWidth - bulletIndent;

    findings.forEach((f) => {
      // Page-break safety for long lists
      if (doc.y + 36 > doc.page.height - 80) doc.addPage();
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#333333")
        .text(`• ${f}`, startX + 4, doc.y, {
          width: textWidth,
          indent: 0,
          continued: false,
        });
      doc.moveDown(0.4);
    });

    // Small summary row (right aligned)
    doc.moveDown(0.6);
    const summaryText = `Analyzed ${summary.totalProducts ?? 0} products • Movements ${metadata.total_movements ?? 0}`;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#777777")
      .text(summaryText, startX, doc.y, {
        width: contentWidth,
        align: "right",
      });

    // Leave space before next section
    doc.moveDown(1.2);
  }

  /**
   * Create performance metrics for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createPerformanceMetrics(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("PERFORMANCE METRICS", { underline: true });

    doc.moveDown(1);

    const perfData = [
      ["Highest Stock Category", data.performance_metrics.highestStockCategory],
      ["Highest Stock Count", data.performance_metrics.highestStockCount],
      [
        "Highest Stock Value",
        this._formatCurrency(data.performance_metrics.highestStockValue),
      ],
      [
        "Average Stock Value",
        this._formatCurrency(data.performance_metrics.averageStockValue),
      ],
      ["Stock Turnover Rate", data.performance_metrics.stockTurnoverRate],
    ];

    const colWidths = [200, 100];
    const startX = 50;
    const startY = doc.y;

    perfData.forEach(([label, value], rowIndex) => {
      const y = startY + rowIndex * 25;

      // Label
      doc
        .fontSize(10)
        .fillColor("#333333")
        .font("Helvetica-Bold")
        .text(label, startX, y, { width: colWidths[0] });

      // Value
      doc
        .fontSize(10)
        .fillColor(this.CHART_COLORS.primary)
        .text(value.toString(), startX + colWidths[0] + 10, y, {
          width: colWidths[1],
        });

      // Separator line
      if (rowIndex < perfData.length - 1) {
        doc
          .moveTo(startX, y + 20)
          .lineTo(startX + colWidths[0] + colWidths[1] + 20, y + 20)
          .strokeColor("#EEEEEE")
          .lineWidth(0.5)
          .stroke();
      }
    });

    doc.moveDown(perfData.length / 2 + 2);
  }

  /**
   * Create stock analysis for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createStockAnalysis(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("STOCK BY CATEGORY", { underline: true });

    doc.moveDown(1);

    if (data.stock_by_category.length === 0) {
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("No category data available", { align: "center" });
      return;
    }

    // Table header
    const headers = ["Category", "Quantity", "Value", "%"];
    const colWidths = [150, 80, 100, 50];
    const startX = 50;
    const startY = doc.y;

    // Draw header
    headers.forEach((header, i) => {
      doc
        .fontSize(10)
        .fillColor("white")
        .font("Helvetica-Bold")
        .rect(startX + i * colWidths[i], startY, colWidths[i], 20)
        .fillColor(this.CHART_COLORS.primary)
        .fill();

      doc.text(header, startX + i * colWidths[i] + 5, startY + 5, {
        width: colWidths[i] - 10,
      });
    });

    // Draw rows
    data.stock_by_category
      .slice(0, 10)
      .forEach(
        (
          /** @type {{ name: string; stock_quantity: { toString: () => any; }; stock_value: number; percentage: any; }} */ category,
          /** @type {number} */ rowIndex
        ) => {
          const y = startY + 20 + rowIndex * 20;

          // Zebra striping
          if (rowIndex % 2 === 0) {
            doc
              .rect(
                startX,
                y,
                colWidths.reduce((a, b) => a + b, 0),
                20
              )
              .fillColor("#F8F9F9")
              .fill();
          }

          // Draw cell borders
          colWidths.forEach((width, i) => {
            doc
              .rect(startX + i * width, y, width, 20)
              .strokeColor("#DDDDDD")
              .stroke();
          });

          // Draw data
          const rowData = [
            category.name.substring(0, 20),
            category.stock_quantity.toString(),
            this._formatCurrency(category.stock_value),
            `${category.percentage || 0}%`,
          ];

          rowData.forEach((text, i) => {
            doc
              .fontSize(9)
              .fillColor("#333333")
              .text(text, startX + i * colWidths[i] + 5, y + 5, {
                width: colWidths[i] - 10,
              });
          });
        }
      );

    doc.moveDown(data.stock_by_category.length / 2 + 1);
  }

  /**
   * Create low stock alerts for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createLowStockAlerts(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("LOW STOCK ALERTS", { underline: true });

    doc.moveDown(1);

    if (data.low_stock_products.length === 0) {
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("No low stock items found", { align: "center" });
      return;
    }

    // Table header
    const headers = ["Product", "Stock", "Reorder", "Category", "Status"];
    const colWidths = [150, 50, 50, 100, 60];
    const startX = 50;
    const startY = doc.y;

    // Draw header
    headers.forEach((header, i) => {
      doc
        .fontSize(10)
        .fillColor("white")
        .font("Helvetica-Bold")
        .rect(startX + i * colWidths[i], startY, colWidths[i], 20)
        .fillColor(this.CHART_COLORS.danger)
        .fill();

      doc.text(header, startX + i * colWidths[i] + 5, startY + 5, {
        width: colWidths[i] - 10,
      });
    });

    // Draw rows
    data.low_stock_products
      .slice(0, 15)
      .forEach(
        (
          /** @type {{ product_name: string; current_stock: { toString: () => any; }; reorder_level: { toString: () => any; }; category: string; stock_status: any; }} */ item,
          /** @type {number} */ rowIndex
        ) => {
          const y = startY + 20 + rowIndex * 20;

          // Zebra striping
          if (rowIndex % 2 === 0) {
            doc
              .rect(
                startX,
                y,
                colWidths.reduce((a, b) => a + b, 0),
                20
              )
              .fillColor("#F8F9F9")
              .fill();
          }

          // Draw cell borders
          colWidths.forEach((width, i) => {
            doc
              .rect(startX + i * width, y, width, 20)
              .strokeColor("#DDDDDD")
              .stroke();
          });

          // Draw data
          const rowData = [
            item.product_name.substring(0, 25),
            item.current_stock.toString(),
            item.reorder_level.toString(),
            item.category.substring(0, 15),
            item.stock_status,
          ];

          rowData.forEach((text, i) => {
            doc
              .fontSize(9)
              .fillColor("#333333")
              .text(text, startX + i * colWidths[i] + 5, y + 5, {
                width: colWidths[i] - 10,
              });
          });
        }
      );

    doc.moveDown(data.low_stock_products.length / 2 + 1);
  }

  /**
   * Create stock movements for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createStockMovements(doc, data = {}) {
    // Safe defaults and layout
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 50;
    const contentW = pageW - margin * 2;
    const startX = margin;
    const formatCurrency =
      typeof this._formatCurrency === "function"
        ? this._formatCurrency
        : (/** @type {any} */ v) => String(v ?? 0);
    const colors = this.CHART_COLORS || { info: "#1976D2", dark: "#263238" };

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(colors.dark)
      .text("STOCK MOVEMENTS", startX, doc.y, { underline: true });

    doc.moveDown(0.8);

    // Guard: ensure stock_movements exists and is an array
    const movements = Array.isArray(data.stock_movements)
      ? data.stock_movements.slice(0, 12)
      : [];
    if (movements.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#666666")
        .text("No stock movement data available", startX, doc.y, {
          width: contentW,
          align: "center",
        });
      doc.moveDown(1);
      return;
    }

    // Table settings (responsive centering)
    const headers = ["Period", "Stock In", "Stock Out", "Net Change", "Trend"];
    const colWidths = [120, 90, 90, 100, 70];
    const tableWidth = colWidths.reduce((s, w) => s + w, 0);
    const tableX = startX + Math.max(0, (contentW - tableWidth) / 2);
    let y = doc.y;

    // Header background
    const headerH = 22;
    doc.save();
    doc.rect(tableX - 4, y - 4, tableWidth + 8, headerH + 8).fill(colors.info);
    doc.restore();

    // Header labels
    let hx = tableX;
    headers.forEach((h, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#FFFFFF")
        .text(h, hx + 6, y + 4, { width: colWidths[i] - 12, align: "left" });
      hx += colWidths[i];
    });

    // Rows start
    y += headerH + 6;
    const rowH = 22;

    // Helper: ensure space for next row, add page if needed
    const ensureSpace = (/** @type {number} */ needed) => {
      if (y + needed > pageH - 80) {
        doc.addPage();
        y = margin;
      }
    };

    // Draw rows
    movements.forEach((/** @type {{ month: any; period: any; stockIn: null; stockOut: null; netChange: null; }} */ movement, /** @type {number} */ rowIndex) => {
      ensureSpace(rowH + 6);

      // Zebra background
      if (rowIndex % 2 === 0) {
        doc.rect(tableX - 4, y - 2, tableWidth + 8, rowH).fill("#F8F9F9");
      }

      // Cell borders
      let cx = tableX;
      colWidths.forEach((w) => {
        doc
          .rect(cx, y - 2, w, rowH)
          .strokeColor("#E0E0E0")
          .lineWidth(0.5)
          .stroke();
        cx += w;
      });

      // Prepare values safely
      const period = String(movement.month ?? movement.period ?? "").substring(
        0,
        20
      );
      const stockIn = movement.stockIn != null ? String(movement.stockIn) : "0";
      const stockOut =
        movement.stockOut != null ? String(movement.stockOut) : "0";
      const netChangeVal =
        movement.netChange != null
          ? Number(movement.netChange)
          : Number(movement.stockIn || 0) - Number(movement.stockOut || 0);
      const netChange =
        typeof movement.netChange === "number"
          ? formatCurrency(netChangeVal)
          : String(netChangeVal);
      const trend =
        netChangeVal > 0 ? "Up" : netChangeVal < 0 ? "Down" : "Flat";
      const trendColor =
        netChangeVal > 0
          // @ts-ignore
          ? this.CHART_COLORS?.success || "#2E7D32"
          : netChangeVal < 0
            ? this.CHART_COLORS?.danger || "#C62828"
            : "#607D8B";

      // Render cells
      let cellX = tableX;
      // Period
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(period, cellX + 6, y + 4, { width: colWidths[0] - 12 });
      cellX += colWidths[0];

      // Stock In
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(stockIn, cellX + 6, y + 4, {
          width: colWidths[1] - 12,
          align: "right",
        });
      cellX += colWidths[1];

      // Stock Out
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(stockOut, cellX + 6, y + 4, {
          width: colWidths[2] - 12,
          align: "right",
        });
      cellX += colWidths[2];

      // Net Change
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(netChange, cellX + 6, y + 4, {
          width: colWidths[3] - 12,
          align: "right",
        });
      cellX += colWidths[3];

      // Trend (colored)
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(trendColor)
        .text(trend, cellX + 6, y + 4, {
          width: colWidths[4] - 12,
          align: "center",
        });

      // Advance y
      y += rowH;
    });

    // Move doc cursor below table
    doc.y = y + 12;
  }

  /**
   * Create recommendations page for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createRecommendationsPage(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("ACTION PLAN & RECOMMENDATIONS", { underline: true });

    doc.moveDown(1);

    const recommendations = this._generateRecommendations(data);
    recommendations.forEach((rec, index) => {
      const y = doc.y;

      // Priority indicator
      let priorityColor;
      if (rec.priority === "HIGH") {
        priorityColor = this.CHART_COLORS.danger;
      } else if (rec.priority === "MEDIUM") {
        priorityColor = this.CHART_COLORS.warning;
      } else {
        priorityColor = this.CHART_COLORS.secondary;
      }

      doc.rect(50, y, 10, 10).fillColor(priorityColor).fill();

      // Recommendation text
      doc
        .fontSize(11)
        .fillColor(this.CHART_COLORS.dark)
        .font("Helvetica-Bold")
        .text(`${index + 1}. ${rec.area}: ${rec.recommendation}`, 70, y - 2);

      // Impact
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor("#666666")
        .text(`Impact: ${rec.impact}`, { indent: 20 });

      doc.moveDown(1);
    });
  }

  /**
   * Create footer for PDF
   * @param {any} doc
   * @param {any} data
   * @param {number} totalPages
   */
  _createFooter(doc, data, totalPages) {
    try {
      // Add footer to all pages
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          doc.switchToPage(i);
        }

        const currentPage = i + 1;

        // Page number
        doc
          .fontSize(8)
          .fillColor("#666666")
          .text(
            `Page ${currentPage} of ${totalPages}`,
            40,
            doc.page.height - 30,
            {
              align: "center",
              width: doc.page.width - 80,
            }
          );

        // Footer separator
        doc
          .moveTo(40, doc.page.height - 40)
          .lineTo(doc.page.width - 40, doc.page.height - 40)
          .strokeColor("#DDDDDD")
          .lineWidth(0.5)
          .stroke();

        // Footer text
        doc
          .fontSize(7)
          .fillColor("#999999")
          .text(
            `Inventory Analysis Report | Generated: ${new Date().toLocaleDateString()} | InventoryPro v2.0 | Report Type: ${data.metadata.report_type} | Confidential`,
            40,
            doc.page.height - 20,
            { align: "center", width: doc.page.width - 80 }
          );
      }
    } catch (error) {
      // @ts-ignore
      console.warn("Error creating footer:", error.message);
    }
  }

  /**
   * Generate recommendations based on data
   * @param {any} data
   */
  _generateRecommendations(data) {
    const recommendations = [];

    // Low stock recommendations
    if (data.summary.lowStockCount > 10) {
      recommendations.push({
        priority: "HIGH",
        area: "Stock Management",
        recommendation: `Prioritize replenishment of ${data.summary.lowStockCount} low stock items`,
        impact: "Prevent stockouts and lost sales",
      });
    }

    // Growth rate recommendations
    if (data.summary.growthRate < 0) {
      recommendations.push({
        priority: "MEDIUM",
        area: "Inventory Planning",
        recommendation:
          "Review purchasing strategy due to negative growth rate",
        impact: "Optimize inventory levels and reduce carrying costs",
      });
    } else if (data.summary.growthRate > 20) {
      recommendations.push({
        priority: "MEDIUM",
        area: "Inventory Planning",
        recommendation:
          "Monitor for potential overstocking with high growth rate",
        impact: "Reduce risk of excess inventory",
      });
    }

    // Stock turnover recommendations
    if (data.summary.stockTurnoverRate < 2) {
      recommendations.push({
        priority: "MEDIUM",
        area: "Product Performance",
        recommendation: "Review slow-moving items and consider promotions",
        impact: "Improve inventory turnover and free up capital",
      });
    }

    // Category concentration recommendations
    if (data.stock_by_category.length > 0) {
      const topCategory = data.stock_by_category[0];
      if (topCategory.percentage > 40) {
        recommendations.push({
          priority: "LOW",
          area: "Category Diversification",
          recommendation: `Diversify inventory beyond '${topCategory.name}' category`,
          impact: "Reduce risk exposure to single category",
        });
      }
    }

    // Value optimization recommendations
    const lowStockValuePercentage = data.analytics.low_stock_percentage;
    if (lowStockValuePercentage > 15) {
      recommendations.push({
        priority: "HIGH",
        area: "Financial Risk",
        recommendation: `Address low stock items representing ${lowStockValuePercentage.toFixed(1)}% of inventory value`,
        impact: "Protect significant portion of inventory value",
      });
    }

    // Default recommendation if no issues found
    if (recommendations.length === 0) {
      recommendations.push({
        priority: "LOW",
        area: "Performance",
        recommendation: "Continue current inventory management practices",
        impact: "Maintain current performance levels",
      });
    }

    return recommendations;
  }

  /**
   * Determine risk level based on data
   * @param {any} data
   */
  _getRiskLevel(data) {
    const lowStockPercentage =
      (data.summary.lowStockCount / data.summary.totalProducts) * 100;
    const valueAtRiskPercentage = data.analytics.low_stock_percentage;

    if (lowStockPercentage > 30 || valueAtRiskPercentage > 20) {
      return "HIGH";
    } else if (lowStockPercentage > 15 || valueAtRiskPercentage > 10) {
      return "MEDIUM";
    }
    return "LOW";
  }

  /**
   * Get export history
   */
  async getExportHistory() {
    try {
      const db = require(
        path.join(__dirname, "..", "..", "models", "BaseQuerySet")
      ).getDb();


      // Check if export_history table exists
      // @ts-ignore
      const tableExists = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='export_history'"
      );

      if (!tableExists) {
        // Create table if it doesn't exist
        // @ts-ignore
        await db.run(`
          CREATE TABLE IF NOT EXISTS export_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            format TEXT NOT NULL,
            record_count INTEGER DEFAULT 0,
            generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            generated_by TEXT DEFAULT 'system',
            file_size TEXT,
            filters_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        return {
          status: true,
          message: "Export history table created",
          data: [],
        };
      }

      // Get history
      // @ts-ignore
      const history = await db.all(
        "SELECT * FROM export_history WHERE filename LIKE '%inventory_report%' ORDER BY generated_at DESC LIMIT 50"
      );

      // Parse filters_json
      const parsedHistory = history.map(
        (/** @type {{ filters_json: string; }} */ item) => ({
          ...item,
          filters: item.filters_json ? JSON.parse(item.filters_json) : {},
        })
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

  /**
   * Save export history
   * @param {{ filename: any; format: any; generated_at: any; file_size: any; filters: any; }} exportData
   */
  async _saveExportHistory(exportData) {
    try {
      const db = require(
        path.join(__dirname, "..", "..", "models", "BaseQuerySet")
      ).getDb();


      // @ts-ignore
      await db.run(
        `INSERT INTO export_history 
         (filename, format, generated_at, file_size, filters_json) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          exportData.filename,
          exportData.format,
          exportData.generated_at,
          exportData.file_size,
          exportData.filters || "{}",
        ]
      );

      return true;
    } catch (error) {
      // @ts-ignore
      console.warn("Failed to save export history:", error.message);
      return false;
    }
  }

  /**
   * Helper Methods
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
   * @param {number} amount
   */
  _formatCurrency(amount) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      return `${currency}${amount.toFixed(2)}`;
    }
  }

  getSupportedFormats() {
    return [
      {
        value: "csv",
        label: "CSV",
        description: "Simple format compatible with all spreadsheet software",
        icon: "📄",
      },
      {
        value: "excel",
        label: "Excel",
        description: "Advanced formatting with multiple sheets and styling",
        icon: "📊",
      },
      {
        value: "pdf",
        label: "PDF Report",
        description: "Professional report with charts and executive summary",
        icon: "📋",
      },
    ];
  }
}

// Create and export handler instance
const inventoryReportExportHandler = new InventoryReportExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("inventoryReportExport", async (event, payload) => {
    return await inventoryReportExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment"
  );
}

// Export for use in other modules
module.exports = { InventoryReportExportHandler, inventoryReportExportHandler };
