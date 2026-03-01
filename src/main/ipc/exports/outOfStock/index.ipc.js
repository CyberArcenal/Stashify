// handlers/OutOfStockExportHandler.js
// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { AppDataSource } = require("../../../db/datasource");
const {
  getGeneralCurrencySign,
  getGeneralCurrency,
} = require("../../../../utils/settings/system");
const {
  successResponse,
  errorResponse,
} = require("../../../../utils/settings/response");
const { outOfStockHandler } = require("../../reports/outOfStock/index.ipc");

let currency = "PHP";
(async () => {
  // @ts-ignore
  currency = await getGeneralCurrency();
})();

class OutOfStockExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "Stashify",
      "out_of_stock_exports",
    );

    // Create export directory if it doesn't exist
    if (!fs.existsSync(this.EXPORT_DIR)) {
      fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
    }

    // Initialize ExcelJS if available
    this.excelJS = null;
    this._initializeExcelJS();

    // Configuration constants
    this.STATUS_COLORS = {
      "Out of Stock": { argb: "FF5252" }, // Red
      "Critical Stock": { argb: "FF9800" }, // Orange
      "Very Low": { argb: "FFEB3B" }, // Yellow
      "Low Stock": { argb: "8BC34A" }, // Light Green
      "Adequate Stock": { argb: "4CAF50" }, // Green
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

    // Initialize currency
    this.currency = "$";
    this._initializeCurrency();
  }

  async _initializeCurrency() {
    try {
      // @ts-ignore
      this.currency = await getGeneralCurrencySign();
    } catch (error) {
      // @ts-ignore
      console.warn("Failed to load currency sign:", error.message);
      this.currency = "$";
    }
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

      console.log(`OutOfStockExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          // @ts-ignore
          return await this.exportOutOfStockReport(params);
        case "exportPreview":
          return await this.getExportPreview(params);
        case "getExportHistory":
          return await this.getExportHistory();
        case "getSupportedFormats":
          return successResponse(
            this.getSupportedFormats(),
            "Supported formats fetched",
          );
        case "getExportTemplates":
          return await this.getExportTemplates();
        case "saveExportTemplate":
          // @ts-ignore
          return await this.saveExportTemplate(params);
        default:
          return errorResponse(`Unknown method: ${method}`, 400);
      }
    } catch (error) {
      console.error("OutOfStockExportHandler error:", error);
      return errorResponse(
        // @ts-ignore
        `Failed to process out of stock export request: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Export out of stock report in specified format
   * @param {{ format: string; }} params
   */
  async exportOutOfStockReport(params) {
    try {
      const format = params.format || "pdf";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return errorResponse(
          `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          400,
        );
      }

      // Get out of stock data from the main handler
      const outOfStockData = await this._getOutOfStockReportData(params);

      let exportResult;
      switch (format) {
        case "csv":
          exportResult = await this._exportCSV(outOfStockData, params);
          break;
        case "excel":
          exportResult = await this._exportExcel(outOfStockData, params);
          break;
        case "pdf":
          exportResult = await this._exportPDF(outOfStockData, params);
          break;
      }

      // Handle case where export failed
      if (!exportResult || !exportResult.filename) {
        throw new Error(`Export failed for format: ${format}`);
      }

      // Read file content as base64 for transmission
      const filepath = path.join(this.EXPORT_DIR, exportResult.filename);

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
        record_count: outOfStockData.stockItems
          ? // @ts-ignore
            outOfStockData.stockItems.length
          : 0,
        generated_at: new Date().toISOString(),
        file_size: exportResult.fileSize || "N/A",
        filters: JSON.stringify(params),
      });

      return successResponse(
        {
          // @ts-ignore
          content: base64Content,
          filename: exportResult.filename,
          fileSize: exportResult.fileSize,
          mimeType: this._getMimeType(format),
          fullPath: filepath,
        },
        `Out of stock report exported successfully: ${exportResult.filename}`,
      );
    } catch (error) {
      console.error("exportOutOfStockReport error:", error);
      return errorResponse(
        // @ts-ignore
        `Failed to export out of stock report: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Get export preview data
   * @param {any} params
   */
  async getExportPreview(params) {
    try {
      const outOfStockData = await this._getOutOfStockReportData(params);
      return successResponse(
        // @ts-ignore
        outOfStockData,
        "Export preview generated successfully",
      );
    } catch (error) {
      console.error("getExportPreview error:", error);
      // @ts-ignore
      return errorResponse(`Failed to generate preview: ${error.message}`, 500);
    }
  }

  /**
   * Get comprehensive out of stock report data from OutOfStockHandler
   * @param {any} params
   */
  async _getOutOfStockReportData(params) {
    try {
      // Get data from the main out of stock handler
      const response = await outOfStockHandler.getOutOfStockReport(params);

      // @ts-ignore
      if (!response.status) {
        throw new Error(
          response.message || "Failed to get out of stock report",
        );
      }

      const outOfStockData = response.data;

      // Transform the data to match the expected format
      const transformedData = await this._transformOutOfStockData(
        outOfStockData,
        params,
      );

      return transformedData;
    } catch (error) {
      console.error("_getOutOfStockReportData error:", error);
      throw error;
    }
  }

  /**
   * Transform OutOfStockHandler data to export format
   * @param {any} outOfStockData
   * @param {any} params
   */
  async _transformOutOfStockData(outOfStockData, params) {
    const {
      stockItems,
      summary,
      charts,
      performanceSummary,
      recommendations,
      metadata,
    } = outOfStockData;

    // Transform stock items
    const transformedItems = stockItems.map(
      (
        /** @type {{ id: any; product: any; sku: any; variant: any; category: any; categoryId: any; warehouse: any; warehouseType: any; warehouseLocation: any; currentStock: number; reorderLevel: number; effectiveReorderLevel: any; costPerItem: number; netPrice: number; status: any; salesVelocity: any; daysOutOfStock: any; estimatedLostSales: any; urgencyScore: any; itemType: any; allowBackorder: any; supplier: any; lastUpdated: any; lastSaleDate: any; potentialRevenue: any; otherWarehouses: any; warehouseDistribution: any; }} */ item,
      ) => ({
        id: item.id,
        product_name: item.product,
        product_sku: item.sku,
        variant_name: item.variant,
        category: item.category,
        categoryId: item.categoryId,
        warehouse: item.warehouse,
        warehouse_type: item.warehouseType,
        warehouse_location: item.warehouseLocation,
        current_stock: item.currentStock,
        reorder_level: item.reorderLevel,
        effective_reorder_level:
          item.effectiveReorderLevel || item.reorderLevel,
        cost_per_item: item.costPerItem || 0,
        net_price: item.netPrice || 0,
        stock_value: (item.netPrice || 0) * item.currentStock,
        profit_margin:
          item.costPerItem > 0 && item.netPrice > 0
            ? ((item.netPrice - item.costPerItem) / item.netPrice) * 100
            : 0,
        stock_status: item.status,
        sales_velocity: item.salesVelocity || 0,
        days_out_of_stock: item.daysOutOfStock || 0,
        estimated_lost_sales: item.estimatedLostSales || 0,
        urgency_score: item.urgencyScore || 0,
        stock_ratio:
          item.currentStock > 0 ? item.currentStock / item.reorderLevel : 0,
        item_type: item.itemType,
        allow_backorder: item.allowBackorder,
        supplier: item.supplier,
        last_updated: item.lastUpdated,
        last_sale_date: item.lastSaleDate,
        potential_revenue: item.potentialRevenue || 0,
        other_warehouses: item.otherWarehouses || [],
        warehouse_distribution: item.warehouseDistribution || [],
      }),
    );

    // Calculate analytics from summary
    const analytics = this._calculateAnalyticsFromSummary(
      summary,
      transformedItems,
      performanceSummary,
    );

    return {
      out_of_stock_items: transformedItems,
      analytics: analytics,
      summary: summary,
      charts: charts,
      performanceSummary: performanceSummary,
      recommendations: recommendations,
      filters: {
        category: params.category || null,
        include_backorder: params.include_backorder || false,
        limit: params.limit || 100,
      },
      metadata: {
        ...metadata,
        generated_at: new Date().toISOString(),
        total_records: summary.totalStockItems || 0,
        records_exported: transformedItems.length,
        currency: this.currency,
        report_type: "per_stock_item",
      },
    };
  }

  /**
   * Calculate analytics from summary data
   * @param {any} summary
   * @param {any[]} items
   * @param {any} performanceSummary
   */
  _calculateAnalyticsFromSummary(summary, items, performanceSummary) {
    // Category breakdown
    const categoryBreakdown = {};
    items.forEach((item) => {
      const category = item.category;
      // @ts-ignore
      if (!categoryBreakdown[category]) {
        // @ts-ignore
        categoryBreakdown[category] = {
          count: 0,
          total_lost_sales: 0,
          total_value: 0,
          urgency_sum: 0,
        };
      }
      // @ts-ignore
      categoryBreakdown[category].count++;
      // @ts-ignore
      categoryBreakdown[category].total_lost_sales +=
        item.estimated_lost_sales || 0;
      // @ts-ignore
      categoryBreakdown[category].total_value +=
        (item.net_price || 0) * (item.reorder_level || 0);
      // @ts-ignore
      categoryBreakdown[category].urgency_sum += item.urgency_score || 0;
    });

    // Warehouse breakdown
    const warehouseBreakdown = {};
    items.forEach((item) => {
      const warehouse = item.warehouse;
      // @ts-ignore
      if (!warehouseBreakdown[warehouse]) {
        // @ts-ignore
        warehouseBreakdown[warehouse] = {
          count: 0,
          total_lost_sales: 0,
          days_sum: 0,
        };
      }
      // @ts-ignore
      warehouseBreakdown[warehouse].count++;
      // @ts-ignore
      warehouseBreakdown[warehouse].total_lost_sales +=
        item.estimated_lost_sales || 0;
      // @ts-ignore
      warehouseBreakdown[warehouse].days_sum += item.days_out_of_stock || 0;
    });

    // Calculate averages
    const avgUrgencyScore =
      items.length > 0
        ? items.reduce((sum, item) => sum + (item.urgency_score || 0), 0) /
          items.length
        : 0;

    const avgDaysOutOfStock =
      items.length > 0
        ? items.reduce((sum, item) => sum + (item.days_out_of_stock || 0), 0) /
          items.length
        : 0;

    const immediateAttentionItems = items.filter(
      (item) => (item.urgency_score || 0) > 70,
    ).length;

    const highLostSalesItems = items.filter(
      (item) => (item.estimated_lost_sales || 0) > 1000,
    ).length;

    return {
      total_items_analyzed: summary.totalStockItems || 0,
      out_of_stock_count: summary.outOfStockCount || 0,
      total_lost_sales: summary.totalLostSales || 0,
      total_potential_revenue: summary.totalPotentialRevenue || 0,
      longest_out_of_stock: performanceSummary.longestOutOfStock || 0,
      average_days_out_of_stock: parseFloat(avgDaysOutOfStock.toFixed(1)),
      most_affected_category: performanceSummary.mostAffectedCategory || "N/A",
      most_affected_category_count:
        performanceSummary.mostAffectedCategoryCount || 0,
      most_affected_category_lost_sales:
        performanceSummary.mostAffectedCategoryLostSales || 0,
      highest_urgency_product:
        performanceSummary.highestUrgencyProduct || "N/A",
      highest_urgency_score: performanceSummary.highestUrgencyScore || 0,
      health_score: performanceSummary.healthScore || 100,
      restocking_priority: performanceSummary.restockingPriority || "Low",
      immediate_attention_items: immediateAttentionItems,
      high_lost_sales_items: highLostSalesItems,
      average_urgency_score: parseFloat(avgUrgencyScore.toFixed(1)),
      affected_warehouses_count: summary.affectedWarehouses || 0,
      affected_categories_count: summary.affectedCategories || 0,
      category_breakdown: Object.entries(categoryBreakdown).map(
        ([category, data]) => ({
          category: category,
          count: data.count,
          total_lost_sales: parseFloat(data.total_lost_sales.toFixed(2)),
          total_value: parseFloat(data.total_value.toFixed(2)),
          average_urgency:
            data.count > 0
              ? parseFloat((data.urgency_sum / data.count).toFixed(1))
              : 0,
          percentage:
            summary.outOfStockCount > 0
              ? parseFloat(
                  ((data.count / summary.outOfStockCount) * 100).toFixed(1),
                )
              : 0,
        }),
      ),
      warehouse_breakdown: Object.entries(warehouseBreakdown).map(
        ([warehouse, data]) => ({
          warehouse: warehouse,
          count: data.count,
          total_lost_sales: parseFloat(data.total_lost_sales.toFixed(2)),
          average_days:
            data.count > 0
              ? parseFloat((data.days_sum / data.count).toFixed(1))
              : 0,
          percentage:
            summary.outOfStockCount > 0
              ? parseFloat(
                  ((data.count / summary.outOfStockCount) * 100).toFixed(1),
                )
              : 0,
        }),
      ),
    };
  }

  /**
   * Export data as CSV with enhanced design
   * @param {any} data
   * @param {any} params
   */
  // @ts-ignore
  async _exportCSV(data, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `out_of_stock_report_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content with enhanced design
    let csvContent = [];

    // Report Header with styling
    csvContent.push("🔥 OUT OF STOCK INVENTORY EMERGENCY REPORT 🔥");
    csvContent.push(`Generated,${new Date().toISOString()}`);
    csvContent.push(`Report ID,OOS-${Date.now().toString().slice(-8)}`);
    csvContent.push(`Total Items Analyzed,${data.summary.totalStockItems}`);
    csvContent.push(`Out of Stock Items,${data.summary.outOfStockCount}`);
    csvContent.push(`Risk Level,${data.analytics.restocking_priority}`);
    csvContent.push(`Currency,${data.metadata.currency}`);
    csvContent.push("");

    // Executive Summary with emojis
    csvContent.push("🚨 EXECUTIVE SUMMARY");
    csvContent.push("Metric,Value,Status,Urgency");

    const execSummary = [
      [
        "Total Lost Sales",
        this._formatCurrency(data.summary.totalLostSales),
        "Revenue Impact",
        "CRITICAL",
      ],
      [
        "Estimated Revenue Loss",
        this._formatCurrency(data.analytics.total_lost_sales),
        "Financial Impact",
        "HIGH",
      ],
      [
        "Longest Out of Stock",
        `${data.analytics.longest_out_of_stock} days`,
        "Customer Impact",
        "HIGH",
      ],
      [
        "Affected Warehouses",
        data.summary.affectedWarehouses,
        "Distribution",
        "MEDIUM",
      ],
      [
        "Affected Categories",
        data.summary.affectedCategories,
        "Category Impact",
        "MEDIUM",
      ],
      [
        "Health Score",
        `${data.analytics.health_score}%`,
        "Inventory Health",
        "MONITOR",
      ],
      [
        "Items Needing Attention",
        data.analytics.immediate_attention_items,
        "Action Required",
        "URGENT",
      ],
    ];

    execSummary.forEach((row) => csvContent.push(row.join(",")));
    csvContent.push("");

    // Critical Alerts Section
    csvContent.push("⚠️ CRITICAL ALERTS");
    csvContent.push("Alert Type,Count,Impact,Action Required");

    const criticalAlerts = [];
    if (data.analytics.immediate_attention_items > 0) {
      criticalAlerts.push([
        "High Urgency Items",
        data.analytics.immediate_attention_items,
        "CRITICAL",
        "Immediate Restocking",
      ]);
    }
    if (data.analytics.high_lost_sales_items > 0) {
      criticalAlerts.push([
        "High Lost Sales Items",
        data.analytics.high_lost_sales_items,
        "FINANCIAL",
        "Prioritize Restocking",
      ]);
    }
    if (data.analytics.longest_out_of_stock > 14) {
      criticalAlerts.push([
        "Long Duration Items",
        data.summary.outOfStockCount,
        "CUSTOMER",
        "Expedite Reordering",
      ]);
    }

    if (criticalAlerts.length > 0) {
      criticalAlerts.forEach((alert) => csvContent.push(alert.join(",")));
    } else {
      csvContent.push(
        "No Critical Alerts,All items are being monitored,NORMAL,Regular Review",
      );
    }
    csvContent.push("");

    // Category Breakdown
    csvContent.push("📊 CATEGORY BREAKDOWN");
    csvContent.push(
      "Category,Out of Stock Items,Percentage,Total Lost Sales,Average Urgency",
    );

    data.analytics.category_breakdown.forEach(
      (
        /** @type {{ category: any; count: any; percentage: any; total_lost_sales: number; average_urgency: number; }} */ breakdown,
      ) => {
        csvContent.push(
          [
            breakdown.category,
            breakdown.count,
            `${breakdown.percentage}%`,
            this._formatCurrency(breakdown.total_lost_sales),
            breakdown.average_urgency.toFixed(1),
          ].join(","),
        );
      },
    );
    csvContent.push("");

    // Warehouse Breakdown
    csvContent.push("🏬 WAREHOUSE BREAKDOWN");
    csvContent.push(
      "Warehouse,Out of Stock Items,Percentage,Total Lost Sales,Avg Days OOS",
    );

    data.analytics.warehouse_breakdown.forEach(
      (
        /** @type {{ warehouse: any; count: any; percentage: any; total_lost_sales: number; average_days: number; }} */ breakdown,
      ) => {
        csvContent.push(
          [
            breakdown.warehouse,
            breakdown.count,
            `${breakdown.percentage}%`,
            this._formatCurrency(breakdown.total_lost_sales),
            breakdown.average_days.toFixed(1),
          ].join(","),
        );
      },
    );
    csvContent.push("");

    // Detailed Out of Stock Data
    csvContent.push("📋 DETAILED OUT OF STOCK INVENTORY");
    csvContent.push(
      [
        "ID",
        "Product",
        "Variant",
        "SKU",
        "Category",
        "Warehouse",
        "Location",
        "Current Stock",
        "Days OOS",
        "Lost Sales",
        "Urgency Score",
        "Sales Velocity",
        "Reorder Level",
        "Supplier",
        "Backorder",
        "Last Sale",
        "Last Updated",
      ].join(","),
    );

    // Sort by urgency score (highest first)
    const sortedItems = [...data.out_of_stock_items].sort(
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
          item.days_out_of_stock,
          this._formatCurrency(item.estimated_lost_sales),
          item.urgency_score.toFixed(1),
          item.sales_velocity.toFixed(2),
          item.reorder_level,
          `"${item.supplier}"`,
          item.allow_backorder ? "Yes" : "No",
          item.last_sale_date || "N/A",
          item.last_updated?.substring(0, 10) || "N/A",
        ].join(","),
      );
    });
    csvContent.push("");

    // Action Plan & Recommendations
    csvContent.push("🎯 ACTION PLAN & RECOMMENDATIONS");
    csvContent.push("Priority,Type,Recommendation,Action,Timeline");

    data.recommendations.forEach(
      (
        /** @type {{ priority: number; type: any; title: any; action: any; }} */ rec,
      ) => {
        csvContent.push(
          [
            rec.priority,
            rec.type,
            `"${rec.title}"`,
            `"${rec.action}"`,
            this._getTimelineForPriority(rec.priority),
          ].join(","),
        );
      },
    );
    csvContent.push("");

    // Footer
    csvContent.push("📄 REPORT INFORMATION");
    csvContent.push("Generated by,Stashify Emergency Response System");
    csvContent.push("Data Source,Real-time Inventory Database");
    csvContent.push("Report Type,Out of Stock Emergency Analysis");
    csvContent.push("Confidentiality Level,STRICTLY CONFIDENTIAL");
    csvContent.push("Action Required,REVIEW WITHIN 24 HOURS");
    csvContent.push("Next Audit,Scheduled for next week");
    csvContent.push(
      `Report Expiry,${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}`,
    );

    const csvString = csvContent.join("\n");
    fs.writeFileSync(filepath, csvString, "utf8");
    const stats = fs.statSync(filepath);

    return {
      filename: filename,
      fileSize: this._formatFileSize(stats.size),
    };
  }

  /**
   * Export data as Excel with enhanced design
   * @param {any} data
   * @param {any} params
   */
  async _exportExcel(data, params) {
    try {
      if (!this.excelJS) {
        throw new Error("ExcelJS library not available");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `out_of_stock_report_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Stashify Emergency Response System";
      workbook.created = new Date();

      // ==================== EMERGENCY DASHBOARD ====================
      const dashboardSheet = workbook.addWorksheet("Emergency Dashboard");

      // Title
      dashboardSheet.mergeCells("A1:H1");
      const titleCell = dashboardSheet.getCell("A1");
      titleCell.value = "🚨 OUT OF STOCK EMERGENCY DASHBOARD";
      titleCell.font = { bold: true, size: 20, color: { argb: "FF0000" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2" },
      };

      // Emergency KPIs
      const emergencyKPIs = [
        {
          label: "🚨 CRITICAL ITEMS",
          value: data.analytics.immediate_attention_items,
          color: "FF0000",
          description: "Items requiring immediate attention",
        },
        {
          label: "💰 LOST SALES",
          value: this._formatCurrency(data.analytics.total_lost_sales),
          color: "FF6B00",
          description: "Total estimated revenue loss",
        },
        {
          label: "📅 LONGEST OOS",
          value: `${data.analytics.longest_out_of_stock} days`,
          color: "FF9800",
          description: "Longest duration out of stock",
        },
        {
          label: "🏬 AFFECTED WAREHOUSES",
          value: data.analytics.affected_warehouses_count,
          color: "2196F3",
          description: "Warehouses with stock issues",
        },
        {
          label: "📦 AFFECTED CATEGORIES",
          value: data.analytics.affected_categories_count,
          color: "9C27B0",
          description: "Product categories impacted",
        },
        {
          label: "📊 HEALTH SCORE",
          value: `${data.analytics.health_score}%`,
          color: data.analytics.health_score > 70 ? "4CAF50" : "F44336",
          description: "Overall inventory health",
        },
      ];

      // Create KPI cards
      let rowIndex = 3;
      emergencyKPIs.forEach((kpi, index) => {
        const col = (index % 3) * 3 + 1;
        const row = Math.floor(index / 3) * 4 + rowIndex;

        // KPI Card
        dashboardSheet.mergeCells(row, col, row, col + 2);
        const titleCell = dashboardSheet.getCell(row, col);
        titleCell.value = kpi.label;
        titleCell.font = { bold: true, size: 12, color: { argb: "FFFFFF" } };
        titleCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: kpi.color },
        };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };

        dashboardSheet.mergeCells(row + 1, col, row + 1, col + 2);
        const valueCell = dashboardSheet.getCell(row + 1, col);
        valueCell.value = kpi.value;
        valueCell.font = { bold: true, size: 18 };
        valueCell.alignment = { horizontal: "center", vertical: "middle" };

        dashboardSheet.mergeCells(row + 2, col, row + 2, col + 2);
        const descCell = dashboardSheet.getCell(row + 2, col);
        descCell.value = kpi.description;
        descCell.font = { size: 9, color: { argb: "666666" } };
        descCell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // ==================== CRITICAL ITEMS LIST ====================
      const itemsSheet = workbook.addWorksheet("Critical Items");

      itemsSheet.columns = [
        { header: "🔥", key: "priority", width: 5 },
        { header: "Product", key: "product", width: 30 },
        { header: "Variant", key: "variant", width: 20 },
        { header: "SKU", key: "sku", width: 15 },
        { header: "Category", key: "category", width: 15 },
        { header: "Warehouse", key: "warehouse", width: 15 },
        { header: "Days OOS", key: "days_oos", width: 10 },
        { header: "Lost Sales", key: "lost_sales", width: 12 },
        { header: "Urgency", key: "urgency", width: 10 },
        { header: "Supplier", key: "supplier", width: 20 },
        { header: "Status", key: "status", width: 12 },
        { header: "Action", key: "action", width: 15 },
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
      headerRow.height = 30;

      // Add data rows with conditional formatting
      const sortedItems = [...data.out_of_stock_items].sort(
        (a, b) => b.urgency_score - a.urgency_score,
      );

      // @ts-ignore
      sortedItems.forEach((item, index) => {
        // Determine priority icon
        let priorityIcon = "⚠️";
        if (item.urgency_score > 80) priorityIcon = "🔥";
        else if (item.urgency_score > 60) priorityIcon = "⚠️";
        else priorityIcon = "📋";

        // Determine status color
        let statusColor;
        if (item.days_out_of_stock > 14) statusColor = "FF0000";
        else if (item.days_out_of_stock > 7) statusColor = "FF9800";
        else statusColor = "FFEB3B";

        // Determine action
        let action = "Monitor";
        if (item.urgency_score > 80) action = "IMMEDIATE RESTOCK";
        else if (item.urgency_score > 60) action = "Urgent Restock";
        else if (item.estimated_lost_sales > 1000) action = "Priority Restock";

        const row = itemsSheet.addRow({
          priority: priorityIcon,
          product: item.product_name,
          variant: item.variant_name,
          sku: item.product_sku,
          category: item.category,
          warehouse: item.warehouse,
          days_oos: item.days_out_of_stock,
          lost_sales: this._formatCurrency(item.estimated_lost_sales),
          urgency: item.urgency_score.toFixed(1),
          supplier: item.supplier,
          status: item.days_out_of_stock > 7 ? "CRITICAL" : "URGENT",
          action: action,
        });

        // Row styling based on urgency
        if (item.urgency_score > 80) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEBEE" },
          };
        } else if (item.urgency_score > 60) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF3E0" },
          };
        }

        // Status cell coloring
        const statusCell = row.getCell("status");
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: statusColor },
        };
        statusCell.font = { bold: true, color: { argb: "000000" } };

        // Action cell styling
        const actionCell = row.getCell("action");
        if (action.includes("IMMEDIATE")) {
          actionCell.font = { bold: true, color: { argb: "FF0000" } };
        }
      });

      // Auto-filter
      itemsSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: itemsSheet.rowCount, column: itemsSheet.columnCount },
      };

      // ==================== ANALYTICS & INSIGHTS ====================
      const analyticsSheet = workbook.addWorksheet("Analytics & Insights");

      // Category Analysis
      analyticsSheet.getCell("A1").value = "📊 CATEGORY ANALYSIS";
      analyticsSheet.getCell("A1").font = {
        size: 16,
        bold: true,
        color: { argb: "2C3E50" },
      };

      const categoryHeaders = [
        "Category",
        "Items",
        "%",
        "Lost Sales",
        "Avg Urgency",
        "Risk Level",
      ];
      analyticsSheet.addRow(categoryHeaders);

      data.analytics.category_breakdown.forEach(
        (
          /** @type {{ average_urgency: number; category: any; count: any; percentage: any; total_lost_sales: number; }} */ category,
        ) => {
          const riskLevel =
            category.average_urgency > 70
              ? "HIGH"
              : category.average_urgency > 50
                ? "MEDIUM"
                : "LOW";
          analyticsSheet.addRow([
            category.category,
            category.count,
            `${category.percentage}%`,
            this._formatCurrency(category.total_lost_sales),
            category.average_urgency.toFixed(1),
            riskLevel,
          ]);
        },
      );

      // Warehouse Analysis
      analyticsSheet.getCell("A15").value = "🏬 WAREHOUSE ANALYSIS";
      analyticsSheet.getCell("A15").font = {
        size: 16,
        bold: true,
        color: { argb: "2C3E50" },
      };

      const warehouseHeaders = [
        "Warehouse",
        "Items",
        "%",
        "Lost Sales",
        "Avg Days OOS",
        "Status",
      ];
      analyticsSheet.addRow(warehouseHeaders);

      data.analytics.warehouse_breakdown.forEach(
        (
          /** @type {{ average_days: number; warehouse: any; count: any; percentage: any; total_lost_sales: number; }} */ warehouse,
        ) => {
          const status =
            warehouse.average_days > 7
              ? "CRITICAL"
              : warehouse.average_days > 3
                ? "URGENT"
                : "MONITOR";
          analyticsSheet.addRow([
            warehouse.warehouse,
            warehouse.count,
            `${warehouse.percentage}%`,
            this._formatCurrency(warehouse.total_lost_sales),
            warehouse.average_days.toFixed(1),
            status,
          ]);
        },
      );

      // ==================== ACTION PLAN ====================
      const actionSheet = workbook.addWorksheet("Action Plan");

      actionSheet.columns = [
        { header: "Priority", key: "priority", width: 10 },
        { header: "Type", key: "type", width: 15 },
        { header: "Issue", key: "issue", width: 40 },
        { header: "Recommended Action", key: "action", width: 40 },
        { header: "Responsible", key: "responsible", width: 20 },
        { header: "Deadline", key: "deadline", width: 15 },
        { header: "Status", key: "status", width: 12 },
      ];

      // @ts-ignore
      data.recommendations.forEach(
        (
          /** @type {{ priority: number; type: string; title: any; action: any; }} */ rec,
          /** @type {any} */ index,
        ) => {
          const deadline = new Date();
          if (rec.priority === 1) deadline.setDate(deadline.getDate() + 1);
          else if (rec.priority === 2) deadline.setDate(deadline.getDate() + 3);
          else if (rec.priority === 3) deadline.setDate(deadline.getDate() + 7);
          else deadline.setDate(deadline.getDate() + 14);

          const responsible =
            rec.type === "warehouse"
              ? "Warehouse Manager"
              : rec.type === "financial"
                ? "Finance Team"
                : "Inventory Manager";

          const row = actionSheet.addRow({
            priority: rec.priority,
            type: rec.type,
            issue: rec.title,
            action: rec.action,
            responsible: responsible,
            deadline: deadline.toISOString().split("T")[0],
            status: "PENDING",
          });

          // Priority coloring
          const priorityCell = row.getCell("priority");
          if (rec.priority === 1) {
            priorityCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF0000" },
            };
            priorityCell.font = { bold: true, color: { argb: "FFFFFF" } };
          } else if (rec.priority === 2) {
            priorityCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF9800" },
            };
            priorityCell.font = { bold: true, color: { argb: "000000" } };
          }

          // Status cell
          const statusCell = row.getCell("status");
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF3CD" },
          };
          statusCell.font = { bold: true, color: { argb: "856404" } };
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
   * Export data as PDF with enhanced design
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
      const filename = `out_of_stock_report_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create PDF document
      const doc = new PDFKit({
        size: "A4",
        margin: 40,
        info: {
          Title: "Out of Stock Emergency Report",
          Author: "Stashify Emergency Response System",
          Subject: "Out of Stock Inventory Analysis",
          Keywords: "out of stock, emergency, inventory, report",
          CreationDate: new Date(),
        },
      });

      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Create pages
      this._createPDFCoverPage(doc, data);
      doc.addPage();
      this._createPDFExecutiveSummary(doc, data);
      doc.addPage();
      this._createPDFCriticalAlerts(doc, data);
      doc.addPage();
      this._createPDFCategoryAnalysis(doc, data);
      doc.addPage();
      this._createPDFWarehouseAnalysis(doc, data);
      doc.addPage();
      this._createPDFActionPlan(doc, data);

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
   * Create PDF cover page
   * @param {any} doc
   * @param {any} data
   */
  _createPDFCoverPage(doc, data = {}) {
    // Safe defaults
    const pageW = doc.page.width;
    const margin = 40;
    const contentLeft = margin;
    const contentRight = pageW - margin;
    const contentWidth = contentRight - contentLeft;

    const summary = data.summary || {};
    const analytics = data.analytics || {};

    const reportId = `OOS-${Date.now().toString().slice(-8)}`;
    const generatedAt = new Date().toLocaleString();
    const itemsAnalyzed = summary.totalStockItems ?? 0;
    const outOfStock = summary.outOfStockCount ?? 0;
    const riskLevel = analytics.restocking_priority ?? "N/A";
    const estimatedLoss =
      typeof this._formatCurrency === "function"
        ? this._formatCurrency(analytics.total_lost_sales ?? 0)
        : String(analytics.total_lost_sales ?? 0);
    const immediateCount = analytics.immediate_attention_items ?? 0;

    // --- Top banner (emergency) ---
    const bannerH = 80;
    doc.save();
    doc.rect(0, 0, pageW, bannerH).fill("#E74C3C");
    doc.fillColor("white").font("Helvetica-Bold").fontSize(24);
    doc.text("EMERGENCY REPORT", 0, 30, { align: "center" });
    doc
      .font("Helvetica")
      .fontSize(18)
      .text("OUT OF STOCK INVENTORY ANALYSIS", 0, 56, { align: "center" });
    doc.restore();

    // Move cursor below banner with consistent spacing
    doc.y = bannerH + 18;

    // --- Section title ---
    doc
      .fillColor("#2C3E50")
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("REPORT DETAILS", contentLeft, doc.y, { underline: true });

    doc.moveDown(0.8);

    // --- Details list (aligned columns) ---
    const labelX = contentLeft + 10;
    const valueX = contentLeft + Math.min(260, contentWidth * 0.55);
    const lineHeight = 14;

    const details = [
      ["Report ID", reportId],
      ["Generated", generatedAt],
      ["Items Analyzed", itemsAnalyzed],
      ["Out of Stock Items", outOfStock],
      ["Risk Level", riskLevel],
      ["Estimated Loss", estimatedLoss],
    ];

    details.forEach(([label, value]) => {
      const y = doc.y;
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#2C3E50")
        .text(label, labelX, y);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#666666")
        .text(String(value), valueX, y, { width: contentRight - valueX });

      doc.moveDown(0.9);
    });

    // --- Critical warning box ---
    doc.moveDown(0.6);
    const boxX = contentLeft + 8;
    const boxW = contentWidth - 16;
    const boxH = 64;
    const boxY = doc.y;

    doc.save();
    doc
      .roundedRect(boxX, boxY, boxW, boxH, 6)
      .fill("#FFEBEE")
      .stroke("#E74C3C");
    doc.restore();

    // Title inside box
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#E74C3C")
      .text("⚠️ CRITICAL ALERT", boxX + 12, boxY + 10);

    // Message lines inside box
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#D32F2F")
      .text(
        `${immediateCount} items require immediate attention`,
        boxX + 12,
        boxY + 28,
        {
          width: boxW - 24,
        },
      );

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#D32F2F")
      .text(`Estimated revenue loss: ${estimatedLoss}`, boxX + 12, boxY + 44, {
        width: boxW - 24,
      });

    // Move cursor below the box
    doc.y = boxY + boxH + 12;
  }

  /**
   * Create PDF executive summary
   * @param {any} doc
   * @param {any} data
   */
  _createPDFExecutiveSummary(doc, data = {}) {
    // Safe defaults and layout
    const pageW = doc.page.width;
    const margin = 40;
    const contentW = pageW - margin * 2;
    const startX = margin;

    const analytics = data.analytics || {};
    const formatCurrency =
      typeof this._formatCurrency === "function"
        ? this._formatCurrency
        : (/** @type {any} */ v) => String(v ?? 0);

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#2C3E50")
      .text("EXECUTIVE SUMMARY", startX, doc.y, { underline: true });

    doc.moveDown(0.8);

    // Summary grid (2 rows x 3 cols)
    const cols = 3;
    const gap = 14;
    const boxH = 64;
    const boxW = Math.floor((contentW - gap * (cols - 1)) / cols);
    const gridY = doc.y;

    const summaryItems = [
      {
        label: "Total Lost Sales",
        value: formatCurrency(analytics.total_lost_sales ?? 0),
        color: "#2E7D32",
      },
      {
        label: "Longest Duration",
        value: `${analytics.longest_out_of_stock ?? 0} days`,
        color: "#1976D2",
      },
      {
        label: "Affected Warehouses",
        value: analytics.affected_warehouses_count ?? 0,
        color: "#6A1B9A",
      },
      {
        label: "Affected Categories",
        value: analytics.affected_categories_count ?? 0,
        color: "#F57C00",
      },
      {
        label: "Avg Urgency Score",
        value:
          typeof analytics.average_urgency_score === "number"
            ? analytics.average_urgency_score.toFixed(1)
            : "0.0",
        color: "#C2185B",
      },
      {
        label: "Health Score",
        value: `${analytics.health_score ?? 0}%`,
        color: "#2C3E50",
      },
    ];

    summaryItems.forEach((item, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const x = startX + col * (boxW + gap);
      const y = gridY + row * (boxH + gap);

      // Card background and border
      doc.roundedRect(x, y, boxW, boxH, 6).fill("#FFFFFF").stroke("#ECEFF1");

      // Left badge (colored square)
      const badgeSize = 28;
      const badgeX = x + 10;
      const badgeY = y + 12;
      doc
        .rect(badgeX, badgeY, badgeSize, badgeSize)
        .fill(item.color)
        .strokeOpacity(0);

      // Label
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#607D8B")
        .text(item.label, badgeX + badgeSize + 8, y + 12, {
          width: boxW - (badgeSize + 28),
        });

      // Value (right aligned)
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#263238")
        .text(String(item.value), x + 12, y + 36, {
          width: boxW - 24,
          align: "right",
        });
    });

    // Move cursor below grid
    doc.y = gridY + Math.ceil(summaryItems.length / cols) * (boxH + gap) + 8;

    // Key findings header
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#2C3E50")
      .text("KEY FINDINGS", startX, doc.y, { underline: true });

    doc.moveDown(0.4);

    // Findings list (compact)
    const immediate = analytics.immediate_attention_items ?? 0;
    const totalLost = analytics.total_lost_sales ?? 0;
    const longest = analytics.longest_out_of_stock ?? 0;
    const warehouses = analytics.affected_warehouses_count ?? 0;
    const categories = analytics.affected_categories_count ?? 0;
    const health = analytics.health_score ?? 0;

    const findings = [
      `${immediate} items require immediate attention (urgency > 70).`,
      `Estimated revenue loss: ${formatCurrency(totalLost)}.`,
      `Longest out-of-stock duration: ${longest} days.`,
      `${warehouses} warehouses affected by stock issues.`,
      `${categories} product categories impacted.`,
      `Overall inventory health score: ${health}%.`,
    ];

    findings.forEach((f) => {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#333333")
        .text("• ", startX + 6, doc.y, { continued: true });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#333333")
        .text(f, { indent: 12, width: contentW - 24 });

      doc.moveDown(0.35);
    });

    // Keep cursor after section
    doc.moveDown(0.6);
  }

  /**
   * Create PDF critical alerts page
   * @param {any} doc
   * @param {any} data
   */
  _createPDFCriticalAlerts(doc, data = {}) {
    // Safe defaults
    const pageW = doc.page.width;
    const margin = 40;
    const contentW = pageW - margin * 2;
    const startX = margin;

    const analytics = data.analytics || {};
    const immediateCount = analytics.immediate_attention_items ?? 0;

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#2C3E50")
      .text("CRITICAL ALERTS", startX, doc.y, { underline: true });

    doc.moveDown(0.8);

    // No alerts case
    if (immediateCount === 0) {
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#666666")
        .text("No critical alerts at this time.", startX, doc.y, {
          width: contentW,
          align: "center",
        });
      doc.moveDown(1);
      return;
    }

    // Prepare critical items (top 10 by urgency)
    const criticalItems = (
      Array.isArray(data.out_of_stock_items) ? data.out_of_stock_items : []
    )
      .filter(
        (/** @type {{ urgency_score: number; }} */ it) =>
          typeof it.urgency_score === "number" && it.urgency_score > 70,
      )
      .sort(
        (
          /** @type {{ urgency_score: number; }} */ a,
          /** @type {{ urgency_score: number; }} */ b,
        ) => b.urgency_score - a.urgency_score,
      )
      .slice(0, 10);

    // Card layout settings
    const cardH = 68;
    const gap = 12;
    const cardW = contentW;
    const cardX = startX;

    // Helper to truncate long names
    const truncate = (/** @type {any} */ s, n = 60) =>
      String(s || "").length > n
        ? String(s).slice(0, n - 3) + "..."
        : String(s || "");

    for (let i = 0; i < criticalItems.length; i++) {
      const item = criticalItems[i];

      // Page break safety
      if (doc.y + cardH + margin > doc.page.height - 60) {
        doc.addPage();
      }

      const y = doc.y;

      // Severity styling
      const severe = item.urgency_score > 85;
      const bg = severe ? "#FFEBEE" : "#FFF8E1";
      const border = severe ? "#E74C3C" : "#FFB300";
      const accent = severe ? "#C62828" : "#EF6C00";

      // Card background
      doc.save();
      doc.roundedRect(cardX, y, cardW, cardH, 6).fill(bg).stroke(border);
      doc.restore();

      // Left: urgency badge
      const badgeSize = 44;
      const badgeX = cardX + 12;
      const badgeY = y + (cardH - badgeSize) / 2;
      doc
        .circle(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2)
        .fill(severe ? "#FFCDD2" : "#FFF3E0")
        .stroke(border);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(accent)
        .text(`${Math.round(item.urgency_score)}%`, badgeX, badgeY + 12, {
          width: badgeSize,
          align: "center",
        });

      // Middle: product and meta
      const leftColX = badgeX + badgeSize + 12;
      const leftColW = cardW - (badgeSize + 12) - 200; // reserve right area for metrics
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#263238")
        .text(
          `${i + 1}. ${truncate(item.product_name || item.variant_name || "Unnamed SKU")}`,
          leftColX,
          y + 8,
          {
            width: leftColW,
          },
        );

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#607D8B")
        .text(
          `Warehouse: ${item.warehouse ?? "N/A"}  •  Days OOS: ${item.days_out_of_stock ?? "N/A"}`,
          leftColX,
          y + 28,
          {
            width: leftColW,
          },
        );

      // Right: numeric metrics
      const rightX = cardX + cardW - 180;
      const metricW = 168;

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#455A64")
        .text("Estimated Loss", rightX, y + 8, {
          width: metricW,
          align: "right",
        });

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(accent)
        .text(
          this._formatCurrency
            ? this._formatCurrency(item.estimated_lost_sales ?? 0)
            : String(item.estimated_lost_sales ?? 0),
          rightX,
          y + 22,
          {
            width: metricW,
            align: "right",
          },
        );

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#455A64")
        .text("Urgency", rightX, y + 40, { width: metricW, align: "right" });

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#263238")
        .text(item.urgency_score.toFixed(1), rightX, y + 52, {
          width: metricW,
          align: "right",
        });

      // Advance cursor below card
      doc.y = y + cardH + gap;
    }

    // Summary & actions
    doc.moveDown(0.4);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#2C3E50")
      .text("Summary & Actions", startX, doc.y);

    doc.moveDown(0.3);

    const summaryText = `${criticalItems.length} critical items require immediate attention. Prioritize replenishment for top urgency SKUs, contact suppliers for expedited lead times, and consider temporary allocation from nearby warehouses.`;
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#37474F")
      .text(summaryText, startX, doc.y, { width: contentW, lineGap: 3 });

    // Footer timestamp
    const footerY = doc.page.height - 40;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#9E9E9E")
      .text(`Generated: ${new Date().toLocaleString()}`, startX, footerY, {
        width: contentW,
        align: "center",
      });

    // Ensure cursor below footer
    doc.y = footerY + 20;
  }

  /**
   * Create PDF category analysis
   * @param {any} doc
   * @param {any} data
   */
  _createPDFCategoryAnalysis(doc, data = {}) {
    // Safe defaults and layout
    const pageW = doc.page.width;
    const margin = 40;
    const contentW = pageW - margin * 2;
    const startX = margin;
    let y = doc.y;

    const analytics = data.analytics || {};
    const breakdown = Array.isArray(analytics.category_breakdown)
      ? analytics.category_breakdown
      : [];

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#2C3E50")
      .text("CATEGORY ANALYSIS", startX, y, { underline: true });

    doc.moveDown(0.8);
    y = doc.y;

    if (breakdown.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#666666")
        .text("No category data available", startX, y, {
          width: contentW,
          align: "center",
        });
      doc.moveDown(1);
      return;
    }

    // Responsive column widths (weights chosen to reflect content)
    const cols = [
      { key: "category", label: "Category", weight: 3, min: 120 },
      { key: "items", label: "Items", weight: 1, min: 50 },
      { key: "pct", label: "%", weight: 1, min: 50 },
      { key: "lost", label: "Lost Sales", weight: 2, min: 90 },
      { key: "urgency", label: "Urgency", weight: 1, min: 60 },
      { key: "risk", label: "Risk", weight: 1, min: 60 },
    ];
    const totalWeight = cols.reduce((s, c) => s + c.weight, 0);
    const colWidths = cols.map((c) =>
      Math.max(c.min, Math.floor((c.weight / totalWeight) * contentW)),
    );

    // Header row
    const headerH = 22;
    let hx = startX;
    doc.save();
    // header background strip
    doc
      .roundedRect(
        startX - 6,
        y - 4,
        colWidths.reduce((a, b) => a + b, 0) + 12,
        headerH + 8,
        4,
      )
      .fill("#F5F7FA");
    doc.restore();

    cols.forEach((c, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#2C3E50")
        .text(c.label, hx + 6, y + 2, {
          width: colWidths[i] - 12,
          align: i === 0 ? "left" : "center",
        });
      hx += colWidths[i];
    });

    // Rows
    let rowY = y + headerH + 8;
    const rowH = 28;

    const ensureSpace = (/** @type {number} */ needed) => {
      if (rowY + needed > doc.page.height - margin) {
        doc.addPage();
        rowY = margin;
      }
    };

    breakdown.forEach(
      (
        /** @type {{ category: any; count: null; percentage: null; total_lost_sales: any; average_urgency: number; }} */ cat,
        /** @type {number} */ idx,
      ) => {
        ensureSpace(rowH + 6);

        // Zebra background
        if (idx % 2 === 0) {
          doc
            .rect(
              startX - 6,
              rowY - 2,
              colWidths.reduce((a, b) => a + b, 0) + 12,
              rowH,
            )
            .fill("#FBFCFD");
        }

        // Compute values and risk
        const name = String(cat.category ?? "Uncategorized");
        const items = cat.count != null ? String(cat.count) : "0";
        const pct = cat.percentage != null ? Number(cat.percentage) : 0;
        const pctLabel = `${pct}%`;
        const lost =
          typeof this._formatCurrency === "function"
            ? this._formatCurrency(cat.total_lost_sales ?? 0)
            : String(cat.total_lost_sales ?? 0);
        const urgency =
          typeof cat.average_urgency === "number"
            ? cat.average_urgency.toFixed(1)
            : "0.0";
        const riskLevel =
          cat.average_urgency > 70
            ? "HIGH"
            : cat.average_urgency > 50
              ? "MEDIUM"
              : "LOW";

        // Column rendering
        let cx = startX;

        // Category (left, allow wrapping)
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("#263238")
          .text(name, cx + 6, rowY + 6, {
            width: colWidths[0] - 12,
            lineGap: 1,
          });
        cx += colWidths[0];

        // Items (center)
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#455A64")
          .text(items, cx, rowY + 8, { width: colWidths[1], align: "center" });
        cx += colWidths[1];

        // Percentage (center) + small inline bar
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#455A64")
          .text(pctLabel, cx, rowY + 8, {
            width: colWidths[2],
            align: "center",
          });

        // Inline percentage bar
        const barMaxW = colWidths[2] - 16;
        const barW = (Math.max(0, Math.min(100, pct)) / 100) * barMaxW;
        const barX = cx + (colWidths[2] - barMaxW) / 2;
        doc.rect(barX, rowY + 20, barMaxW, 4).fill("#ECEFF1");
        if (barW > 0) doc.rect(barX, rowY + 20, barW, 4).fill("#42A5F5");
        cx += colWidths[2];

        // Lost Sales (right aligned)
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#263238")
          .text(lost, cx, rowY + 8, {
            width: colWidths[3] - 8,
            align: "right",
          });
        cx += colWidths[3];

        // Urgency (center with colored badge)
        const urgencyVal = urgency;
        const urgencyColor =
          cat.average_urgency > 70
            ? "#E53935"
            : cat.average_urgency > 50
              ? "#FB8C00"
              : "#43A047";
        const badgeW = 44;
        const badgeX = cx + (colWidths[4] - badgeW) / 2;
        doc
          .roundedRect(badgeX, rowY + 6, badgeW, 16, 4)
          .fill(urgencyColor + "22")
          .strokeOpacity(0);
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(urgencyColor)
          .text(urgencyVal, badgeX, rowY + 8, {
            width: badgeW,
            align: "center",
          });
        cx += colWidths[4];

        // Risk (center, colored text)
        const riskColor =
          riskLevel === "HIGH"
            ? "#C62828"
            : riskLevel === "MEDIUM"
              ? "#F57C00"
              : "#2E7D32";
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(riskColor)
          .text(riskLevel, cx, rowY + 8, {
            width: colWidths[5] - 8,
            align: "center",
          });

        // Advance rowY
        rowY += rowH;
      },
    );

    // Move doc cursor below table
    doc.y = rowY + 12;

    // Legend
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#607D8B")
      .text("Legend:", startX, doc.y);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#455A64")
      .text(
        " HIGH = avg urgency > 70; MEDIUM = 50–70; LOW = < 50",
        startX + 48,
        doc.y,
        { continued: false },
      );

    doc.moveDown(1);
  }

  /**
   * Create PDF warehouse analysis
   * @param {any} doc
   * @param {any} data
   */
  _createPDFWarehouseAnalysis(doc, data = {}) {
    // Safe defaults and layout
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 40;
    const contentW = pageW - margin * 2;
    const startX = margin;

    const analytics = data.analytics || {};
    const breakdown = Array.isArray(analytics.warehouse_breakdown)
      ? analytics.warehouse_breakdown
      : [];

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#2C3E50")
      .text("WAREHOUSE ANALYSIS", startX, doc.y, { underline: true });

    doc.moveDown(0.8);

    if (breakdown.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#666666")
        .text("No warehouse data available", startX, doc.y, {
          width: contentW,
          align: "center",
        });
      doc.moveDown(1);
      return;
    }

    // Card layout settings
    const cardH = 72;
    const gap = 12;
    const cardW = contentW;
    const cardX = startX;

    // Helper: truncate long text
    const truncate = (/** @type {string} */ s, n = 60) => {
      const str = String(s ?? "");
      return str.length > n ? str.slice(0, n - 3) + "..." : str;
    };

    for (let i = 0; i < breakdown.length; i++) {
      const wh = breakdown[i];

      // Page break safety
      if (doc.y + cardH + margin > pageH - 80) {
        doc.addPage();
      }

      const y = doc.y;

      // Normalize values
      const name = String(wh.warehouse ?? "Unnamed Warehouse");
      const count = Number(wh.count ?? 0);
      const pct = wh.percentage ?? 0;
      const avgDays = Number(wh.average_days ?? 0);
      const lost = Number(wh.total_lost_sales ?? 0);

      // Determine status and colors
      const status =
        avgDays > 7 ? "CRITICAL" : avgDays > 3 ? "URGENT" : "MONITOR";
      const statusColor =
        status === "CRITICAL"
          ? "#E74C3C"
          : status === "URGENT"
            ? "#FF9800"
            : "#1976D2";
      const bgColor =
        status === "CRITICAL"
          ? "#FFEBEE"
          : status === "URGENT"
            ? "#FFF8E1"
            : "#E8F5FF";
      const borderColor =
        status === "CRITICAL"
          ? "#EF9A9A"
          : status === "URGENT"
            ? "#FFE0B2"
            : "#BBDEFB";

      // Card background
      doc.save();
      doc
        .roundedRect(cardX, y, cardW, cardH, 6)
        .fill(bgColor)
        .stroke(borderColor);
      doc.restore();

      // Left column: name + meta
      const leftX = cardX + 12;
      const leftW = cardW - 220;

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#263238")
        .text(`${i + 1}. ${truncate(name)}`, leftX, y + 8, { width: leftW });

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#607D8B")
        .text(`${count} items • ${pct}% affected`, leftX, y + 28, {
          width: leftW,
        });

      // Right column: metrics block
      const rightX = cardX + cardW - 200;
      const metricW = 188;

      // Estimated loss
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#455A64")
        .text("Estimated Loss", rightX, y + 8, {
          width: metricW,
          align: "right",
        });

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#B71C1C")
        .text(
          typeof this._formatCurrency === "function"
            ? this._formatCurrency(lost)
            : String(lost),
          rightX,
          y + 22,
          { width: metricW, align: "right" },
        );

      // Avg days OOS
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#455A64")
        .text("Avg Days OOS", rightX, y + 40, {
          width: metricW,
          align: "right",
        });

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#263238")
        .text(avgDays.toFixed(1), rightX, y + 54, {
          width: metricW,
          align: "right",
        });

      // Status badge (left of right column)
      const badgeW = 72;
      const badgeX = rightX - badgeW - 12;
      const badgeY = y + 18;
      doc
        .roundedRect(badgeX, badgeY, badgeW, 28, 6)
        .fill(
          status === "CRITICAL"
            ? "#FFCDD2"
            : status === "URGENT"
              ? "#FFF3E0"
              : "#E3F2FD",
        )
        .stroke(borderColor);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(statusColor)
        .text(status, badgeX, badgeY + 7, { width: badgeW, align: "center" });

      // Small details line below card
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#666666")
        .text(
          `Lost Sales: ${typeof this._formatCurrency === "function" ? this._formatCurrency(lost) : String(lost)}  •  Avg Days: ${avgDays.toFixed(1)}  •  Items: ${count}`,
          leftX,
          y + cardH - 18,
          { width: cardW - 24 },
        );

      // Advance cursor
      doc.y = y + cardH + gap;
    }

    // Footer summary
    doc.moveDown(0.6);
    const totalWarehouses = breakdown.length;
    const totalLost = breakdown.reduce(
      (/** @type {number} */ s, /** @type {{ total_lost_sales: any; }} */ w) =>
        s + (Number(w.total_lost_sales) || 0),
      0,
    );

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#2C3E50")
      .text("Summary", startX, doc.y);

    doc.moveDown(0.3);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#455A64")
      .text(
        `${totalWarehouses} warehouses analyzed • Total estimated loss: ${typeof this._formatCurrency === "function" ? this._formatCurrency(totalLost) : String(totalLost)}`,
        startX,
        doc.y,
        { width: contentW },
      );

    // Footer timestamp
    const footerY = pageH - 40;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#9E9E9E")
      .text(`Generated: ${new Date().toLocaleString()}`, startX, footerY, {
        width: contentW,
        align: "center",
      });

    // ensure cursor below footer
    doc.y = footerY + 20;
  }

  /**
   * Create PDF action plan
   * @param {any} doc
   * @param {any} data
   */
  _createPDFActionPlan(doc, data = {}) {
    // Safe defaults and layout
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 40;
    const contentW = pageW - margin * 2;
    const startX = margin;

    const recommendations = Array.isArray(data.recommendations)
      ? data.recommendations
      : [];

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#2C3E50")
      .text("ACTION PLAN", startX, doc.y, { underline: true });

    doc.moveDown(0.8);

    // Helper: ensure space for next card, add page if needed
    const ensureSpace = (/** @type {number} */ needed) => {
      if (doc.y + needed > pageH - 120) {
        doc.addPage();
        doc.y = margin;
      }
    };

    // Render each recommendation as a compact row with priority badge
    const rowHeight = 72;
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];

      ensureSpace(rowHeight + 12);
      const y = doc.y;

      // Priority color
      let priorityColor = "#3498DB";
      if (rec.priority === 1) priorityColor = "#E74C3C";
      else if (rec.priority === 2) priorityColor = "#FF9800";

      // Left priority badge
      const badgeX = startX;
      const badgeY = y + 8;
      const badgeR = 8;
      doc.save();
      doc
        .circle(badgeX + badgeR, badgeY + badgeR, badgeR)
        .fill(priorityColor)
        .strokeOpacity(0);
      doc.restore();

      // Main content area
      const contentX = badgeX + badgeR * 2 + 12;
      const contentWInner = contentW - (contentX - startX);

      // Title
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#2C3E50")
        .text(`${i + 1}. ${rec.title}`, contentX, y, { width: contentWInner });

      // Description (wraps)
      const descY = doc.y + 6;
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#666666")
        .text(String(rec.description ?? ""), contentX, descY, {
          width: contentWInner,
          lineGap: 2,
        });

      // Action line (bold)
      const afterDescY = doc.y + 6;
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#2C3E50")
        .text(`Action: ${rec.action}`, contentX, afterDescY, {
          width: contentWInner,
        });

      // Small separator space
      doc.moveDown(0.8);
    }

    // Footer block (fixed at bottom)
    const footerText1 =
      "Report generated by Stashify Emergency Response System";
    const footerText2 = `Report ID: OOS-${Date.now().toString().slice(-8)} | Generated: ${new Date().toLocaleString()}`;
    const footerText3 = "CONFIDENTIAL - FOR INTERNAL USE ONLY";

    // Reserve space and draw footer at fixed positions to avoid overlap with content
    const footerY1 = pageH - 54;
    const footerY2 = pageH - 40;
    const footerY3 = pageH - 28;

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#666666")
      .text(footerText1, 0, footerY1, { align: "center", width: pageW });

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#666666")
      .text(footerText2, 0, footerY2, { align: "center", width: pageW });

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#2C3E50")
      .text(footerText3, 0, footerY3, { align: "center", width: pageW });

    // Ensure cursor is below footer for any following content
    doc.y = footerY3 + 12;
  }

  /**
   * Get export history using TypeORM
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

        return successResponse([], "Export history table created");
      }

      // Get history
      const history = await AppDataSource.query(
        "SELECT * FROM export_history WHERE filename LIKE '%out_of_stock%' OR filename LIKE '%OutOfStock%' ORDER BY generated_at DESC LIMIT 50",
      );

      // Parse filters_json
      const parsedHistory = history.map(
        (/** @type {{ filters_json: string; }} */ item) => ({
          ...item,
          filters: item.filters_json ? JSON.parse(item.filters_json) : {},
        }),
      );

      return successResponse(
        parsedHistory,
        "Export history fetched successfully",
      );
    } catch (error) {
      console.error("getExportHistory error:", error);
      return errorResponse(
        // @ts-ignore
        `Failed to fetch export history: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Get export templates using TypeORM
   */
  async getExportTemplates() {
    try {
      // Check if export_templates table exists
      const tableCheck = await AppDataSource.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='export_templates'",
      );

      if (!tableCheck || tableCheck.length === 0) {
        // Create table if it doesn't exist
        await AppDataSource.query(`
          CREATE TABLE IF NOT EXISTS export_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            filters_json TEXT,
            created_by TEXT DEFAULT 'system',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Add default templates
        const defaultTemplates = [
          {
            name: "Emergency Out of Stock Report",
            description: "Critical items requiring immediate attention",
            filters_json: JSON.stringify({
              limit: 50,
              include_backorder: false,
            }),
          },
          {
            name: "Complete Out of Stock Analysis",
            description: "All out of stock items with detailed analytics",
            filters_json: JSON.stringify({
              limit: 500,
              include_backorder: true,
            }),
          },
          {
            name: "Warehouse-Specific Out of Stock",
            description: "Out of stock items by specific warehouse",
            filters_json: JSON.stringify({
              limit: 100,
            }),
          },
          {
            name: "High Urgency Items Only",
            description: "Items with urgency score above 70",
            filters_json: JSON.stringify({
              limit: 100,
            }),
          },
        ];

        for (const template of defaultTemplates) {
          await AppDataSource.query(
            "INSERT INTO export_templates (name, description, filters_json) VALUES (?, ?, ?)",
            [template.name, template.description, template.filters_json],
          );
        }

        const templates = await AppDataSource.query(
          "SELECT * FROM export_templates WHERE name LIKE '%out of stock%' OR name LIKE '%OutOfStock%' ORDER BY name",
        );

        const parsedTemplates = templates.map(
          (/** @type {{ filters_json: string; }} */ template) => ({
            ...template,
            filters: template.filters_json
              ? JSON.parse(template.filters_json)
              : {},
          }),
        );

        return successResponse(parsedTemplates, "Default templates created");
      }

      const templates = await AppDataSource.query(
        "SELECT * FROM export_templates WHERE name LIKE '%out of stock%' OR name LIKE '%OutOfStock%' ORDER BY name",
      );

      const parsedTemplates = templates.map(
        (/** @type {{ filters_json: string; }} */ template) => ({
          ...template,
          filters: template.filters_json
            ? JSON.parse(template.filters_json)
            : {},
        }),
      );

      return successResponse(
        parsedTemplates,
        "Export templates fetched successfully",
      );
    } catch (error) {
      console.error("getExportTemplates error:", error);
      return errorResponse(
        // @ts-ignore
        `Failed to fetch export templates: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Save export template using TypeORM
   * @param {{ name: any; description: any; filters: any; }} params
   */
  async saveExportTemplate(params) {
    try {
      const { name, description, filters } = params;

      if (!name) {
        return errorResponse("Template name is required", 400);
      }

      const result = await AppDataSource.query(
        "INSERT INTO export_templates (name, description, filters_json) VALUES (?, ?, ?)",
        [name, description || "", JSON.stringify(filters || {})],
      );

      return successResponse(
        // @ts-ignore
        { id: result.lastInsertRowid, name },
        "Template saved successfully",
      );
    } catch (error) {
      console.error("saveExportTemplate error:", error);
      // @ts-ignore
      return errorResponse(`Failed to save template: ${error.message}`, 500);
    }
  }

  /**
   * Save export history using TypeORM
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

  /**
   * Format currency
   * @param {number} amount
   */
  _formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Get timeline for priority
   * @param {number} priority
   */
  _getTimelineForPriority(priority) {
    switch (priority) {
      case 1:
        return "IMMEDIATE (24 hours)";
      case 2:
        return "URGENT (3 days)";
      case 3:
        return "HIGH (1 week)";
      case 4:
        return "MEDIUM (2 weeks)";
      default:
        return "LOW (1 month)";
    }
  }

  /**
   * Get supported formats
   */
  getSupportedFormats() {
    return [
      {
        value: "csv",
        label: "CSV",
        description: "Emergency CSV format for quick analysis",
        icon: "📄",
      },
      {
        value: "excel",
        label: "Excel Dashboard",
        description: "Interactive Excel dashboard with emergency alerts",
        icon: "📊",
      },
      {
        value: "pdf",
        label: "PDF Emergency Report",
        description: "Professional emergency report with action plan",
        icon: "🚨",
      },
    ];
  }

  /**
   * Get stock status options
   */
  getStockStatusOptions() {
    return Object.keys(this.STATUS_COLORS).map((status) => ({
      value: status,
      label: status,
      // @ts-ignore
      color: this.STATUS_COLORS[status]?.argb || "CCCCCC",
    }));
  }
}

// Create and export handler instance
const outOfStockExportHandler = new OutOfStockExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("outOfStockExport", async (event, payload) => {
    return await outOfStockExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

// Export for use in other modules
module.exports = { OutOfStockExportHandler, outOfStockExportHandler };
