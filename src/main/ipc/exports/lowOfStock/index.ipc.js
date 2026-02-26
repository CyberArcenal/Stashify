// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { AppDataSource } = require("../../../db/datasource");
const { getGeneralCurrencySign } = require("../../../../utils/settings/system");
const { lowStockHandler } = require("../../reports/lowStock/index.ipc");

let currency = "$";
(async () => {
  // @ts-ignore
  currency = await getGeneralCurrencySign();
})();

class LowStockExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "stashly",
      "low_stock_exports",
    );

    // Create export directory if it doesn't exist
    if (!fs.existsSync(this.EXPORT_DIR)) {
      fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
    }

    // Initialize ExcelJS if available
    this.excelJS = null;
    this._initializeExcelJS();

    // Configuration constants
    this.SALES_ANALYSIS_DAYS = 30;
    this.STATUS_THRESHOLDS = {
      "Out of Stock": 0,
      Critical: 0.2,
      "Very Low": 0.5,
      "Low Stock": 1.0,
      Adequate: Infinity,
    };

    this.STATUS_COLORS = {
      "Out of Stock": { argb: "FF5252" }, // Red
      Critical: { argb: "FF9800" }, // Orange
      "Very Low": { argb: "FFEB3B" }, // Yellow
      "Low Stock": { argb: "8BC34A" }, // Light Green
      Adequate: { argb: "4CAF50" }, // Green
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

      console.log(`LowStockExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          // @ts-ignore
          return await this.exportLowStockReport(params);
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
      console.error("LowStockExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export low stock report in specified format
   * @param {{ format: string; }} params
   */
  async exportLowStockReport(params) {
    try {
      const format = params.format || "pdf";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get low stock data from the main handler
      const lowStockData = await this._getLowStockReportData(params);

      let exportResult;
      switch (format) {
        case "csv":
          exportResult = await this._exportCSV(lowStockData, params);
          break;
        case "excel":
          exportResult = await this._exportExcel(lowStockData, params);
          break;
        case "pdf":
          exportResult = await this._exportPDF(lowStockData, params);
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
        // @ts-ignore
        record_count: lowStockData.stockItems
          ? // @ts-ignore
            lowStockData.stockItems.length
          : 0,
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
      console.error("exportLowStockReport error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export low stock report: ${error.message}`,
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
      const lowStockData = await this._getLowStockReportData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: lowStockData,
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
   * Get comprehensive low stock report data from LowStockHandler
   * @param {any} params
   */
  async _getLowStockReportData(params) {
    try {
      // Get data from the main low stock handler
      const response = await lowStockHandler.getLowStockReport(params);

      // @ts-ignore
      if (!response.status) {
        throw new Error(response.message);
      }

      const lowStockData = response.data;

      // Transform the data to match the expected format
      const transformedData = await this._transformLowStockData(
        lowStockData,
        params,
      );

      return transformedData;
    } catch (error) {
      console.error("_getLowStockReportData error:", error);
      throw error;
    }
  }

  /**
   * Transform LowStockHandler data to export format
   * @param {{ stockItems: any; summary: any; charts: any; performanceSummary: any; recommendations: any; metadata: any; }} lowStockData
   * @param {{ category: any; warehouse: any; threshold_multiplier: any; limit: any; }} params
   */
  async _transformLowStockData(lowStockData, params) {
    const {
      stockItems,
      summary,
      charts,
      performanceSummary,
      recommendations,
      metadata,
    } = lowStockData;

    // Transform stock items
    const transformedItems = stockItems.map(
      (
        /** @type {{ id: any; product: any; sku: any; variant: any; category: string; warehouse: any; warehouseLocation: any; currentStock: any; reorderLevel: any; adjustedReorderLevel: any; costPerItem: number; netPrice: number; stockValue: any; status: string; salesVelocity: any; daysOfSupply: any; urgencyScore: any; stockRatio: any; itemType: any; lastUpdated: any; supplier: any; deductionStrategy: any; allowNegativeStock: any; otherWarehouses: any; }} */ item,
      ) => ({
        id: item.id,
        product_name: item.product,
        product_sku: item.sku,
        variant_name: item.variant,
        category: item.category,
        category_color: this._getCategoryColor(item.category),
        warehouse: item.warehouse,
        warehouse_location: item.warehouseLocation,
        current_stock: item.currentStock,
        reorder_level: item.reorderLevel,
        adjusted_reorder_level: item.adjustedReorderLevel,
        cost_per_item: item.costPerItem || 0,
        price: item.netPrice || 0,
        stock_value: item.stockValue || 0,
        profit_margin:
          item.costPerItem > 0
            ? ((item.netPrice - item.costPerItem) / item.netPrice) * 100
            : 0,
        stock_status: item.status,
        sales_velocity: item.salesVelocity || 0,
        days_of_supply: item.daysOfSupply,
        urgency_score: item.urgencyScore || 0,
        stock_ratio: item.stockRatio || 0,
        item_type: item.itemType,
        is_published: true,
        last_updated: item.lastUpdated,
        is_low_stock: [
          "Low Stock",
          "Very Low",
          "Critical",
          "Out of Stock",
        ].includes(item.status),
        is_out_of_stock: item.status === "Out of Stock",
        is_critical_stock: item.status === "Critical",
        supplier: item.supplier,
        deduction_strategy: item.deductionStrategy,
        allow_negative_stock: item.allowNegativeStock,
        other_warehouses: item.otherWarehouses || [],
      }),
    );

    // Calculate analytics from summary
    const analytics = this._calculateAnalyticsFromSummary(
      summary,
      transformedItems,
    );

    return {
      low_stock_items: transformedItems,
      analytics: analytics,
      summary: summary,
      charts: charts,
      performanceSummary: performanceSummary,
      recommendations: recommendations,
      filters: {
        category: params.category || null,
        warehouse: params.warehouse || null,
        threshold_multiplier: params.threshold_multiplier || 1.0,
        limit: params.limit || 100,
      },
      metadata: {
        ...metadata,
        generated_at: new Date().toISOString(),
        total_records: summary.totalStockItems,
        records_exported: transformedItems.length,
        currency: currency,
        report_type: "per_stock_item",
      },
    };
  }

  /**
   * Calculate analytics from summary data
   * @param {{ outOfStockCount: any; criticalStockCount: any; veryLowStockCount: any; lowStockCountDetailed: any; totalStockItems: number; lowStockCount: number; estimatedReorderCost: any; totalStockValue: any; }} summary
   * @param {any[]} items
   */
  _calculateAnalyticsFromSummary(summary, items) {
    const statusDistribution = {
      "Out of Stock": summary.outOfStockCount || 0,
      Critical: summary.criticalStockCount || 0,
      "Very Low": summary.veryLowStockCount || 0,
      "Low Stock": summary.lowStockCountDetailed || 0,
      Adequate: summary.totalStockItems - summary.lowStockCount,
    };

    // Category breakdown from items
    const categoryBreakdown = {};
    items.forEach((item) => {
      const category = item.category;
      // @ts-ignore
      if (!categoryBreakdown[category]) {
        // @ts-ignore
        categoryBreakdown[category] = {
          count: 0,
          total_value: 0,
          urgency_sum: 0,
          profit_sum: 0,
        };
      }
      // @ts-ignore
      categoryBreakdown[category].count++;
      // @ts-ignore
      categoryBreakdown[category].total_value += item.stock_value;
      // @ts-ignore
      categoryBreakdown[category].urgency_sum += item.urgency_score;
      // @ts-ignore
      categoryBreakdown[category].profit_sum += item.profit_margin;
    });

    // Warehouse breakdown from items
    const warehouseBreakdown = {};
    items.forEach((item) => {
      const warehouse = item.warehouse;
      // @ts-ignore
      if (!warehouseBreakdown[warehouse]) {
        // @ts-ignore
        warehouseBreakdown[warehouse] = {
          count: 0,
          total_value: 0,
          stock_sum: 0,
        };
      }
      // @ts-ignore
      warehouseBreakdown[warehouse].count++;
      // @ts-ignore
      warehouseBreakdown[warehouse].total_value += item.stock_value;
      // @ts-ignore
      warehouseBreakdown[warehouse].stock_sum += item.current_stock;
    });

    // Calculate averages
    const avgUrgencyScore =
      items.length > 0
        ? items.reduce((sum, item) => sum + item.urgency_score, 0) /
          items.length
        : 0;

    const avgProfitMargin =
      items.length > 0
        ? items.reduce((sum, item) => sum + item.profit_margin, 0) /
          items.length
        : 0;

    const immediateAttentionItems = items.filter((item) =>
      ["Out of Stock", "Critical"].includes(item.stock_status),
    ).length;

    const riskLevel = this._getRiskLevel(items.length, summary.totalStockItems);

    return {
      total_items_analyzed: summary.totalStockItems,
      low_stock_items_count: summary.lowStockCount,
      out_of_stock_count: summary.outOfStockCount || 0,
      critical_stock_count: summary.criticalStockCount || 0,
      very_low_stock_count: summary.veryLowStockCount || 0,
      low_stock_count: summary.lowStockCountDetailed || 0,
      adequate_stock_count: statusDistribution["Adequate"],
      total_stock_value_at_risk: summary.estimatedReorderCost || 0,
      total_inventory_value: summary.totalStockValue || 0,
      average_urgency_score: parseFloat(avgUrgencyScore.toFixed(1)),
      average_profit_margin: parseFloat(avgProfitMargin.toFixed(1)),
      immediate_attention_items: immediateAttentionItems,
      risk_level: riskLevel,
      category_breakdown: Object.entries(categoryBreakdown).map(
        ([category, data]) => ({
          category: category,
          count: data.count,
          total_value: parseFloat(data.total_value.toFixed(2)),
          average_urgency:
            data.count > 0
              ? parseFloat((data.urgency_sum / data.count).toFixed(1))
              : 0,
          average_profit_margin:
            data.count > 0
              ? parseFloat((data.profit_sum / data.count).toFixed(1))
              : 0,
          percentage:
            summary.totalStockItems > 0
              ? parseFloat(
                  ((data.count / summary.totalStockItems) * 100).toFixed(1),
                )
              : 0,
        }),
      ),
      warehouse_breakdown: Object.entries(warehouseBreakdown).map(
        ([warehouse, data]) => ({
          warehouse: warehouse,
          count: data.count,
          total_value: parseFloat(data.total_value.toFixed(2)),
          average_stock:
            data.count > 0
              ? parseFloat((data.stock_sum / data.count).toFixed(1))
              : 0,
        }),
      ),
      status_distribution: statusDistribution,
    };
  }

  /**
   * Export data as CSV
   * @param {any} data
   * @param {any} params
   */
  // @ts-ignore
  async _exportCSV(data, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `low_stock_report_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Report Header
    csvContent.push("📊 LOW STOCK INVENTORY ANALYSIS REPORT");
    csvContent.push(`Generated,${new Date().toISOString()}`);
    csvContent.push(`Report Type,${data.metadata.report_type}`);
    csvContent.push(`Total Items Analyzed,${data.summary.totalStockItems}`);
    csvContent.push(`Low Stock Items Found,${data.summary.lowStockCount}`);
    csvContent.push(
      `Threshold Multiplier,${data.filters.threshold_multiplier}x`,
    );
    csvContent.push(`Risk Level,${data.analytics.risk_level}`);
    csvContent.push(`Currency,${data.metadata.currency}`);
    csvContent.push("");

    // Executive Summary
    csvContent.push("📈 EXECUTIVE SUMMARY");
    csvContent.push("Metric,Value,Status,Impact");

    const execSummary = [
      [
        "Total Inventory Value",
        this._formatCurrency(data.summary.totalStockValue),
        "All Items",
        "High",
      ],
      [
        "Estimated Reorder Cost",
        this._formatCurrency(data.summary.estimatedReorderCost),
        "Action Required",
        "Critical",
      ],
      [
        "Out of Stock Items",
        data.summary.outOfStockCount,
        "Critical",
        "Immediate",
      ],
      [
        "Critical Stock Items",
        data.summary.criticalStockCount,
        "High",
        "Urgent",
      ],
      [
        "Affected Warehouses",
        data.summary.affectedWarehouses,
        "Distribution",
        "Review",
      ],
      [
        "Affected Categories",
        data.summary.affectedCategories,
        "Analysis",
        "Medium",
      ],
      [
        "Low Stock Percentage",
        `${data.summary.lowStockPercentage}%`,
        data.summary.lowStockPercentage > 20 ? "High" : "Normal",
        "Monitor",
      ],
    ];

    execSummary.forEach((row) => csvContent.push(row.join(",")));
    csvContent.push("");

    // Performance Summary
    csvContent.push("🎯 PERFORMANCE SUMMARY");
    csvContent.push("Metric,Value");

    const perfSummary = [
      ["Most Critical Category", data.performanceSummary.mostCriticalCategory],
      [
        "Critical Products Count",
        data.performanceSummary.criticalProductsCount,
      ],
      [
        "Most Critical Warehouse",
        data.performanceSummary.mostCriticalWarehouse,
      ],
      [
        "Critical Items in Warehouse",
        data.performanceSummary.criticalItemsInWarehouse,
      ],
      ["Average Stock Ratio", `${data.performanceSummary.avgStockRatio}%`],
      [
        "Needs Immediate Attention",
        data.performanceSummary.needsImmediateAttention,
      ],
      ["Average Urgency Score", data.performanceSummary.avgUrgencyScore],
      ["Highest Risk Product", data.performanceSummary.highestRiskProduct],
      ["Highest Risk Score", data.performanceSummary.highestRiskScore],
    ];

    perfSummary.forEach((row) => csvContent.push(row.join(",")));
    csvContent.push("");

    // Status Distribution
    csvContent.push("📊 STOCK STATUS DISTRIBUTION");
    csvContent.push("Status,Count,Percentage,Color");

    const total = data.summary.totalStockItems;
    Object.entries(data.analytics.status_distribution).forEach(
      ([status, count]) => {
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
        // @ts-ignore
        const color = this.STATUS_COLORS[status]?.argb || "CCCCCC";
        csvContent.push([status, count, `${percentage}%`, color].join(","));
      },
    );
    csvContent.push("");

    // Category Breakdown
    csvContent.push("📦 CATEGORY BREAKDOWN");
    csvContent.push(
      "Category,Low Stock Items,Percentage,Total Value,Avg Urgency,Avg Profit Margin",
    );

    data.analytics.category_breakdown.forEach(
      (
        /** @type {{ category: any; count: any; percentage: number; total_value: number; average_urgency: number; average_profit_margin: number; }} */ breakdown,
      ) => {
        csvContent.push(
          [
            breakdown.category,
            breakdown.count,
            `${breakdown.percentage.toFixed(1)}%`,
            this._formatCurrency(breakdown.total_value),
            breakdown.average_urgency.toFixed(1),
            `${breakdown.average_profit_margin.toFixed(1)}%`,
          ].join(","),
        );
      },
    );
    csvContent.push("");

    // Detailed Low Stock Data
    csvContent.push("📋 DETAILED LOW STOCK INVENTORY (PER WAREHOUSE)");
    csvContent.push(
      [
        "Stock Item ID",
        "Product",
        "Variant",
        "SKU",
        "Category",
        "Warehouse",
        "Location",
        "Current Stock",
        "Reorder Level",
        "Adjusted Level",
        "Stock Status",
        "Cost per Item",
        "Price",
        "Profit Margin",
        "Stock Value",
        "Sales Velocity",
        "Days of Supply",
        "Urgency Score",
        "Supplier",
        "Item Type",
        "Last Updated",
      ].join(","),
    );

    // Sort by urgency score (highest first)
    const sortedItems = [...data.low_stock_items].sort(
      (a, b) => b.urgency_score - a.urgency_score,
    );

    sortedItems.forEach((item) => {
      csvContent.push(
        [
          item.id,
          `"${item.product_name}"`,
          `"${item.variant_name}"`,
          `"${item.product_sku}"`,
          `"${item.category}"`,
          `"${item.warehouse}"`,
          `"${item.warehouse_location}"`,
          item.current_stock,
          item.reorder_level,
          item.adjusted_reorder_level,
          item.stock_status,
          this._formatCurrency(item.cost_per_item),
          this._formatCurrency(item.price),
          `${item.profit_margin.toFixed(1)}%`,
          this._formatCurrency(item.stock_value),
          item.sales_velocity.toFixed(2),
          item.days_of_supply || "N/A",
          item.urgency_score.toFixed(1),
          `"${item.supplier}"`,
          item.item_type,
          item.last_updated.substring(0, 10),
        ].join(","),
      );
    });
    csvContent.push("");

    // Recommendations
    csvContent.push("💡 RECOMMENDATIONS & ACTION ITEMS");
    csvContent.push("Priority,Type,Recommendation,Action,Impact");

    data.recommendations.forEach(
      (
        /** @type {{ priority: any; type: any; title: any; action: any; description: any; }} */ rec,
      ) => {
        csvContent.push(
          [
            rec.priority,
            rec.type,
            `"${rec.title}"`,
            `"${rec.action}"`,
            `"${rec.description}"`,
          ].join(","),
        );
      },
    );
    csvContent.push("");

    // Footer
    csvContent.push("🏁 REPORT FOOTER");
    csvContent.push("Generated by,stashly Management System v2.0");
    csvContent.push("Data Source,Product Inventory Database");
    csvContent.push(
      "Report Type,Low Stock Analysis - Per Warehouse Stock Items",
    );
    csvContent.push("Confidentiality,Internal Use Only");
    csvContent.push("Next Review,Next 7 Days");
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
      const filename = `low_stock_report_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "stashly Management System";
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

      const titleRow = coverSheet.addRow(["LOW STOCK INVENTORY REPORT"]);
      titleRow.font = { size: 28, bold: true, color: { argb: "E74C3C" } };
      titleRow.height = 50;
      coverSheet.mergeCells(`A3:E3`);
      titleRow.alignment = { horizontal: "center", vertical: "middle" };

      coverSheet.addRow([]);
      coverSheet.addRow([]);

      // Report Details
      const details = [
        ["Report ID", `LSR-${Date.now()}`],
        ["Generated", new Date().toLocaleString()],
        ["Period", "Current Inventory"],
        ["Analysis Type", "Low Stock & Reorder Analysis"],
        ["Report Scope", "Per Warehouse Stock Items"],
        ["Currency", data.metadata.currency],
        ["Threshold Multiplier", `${data.filters.threshold_multiplier}x`],
        ["Total Items Analyzed", data.summary.totalStockItems],
        ["Low Stock Items", data.summary.lowStockCount],
        ["Risk Level", data.analytics.risk_level],
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
        [
          "⚠️ Immediate Action Required",
          data.performanceSummary.needsImmediateAttention + " items",
        ],
        [
          "💰 Estimated Reorder Cost",
          this._formatCurrency(data.summary.estimatedReorderCost),
        ],
        ["📉 Out of Stock", data.summary.outOfStockCount + " items"],
        ["🔴 Critical Stock", data.summary.criticalStockCount + " items"],
        [
          "📈 Average Urgency",
          data.performanceSummary.avgUrgencyScore.toFixed(1) + "/100",
        ],
        ["🏬 Affected Warehouses", data.summary.affectedWarehouses],
        ["📦 Affected Categories", data.summary.affectedCategories],
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
          label: "Total Items",
          value: data.summary.totalStockItems,
          color: "3498DB",
        },
        {
          label: "Low Stock",
          value: data.summary.lowStockCount,
          color: "E74C3C",
        },
        {
          label: "Out of Stock",
          value: data.summary.outOfStockCount,
          color: "E74C3C",
        },
        {
          label: "Critical",
          value: data.summary.criticalStockCount,
          color: "F39C12",
        },
        {
          label: "Reorder Cost",
          value: this._formatCurrency(data.summary.estimatedReorderCost),
          color: "9B59B6",
        },
        {
          label: "Avg Urgency",
          value: data.performanceSummary.avgUrgencyScore.toFixed(1),
          color: "2ECC71",
        },
      ];

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

      // Status Distribution Chart Data
      rowIndex = 9;
      dashboardSheet.getCell(rowIndex, 1).value = "Stock Status Distribution";
      dashboardSheet.getCell(rowIndex, 1).font = { size: 14, bold: true };

      const statusData = Object.entries(data.analytics.status_distribution);
      statusData.forEach(([status, count], index) => {
        dashboardSheet.getCell(rowIndex + index + 1, 1).value = status;
        dashboardSheet.getCell(rowIndex + index + 1, 2).value = count;
        dashboardSheet.getCell(rowIndex + index + 1, 3).value =
          ((count / data.summary.totalStockItems) * 100).toFixed(1) + "%";

        // Color coding
        const statusCell = dashboardSheet.getCell(rowIndex + index + 1, 1);
        // @ts-ignore
        const color = this.STATUS_COLORS[status]?.argb || "CCCCCC";
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color },
        };
      });

      // ==================== DETAILED ITEMS PAGE ====================
      const itemsSheet = workbook.addWorksheet("Low Stock Items");

      // Column headers
      itemsSheet.columns = [
        { header: "No.", key: "no", width: 6 },
        { header: "Product", key: "product", width: 30 },
        { header: "Variant", key: "variant", width: 20 },
        { header: "SKU", key: "sku", width: 15 },
        { header: "Category", key: "category", width: 15 },
        { header: "Warehouse", key: "warehouse", width: 15 },
        { header: "Location", key: "location", width: 15 },
        { header: "Current Stock", key: "stock", width: 12 },
        { header: "Reorder Level", key: "reorder", width: 12 },
        { header: "Status", key: "status", width: 12 },
        { header: "Cost", key: "cost", width: 12 },
        { header: "Value", key: "value", width: 12 },
        { header: "Urgency", key: "urgency", width: 10 },
        { header: "Profit %", key: "profit", width: 10 },
        { header: "Supplier", key: "supplier", width: 15 },
        { header: "Item Type", key: "type", width: 10 },
      ];

      // Header styling
      const headerRow = itemsSheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "2C3E50" },
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 25;

      // Add data rows with conditional formatting
      const sortedItems = [...data.low_stock_items].sort(
        (a, b) => b.urgency_score - a.urgency_score,
      );

      sortedItems.forEach((item, index) => {
        const row = itemsSheet.addRow({
          no: index + 1,
          product: item.product_name,
          variant: item.variant_name,
          sku: item.product_sku,
          category: item.category,
          warehouse: item.warehouse,
          location: item.warehouse_location,
          stock: item.current_stock,
          reorder: item.reorder_level,
          status: item.stock_status,
          cost: this._formatCurrency(item.cost_per_item),
          value: this._formatCurrency(item.stock_value),
          urgency: item.urgency_score.toFixed(1),
          profit: item.profit_margin.toFixed(1) + "%",
          supplier: item.supplier,
          type: item.item_type,
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

        // Urgency score coloring
        const urgencyCell = row.getCell("urgency");
        if (item.urgency_score >= 80) {
          urgencyCell.font = { bold: true, color: { argb: "E74C3C" } };
        } else if (item.urgency_score >= 60) {
          urgencyCell.font = { bold: true, color: { argb: "F39C12" } };
        }

        // Profit margin coloring
        const profitCell = row.getCell("profit");
        if (item.profit_margin >= 40) {
          profitCell.font = { bold: true, color: { argb: "27AE60" } };
        } else if (item.profit_margin <= 10) {
          profitCell.font = { bold: true, color: { argb: "E74C3C" } };
        }
      });

      // Auto-filter
      itemsSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: itemsSheet.rowCount, column: itemsSheet.columnCount },
      };

      // ==================== ANALYTICS PAGE ====================
      const analyticsSheet = workbook.addWorksheet("Analytics");

      // Category Breakdown
      analyticsSheet.getCell("A1").value = "Category Analysis";
      analyticsSheet.getCell("A1").font = { size: 16, bold: true };

      const categoryHeaders = [
        "Category",
        "Items",
        "Percentage",
        "Total Value",
        "Avg Urgency",
        "Avg Profit",
      ];
      analyticsSheet.addRow(categoryHeaders);

      // @ts-ignore
      data.analytics.category_breakdown.forEach(
        (
          /** @type {{ category: any; count: any; percentage: number; total_value: number; average_urgency: number; average_profit_margin: number; }} */ category,
          /** @type {any} */ index,
        ) => {
          analyticsSheet.addRow([
            category.category,
            category.count,
            `${category.percentage.toFixed(1)}%`,
            this._formatCurrency(category.total_value),
            category.average_urgency.toFixed(1),
            `${category.average_profit_margin.toFixed(1)}%`,
          ]);
        },
      );

      // Warehouse Breakdown
      analyticsSheet.getCell("A15").value = "Warehouse Analysis";
      analyticsSheet.getCell("A15").font = { size: 16, bold: true };

      const warehouseHeaders = [
        "Warehouse",
        "Items",
        "Total Value",
        "Avg Stock",
      ];
      analyticsSheet.addRow(warehouseHeaders);

      // @ts-ignore
      data.analytics.warehouse_breakdown.forEach(
        (
          /** @type {{ warehouse: any; count: any; total_value: number; average_stock: number; }} */ warehouse,
          /** @type {any} */ index,
        ) => {
          analyticsSheet.addRow([
            warehouse.warehouse,
            warehouse.count,
            this._formatCurrency(warehouse.total_value),
            warehouse.average_stock.toFixed(1),
          ]);
        },
      );

      // ==================== CHARTS PAGE ====================
      const chartsSheet = workbook.addWorksheet("Charts & Graphs");

      // Add chart data from the main handler
      if (data.charts && data.charts.barChart) {
        chartsSheet.getCell("A1").value = "Top Urgent Items";
        chartsSheet.getCell("A1").font = { size: 16, bold: true };

        const barHeaders = [
          "Product/Variant",
          "Warehouse",
          "Current Stock",
          "Reorder Level",
          "Urgency Score",
          "Status",
        ];
        chartsSheet.addRow(barHeaders);

        // @ts-ignore
        data.charts.barChart
          .slice(0, 10)
          .forEach(
            (
              /** @type {{ name: any; warehouse: any; stock: any; reorderLevel: any; urgencyScore: any; status: any; }} */ item,
              /** @type {any} */ index,
            ) => {
              chartsSheet.addRow([
                item.name,
                item.warehouse,
                item.stock,
                item.reorderLevel,
                item.urgencyScore,
                item.status,
              ]);
            },
          );
      }

      if (data.charts && data.charts.pieChart) {
        chartsSheet.getCell("A15").value = "Category Distribution";
        chartsSheet.getCell("A15").font = { size: 16, bold: true };

        const pieHeaders = ["Category", "Count", "Total Value", "Avg Urgency"];
        chartsSheet.addRow(pieHeaders);

        data.charts.pieChart.forEach(
          (
            /** @type {{ name: any; value: any; totalValue: number; averageUrgency: any; }} */ item,
          ) => {
            chartsSheet.addRow([
              item.name,
              item.value,
              this._formatCurrency(item.totalValue),
              item.averageUrgency,
            ]);
          },
        );
      }

      // ==================== RECOMMENDATIONS PAGE ====================
      const recSheet = workbook.addWorksheet("Recommendations");

      recSheet.columns = [
        { header: "Priority", key: "priority", width: 10 },
        { header: "Type", key: "type", width: 15 },
        { header: "Title", key: "title", width: 40 },
        { header: "Action", key: "action", width: 40 },
        { header: "Description", key: "description", width: 50 },
      ];

      // @ts-ignore
      data.recommendations.forEach(
        (
          /** @type {{ priority: number; type: any; title: any; action: any; description: any; }} */ rec,
          /** @type {any} */ index,
        ) => {
          const row = recSheet.addRow({
            priority: rec.priority,
            type: rec.type,
            title: rec.title,
            action: rec.action,
            description: rec.description,
          });

          // Priority coloring
          const priorityCell = row.getCell("priority");
          if (rec.priority === 1 || rec.priority === 2) {
            priorityCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE6E6" },
            };
            priorityCell.font = { bold: true, color: { argb: "E74C3C" } };
          } else if (rec.priority === 3 || rec.priority === 4) {
            priorityCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF2E6" },
            };
            priorityCell.font = { bold: true, color: { argb: "F39C12" } };
          }
        },
      );

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
   * Export data as PDF with enhanced design and charts
   * @param {any} data
   * @param {any} params
   */
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
      const filename = `low_stock_report_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create PDF document
      const doc = new PDFKit({
        size: "A4",
        margin: 40,
        info: {
          Title: "Low Stock Inventory Report",
          Author: "stashly Management System",
          Subject: "Low Stock Analysis Report",
          Keywords: "inventory, low stock, reorder, report",
          CreationDate: new Date(),
        },
      });

      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Track pages as we create them
      const pages = [];

      // ==================== COVER PAGE ====================
      this._createCoverPage(doc, data);
      pages.push(0);
      doc.addPage();

      // ==================== EXECUTIVE SUMMARY ====================
      this._createExecutiveSummary(doc, data);
      pages.push(1);
      doc.addPage();

      // ==================== PERFORMANCE SUMMARY ====================
      this._createPerformanceSummary(doc, data);
      pages.push(2);
      doc.addPage();

      // ==================== STATUS DISTRIBUTION ====================
      this._createStatusDistribution(doc, data);
      pages.push(3);
      doc.addPage();

      // ==================== CATEGORY ANALYSIS ====================
      this._createCategoryAnalysis(doc, data);
      pages.push(4);
      doc.addPage();

      // ==================== CHARTS ====================
      this._createChartsSection(doc, data);
      pages.push(5);
      doc.addPage();

      // ==================== DETAILED LISTING ====================
      this._createDetailedListing(doc, data);
      pages.push(6);
      doc.addPage();

      // ==================== RECOMMENDATIONS ====================
      this._createRecommendations(doc, data);
      pages.push(7);

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
      // Fallback to CSV
      return await this._exportCSV(data, params);
    }
  }

  /**
   * Create cover page for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createCoverPage(doc, data) {
    // Layout constants
    const pageWidth = doc.page.width;
    const margin = 40;
    const headerHeight = 180; // mas mataas para hindi tumagos ang title
    const headerPaddingTop = 30;
    const panelTop = headerHeight - 20; // puting panel nagsisimula konti sa ilalim ng header
    const panelHeight = 300;
    // @ts-ignore
    const panelRadius = 6;

    // Header background (dark band)
    doc.save();
    doc.rect(0, 0, pageWidth, headerHeight).fill(this.CHART_COLORS.dark);

    // Title block (centered vertically inside header)
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(32)
      .text("LOW STOCK", margin, headerPaddingTop, {
        width: pageWidth - margin * 2,
        align: "center",
        lineGap: 2,
      });

    doc
      .font("Helvetica")
      .fontSize(20)
      .fillColor("white")
      .text("INVENTORY REPORT", margin, headerPaddingTop + 44, {
        width: pageWidth - margin * 2,
        align: "center",
      });

    doc
      .fontSize(12)
      .fillColor(this.CHART_COLORS.light)
      .text(
        "Per Warehouse Stock Items Analysis",
        margin,
        headerPaddingTop + 74,
        {
          width: pageWidth - margin * 2,
          align: "center",
        },
      );

    doc
      .fontSize(10)
      .fillColor(this.CHART_COLORS.light)
      .text("stashly Management System", margin, headerPaddingTop + 92, {
        width: pageWidth - margin * 2,
        align: "center",
      });
    doc.restore();

    // White panel for main content (with slight overlap to create card effect)
    doc.save();
    doc.fillColor("white");
    doc.rect(margin, panelTop, pageWidth - margin * 2, panelHeight).fill();

    // Add subtle border/shadow effect (light stroke)
    doc
      .lineWidth(0.5)
      .strokeColor("#e6e6e6")
      .rect(margin, panelTop, pageWidth - margin * 2, panelHeight)
      .stroke();
    doc.restore();

    // Move cursor into the white panel with padding
    const contentX = margin + 16;
    let cursorY = panelTop + 18;

    // Report Details heading inside white panel
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(this.CHART_COLORS.dark)
      .text("REPORT DETAILS", contentX, cursorY);

    // underline effect (thin line)
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
      ["Report ID", `LSR-${Date.now().toString().slice(-8)}`],
      ["Generated", new Date().toLocaleString()],
      ["Items Analyzed", data.summary.totalStockItems],
      ["Low Stock Items", data.summary.lowStockCount],
      ["Report Scope", "Per Warehouse Stock Items"],
      ["Risk Level", data.analytics.risk_level],
      ["Currency", data.metadata.currency],
      ["Threshold", `${data.filters.threshold_multiplier}x`],
    ];

    details.forEach(([label, value]) => {
      // label
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(this.CHART_COLORS.dark)
        .text(label, contentX, cursorY, { continued: false });

      // value (aligned to the right area of the panel)
      const valueX = contentX + 220;
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#666666")
        .text(String(value), valueX, cursorY);

      cursorY += 18;
    });

    // Risk Indicator inside panel
    cursorY += 12;
    const riskLevel = data.analytics.risk_level;
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

    // Move doc cursor below the panel for subsequent content
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
    const formatCurrency =
      typeof this._formatCurrency === "function"
        ? this._formatCurrency
        : (/** @type {any} */ v) => String(v ?? 0);
    const colors = this.CHART_COLORS || { primary: "#1976D2", dark: "#263238" };

    // Section header
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(colors.dark)
      .text("EXECUTIVE SUMMARY", startX, doc.y, { underline: true });

    doc.moveDown(0.8);

    // KPI Grid settings (responsive columns)
    const summary = data.summary || {};
    const perf = data.performanceSummary || {};

    const kpis = [
      {
        label: "Estimated Reorder Cost",
        value: formatCurrency(summary.estimatedReorderCost ?? 0),
        icon: "$",
      },
      {
        label: "Immediate Action",
        value: `${perf.needsImmediateAttention ?? 0} items`,
        icon: "!",
      },
      {
        label: "Out of Stock",
        value: `${summary.outOfStockCount ?? 0} items`,
        icon: "↓",
      },
      {
        label: "Critical Stock",
        value: `${summary.criticalStockCount ?? 0} items`,
        icon: "●",
      },
      {
        label: "Affected Warehouses",
        value: summary.affectedWarehouses ?? 0,
        icon: "W",
      },
      {
        label: "Affected Categories",
        value: summary.affectedCategories ?? 0,
        icon: "C",
      },
      {
        label: "Avg Urgency Score",
        value:
          typeof perf.avgUrgencyScore === "number"
            ? perf.avgUrgencyScore.toFixed(1)
            : "0.0",
        icon: "⦿",
      },
      {
        label: "Low Stock %",
        value:
          typeof summary.lowStockPercentage === "number"
            ? `${summary.lowStockPercentage.toFixed(1)}%`
            : "0.0%",
        icon: "%",
      },
    ];

    const maxCols = 3;
    const gap = 14;
    const colCount = Math.min(maxCols, kpis.length);
    const boxWidth = Math.floor(
      (contentWidth - gap * (colCount - 1)) / colCount,
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

    // Key Findings heading
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(colors.dark)
      .text("KEY FINDINGS", startX, doc.y, { underline: true });

    doc.moveDown(0.5);

    // Findings list with controlled line width
    const findings = [
      `${summary.outOfStockCount ?? 0} stock items are completely out of stock`,
      `${summary.criticalStockCount ?? 0} stock items are at critical levels`,
      `Estimated reorder cost: ${formatCurrency(summary.estimatedReorderCost ?? 0)}`,
      `${perf.needsImmediateAttention ?? 0} items require immediate attention`,
      `Items are spread across ${summary.affectedWarehouses ?? 0} warehouses`,
      `${summary.affectedCategories ?? 0} product categories are affected`,
      `Average urgency score: ${typeof perf.avgUrgencyScore === "number" ? perf.avgUrgencyScore.toFixed(1) : "0.0"}/100`,
    ];

    const bulletIndent = 18;
    const textWidth = contentWidth - bulletIndent;

    findings.forEach((f) => {
      // Page-break safety for long lists
      if (doc.y + 36 > doc.page.height - 80) {
        doc.addPage();
      }

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

    // Small summary row (optional) aligned to right
    doc.moveDown(0.6);
    const summaryText = `Analyzed ${summary.totalStockItems ?? 0} items • Low stock ${summary.lowStockCount ?? 0} items`;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#777777")
      .text(summaryText, startX, doc.y, {
        width: contentWidth,
        align: "right",
      });

    // Leave some space before next section
    doc.moveDown(1.2);
  }

  /**
   * Create performance summary for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createPerformanceSummary(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("PERFORMANCE SUMMARY", { underline: true });

    doc.moveDown(1);

    const perfData = [
      ["Most Critical Category", data.performanceSummary.mostCriticalCategory],
      [
        "Critical Products in Category",
        data.performanceSummary.criticalProductsCount,
      ],
      [
        "Most Critical Warehouse",
        data.performanceSummary.mostCriticalWarehouse,
      ],
      [
        "Critical Items in Warehouse",
        data.performanceSummary.criticalItemsInWarehouse,
      ],
      ["Average Stock Ratio", `${data.performanceSummary.avgStockRatio}%`],
      [
        "Items Needing Immediate Attention",
        data.performanceSummary.needsImmediateAttention,
      ],
      ["Average Urgency Score", data.performanceSummary.avgUrgencyScore],
      ["Highest Risk Product", data.performanceSummary.highestRiskProduct],
      ["Highest Risk Warehouse", data.performanceSummary.highestRiskWarehouse],
      ["Highest Risk Score", data.performanceSummary.highestRiskScore],
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
   * Create status distribution for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createStatusDistribution(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("STOCK STATUS DISTRIBUTION", { underline: true });

    doc.moveDown(1);

    const statusData = Object.entries(data.analytics.status_distribution);
    const total = data.summary.totalStockItems;

    // Chart dimensions
    const chartX = 50;
    const chartY = doc.y;
    const chartWidth = 300;
    const chartHeight = 200;

    // Draw chart background
    doc
      .rect(chartX, chartY, chartWidth, chartHeight)
      .fillColor("#F8F9F9")
      .fill()
      .strokeColor("#DDDDDD")
      .stroke();

    // Draw bars
    const barWidth = 40;
    const maxValue = Math.max(
      ...Object.values(data.analytics.status_distribution),
    );
    const scale = chartHeight / maxValue;

    statusData.forEach(([status, count], index) => {
      const x = chartX + 20 + index * (barWidth + 20);
      const barHeight = count * scale;
      const y = chartY + chartHeight - barHeight;

      const color =
        // @ts-ignore
        this.STATUS_COLORS[status]?.argb?.replace("#", "") || "CCCCCC";

      // Draw bar
      doc.rect(x, y, barWidth, barHeight).fillColor(`#${color}`).fill();

      // Draw value on top
      doc
        .fontSize(9)
        .fillColor("#333333")
        .text(count.toString(), x, y - 15, {
          width: barWidth,
          align: "center",
        });

      // Draw label
      doc.rotate(45, { origin: [x + barWidth / 2, chartY + chartHeight + 20] });
      doc
        .fontSize(8)
        .fillColor("#666666")
        .text(status, x, chartY + chartHeight + 20, {
          width: barWidth,
          align: "center",
        });
      doc.rotate(-45, {
        origin: [x + barWidth / 2, chartY + chartHeight + 20],
      });
    });

    // Legend
    doc.moveDown(5);
    const legendX = 400;
    let legendY = chartY;

    statusData.forEach(([status, count], index) => {
      const y = legendY + index * 20;
      const color =
        // @ts-ignore
        this.STATUS_COLORS[status]?.argb?.replace("#", "") || "CCCCCC";
      const percentage = ((count / total) * 100).toFixed(1);

      // Color box
      doc.rect(legendX, y, 10, 10).fillColor(`#${color}`).fill();

      // Label
      doc
        .fontSize(9)
        .fillColor("#333333")
        .text(`${status}: ${count} items (${percentage}%)`, legendX + 15, y);
    });
  }

  /**
   * Create category analysis for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createCategoryAnalysis(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("CATEGORY ANALYSIS", { underline: true });

    doc.moveDown(1);

    if (data.analytics.category_breakdown.length === 0) {
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("No category data available", { align: "center" });
      return;
    }

    // Table header
    const headers = ["Category", "Items", "%", "Value", "Urgency", "Profit"];
    const colWidths = [100, 50, 50, 80, 60, 60];
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
    data.analytics.category_breakdown.forEach(
      (
        /** @type {{ category: any; count: { toString: () => any; }; percentage: number; total_value: number; average_urgency: number; average_profit_margin: number; }} */ category,
        /** @type {number} */ rowIndex,
      ) => {
        const y = startY + 20 + rowIndex * 20;

        // Zebra striping
        if (rowIndex % 2 === 0) {
          doc
            .rect(
              startX,
              y,
              colWidths.reduce((a, b) => a + b, 0),
              20,
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
          category.category,
          category.count.toString(),
          `${category.percentage.toFixed(1)}%`,
          this._formatCurrency(category.total_value),
          category.average_urgency.toFixed(1),
          `${category.average_profit_margin.toFixed(1)}%`,
        ];

        rowData.forEach((text, i) => {
          doc
            .fontSize(9)
            .fillColor("#333333")
            .text(text, startX + i * colWidths[i] + 5, y + 5, {
              width: colWidths[i] - 10,
            });
        });
      },
    );

    doc.moveDown(data.analytics.category_breakdown.length / 2 + 1);
  }

  /**
   * Create charts section for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createChartsSection(doc, data) {
    const pageWidth = doc.page.width;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    const startX = margin;

    // Section header
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .text("CHARTS & VISUALIZATIONS", startX, doc.y, { underline: true });
    doc.moveDown(0.8);

    // Helper: ensure enough space on page, add new page if needed
    const ensureSpace = (/** @type {number} */ needed) => {
      if (doc.y + needed > doc.page.height - margin) {
        doc.addPage();
        doc.y = margin;
      }
    };

    // --- Top 10 Urgent Items table ---
    if (
      data.charts &&
      data.charts.barChart &&
      data.charts.barChart.length > 0
    ) {
      ensureSpace(40);
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(this.CHART_COLORS.dark)
        .text("Top 10 Urgent Items", startX, doc.y);
      doc.moveDown(0.4);

      // Column layout (responsive) - make Reorder, Urgency, Status similar width
      const headers = [
        "#",
        "Product / Variant",
        "Warehouse",
        "Stock",
        "Reorder",
        "Urgency",
        "Status",
      ];
      const colRatios = [0.05, 0.4, 0.18, 0.08, 0.09, 0.09, 0.11]; // Reorder/Urgency/Status balanced
      const colWidths = colRatios.map((r) => Math.floor(contentWidth * r));
      const rowHeight = 22;
      const headerHeight = 26;
      const tableX = startX;
      let tableY = doc.y;

      // Draw header background
      doc.save();
      doc
        .rect(
          tableX,
          tableY,
          colWidths.reduce((a, b) => a + b, 0),
          headerHeight,
        )
        .fill(this.CHART_COLORS.dark);
      doc.restore();

      // Header text (dynamic shrink + ellipsis). Numeric/status headers centered and fixed size.
      let hx = tableX;
      headers.forEach((h, i) => {
        const cellX = hx + 6;
        const availableWidth = Math.max(12, colWidths[i] - 12);

        // For numeric/status columns, use fixed font size and center alignment
        const isNumericHeader = [0, 3, 4, 5, 6].includes(i); // #, Stock, Reorder, Urgency, Status
        if (isNumericHeader) {
          const fontSize = 9;
          // shrink slightly if too wide
          let fs = fontSize;
          const minFs = 7;
          doc.font("Helvetica-Bold");
          while (
            fs > minFs &&
            doc.widthOfString(h, { font: "Helvetica-Bold", size: fs }) >
              availableWidth
          ) {
            fs -= 0.5;
          }
          const textY = tableY + Math.round((headerHeight - fs) / 2) - 1;
          doc.fontSize(fs).fillColor("white").text(h, hx, textY, {
            width: colWidths[i],
            align: "center",
            ellipsis: true,
          });
        } else {
          // Product / Variant and Warehouse: allow left align with dynamic shrink + ellipsis
          let fontSize = 9;
          const minFontSize = 7;
          doc.font("Helvetica-Bold");
          while (
            fontSize > minFontSize &&
            doc.widthOfString(h, { font: "Helvetica-Bold", size: fontSize }) >
              availableWidth
          ) {
            fontSize -= 0.5;
          }
          const textY = tableY + Math.round((headerHeight - fontSize) / 2) - 1;
          doc.fontSize(fontSize).fillColor("white").text(h, cellX, textY, {
            width: availableWidth,
            align: "left",
            ellipsis: true,
          });
        }

        hx += colWidths[i];
      });

      tableY += headerHeight;

      // Rows (limit to 10)
      const rows = data.charts.barChart.slice(0, 10);
      rows.forEach(
        (
          /** @type {{ name: any; warehouse: any; stock: null; reorderLevel: null; urgencyScore: number | null; status: string | number; }} */ item,
          /** @type {number} */ rowIndex,
        ) => {
          ensureSpace(rowHeight + 10);

          // Zebra background
          if (rowIndex % 2 === 0) {
            doc
              .rect(
                tableX,
                tableY,
                colWidths.reduce((a, b) => a + b, 0),
                rowHeight,
              )
              .fillColor("#FAFBFB")
              .fill();
          }

          // Prepare row values with truncation/wrapping
          const values = [
            (rowIndex + 1).toString(),
            item.name,
            item.warehouse || "-",
            item.stock != null ? String(item.stock) : "-",
            item.reorderLevel != null ? String(item.reorderLevel) : "-",
            item.urgencyScore != null ? item.urgencyScore.toFixed(1) : "-",
            item.status || "-",
          ];

          // Draw each cell
          let cx = tableX;
          values.forEach((text, ci) => {
            const cellWidth = colWidths[ci] - 12;
            const cellX = cx + 6;

            // Status cell: colored badge background and centered text
            if (ci === values.length - 1) {
              const statusColorHex = // @ts-ignore
                (this.STATUS_COLORS[item.status]?.argb || "FFCCCC").replace(
                  "#",
                  "",
                );
              const badgeW = Math.max(48, cellWidth);
              const badgeH = rowHeight - 10;
              const badgeX = cx + (colWidths[ci] - badgeW) / 2;
              const badgeY = tableY + (rowHeight - badgeH) / 2;

              doc
                .roundedRect(badgeX, badgeY, badgeW, badgeH, 4)
                .fillColor(`#${statusColorHex}CC`)
                .fill();
              doc
                .font("Helvetica-Bold")
                .fontSize(8)
                .fillColor("#222222")
                .text(text, badgeX, badgeY + 3, {
                  width: badgeW,
                  align: "center",
                  ellipsis: true,
                });
            } else if (ci === 1) {
              // Product name: allow wrapping but limit to two lines
              const maxWidth = cellWidth;
              const maxChars = 100;
              let displayText = String(text);
              if (displayText.length > maxChars)
                displayText = displayText.slice(0, maxChars - 3) + "...";
              doc
                .font("Helvetica")
                .fontSize(9)
                .fillColor("#333333")
                .text(displayText, cellX, tableY + 4, {
                  width: maxWidth,
                  lineGap: 1,
                  ellipsis: true,
                });
            } else if ([0, 3, 4, 5].includes(ci)) {
              // Numeric columns: center align
              doc
                .font("Helvetica")
                .fontSize(9)
                .fillColor("#333333")
                .text(String(text), cx, tableY + 6, {
                  width: colWidths[ci],
                  align: "center",
                  ellipsis: true,
                });
            } else {
              // Regular left-aligned cells
              doc
                .font("Helvetica")
                .fontSize(9)
                .fillColor("#333333")
                .text(String(text), cellX, tableY + 6, {
                  width: cellWidth,
                  ellipsis: true,
                });
            }

            cx += colWidths[ci];
          });

          tableY += rowHeight;
        },
      );

      // Move doc cursor below table
      doc.y = tableY + 12;
    }

    // --- Category Distribution (pie-like bars) ---
    if (
      data.charts &&
      data.charts.pieChart &&
      data.charts.pieChart.length > 0
    ) {
      ensureSpace(80);
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(this.CHART_COLORS.dark)
        .text("Category Distribution", startX, doc.y);
      doc.moveDown(0.4);

      const total = Math.max(
        1,
        data.charts.pieChart.reduce(
          (/** @type {any} */ s, /** @type {{ value: any; }} */ c) =>
            s + (c.value || 0),
          0,
        ),
      );
      const barMaxWidth = Math.min(360, contentWidth - 120);
      let pieY = doc.y;

      data.charts.pieChart.forEach(
        (/** @type {{ value: any; name: any; }} */ item) => {
          ensureSpace(18);
          const pct = ((item.value || 0) / total) * 100;
          const barWidth = Math.round(
            ((item.value || 0) / total) * barMaxWidth,
          );

          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#333333")
            .text(item.name, startX, pieY, { width: 120 });

          const barX = startX + 130;
          doc
            .rect(barX, pieY + 3, barMaxWidth, 10)
            .fillColor("#F1F1F1")
            .fill();
          const color = this.CHART_COLORS.primary || "#4A90E2";
          doc
            .rect(barX, pieY + 3, barWidth, 10)
            .fillColor(color)
            .fill();

          doc
            .font("Helvetica-Bold")
            .fontSize(9)
            .fillColor(this.CHART_COLORS.dark)
            .text(
              `${item.value} (${pct.toFixed(1)}%)`,
              barX + barMaxWidth + 8,
              pieY,
              { width: 80 },
            );

          pieY += 18;
        },
      );

      doc.y = pieY + 8;
    }

    // leave space before next section
    doc.moveDown(1.2);
  }

  /**
   * Create detailed listing for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createDetailedListing(doc, data) {
    const pageWidth = doc.page.width;
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;
    const startX = margin;
    const headerY = doc.y;

    // Section header
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .text("DETAILED LOW STOCK ITEMS", startX, headerY, { underline: true });

    doc.moveDown(0.4);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#666666")
      .text(
        `Showing ${Math.min(20, data.low_stock_items.length)} of ${data.low_stock_items.length} items`,
        { align: "center" },
      );

    doc.moveDown(0.6);

    if (!data.low_stock_items || data.low_stock_items.length === 0) {
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("No low stock items found", { align: "center" });
      return;
    }

    // Responsive column ratios (sum = 1)
    const colRatios = [0.04, 0.28, 0.16, 0.16, 0.08, 0.1, 0.1, 0.08];
    const colWidths = colRatios.map((r) => Math.floor(contentWidth * r));
    const headers = [
      "#",
      "Product",
      "Variant",
      "Warehouse",
      "Stock",
      "Status",
      "Value",
      "Urgency",
    ];
    const tableX = startX;
    let tableY = doc.y;

    // Ensure enough space helper
    const ensureSpace = (/** @type {number} */ needed) => {
      if (tableY + needed > doc.page.height - margin) {
        doc.addPage();
        tableY = margin;
      }
    };

    // Draw header row
    const headerHeight = 26;
    ensureSpace(headerHeight + 10);
    doc.save();
    doc
      .rect(
        tableX,
        tableY,
        colWidths.reduce((a, b) => a + b, 0),
        headerHeight,
      )
      .fill(this.CHART_COLORS.dark);
    doc.restore();

    // Improved header rendering: dynamic font shrink, ellipsis, vertical centering, numeric center alignment
    let hx = tableX;
    headers.forEach((h, i) => {
      const cellX = hx + 6;
      const cellWidth = Math.max(12, colWidths[i] - 12);

      // Decide alignment for header: center numeric/status columns, left for text columns
      const centerHeaders = [0, 4, 5, 6, 7]; // #, Stock, Status, Value, Urgency
      const align = centerHeaders.includes(i) ? "center" : "left";

      // Start with base font size and shrink until it fits or reaches min
      let fontSize = 9;
      const minFontSize = 7;
      doc.font("Helvetica-Bold");
      while (
        fontSize > minFontSize &&
        doc.widthOfString(h, { font: "Helvetica-Bold", size: fontSize }) >
          cellWidth
      ) {
        fontSize -= 0.5;
      }

      // Vertical center inside header cell
      const textY = tableY + Math.round((headerHeight - fontSize) / 2) - 1;

      doc
        .fontSize(fontSize)
        .fillColor("white")
        .text(h, align === "center" ? hx : cellX, textY, {
          width: align === "center" ? colWidths[i] : cellWidth,
          align,
          ellipsis: true,
        });

      hx += colWidths[i];
    });

    tableY += headerHeight;

    // Row settings
    const rowHeight = 28;
    const displayItems = data.low_stock_items.slice(0, 20);

    displayItems.forEach(
      (
        /** @type {{ product_name: any; variant_name: any; warehouse: any; current_stock: null; stock_status: string | number; stock_value: any; urgency_score: number | null; }} */ item,
        /** @type {number} */ rowIndex,
      ) => {
        ensureSpace(rowHeight + 8);

        // Zebra background
        if (rowIndex % 2 === 0) {
          doc
            .rect(
              tableX,
              tableY,
              colWidths.reduce((a, b) => a + b, 0),
              rowHeight,
            )
            .fillColor("#FAFBFB")
            .fill();
        }

        // Prepare values
        const productName = String(item.product_name || "-");
        const variantName = String(item.variant_name || "-");
        const warehouse = String(item.warehouse || "-");
        const values = [
          (rowIndex + 1).toString(),
          productName,
          variantName,
          warehouse,
          item.current_stock != null ? String(item.current_stock) : "-",
          item.stock_status || "-",
          this._formatCurrency(item.stock_value || 0),
          item.urgency_score != null ? item.urgency_score.toFixed(1) : "-",
        ];

        // Draw cells
        let cx = tableX;
        values.forEach((text, ci) => {
          const cellX = cx + 6;
          const cellWidth = colWidths[ci] - 12;

          // Status badge
          if (ci === 5) {
            const statusColorHex = // @ts-ignore
              (this.STATUS_COLORS[item.stock_status]?.argb || "FFCCCC").replace(
                "#",
                "",
              );
            const badgeW = Math.max(48, cellWidth - 8);
            const badgeH = 18;
            const badgeX = cx + (colWidths[ci] - badgeW) / 2;
            const badgeY = tableY + (rowHeight - badgeH) / 2;

            doc
              .roundedRect(badgeX, badgeY, badgeW, badgeH, 4)
              .fillColor(`#${statusColorHex}CC`)
              .fill();

            doc
              .font("Helvetica-Bold")
              .fontSize(8)
              .fillColor("#222222")
              .text(text, badgeX, badgeY + 3, {
                width: badgeW,
                align: "center",
                ellipsis: true,
              });
          } else if (ci === 1 || ci === 2 || ci === 3) {
            // Product / Variant / Warehouse: allow wrapping up to 2 lines, then truncate
            const maxLines = 2;
            const lineHeight = 10;
            const maxHeight = maxLines * lineHeight;
            const measured = doc.heightOfString(String(text), {
              width: cellWidth,
              align: "left",
              lineGap: 1,
            });
            let displayText = String(text);
            if (measured > maxHeight) {
              // rough truncation: reduce chars until fits
              let truncated = displayText;
              while (
                doc.heightOfString(truncated + "...", { width: cellWidth }) >
                  maxHeight &&
                truncated.length > 10
              ) {
                truncated = truncated.slice(0, -4);
              }
              displayText = truncated + "...";
            }

            doc
              .font("Helvetica")
              .fontSize(9)
              .fillColor("#333333")
              .text(displayText, cellX, tableY + 6, {
                width: cellWidth,
                lineGap: 1,
                ellipsis: true,
              });
          } else {
            // Numeric or short text cells
            // Urgency coloring
            // @ts-ignore
            if (ci === 7 && !isNaN(parseFloat(text))) {
              // @ts-ignore
              const val = parseFloat(text);
              if (val >= 80) doc.fillColor(this.CHART_COLORS.danger);
              else if (val >= 60) doc.fillColor(this.CHART_COLORS.warning);
              else doc.fillColor("#333333");
            } else {
              doc.fillColor("#333333");
            }

            // Center numeric columns for visual balance
            const numericCols = [0, 4, 6, 7];
            if (numericCols.includes(ci)) {
              doc
                .font("Helvetica")
                .fontSize(9)
                .text(String(text), cx, tableY + 8, {
                  width: colWidths[ci],
                  align: "center",
                  ellipsis: true,
                });
            } else {
              doc
                .font("Helvetica")
                .fontSize(9)
                .text(String(text), cellX, tableY + 8, {
                  width: cellWidth,
                  align: "left",
                  ellipsis: true,
                });
            }
          }

          cx += colWidths[ci];
        });

        tableY += rowHeight;
      },
    );

    // Move doc cursor below table
    doc.y = tableY + 10;

    // Note if truncated
    if (data.low_stock_items.length > 20) {
      doc
        .fontSize(9)
        .fillColor("#666666")
        .text(
          `* Showing first 20 of ${data.low_stock_items.length} items. See full list in Excel/CSV export.`,
          { align: "center" },
        );
      doc.moveDown(0.6);
    }
  }

  /**
   * Create recommendations for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createRecommendations(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("ACTION PLAN & RECOMMENDATIONS", { underline: true });

    doc.moveDown(1);

    data.recommendations.forEach(
      (
        /** @type {{ priority: number; title: any; description: any; action: any; }} */ rec,
        /** @type {number} */ index,
      ) => {
        const y = doc.y;

        // Priority indicator
        let priorityColor;
        if (rec.priority === 1 || rec.priority === 2) {
          priorityColor = this.CHART_COLORS.danger;
        } else if (rec.priority === 3 || rec.priority === 4) {
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
          .text(`${index + 1}. ${rec.title}`, 70, y - 2);

        // Description
        doc
          .fontSize(9)
          .fillColor("#666666")
          .text(rec.description, 70, doc.y, { width: 400 });

        // Action
        doc.moveDown(0.3);
        doc
          .fontSize(9)
          .fillColor(this.CHART_COLORS.primary)
          .font("Helvetica-Bold")
          .text(`Action: ${rec.action}`, { indent: 20 });

        doc.moveDown(1);
      },
    );

    // Urgency Scale
    doc.moveDown(1);
    doc
      .fontSize(12)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("URGENCY SCALE:", { underline: true });

    doc.moveDown(0.5);

    const urgencyScale = [
      {
        range: "80-100",
        level: "CRITICAL",
        action: "Immediate action required",
      },
      { range: "60-79", level: "HIGH", action: "Action within 24 hours" },
      { range: "40-59", level: "MEDIUM", action: "Action within 3 days" },
      { range: "0-39", level: "LOW", action: "Monitor and plan" },
    ];

    urgencyScale.forEach((scale) => {
      doc
        .fontSize(9)
        .fillColor("#333333")
        .text(`• ${scale.range}: ${scale.level} - ${scale.action}`, {
          indent: 20,
        });
      doc.moveDown(0.3);
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
            },
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
            `Low Stock Report | Generated: ${new Date().toLocaleDateString()} | stashly v2.0 | Report Type: ${data.metadata.report_type} | Confidential`,
            40,
            doc.page.height - 20,
            { align: "center", width: doc.page.width - 80 },
          );
      }
    } catch (error) {
      // @ts-ignore
      console.warn("Error creating footer:", error.message);
      // Continue without footer if there's an error
    }
  }

  /**
   * Get export history
   */
  async getExportHistory() {
    try {
      // Check if export_history table exists
      const tableCheck = await AppDataSource.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='export_history'",
      );

      if (!tableCheck || tableCheck.length === 0) {
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
      const history = await AppDataSource.query(
        "SELECT * FROM export_history WHERE filename LIKE '%low_stock%' OR filename LIKE '%LowStock%' ORDER BY generated_at DESC LIMIT 50",
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

  /**
   * Save export history
   * @param {{ filename: any; format: any; record_count: any; generated_at: any; file_size: any; filters: any; }} exportData
   */
  async _saveExportHistory(exportData) {
    try {
      await AppDataSource.query(
        `INSERT INTO export_history 
         (filename, format, record_count, generated_at, file_size, filters_json) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          exportData.filename,
          exportData.format,
          exportData.record_count,
          exportData.generated_at,
          exportData.file_size,
          exportData.filters || "{}",
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
   * @param {string} categoryName
   */
  _getCategoryColor(categoryName) {
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#A29BFE",
      "#81CEC6",
    ];

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * @param {number} count
   * @param {number} total
   */
  _getRiskLevel(count, total) {
    if (total === 0) return "LOW";
    const percentage = (count / total) * 100;
    if (percentage > 30) return "HIGH";
    if (percentage > 15) return "MEDIUM";
    return "LOW";
  }

  /**
   * @param {number} amount
   */
  _formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
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

  getStockStatusOptions() {
    return Object.keys(this.STATUS_THRESHOLDS).map((status) => ({
      value: status,
      label: status,
      // @ts-ignore
      color: this.STATUS_COLORS[status]?.argb || "CCCCCC",
    }));
  }
}

// Create and export handler instance
const lowStockExportHandler = new LowStockExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("lowOfStockExport", async (event, payload) => {
    return await lowStockExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

// Export for use in other modules
module.exports = { LowStockExportHandler, lowStockExportHandler };
