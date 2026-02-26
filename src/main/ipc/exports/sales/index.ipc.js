// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { AppDataSource } = require("../../../db/datasource");
const { salesReportHandler } = require("../../reports/salesReport/index.ipc");

class SalesReportExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "stashly",
      "sales_report_exports",
    );

    // Create export directory if it doesn't exist
    if (!fs.existsSync(this.EXPORT_DIR)) {
      fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
    }

    // Initialize ExcelJS if available
    this.excelJS = null;
    this._initializeExcelJS();

    // Configuration constants
    this.CHART_COLORS = {
      primary: "#3498db",
      secondary: "#2ecc71",
      danger: "#e74c3c",
      warning: "#f39c12",
      info: "#9b59b6",
      dark: "#2c3e50",
      light: "#ecf0f1",
      success: "#27ae60",
    };

    this.PERFORMANCE_LEVELS = {
      EXCELLENT: { color: "#27AE60", threshold: 15 },
      GOOD: { color: "#F39C12", threshold: 8 },
      SATISFACTORY: { color: "#3498DB", threshold: 3 },
      NEEDS_ATTENTION: { color: "#E74C3C", threshold: 0 },
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

      console.log(`SalesReportExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          // @ts-ignore
          return await this.exportSalesReport(params);
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
      console.error("SalesReportExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export sales report in specified format
   * @param {{ format: string; }} params
   */
  async exportSalesReport(params) {
    try {
      const format = params.format || "pdf";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get sales data from the main handler
      const salesData = await this._getSalesReportData(params);

      let exportResult;
      switch (format) {
        case "csv":
          exportResult = await this._exportCSV(salesData, params);
          break;
        case "excel":
          exportResult = await this._exportExcel(salesData, params);
          break;
        case "pdf":
          exportResult = await this._exportPDF(salesData, params);
          break;
      }

      // Handle case where export failed
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
        record_count: salesData.salesByMonth
          ? // @ts-ignore
            salesData.salesByMonth.length
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
      console.error("exportSalesReport error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export sales report: ${error.message}`,
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
      const salesData = await this._getSalesReportData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: salesData,
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
   * Get comprehensive sales report data from SalesReportHandler
   * @param {any} params
   */
  async _getSalesReportData(params) {
    try {
      // Get data from the main sales report handler
      const response = await salesReportHandler.getSalesReport(params);

      if (!response.status) {
        throw new Error(response.message);
      }

      const salesData = response.data;

      // Transform the data to match the expected format
      const transformedData = await this._transformSalesData(salesData, params);

      return transformedData;
    } catch (error) {
      console.error("_getSalesReportData error:", error);
      throw error;
    }
  }

  /**
   * Transform SalesReportHandler data to export format
   * @param {{ salesByMonth: never[]; topProducts: never[]; salesTrend: never[]; salesByCategory: never[]; quickStats: { totalSales: number; totalProfit: number; totalOrders: number; totalCOGS: number; averageOrderValue: number; growthRate: number; ordersGrowthRate: number; profitMargin: number; reconciliationStatus: string; growthRateMethod: string; growthRateFallbackApplied: boolean; }; performanceMetrics: { averageOrderValue: number; conversionRate: number; customerSatisfaction: number; customerLifetimeValue: number; repeatCustomerRate: number; totalProfit: number; totalCOGS: number; cogsToSalesRatio: number; }; dateRange: { startDate: any; endDate: any; period: any; }; metadata: { generatedAt: string; formulaVersion: string; profitFormulaVersion: string; cogsIntegrationStatus: string; totalMonths: number; totalProducts: number; totalCategories: number; filtersApplied: { period: any; category: null; productId: null; group_by: string; }; fallbackUsed: boolean; }; } | { salesByMonth: any; topProducts: any; salesTrend: { month: any; sales: any; profit: any; cogs: any; target: number; }[]; salesByCategory: any; quickStats: { totalSales: number; totalProfit: number; totalOrders: any; totalCOGS: number; averageOrderValue: number; growthRate: number; ordersGrowthRate: number; profitMargin: number; reconciliationStatus: string; growthRateMethod: string; growthRateFallbackApplied: boolean; }; performanceMetrics: { averageOrderValue: any; conversionRate: number; customerSatisfaction: number; customerLifetimeValue: Promise<number>; repeatCustomerRate: Promise<number>; totalProfit: any; totalCOGS: any; cogsToSalesRatio: number; } | { averageOrderValue: number; conversionRate: number; customerSatisfaction: number; customerLifetimeValue: number; repeatCustomerRate: number; totalProfit: number; totalCOGS: number; cogsToSalesRatio: number; }; dateRange: { startDate: string; endDate: string; period: any; }; metadata: { generatedAt: string; formulaVersion: string; profitFormulaVersion: string; cogsIntegrationStatus: string; totalMonths: any; totalProducts: any; totalCategories: any; filtersApplied: { period: any; category: any; productId: any; group_by: any; }; }; } | null} salesData
   * @param {{ period: any; category: any; productId: any; group_by: any; }} params
   */
  async _transformSalesData(salesData, params) {
    const {
      // @ts-ignore
      salesByMonth,
      // @ts-ignore
      topProducts,
      // @ts-ignore
      salesTrend,
      // @ts-ignore
      salesByCategory,
      // @ts-ignore
      quickStats,
      // @ts-ignore
      performanceMetrics,
      // @ts-ignore
      dateRange,
      // @ts-ignore
      metadata,
    } = salesData;

    // Calculate business insights
    const businessInsights = this._generateBusinessInsights(
      quickStats,
      performanceMetrics,
    );

    return {
      sales_by_month: salesByMonth.map(
        (
          /** @type {{ month: any; sales: any; profit: any; cogs: any; profitMargin: any; orders: any; }} */ item,
        ) => ({
          period: item.month,
          sales: item.sales || 0,
          profit: item.profit || 0,
          cogs: item.cogs || 0,
          profit_margin: item.profitMargin || 0,
          orders: item.orders || 0,
        }),
      ),
      top_products: topProducts.map(
        (
          /** @type {{ name: any; revenue: any; profit: any; profitMargin: any; units: any; value: any; category: any; }} */ item,
        ) => ({
          name: item.name,
          revenue: item.revenue || 0,
          profit: item.profit || 0,
          profit_margin: item.profitMargin || 0,
          units_sold: item.units || 0,
          order_count: item.value || 0,
          category: item.category,
        }),
      ),
      sales_trend: salesTrend.map(
        (/** @type {{ month: any; sales: any; target: any; }} */ item) => ({
          period: item.month,
          sales: item.sales || 0,
          target: item.target || 0,
          variance: (item.sales || 0) - (item.target || 0),
          variance_percentage:
            (item.target || 0) > 0
              ? (((item.sales || 0) - (item.target || 0)) /
                  (item.target || 0)) *
                100
              : 0,
        }),
      ),
      sales_by_category: salesByCategory.map(
        (
          /** @type {{ category: any; sales: any; percentage: any; }} */ item,
        ) => ({
          category: item.category,
          sales: item.sales || 0,
          percentage: item.percentage || 0,
          rank: 0, // Will be calculated
        }),
      ),
      quick_stats: {
        total_sales: quickStats.totalSales || 0,
        total_profit: quickStats.totalProfit || 0,
        total_orders: quickStats.totalOrders || 0,
        total_cogs: quickStats.totalCOGS || 0,
        average_order_value: quickStats.averageOrderValue || 0,
        sales_growth_rate: quickStats.growthRate || 0,
        orders_growth_rate: quickStats.ordersGrowthRate || 0,
        profit_margin: quickStats.profitMargin || 0,
      },
      performance_metrics: {
        average_order_value: performanceMetrics.averageOrderValue || 0,
        conversion_rate: performanceMetrics.conversionRate || 0,
        customer_satisfaction: performanceMetrics.customerSatisfaction || 0,
        customer_lifetime_value: performanceMetrics.customerLifetimeValue || 0,
        repeat_customer_rate: performanceMetrics.repeatCustomerRate || 0,
        cogs_to_sales_ratio: performanceMetrics.cogsToSalesRatio || 0,
      },
      business_insights: businessInsights,
      filters: {
        period: params.period || "1year",
        category: params.category || null,
        productId: params.productId || null,
        group_by: params.group_by || "month",
      },
      metadata: {
        ...metadata,
        generated_at: new Date().toISOString(),
        total_records: salesByMonth?.length || 0,
        report_type: "sales_performance",
        date_range: {
          start_date:
            dateRange?.startDate || new Date().toISOString().split("T")[0],
          end_date:
            dateRange?.endDate || new Date().toISOString().split("T")[0],
          period: dateRange?.period || "1year",
        },
      },
    };
  }

  /**
   * Generate business insights
   * @param {{ salesGrowthRate: number; profitMargin: number; }} quickStats
   * @param {{ conversionRate: number; customerSatisfaction: number; }} performanceMetrics
   */
  _generateBusinessInsights(quickStats, performanceMetrics) {
    const insights = [];

    // Sales Growth Insight
    const salesGrowth = quickStats.salesGrowthRate || 0;
    if (salesGrowth < 0) {
      insights.push({
        priority: "HIGH",
        type: "Sales Performance",
        title: "Negative Sales Growth Detected",
        description: `Sales declined by ${Math.abs(salesGrowth).toFixed(1)}% during the period`,
        action: "Review marketing strategies and customer acquisition costs",
        impact: "HIGH - Direct revenue impact",
      });
    } else if (salesGrowth > 15) {
      insights.push({
        priority: "LOW",
        type: "Growth Opportunity",
        title: "Exceptional Sales Growth",
        description: `Sales grew by ${salesGrowth.toFixed(1)}% - significantly above targets`,
        action: "Scale successful strategies and expand inventory",
        impact: "HIGH - Growth acceleration",
      });
    }

    // Profit Margin Insight
    const profitMargin = quickStats.profitMargin || 0;
    if (profitMargin < 15) {
      insights.push({
        priority: "HIGH",
        type: "Profitability",
        title: "Low Profit Margin",
        description: `Profit margin of ${profitMargin.toFixed(1)}% is below the 20% target`,
        action:
          "Review product pricing, supplier costs, and operational efficiency",
        impact: "HIGH - Direct impact on bottom line",
      });
    } else if (profitMargin > 30) {
      insights.push({
        priority: "LOW",
        type: "Profitability",
        title: "Excellent Profit Margin",
        description: `Profit margin of ${profitMargin.toFixed(1)}% exceeds expectations`,
        action: "Consider strategic investments or price optimization",
        impact: "HIGH - Strong financial performance",
      });
    }

    // Conversion Rate Insight
    const conversionRate = performanceMetrics.conversionRate || 0;
    if (conversionRate < 5) {
      insights.push({
        priority: "MEDIUM",
        type: "Conversion Optimization",
        title: "Low Conversion Rate",
        description: `Conversion rate of ${conversionRate.toFixed(1)}% is below industry average`,
        action:
          "Improve website UX, checkout process, and promotional strategies",
        impact: "MEDIUM - Potential revenue growth",
      });
    }

    // Customer Satisfaction Insight
    const satisfaction = performanceMetrics.customerSatisfaction || 0;
    if (satisfaction < 4.0) {
      insights.push({
        priority: "HIGH",
        type: "Customer Experience",
        title: "Customer Satisfaction Needs Improvement",
        description: `Customer satisfaction rating of ${satisfaction.toFixed(1)}/5.0`,
        action:
          "Implement customer feedback system and service quality improvements",
        impact: "HIGH - Customer retention and loyalty",
      });
    }

    // Add ranking for insights
    return insights.map((insight, index) => ({
      ...insight,
      ranking: index + 1,
    }));
  }

  /**
   * Export data as CSV
   * @param {{ sales_by_month: any; top_products: any; sales_trend: any; sales_by_category: any; quick_stats: any; performance_metrics: any; business_insights: any; filters?: { period: any; category: any; productId: any; group_by: any; }; metadata: any; }} data
   * @param {{ format: string; }} params
   */
  // @ts-ignore
  async _exportCSV(data, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `sales_performance_report_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Report Header
    csvContent.push("📈 SALES PERFORMANCE ANALYSIS REPORT");
    csvContent.push(`Generated,${new Date().toISOString()}`);
    csvContent.push(`Report Type,${data.metadata.report_type}`);
    csvContent.push(
      `Period,${data.metadata.date_range.start_date} to ${data.metadata.date_range.end_date}`,
    );
    csvContent.push(`Total Periods Analyzed,${data.metadata.total_records}`);
    csvContent.push("");

    // Executive Summary
    csvContent.push("🎯 EXECUTIVE SUMMARY");
    csvContent.push("Metric,Value,Target,Performance");

    const execSummary = [
      [
        "Total Sales",
        this._formatCurrency(data.quick_stats.total_sales),
        "N/A",
        this._getPerformanceLevel(data.quick_stats.sales_growth_rate),
      ],
      [
        "Total Profit",
        this._formatCurrency(data.quick_stats.total_profit),
        "N/A",
        this._getPerformanceLevel(data.quick_stats.profit_margin),
      ],
      [
        "Total Orders",
        data.quick_stats.total_orders,
        "N/A",
        this._getPerformanceLevel(data.quick_stats.orders_growth_rate),
      ],
      [
        "Average Order Value",
        this._formatCurrency(data.quick_stats.average_order_value),
        "$50+",
        this._getAOVPerformance(data.quick_stats.average_order_value),
      ],
      [
        "Sales Growth Rate",
        `${data.quick_stats.sales_growth_rate.toFixed(2)}%`,
        ">8%",
        this._getGrowthPerformance(data.quick_stats.sales_growth_rate),
      ],
      [
        "Profit Margin",
        `${data.quick_stats.profit_margin.toFixed(2)}%`,
        ">20%",
        this._getMarginPerformance(data.quick_stats.profit_margin),
      ],
      [
        "Orders Growth Rate",
        `${data.quick_stats.orders_growth_rate.toFixed(2)}%`,
        ">5%",
        this._getGrowthPerformance(data.quick_stats.orders_growth_rate),
      ],
    ];

    execSummary.forEach((row) => csvContent.push(row.join(",")));
    csvContent.push("");

    // Performance Metrics
    csvContent.push("📊 PERFORMANCE METRICS");
    csvContent.push("Metric,Value,Industry Benchmark,Status");

    const perfMetrics = [
      [
        "Conversion Rate",
        `${data.performance_metrics.conversion_rate.toFixed(1)}%`,
        "5-10%",
        this._getConversionPerformance(
          data.performance_metrics.conversion_rate,
        ),
      ],
      [
        "Customer Satisfaction",
        `${data.performance_metrics.customer_satisfaction.toFixed(1)}/5.0`,
        "4.2+",
        this._getSatisfactionPerformance(
          data.performance_metrics.customer_satisfaction,
        ),
      ],
      [
        "Customer Lifetime Value",
        this._formatCurrency(data.performance_metrics.customer_lifetime_value),
        "$200+",
        this._getCLVPerformance(
          data.performance_metrics.customer_lifetime_value,
        ),
      ],
      [
        "Repeat Customer Rate",
        `${data.performance_metrics.repeat_customer_rate}%`,
        "30%+",
        this._getRepeatCustomerPerformance(
          data.performance_metrics.repeat_customer_rate,
        ),
      ],
      [
        "COGS to Sales Ratio",
        `${data.performance_metrics.cogs_to_sales_ratio.toFixed(2)}%`,
        "<60%",
        this._getCOGSPerformance(data.performance_metrics.cogs_to_sales_ratio),
      ],
    ];

    perfMetrics.forEach((row) => csvContent.push(row.join(",")));
    csvContent.push("");

    // Sales Trend Analysis
    csvContent.push("📈 SALES TREND ANALYSIS");
    csvContent.push(
      "Period,Actual Sales,Target Sales,Variance,Variance %,Status",
    );

    data.sales_trend.forEach(
      (
        /** @type {{ variance: number; period: any; sales: any; target: any; variance_percentage: number; }} */ item,
      ) => {
        const status = item.variance >= 0 ? "Above Target" : "Below Target";
        csvContent.push(
          [
            item.period,
            this._formatCurrency(item.sales),
            this._formatCurrency(item.target),
            this._formatCurrency(item.variance),
            `${item.variance_percentage.toFixed(1)}%`,
            status,
          ].join(","),
        );
      },
    );
    csvContent.push("");

    // Sales by Period
    csvContent.push("📅 SALES BY PERIOD");
    csvContent.push("Period,Sales,Profit,Profit Margin,COGS,Orders");

    data.sales_by_month.forEach(
      (
        /** @type {{ period: any; sales: any; profit: any; profit_margin: number; cogs: any; orders: any; }} */ item,
      ) => {
        csvContent.push(
          [
            item.period,
            this._formatCurrency(item.sales),
            this._formatCurrency(item.profit),
            `${item.profit_margin.toFixed(2)}%`,
            this._formatCurrency(item.cogs),
            item.orders,
          ].join(","),
        );
      },
    );
    csvContent.push("");

    // Top Products
    csvContent.push("🏆 TOP PERFORMING PRODUCTS");
    csvContent.push(
      "Rank,Product,Category,Revenue,Profit,Profit Margin,Units Sold,Orders",
    );

    data.top_products.forEach(
      (
        /** @type {{ name: any; category: any; revenue: any; profit: any; profit_margin: number; units_sold: any; order_count: any; }} */ item,
        /** @type {number} */ index,
      ) => {
        csvContent.push(
          [
            index + 1,
            `"${item.name}"`,
            `"${item.category}"`,
            this._formatCurrency(item.revenue),
            this._formatCurrency(item.profit),
            `${item.profit_margin.toFixed(2)}%`,
            item.units_sold,
            item.order_count,
          ].join(","),
        );
      },
    );
    csvContent.push("");

    // Category Breakdown
    csvContent.push("📦 SALES BY CATEGORY");
    csvContent.push("Rank,Category,Sales,Market Share,Performance");

    // Sort categories by sales
    const sortedCategories = [...data.sales_by_category]
      .sort((a, b) => b.sales - a.sales)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        performance:
          item.percentage > 20
            ? "Market Leader"
            : item.percentage > 10
              ? "Strong Performer"
              : item.percentage > 5
                ? "Growing"
                : "Niche",
      }));

    sortedCategories.forEach((item) => {
      csvContent.push(
        [
          item.rank,
          `"${item.category}"`,
          this._formatCurrency(item.sales),
          `${item.percentage.toFixed(2)}%`,
          item.performance,
        ].join(","),
      );
    });
    csvContent.push("");

    // Business Insights
    csvContent.push("💡 BUSINESS INSIGHTS & RECOMMENDATIONS");
    csvContent.push("Priority,Type,Title,Recommendation,Impact");

    data.business_insights.forEach(
      (
        /** @type {{ priority: any; type: any; title: any; action: any; impact: any; }} */ insight,
      ) => {
        csvContent.push(
          [
            insight.priority,
            insight.type,
            `"${insight.title}"`,
            `"${insight.action}"`,
            `"${insight.impact}"`,
          ].join(","),
        );
      },
    );
    csvContent.push("");

    // Footer
    csvContent.push("🏁 REPORT FOOTER");
    csvContent.push("Generated by,stashly Sales Analytics v2.0");
    csvContent.push("Data Source,Sales Transaction Database");
    csvContent.push("Report Type,Sales Performance Analysis");
    csvContent.push("Confidentiality,Internal Use Only");
    csvContent.push("Next Review,Next 30 Days");
    csvContent.push("Contact,Sales Manager");

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
   * @param {{ sales_by_month: any; top_products: any; sales_trend: any; sales_by_category: any; quick_stats: any; performance_metrics?: { average_order_value: any; conversion_rate: any; customer_satisfaction: any; customer_lifetime_value: any; repeat_customer_rate: any; cogs_to_sales_ratio: any; }; business_insights: any; filters?: { period: any; category: any; productId: any; group_by: any; }; metadata: any; }} data
   * @param {{ format: string; }} params
   */
  async _exportExcel(data, params) {
    try {
      if (!this.excelJS) {
        throw new Error("ExcelJS library not available");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `sales_performance_report_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "stashly Sales Analytics";
      workbook.created = new Date();

      // ==================== COVER PAGE ====================
      const coverSheet = workbook.addWorksheet("Cover");

      // Add logo/header
      const logoRow = coverSheet.addRow(["SALES ANALYTICS SYSTEM"]);
      logoRow.font = { size: 24, bold: true, color: { argb: "2C3E50" } };
      logoRow.height = 40;
      coverSheet.mergeCells(`A1:E1`);
      logoRow.alignment = { horizontal: "center", vertical: "middle" };

      coverSheet.addRow([]);

      const titleRow = coverSheet.addRow(["SALES PERFORMANCE REPORT"]);
      titleRow.font = { size: 28, bold: true, color: { argb: "3498DB" } };
      titleRow.height = 50;
      coverSheet.mergeCells(`A3:E3`);
      titleRow.alignment = { horizontal: "center", vertical: "middle" };

      coverSheet.addRow([]);
      coverSheet.addRow([]);

      // Report Details
      const details = [
        ["Report ID", `SPR-${Date.now()}`],
        ["Generated", new Date().toLocaleString()],
        [
          "Period",
          `${data.metadata.date_range.start_date} to ${data.metadata.date_range.end_date}`,
        ],
        ["Analysis Type", "Sales Performance Analysis"],
        ["Report Scope", "Complete Sales Performance"],
        ["Currency", "USD"],
        ["Period Type", data.metadata.date_range.period],
        ["Total Periods", data.metadata.total_records],
        ["Report Version", "v2.0"],
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
      const summaryTitle = coverSheet.addRow(["KEY PERFORMANCE INDICATORS"]);
      summaryTitle.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
      summaryTitle.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "3498DB" },
      };
      summaryTitle.alignment = { horizontal: "center" };
      coverSheet.mergeCells(`A${summaryTitle.number}:E${summaryTitle.number}`);

      const summaryContent = [
        ["💰 Total Sales", this._formatCurrency(data.quick_stats.total_sales)],
        [
          "📈 Sales Growth",
          `${data.quick_stats.sales_growth_rate.toFixed(2)}%`,
        ],
        [
          "💵 Total Profit",
          this._formatCurrency(data.quick_stats.total_profit),
        ],
        ["📊 Profit Margin", `${data.quick_stats.profit_margin.toFixed(2)}%`],
        ["🛒 Total Orders", data.quick_stats.total_orders],
        [
          "📦 Avg Order Value",
          this._formatCurrency(data.quick_stats.average_order_value),
        ],
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
          label: "Total Sales",
          value: this._formatCurrency(data.quick_stats.total_sales),
          color: "3498DB",
          icon: "💰",
        },
        {
          label: "Sales Growth",
          value: `${data.quick_stats.sales_growth_rate.toFixed(2)}%`,
          color: data.quick_stats.sales_growth_rate >= 0 ? "27AE60" : "E74C3C",
          icon: data.quick_stats.sales_growth_rate >= 0 ? "📈" : "📉",
        },
        {
          label: "Total Profit",
          value: this._formatCurrency(data.quick_stats.total_profit),
          color: "9B59B6",
          icon: "💵",
        },
        {
          label: "Profit Margin",
          value: `${data.quick_stats.profit_margin.toFixed(2)}%`,
          color: data.quick_stats.profit_margin >= 20 ? "27AE60" : "F39C12",
          icon: "📊",
        },
        {
          label: "Total Orders",
          value: data.quick_stats.total_orders,
          color: "2ECC71",
          icon: "🛒",
        },
        {
          label: "Avg Order Value",
          value: this._formatCurrency(data.quick_stats.average_order_value),
          color: "E67E22",
          icon: "📦",
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
        titleCell.value = `${kpi.icon} ${kpi.label}`;
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

      // ==================== SALES TRENDS PAGE ====================
      const trendsSheet = workbook.addWorksheet("Sales Trends");

      // Column headers
      trendsSheet.columns = [
        { header: "Period", key: "period", width: 20 },
        { header: "Sales", key: "sales", width: 15 },
        { header: "Target", key: "target", width: 15 },
        { header: "Variance", key: "variance", width: 15 },
        { header: "Variance %", key: "variance_pct", width: 12 },
        { header: "Status", key: "status", width: 15 },
        { header: "Profit", key: "profit", width: 15 },
        { header: "Profit Margin", key: "profit_margin", width: 15 },
        { header: "Orders", key: "orders", width: 10 },
      ];

      // Header styling
      const headerRow = trendsSheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "2C3E50" },
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 25;

      // Add data rows with conditional formatting
      data.sales_trend.forEach(
        (
          /** @type {{ period: any; sales: any; target: any; variance: number; variance_percentage: number; }} */ item,
          /** @type {number} */ index,
        ) => {
          const periodData =
            data.sales_by_month.find(
              (/** @type {{ period: any; }} */ p) => p.period === item.period,
            ) || {};
          const row = trendsSheet.addRow({
            period: item.period,
            sales: this._formatCurrency(item.sales),
            target: this._formatCurrency(item.target),
            variance: this._formatCurrency(item.variance),
            variance_pct: `${item.variance_percentage.toFixed(1)}%`,
            status: item.variance >= 0 ? "Above Target" : "Below Target",
            profit: this._formatCurrency(periodData.profit || 0),
            profit_margin: `${periodData.profit_margin?.toFixed(2) || 0}%`,
            orders: periodData.orders || 0,
          });

          // Zebra striping
          if (index % 2 === 0) {
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F8F9F9" },
            };
          }

          // Variance coloring
          const varianceCell = row.getCell("variance");
          if (item.variance > 0) {
            varianceCell.font = { bold: true, color: { argb: "27AE60" } };
          } else if (item.variance < 0) {
            varianceCell.font = { bold: true, color: { argb: "E74C3C" } };
          }

          // Status coloring
          const statusCell = row.getCell("status");
          if (item.variance >= 0) {
            statusCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "D5F4E6" },
            };
            statusCell.font = { bold: true, color: { argb: "27AE60" } };
          } else {
            statusCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FADBD8" },
            };
            statusCell.font = { bold: true, color: { argb: "E74C3C" } };
          }
        },
      );

      // ==================== PRODUCT PERFORMANCE PAGE ====================
      const productsSheet = workbook.addWorksheet("Top Products");

      productsSheet.columns = [
        { header: "Rank", key: "rank", width: 8 },
        { header: "Product", key: "product", width: 35 },
        { header: "Category", key: "category", width: 20 },
        { header: "Revenue", key: "revenue", width: 15 },
        { header: "Profit", key: "profit", width: 15 },
        { header: "Profit Margin", key: "profit_margin", width: 15 },
        { header: "Units Sold", key: "units", width: 12 },
        { header: "Orders", key: "orders", width: 10 },
        { header: "Performance", key: "performance", width: 15 },
      ];

      // Header styling
      const productsHeaderRow = productsSheet.getRow(1);
      productsHeaderRow.font = { bold: true, color: { argb: "FFFFFF" } };
      productsHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "9B59B6" },
      };
      productsHeaderRow.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      productsHeaderRow.height = 25;

      // Add data rows
      data.top_products.forEach(
        (
          /** @type {{ profit_margin: number; name: any; category: any; revenue: any; profit: any; units_sold: any; order_count: any; }} */ item,
          /** @type {number} */ index,
        ) => {
          const performance =
            item.profit_margin >= 30
              ? "Excellent"
              : item.profit_margin >= 20
                ? "Good"
                : item.profit_margin >= 10
                  ? "Average"
                  : "Low";

          const row = productsSheet.addRow({
            rank: index + 1,
            product: item.name,
            category: item.category,
            revenue: this._formatCurrency(item.revenue),
            profit: this._formatCurrency(item.profit),
            profit_margin: `${item.profit_margin.toFixed(2)}%`,
            units: item.units_sold,
            orders: item.order_count,
            performance: performance,
          });

          // Zebra striping
          if (index % 2 === 0) {
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F8F9F9" },
            };
          }

          // Profit margin coloring
          const marginCell = row.getCell("profit_margin");
          if (item.profit_margin >= 30) {
            marginCell.font = { bold: true, color: { argb: "27AE60" } };
          } else if (item.profit_margin >= 20) {
            marginCell.font = { bold: true, color: { argb: "F39C12" } };
          }

          // Performance coloring
          const perfCell = row.getCell("performance");
          if (performance === "Excellent") {
            perfCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "D5F4E6" },
            };
            perfCell.font = { bold: true, color: { argb: "27AE60" } };
          } else if (performance === "Good") {
            perfCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FEF9E7" },
            };
            perfCell.font = { bold: true, color: { argb: "F39C12" } };
          }
        },
      );

      // ==================== CATEGORY ANALYSIS PAGE ====================
      const categoriesSheet = workbook.addWorksheet("Categories");

      // Sort categories by sales
      const sortedCategories = [...data.sales_by_category]
        .sort((a, b) => b.sales - a.sales)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }));

      categoriesSheet.columns = [
        { header: "Rank", key: "rank", width: 8 },
        { header: "Category", key: "category", width: 25 },
        { header: "Sales", key: "sales", width: 15 },
        { header: "Market Share", key: "share", width: 15 },
        { header: "Performance", key: "performance", width: 15 },
      ];

      // Header styling
      const categoriesHeaderRow = categoriesSheet.getRow(1);
      categoriesHeaderRow.font = { bold: true, color: { argb: "FFFFFF" } };
      categoriesHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "2ECC71" },
      };
      categoriesHeaderRow.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      categoriesHeaderRow.height = 25;

      // Add data rows
      sortedCategories.forEach((item, index) => {
        const performance =
          item.percentage > 20
            ? "Market Leader"
            : item.percentage > 10
              ? "Strong Performer"
              : item.percentage > 5
                ? "Growing"
                : "Niche";

        const row = categoriesSheet.addRow({
          rank: item.rank,
          category: item.category,
          sales: this._formatCurrency(item.sales),
          share: `${item.percentage.toFixed(2)}%`,
          performance: performance,
        });

        // Zebra striping
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F8F9F9" },
          };
        }

        // Performance coloring
        const perfCell = row.getCell("performance");
        if (performance === "Market Leader") {
          perfCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "D5F4E6" },
          };
          perfCell.font = { bold: true, color: { argb: "27AE60" } };
        } else if (performance === "Strong Performer") {
          perfCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FEF9E7" },
          };
          perfCell.font = { bold: true, color: { argb: "F39C12" } };
        }
      });

      // ==================== INSIGHTS PAGE ====================
      const insightsSheet = workbook.addWorksheet("Insights");

      insightsSheet.columns = [
        { header: "Priority", key: "priority", width: 10 },
        { header: "Type", key: "type", width: 20 },
        { header: "Title", key: "title", width: 40 },
        { header: "Recommendation", key: "recommendation", width: 50 },
        { header: "Impact", key: "impact", width: 20 },
      ];

      // Header styling
      const insightsHeaderRow = insightsSheet.getRow(1);
      insightsHeaderRow.font = { bold: true, color: { argb: "FFFFFF" } };
      insightsHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "E74C3C" },
      };
      insightsHeaderRow.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      insightsHeaderRow.height = 25;

      // Add data rows
      // @ts-ignore
      data.business_insights.forEach(
        (
          /** @type {{ priority: string; type: any; title: any; action: any; impact: any; }} */ insight,
          /** @type {any} */ index,
        ) => {
          const row = insightsSheet.addRow({
            priority: insight.priority,
            type: insight.type,
            title: insight.title,
            recommendation: insight.action,
            impact: insight.impact,
          });

          // Priority coloring
          const priorityCell = row.getCell("priority");
          if (insight.priority === "HIGH") {
            priorityCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FADBD8" },
            };
            priorityCell.font = { bold: true, color: { argb: "E74C3C" } };
          } else if (insight.priority === "MEDIUM") {
            priorityCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FEF9E7" },
            };
            priorityCell.font = { bold: true, color: { argb: "F39C12" } };
          } else {
            priorityCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "D5F4E6" },
            };
            priorityCell.font = { bold: true, color: { argb: "27AE60" } };
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
      // @ts-ignore
      return await this._exportCSV(data, params);
    }
  }

  /**
   * Export data as PDF with enhanced design and charts
   * @param {{ sales_by_month: any; top_products: any; sales_trend: any; sales_by_category: any; quick_stats: { total_sales: any; total_profit: any; total_orders: any; total_cogs: any; average_order_value: any; sales_growth_rate: any; orders_growth_rate: any; profit_margin: any; }; performance_metrics: { average_order_value: any; conversion_rate: any; customer_satisfaction: any; customer_lifetime_value: any; repeat_customer_rate: any; cogs_to_sales_ratio: any; }; business_insights: { ranking: number; priority: string; type: string; title: string; description: string; action: string; impact: string; }[]; filters: { period: any; category: any; productId: any; group_by: any; }; metadata: any; }} data
   * @param {{ format: string; }} params
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
      const filename = `sales_performance_report_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create PDF document
      const doc = new PDFKit({
        size: "A4",
        margin: 40,
        info: {
          Title: "Sales Performance Report",
          Author: "stashly Sales Analytics",
          Subject: "Sales Performance Analysis Report",
          Keywords: "sales, performance, analysis, report, revenue, profit",
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

      // ==================== PERFORMANCE METRICS ====================
      await this._createPerformanceMetrics(doc, data);
      pages.push(2);
      doc.addPage();

      // ==================== SALES TRENDS ====================
      this._createSalesTrends(doc, data);
      pages.push(3);
      doc.addPage();

      // ==================== TOP PRODUCTS ====================
      this._createTopProducts(doc, data);
      pages.push(4);
      doc.addPage();

      // ==================== CATEGORY ANALYSIS ====================
      this._createCategoryAnalysis(doc, data);
      pages.push(5);
      doc.addPage();

      // ==================== INSIGHTS ====================
      this._createInsights(doc, data);
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
      // Fallback to CSV
      return await this._exportCSV(data, params);
    }
  }

  /**
   * Create cover page for PDF
   * @param {PDFKit.PDFDocument} doc
   * @param {{ metadata: { date_range: { start_date: any; end_date: any; period: any; }; total_records: any; }; quick_stats: { total_sales: any; }; }} data
   */
  _createCoverPage(doc, data) {
    // Layout constants
    const pageWidth = doc.page.width;
    const margin = 40;
    const headerHeight = 180;
    const headerPaddingTop = 30;
    const panelTop = headerHeight - 20;
    const panelHeight = 300;

    // Header background (blue band)
    doc.save();
    doc.rect(0, 0, pageWidth, headerHeight).fill(this.CHART_COLORS.primary);

    // Title block
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(32)
      .text("SALES PERFORMANCE", margin, headerPaddingTop, {
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
        "Comprehensive Sales Performance Analysis",
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
      .text("stashly Sales Analytics", margin, headerPaddingTop + 92, {
        width: pageWidth - margin * 2,
        align: "center",
      });
    doc.restore();

    // White panel for main content
    doc.save();
    doc.fillColor("white");
    doc.rect(margin, panelTop, pageWidth - margin * 2, panelHeight).fill();

    // Add subtle border
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

    // underline effect
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
      ["Report ID", `SPR-${Date.now().toString().slice(-8)}`],
      ["Generated", new Date().toLocaleString()],
      [
        "Period",
        `${data.metadata.date_range.start_date} to ${data.metadata.date_range.end_date}`,
      ],
      ["Period Type", data.metadata.date_range.period],
      ["Total Periods", data.metadata.total_records],
      ["Report Scope", "Complete Sales Performance"],
      ["Currency", "USD"],
      ["Report Version", "v2.0"],
    ];

    details.forEach(([label, value]) => {
      // label
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(this.CHART_COLORS.dark)
        .text(label, contentX, cursorY, { continued: false });

      // value
      const valueX = contentX + 220;
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#666666")
        .text(String(value), valueX, cursorY);

      cursorY += 18;
    });

    // Performance Summary inside panel
    cursorY += 12;
    const summaryBoxWidth = 220;
    const summaryBoxHeight = 28;
    const summaryBoxX = contentX;
    const summaryBoxY = cursorY;

    doc.save();
    doc
      .roundedRect(
        summaryBoxX,
        summaryBoxY,
        summaryBoxWidth,
        summaryBoxHeight,
        4,
      )
      .fill(this.CHART_COLORS.secondary);

    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(
        `TOTAL SALES: ${this._formatCurrency(data.quick_stats.total_sales)}`,
        summaryBoxX,
        summaryBoxY + 6,
        {
          width: summaryBoxWidth,
          align: "center",
        },
      );
    doc.restore();

    // Move doc cursor below the panel
    doc.y = panelTop + panelHeight + 20;
  }

  /**
   * Create executive summary for PDF
   * @param {PDFKit.PDFDocument} doc
   * @param {{ quick_stats: { total_sales: any; sales_growth_rate: number; total_profit: any; profit_margin: number; total_orders: any; average_order_value: any; orders_growth_rate: any; }; metadata: { total_records: any; }; }} data
   */
  // @ts-ignore
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
    const quick = data.quick_stats || {};
    const meta = data.metadata || {};

    // Section header
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(colors.dark)
      .text("EXECUTIVE SUMMARY", startX, doc.y, { underline: true });

    doc.moveDown(0.8);

    // KPI Grid (responsive, emoji-free icons)
    const kpis = [
      {
        label: "Total Sales",
        value: formatCurrency(quick.total_sales ?? 0),
        icon: "$",
      },
      {
        label: "Sales Growth",
        value: `${typeof quick.sales_growth_rate === "number" ? quick.sales_growth_rate.toFixed(2) : "0.00"} %`,
        icon: quick.sales_growth_rate >= 0 ? "↑" : "↓",
      },
      {
        label: "Total Profit",
        value: formatCurrency(quick.total_profit ?? 0),
        icon: "P",
      },
      {
        label: "Profit Margin",
        value: `${typeof quick.profit_margin === "number" ? quick.profit_margin.toFixed(2) : "0.00"} %`,
        icon: "%",
      },
      { label: "Total Orders", value: quick.total_orders ?? 0, icon: "#" },
      {
        label: "Avg Order Value",
        value: formatCurrency(quick.average_order_value ?? 0),
        icon: "A",
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

      if (y + boxHeight > doc.page.height - 80) {
        doc.addPage();
        cursorY = margin;
      }

      doc
        .roundedRect(x, y, boxWidth, boxHeight, 6)
        .fill("#FFFFFF")
        .lineWidth(0.6)
        .strokeColor("#E6E6E6")
        .stroke();

      // Icon
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
        .text(kpis[idx].label, labelX, y + 10, { width: boxWidth - 54 });

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

    // Performance Indicators
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(colors.dark)
      .text("PERFORMANCE INDICATORS", startX, doc.y, { underline: true });
    doc.moveDown(0.5);

    const indicators = [
      `Sales Growth: ${typeof this._getPerformanceLevel === "function" ? this._getPerformanceLevel(quick.sales_growth_rate) : (quick.sales_growth_rate ?? "N/A")}`,
      `Profit Margin: ${typeof this._getMarginPerformance === "function" ? this._getMarginPerformance(quick.profit_margin) : (quick.profit_margin ?? "N/A")}`,
      `Order Volume: ${typeof this._getGrowthPerformance === "function" ? this._getGrowthPerformance(quick.orders_growth_rate) : (quick.orders_growth_rate ?? "N/A")}`,
      `Average Order Value: ${typeof this._getAOVPerformance === "function" ? this._getAOVPerformance(quick.average_order_value) : (quick.average_order_value ?? "N/A")}`,
    ];

    const bulletIndent = 18;
    const textWidth = contentWidth - bulletIndent;

    indicators.forEach((indicator) => {
      if (doc.y + 36 > doc.page.height - 80) doc.addPage();
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#333333")
        .text(`• ${indicator}`, startX + 4, doc.y, { width: textWidth });
      doc.moveDown(0.4);
    });

    // Small summary row
    doc.moveDown(0.6);
    const summaryText = `Analyzed ${meta.total_records ?? 0} periods • Generated ${new Date().toLocaleDateString()}`;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#777777")
      .text(summaryText, startX, doc.y, {
        width: contentWidth,
        align: "right",
      });

    // Space before next section
    doc.moveDown(1.2);
  }

  /**
   * Create performance metrics for PDF
   * @param {PDFKit.PDFDocument} doc
   * @param {{ performance_metrics: { conversion_rate: number; customer_satisfaction: number; customer_lifetime_value: any; repeat_customer_rate: number; cogs_to_sales_ratio: number; }; }} data
   */
  async _createPerformanceMetrics(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("PERFORMANCE METRICS", { underline: true });

    doc.moveDown(1);

    const metrics = [
      [
        "Conversion Rate",
        `${data.performance_metrics.conversion_rate.toFixed(1)}%`,
        "5-10%",
      ],
      [
        "Customer Satisfaction",
        `${data.performance_metrics.customer_satisfaction.toFixed(1)}/5.0`,
        "4.2+",
      ],
      [
        "Customer Lifetime Value",
        this._formatCurrency(data.performance_metrics.customer_lifetime_value),
        "$200+",
      ],
      [
        "Repeat Customer Rate",
        `${await data.performance_metrics.repeat_customer_rate}%`,
        "30%+",
      ],
      [
        "COGS to Sales Ratio",
        `${data.performance_metrics.cogs_to_sales_ratio.toFixed(2)}%`,
        "<60%",
      ],
    ];

    const colWidths = [200, 100, 80];
    const startX = 50;
    const startY = doc.y;

    metrics.forEach(([label, value, benchmark], rowIndex) => {
      const y = startY + rowIndex * 25;

      // Label
      doc
        .fontSize(10)
        .fillColor("#333333")
        .font("Helvetica-Bold")
        .text(label, startX, y, { width: colWidths[0] });

      // Value with performance indicator
      const performance = this._getMetricPerformance(label, value, benchmark);
      const valueColor =
        performance === "Excellent"
          ? this.CHART_COLORS.success
          : performance === "Good"
            ? this.CHART_COLORS.warning
            : performance === "Needs Attention"
              ? this.CHART_COLORS.danger
              : "#333333";

      doc
        .fontSize(10)
        .fillColor(valueColor)
        .text(value.toString(), startX + colWidths[0] + 10, y, {
          width: colWidths[1],
        });

      // Benchmark
      doc
        .fontSize(9)
        .fillColor("#666666")
        .text(benchmark, startX + colWidths[0] + colWidths[1] + 20, y, {
          width: colWidths[2],
        });

      // Separator line
      if (rowIndex < metrics.length - 1) {
        doc
          .moveTo(startX, y + 20)
          .lineTo(
            startX + colWidths[0] + colWidths[1] + colWidths[2] + 30,
            y + 20,
          )
          .strokeColor("#EEEEEE")
          .lineWidth(0.5)
          .stroke();
      }
    });

    doc.moveDown(metrics.length / 2 + 2);
  }

  /**
   * Create sales trends for PDF
   * @param {PDFKit.PDFDocument} doc
   * @param {{ sales_trend: string | any[]; }} data
   */
  // @ts-ignore
  _createSalesTrends(doc, data = {}) {
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
    const colors = this.CHART_COLORS || {
      primary: "#1976D2",
      dark: "#263238",
      success: "#2E7D32",
      danger: "#C62828",
    };

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(colors.dark)
      .text("SALES TREND ANALYSIS", startX, doc.y, { underline: true });

    doc.moveDown(0.8);

    // Guard: ensure sales_trend exists and is an array
    const items = Array.isArray(data.sales_trend)
      ? data.sales_trend.slice(0, 10)
      : [];
    if (items.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#666666")
        .text("No sales trend data available.", startX, doc.y, {
          width: contentW,
          align: "center",
        });
      doc.moveDown(1);
      return;
    }

    // Table settings
    const headers = ["Period", "Sales", "Target", "Variance", "Status"];
    const colWidths = [120, 90, 90, 90, 70];
    const tableWidth = colWidths.reduce((s, w) => s + w, 0);
    const tableX = startX + Math.max(0, (contentW - tableWidth) / 2);
    let y = doc.y;

    // Header row background
    const headerH = 22;
    doc.save();
    doc
      .rect(tableX - 4, y - 4, tableWidth + 8, headerH + 8)
      .fill(colors.primary);
    doc.restore();

    // Draw header labels
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
    items.forEach((item, rowIndex) => {
      ensureSpace(rowH + 6);

      // Zebra background
      if (rowIndex % 2 === 0) {
        doc.rect(tableX - 4, y - 2, tableWidth + 8, rowH).fill("#F8F9F9");
      }

      // Borders for each cell
      let cx = tableX;
      colWidths.forEach((w) => {
        doc
          .rect(cx, y - 2, w, rowH)
          .strokeColor("#E0E0E0")
          .lineWidth(0.5)
          .stroke();
        cx += w;
      });

      // Prepare row values safely
      const period = String(item.period ?? "").substring(0, 16);
      const sales = formatCurrency(item.sales ?? 0);
      const target = formatCurrency(item.target ?? 0);
      const varianceVal =
        item.variance != null
          ? item.variance
          : item.sales != null && item.target != null
            ? item.sales - item.target
            : 0;
      const variance = formatCurrency(varianceVal);
      const status =
        typeof varianceVal === "number" && varianceVal >= 0 ? "Above" : "Below";
      const statusColor =
        typeof varianceVal === "number" && varianceVal >= 0
          ? colors.success
          : colors.danger;

      // Render cells
      let cellX = tableX;
      // Period
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(period, cellX + 6, y + 4, { width: colWidths[0] - 12 });
      cellX += colWidths[0];

      // Sales
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(sales, cellX + 6, y + 4, {
          width: colWidths[1] - 12,
          align: "right",
        });
      cellX += colWidths[1];

      // Target
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(target, cellX + 6, y + 4, {
          width: colWidths[2] - 12,
          align: "right",
        });
      cellX += colWidths[2];

      // Variance
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(variance, cellX + 6, y + 4, {
          width: colWidths[3] - 12,
          align: "right",
        });
      cellX += colWidths[3];

      // Status (colored)
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(statusColor)
        .text(status, cellX + 6, y + 4, {
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
   * Create top products section for PDF
   * @param {PDFKit.PDFDocument} doc
   * @param {{ top_products: string | any[]; }} data
   */
  _createTopProducts(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("TOP PERFORMING PRODUCTS", { underline: true });

    doc.moveDown(1);

    // Display top 5 products
    const displayProducts = data.top_products.slice(0, 5);

    // @ts-ignore
    displayProducts.forEach(
      (
        /** @type {{ name: any; category: any; revenue: any; profit: any; profit_margin: number; units_sold: any; order_count: any; }} */ product,
        /** @type {number} */ index,
      ) => {
        const y = doc.y;

        // Rank badge
        doc.save();
        doc
          .circle(50, y + 10, 10)
          .fillColor(this.CHART_COLORS.primary)
          .fill();
        doc
          .fillColor("white")
          .fontSize(8)
          .font("Helvetica-Bold")
          // @ts-ignore
          .text(index + 1, 46, y + 7);
        doc.restore();

        // Product name and category
        doc
          .fontSize(11)
          .fillColor(this.CHART_COLORS.dark)
          .font("Helvetica-Bold")
          .text(product.name, 70, y - 2);

        doc
          .fontSize(9)
          .fillColor("#666666")
          .text(`Category: ${product.category}`, 70, doc.y);

        // Performance metrics
        doc.moveDown(0.5);
        doc
          .fontSize(9)
          .fillColor("#333333")
          .text(
            `Revenue: ${this._formatCurrency(product.revenue)} | Profit: ${this._formatCurrency(product.profit)} | Margin: ${product.profit_margin.toFixed(2)}%`,
            {
              indent: 20,
            },
          );

        doc
          .fontSize(9)
          .fillColor("#333333")
          .text(
            `Units Sold: ${product.units_sold} | Orders: ${product.order_count}`,
            {
              indent: 20,
            },
          );

        // Performance indicator
        const performance =
          product.profit_margin >= 30
            ? "Excellent"
            : product.profit_margin >= 20
              ? "Good"
              : product.profit_margin >= 10
                ? "Average"
                : "Low";

        doc
          .fontSize(8)
          .fillColor(
            performance === "Excellent"
              ? this.CHART_COLORS.success
              : performance === "Good"
                ? this.CHART_COLORS.warning
                : performance === "Average"
                  ? "#3498DB"
                  : this.CHART_COLORS.danger,
          )
          .font("Helvetica-Bold")
          .text(`Performance: ${performance}`, {
            indent: 20,
          });

        doc.moveDown(1);
      },
    );
  }

  /**
   * Create category analysis for PDF
   * @param {PDFKit.PDFDocument} doc
   * @param {{ sales_by_category: any; }} data
   */
  _createCategoryAnalysis(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("CATEGORY PERFORMANCE", { underline: true });

    doc.moveDown(1);

    // Sort categories by sales
    const sortedCategories = [...data.sales_by_category]
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 8); // Show top 8 categories

    // Create horizontal bar chart
    const maxSales = Math.max(...sortedCategories.map((c) => c.sales));
    const barWidth = 300;
    const startX = 50;
    let startY = doc.y;

    sortedCategories.forEach((category, index) => {
      const y = startY + index * 25;

      // Category name
      doc
        .fontSize(9)
        .fillColor("#333333")
        .text(category.category, startX, y, { width: 100 });

      // Bar
      const barLength = (category.sales / maxSales) * barWidth;
      const barColor =
        index % 3 === 0
          ? this.CHART_COLORS.primary
          : index % 3 === 1
            ? this.CHART_COLORS.secondary
            : this.CHART_COLORS.info;

      doc
        .rect(startX + 110, y + 3, barLength, 10)
        .fillColor(barColor)
        .fill();

      // Sales value
      doc
        .fontSize(9)
        .fillColor("#333333")
        .text(
          this._formatCurrency(category.sales),
          startX + 110 + barLength + 10,
          y,
          {
            width: 80,
          },
        );

      // Percentage
      doc
        .fontSize(8)
        .fillColor("#666666")
        .text(
          `${category.percentage.toFixed(1)}%`,
          startX + 110 + barLength + 90,
          y,
          {
            width: 40,
          },
        );
    });

    doc.moveDown(sortedCategories.length / 3 + 1);
  }

  /**
   * Create insights section for PDF
   * @param {PDFKit.PDFDocument} doc
   * @param {{ business_insights: any[]; }} data
   */
  _createInsights(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("BUSINESS INSIGHTS & RECOMMENDATIONS", { underline: true });

    doc.moveDown(1);

    // Group insights by priority
    const highPriority = data.business_insights.filter(
      (/** @type {{ priority: string; }} */ i) => i.priority === "HIGH",
    );
    const mediumPriority = data.business_insights.filter(
      (/** @type {{ priority: string; }} */ i) => i.priority === "MEDIUM",
    );
    const lowPriority = data.business_insights.filter(
      (/** @type {{ priority: string; }} */ i) => i.priority === "LOW",
    );

    // High Priority Insights
    if (highPriority.length > 0) {
      doc
        .fontSize(14)
        .fillColor(this.CHART_COLORS.danger)
        .font("Helvetica-Bold")
        .text("HIGH PRIORITY", { underline: true });

      highPriority.forEach(
        (
          /** @type {{ title: any; type: any; impact: any; action: any; }} */ insight,
          /** @type {number} */ index,
        ) => {
          doc.moveDown(0.5);
          doc
            .fontSize(11)
            .fillColor(this.CHART_COLORS.dark)
            .font("Helvetica-Bold")
            .text(`${index + 1}. ${insight.title}`, { indent: 20 });

          doc
            .fontSize(9)
            .fillColor("#666666")
            .text(`Type: ${insight.type} | Impact: ${insight.impact}`, {
              indent: 40,
            });

          doc
            .fontSize(10)
            .fillColor("#333333")
            .text(`Recommendation: ${insight.action}`, { indent: 40 });

          doc.moveDown(0.5);
        },
      );
    }

    // Medium Priority Insights
    if (mediumPriority.length > 0) {
      doc.moveDown(0.5);
      doc
        .fontSize(14)
        .fillColor(this.CHART_COLORS.warning)
        .font("Helvetica-Bold")
        .text("MEDIUM PRIORITY", { underline: true });

      mediumPriority.forEach(
        (
          /** @type {{ title: any; type: any; impact: any; action: any; }} */ insight,
          /** @type {number} */ index,
        ) => {
          doc.moveDown(0.5);
          doc
            .fontSize(11)
            .fillColor(this.CHART_COLORS.dark)
            .font("Helvetica-Bold")
            .text(`${index + 1}. ${insight.title}`, { indent: 20 });

          doc
            .fontSize(9)
            .fillColor("#666666")
            .text(`Type: ${insight.type} | Impact: ${insight.impact}`, {
              indent: 40,
            });

          doc
            .fontSize(10)
            .fillColor("#333333")
            .text(`Recommendation: ${insight.action}`, { indent: 40 });

          doc.moveDown(0.5);
        },
      );
    }

    // Action Plan Summary
    doc.moveDown(1);
    doc
      .fontSize(12)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("ACTION PLAN SUMMARY:", { underline: true });

    doc.moveDown(0.5);

    const actionPlan = [
      `Immediate Actions (High Priority): ${highPriority.length} items`,
      `Short-term Actions (Medium Priority): ${mediumPriority.length} items`,
      `Strategic Planning (Low Priority): ${lowPriority.length} items`,
      `Total Recommendations: ${data.business_insights.length} items`,
    ];

    actionPlan.forEach((item) => {
      doc.fontSize(9).fillColor("#333333").text(`• ${item}`, { indent: 20 });
      doc.moveDown(0.3);
    });
  }

  /**
   * Create footer for PDF
   * @param {PDFKit.PDFDocument} doc
   * @param {{ metadata: { report_type: any; }; }} data
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
            `Sales Performance Report | Generated: ${new Date().toLocaleDateString()} | stashly Sales Analytics v2.0 | Report Type: ${data.metadata.report_type} | Confidential`,
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

        return {
          status: true,
          message: "Export history table created",
          data: [],
        };
      }

      // Get history for sales reports
      const history = await AppDataSource.query(
        "SELECT * FROM export_history WHERE filename LIKE '%sales_performance%' OR filename LIKE '%sales_report%' ORDER BY generated_at DESC LIMIT 50",
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
   * @param {string | number | bigint} amount
   */
  _formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      // @ts-ignore
    }).format(amount);
  }

  /**
   * @param {number} value
   */
  _getPerformanceLevel(value) {
    if (value >= 15) return "EXCELLENT";
    if (value >= 8) return "GOOD";
    if (value >= 0) return "SATISFACTORY";
    return "NEEDS ATTENTION";
  }

  /**
   * @param {number} growth
   */
  _getGrowthPerformance(growth) {
    if (growth >= 15) return "EXCELLENT";
    if (growth >= 8) return "GOOD";
    if (growth >= 0) return "SATISFACTORY";
    return "NEEDS ATTENTION";
  }

  /**
   * @param {number} margin
   */
  _getMarginPerformance(margin) {
    if (margin >= 25) return "EXCELLENT";
    if (margin >= 15) return "GOOD";
    if (margin >= 5) return "SATISFACTORY";
    return "NEEDS ATTENTION";
  }

  /**
   * @param {number} aov
   */
  _getAOVPerformance(aov) {
    if (aov >= 100) return "EXCELLENT";
    if (aov >= 50) return "GOOD";
    if (aov >= 25) return "SATISFACTORY";
    return "NEEDS ATTENTION";
  }

  /**
   * @param {number} conversion
   */
  _getConversionPerformance(conversion) {
    if (conversion >= 15) return "EXCELLENT";
    if (conversion >= 8) return "GOOD";
    if (conversion >= 3) return "SATISFACTORY";
    return "NEEDS ATTENTION";
  }

  /**
   * @param {number} satisfaction
   */
  _getSatisfactionPerformance(satisfaction) {
    if (satisfaction >= 4.5) return "EXCELLENT";
    if (satisfaction >= 4.0) return "GOOD";
    if (satisfaction >= 3.5) return "SATISFACTORY";
    return "NEEDS ATTENTION";
  }

  /**
   * @param {number} clv
   */
  _getCLVPerformance(clv) {
    if (clv >= 200) return "EXCELLENT";
    if (clv >= 100) return "GOOD";
    if (clv >= 50) return "SATISFACTORY";
    return "NEEDS ATTENTION";
  }

  /**
   * @param {number} rate
   */
  _getRepeatCustomerPerformance(rate) {
    if (rate >= 40) return "EXCELLENT";
    if (rate >= 25) return "GOOD";
    if (rate >= 15) return "SATISFACTORY";
    return "NEEDS ATTENTION";
  }

  /**
   * @param {number} ratio
   */
  _getCOGSPerformance(ratio) {
    if (ratio < 50) return "EXCELLENT";
    if (ratio < 60) return "GOOD";
    if (ratio < 70) return "SATISFACTORY";
    return "NEEDS ATTENTION";
  }

  /**
   * @param {string} metric
   * @param {string} value
   * @param {string} benchmark
   */
  // @ts-ignore
  _getMetricPerformance(metric, value, benchmark) {
    // This is a simplified implementation
    return "SATISFACTORY";
  }

  getSupportedFormats() {
    return [
      {
        value: "csv",
        label: "CSV",
        description: "Detailed format compatible with all spreadsheet software",
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
        description: "Professional report with executive summary and insights",
        icon: "📋",
      },
    ];
  }
}

// Create and export handler instance
const salesReportExportHandler = new SalesReportExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("salesReportExport", async (event, payload) => {
    return await salesReportExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

// Export for use in other modules
module.exports = { SalesReportExportHandler, salesReportExportHandler };
