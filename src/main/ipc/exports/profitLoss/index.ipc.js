// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { AppDataSource } = require("../../../db/datasource");
const { profitLossHandler } = require("../../reports/profitLoss/index.ipc");


class ProfitLossExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "InventoryPro",
      "profit_loss_exports"
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
    };

    this.PERFORMANCE_COLORS = {
      excellent: { argb: "4CAF50" }, // Green
      good: { argb: "8BC34A" }, // Light Green
      average: { argb: "FFC107" }, // Amber
      poor: { argb: "FF9800" }, // Orange
      critical: { argb: "F44336" }, // Red
    };
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
   * @param {Electron.IpcMainInvokeEvent} event
   * @param {{ method: any; params: {}; }} payload
   */
  // @ts-ignore
  // @ts-ignore
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      console.log(`ProfitLossExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          // @ts-ignore
          return await this.exportProfitLossReport(params);
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
      console.error("ProfitLossExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Export profit loss report in specified format
   * @param {{ format: string; }} params
   */
  async exportProfitLossReport(params) {
    try {
      const format = params.format || "pdf";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      // Get profit loss data from the main handler
      const profitLossData = await this._getProfitLossReportData(params);

      let exportResult;
      switch (format) {
        case "csv":
          exportResult = await this._exportCSV(profitLossData, params);
          break;
        case "excel":
          exportResult = await this._exportExcel(profitLossData, params);
          break;
        case "pdf":
          exportResult = await this._exportPDF(profitLossData, params);
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
        record_count: profitLossData.profitLossByMonth?.length || 0,
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
      console.error("exportProfitLossReport error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export profit loss report: ${error.message}`,
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
      const profitLossData = await this._getProfitLossReportData(params);

      return {
        status: true,
        message: "Export preview generated successfully",
        data: profitLossData,
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
   * Get comprehensive profit loss report data from ProfitLossHandler
   * @param {any} params
   */
  async _getProfitLossReportData(params) {
    try {
      // Get data from the main profit loss handler
      const response = await profitLossHandler.getProfitLossReport(params);

      // @ts-ignore
      if (!response.status) {
        throw new Error(response.message);
      }

      const profitLossData = response.data;

      // Transform the data to match the expected format
      const transformedData = await this._transformProfitLossData(
        // @ts-ignore
        profitLossData,
        params
      );

      return transformedData;
    } catch (error) {
      console.error("_getProfitLossReportData error:", error);
      throw error;
    }
  }

  /**
   * Transform ProfitLossHandler data to export format
   * @param {{ profitLossByMonth: any; expenseBreakdown: any; profitLossTrend: any; summary: any; performanceMetrics: any; dateRange: any; metadata: any; }} profitLossData
   * @param {{ period: any; group_by: any; category: any; }} params
   */
  async _transformProfitLossData(profitLossData, params) {
    const {
      profitLossByMonth,
      expenseBreakdown,
      profitLossTrend,
      summary,
      performanceMetrics,
      // @ts-ignore
      dateRange,
      metadata,
    } = profitLossData;

    // Calculate financial health score
    const financialHealthScore = this._calculateFinancialHealthScore(summary);

    // Generate insights
    const insights = this._generateFinancialInsights(
      summary,
      profitLossByMonth
    );

    return {
      profit_loss_data: profitLossByMonth,
      expense_breakdown: expenseBreakdown || [],
      profit_loss_trend: profitLossTrend || [],
      summary: {
        ...summary,
        financial_health_score: financialHealthScore.score,
        financial_health_level: financialHealthScore.level,
        financial_health_color: financialHealthScore.color,
      },
      performance_metrics: performanceMetrics,
      insights: insights,
      analytics: this._calculateAnalytics(profitLossByMonth, summary),
      filters: {
        period: params.period || "1year",
        group_by: params.group_by || "month",
        category: params.category || null,
      },
      metadata: {
        ...metadata,
        generated_at: new Date().toISOString(),
        total_periods: profitLossByMonth.length,
        report_type: "profit_loss_analysis",
      },
    };
  }

  /**
   * Calculate financial health score
   * @param {{ profitMargin: number; growthRate: number; netProfit: number; totalRevenue: number; }} summary
   */
  _calculateFinancialHealthScore(summary) {
    let score = 0;

    // Profit Margin (0-40 points)
    if (summary.profitMargin > 20) score += 40;
    else if (summary.profitMargin > 15) score += 30;
    else if (summary.profitMargin > 10) score += 20;
    else if (summary.profitMargin > 5) score += 10;
    else if (summary.profitMargin > 0) score += 5;

    // Growth Rate (0-30 points)
    if (summary.growthRate > 20) score += 30;
    else if (summary.growthRate > 10) score += 20;
    else if (summary.growthRate > 5) score += 15;
    else if (summary.growthRate > 0) score += 10;
    else if (summary.growthRate >= -5) score += 5;

    // Net Profit (0-30 points)
    const profitRatio = summary.netProfit / summary.totalRevenue;
    if (profitRatio > 0.2) score += 30;
    else if (profitRatio > 0.15) score += 25;
    else if (profitRatio > 0.1) score += 20;
    else if (profitRatio > 0.05) score += 15;
    else if (profitRatio > 0) score += 10;

    // Determine level and color
    let level, color;
    if (score >= 80) {
      level = "Excellent";
      color = this.PERFORMANCE_COLORS.excellent.argb;
    } else if (score >= 60) {
      level = "Good";
      color = this.PERFORMANCE_COLORS.good.argb;
    } else if (score >= 40) {
      level = "Average";
      color = this.PERFORMANCE_COLORS.average.argb;
    } else if (score >= 20) {
      level = "Poor";
      color = this.PERFORMANCE_COLORS.poor.argb;
    } else {
      level = "Critical";
      color = this.PERFORMANCE_COLORS.critical.argb;
    }

    return { score, level, color };
  }

  /**
   * Generate financial insights
   * @param {{ profitMargin: any; growthRate: any; netProfit: any; totalRevenue: any; totalExpenses: any; }} summary
   * @param {any[]} profitLossByMonth
   */
  _generateFinancialInsights(summary, profitLossByMonth) {
    const insights = [];

    // Profit Margin Insight
    if (summary.profitMargin < 5) {
      insights.push({
        priority: "HIGH",
        type: "Profit Margin",
        title: "Low Profit Margin Detected",
        action: "Review pricing strategy and cost structure",
        description: `Current profit margin (${summary.profitMargin.toFixed(1)}%) is below healthy levels. Consider price adjustments or cost optimization.`,
        impact: "Critical",
      });
    } else if (summary.profitMargin > 20) {
      insights.push({
        priority: "LOW",
        type: "Profit Margin",
        title: "Excellent Profit Margin",
        action: "Maintain current strategy",
        description: `Profit margin (${summary.profitMargin.toFixed(1)}%) is strong. Continue current business practices.`,
        impact: "Positive",
      });
    }

    // Growth Rate Insight
    if (summary.growthRate < 0) {
      insights.push({
        priority: "HIGH",
        type: "Growth",
        title: "Negative Growth Detected",
        action: "Analyze market trends and sales strategy",
        description: `Revenue declined by ${Math.abs(summary.growthRate).toFixed(1)}% compared to previous period.`,
        impact: "Critical",
      });
    } else if (summary.growthRate > 15) {
      insights.push({
        priority: "MEDIUM",
        type: "Growth",
        title: "Strong Growth Performance",
        action: "Consider scaling operations",
        description: `Revenue grew by ${summary.growthRate.toFixed(1)}%. Evaluate expansion opportunities.`,
        impact: "Positive",
      });
    }

    // Expense Ratio Insight
    const expenseRatio = (summary.totalExpenses / summary.totalRevenue) * 100;
    if (expenseRatio > 80) {
      insights.push({
        priority: "HIGH",
        type: "Expenses",
        title: "High Expense Ratio",
        action: "Implement cost control measures",
        description: `Expenses consume ${expenseRatio.toFixed(1)}% of revenue. Review operational costs.`,
        impact: "High",
      });
    }

    // Profit Consistency Insight
    if (profitLossByMonth.length > 0) {
      const losingMonths = profitLossByMonth.filter(
        (m) => m.netProfit < 0
      ).length;
      const losingPercentage = (losingMonths / profitLossByMonth.length) * 100;

      if (losingPercentage > 30) {
        insights.push({
          priority: "MEDIUM",
          type: "Consistency",
          title: "Profit Inconsistency",
          action: "Stabilize revenue streams",
          description: `${losingPercentage.toFixed(0)}% of periods show losses. Improve business stability.`,
          impact: "Medium",
        });
      }
    }

    // Default positive insight if no issues
    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        type: "Overall",
        title: "Healthy Financial Performance",
        action: "Continue current operations",
        description: "All key financial metrics are within healthy ranges.",
        impact: "Positive",
      });
    }

    return insights;
  }

  /**
   * Calculate additional analytics
   * @param {any[]} profitLossByMonth
   * @param {{ totalRevenue: any; totalCostOfGoodsSold: any; totalOperatingExpenses: any; }} summary
   */
  _calculateAnalytics(profitLossByMonth, summary) {
    // Calculate monthly averages
    const avgMonthlyRevenue =
      profitLossByMonth.length > 0
        ? profitLossByMonth.reduce((sum, m) => sum + m.revenue, 0) /
          profitLossByMonth.length
        : 0;

    const avgMonthlyProfit =
      profitLossByMonth.length > 0
        ? profitLossByMonth.reduce((sum, m) => sum + m.netProfit, 0) /
          profitLossByMonth.length
        : 0;

    // Calculate volatility
    const monthlyProfits = profitLossByMonth.map((m) => m.netProfit);
    const profitVolatility = this._calculateVolatility(monthlyProfits);

    // Calculate expense ratios
    const cogsRatio =
      summary.totalRevenue > 0
        ? (summary.totalCostOfGoodsSold / summary.totalRevenue) * 100
        : 0;

    const operatingExpenseRatio =
      summary.totalRevenue > 0
        ? (summary.totalOperatingExpenses / summary.totalRevenue) * 100
        : 0;

    return {
      average_monthly_revenue: parseFloat(avgMonthlyRevenue.toFixed(2)),
      average_monthly_profit: parseFloat(avgMonthlyProfit.toFixed(2)),
      profit_volatility: parseFloat(profitVolatility.toFixed(3)),
      cogs_ratio: parseFloat(cogsRatio.toFixed(1)),
      operating_expense_ratio: parseFloat(operatingExpenseRatio.toFixed(1)),
      total_periods_analyzed: profitLossByMonth.length,
      profitable_periods: profitLossByMonth.filter((m) => m.netProfit > 0)
        .length,
      break_even_periods: profitLossByMonth.filter((m) => m.netProfit === 0)
        .length,
      loss_periods: profitLossByMonth.filter((m) => m.netProfit < 0).length,
    };
  }

  /**
   * Calculate volatility (coefficient of variation)
   * @param {number[]} values
   */
  _calculateVolatility(values) {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return mean !== 0 ? stdDev / Math.abs(mean) : 0;
  }

  /**
   * Export data as CSV
   * @param {any} data
   * @param {any} params
   */
  // @ts-ignore
  async _exportCSV(data, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `profit_loss_report_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    // Create CSV content
    let csvContent = [];

    // Report Header
    csvContent.push("📊 PROFIT & LOSS FINANCIAL ANALYSIS REPORT");
    csvContent.push(`Generated,${new Date().toISOString()}`);
    csvContent.push(`Report Type,${data.metadata.report_type}`);
    csvContent.push(`Period Analyzed,${data.filters.period}`);
    csvContent.push(`Group By,${data.filters.group_by}`);
    csvContent.push(`Financial Health,${data.summary.financial_health_level}`);
    csvContent.push(
      `Financial Health Score,${data.summary.financial_health_score}/100`
    );
    csvContent.push("");

    // Executive Summary
    csvContent.push("📈 EXECUTIVE SUMMARY");
    csvContent.push("Metric,Value,Status,Impact");

    const execSummary = [
      [
        "Total Revenue",
        this._formatCurrency(data.summary.totalRevenue),
        this._getPerformanceStatus(data.summary.totalRevenue, 0, "revenue"),
        "High",
      ],
      [
        "Net Profit",
        this._formatCurrency(data.summary.netProfit),
        this._getPerformanceStatus(data.summary.netProfit, 0, "profit"),
        "Critical",
      ],
      [
        "Profit Margin",
        `${data.summary.profitMargin.toFixed(2)}%`,
        this._getPerformanceStatus(data.summary.profitMargin, 10, "margin"),
        "High",
      ],
      [
        "Growth Rate",
        `${data.summary.growthRate.toFixed(2)}%`,
        this._getPerformanceStatus(data.summary.growthRate, 5, "growth"),
        "Medium",
      ],
      [
        "Financial Health",
        `${data.summary.financial_health_score}/100 (${data.summary.financial_health_level})`,
        data.summary.financial_health_level,
        this._getImpactLevel(data.summary.financial_health_score),
      ],
      [
        "Total Expenses",
        this._formatCurrency(data.summary.totalExpenses),
        "Analysis",
        "Review",
      ],
      [
        "Gross Profit",
        this._formatCurrency(data.summary.grossProfit),
        this._getPerformanceStatus(data.summary.grossProfit, 0, "profit"),
        "High",
      ],
    ];

    execSummary.forEach((row) => csvContent.push(row.join(",")));
    csvContent.push("");

    // Performance Metrics
    csvContent.push("🎯 PERFORMANCE METRICS");
    csvContent.push("Metric,Value");

    const perfMetrics = [
      ["Best Performing Period", data.performance_metrics.bestMonth],
      ["Worst Performing Period", data.performance_metrics.worstMonth],
      [
        "Highest Profit Margin",
        `${data.performance_metrics.highestMargin.toFixed(2)}%`,
      ],
      [
        "Lowest Profit Margin",
        `${data.performance_metrics.lowestMargin.toFixed(2)}%`,
      ],
      [
        "Average Profit Margin",
        `${data.performance_metrics.averageMargin.toFixed(2)}%`,
      ],
      ["Total Periods Analyzed", data.analytics.total_periods_analyzed],
      ["Profitable Periods", data.analytics.profitable_periods],
      ["Loss Periods", data.analytics.loss_periods],
      [
        "Success Rate",
        `${((data.analytics.profitable_periods / data.analytics.total_periods_analyzed) * 100).toFixed(1)}%`,
      ],
      ["Profit Volatility", data.analytics.profit_volatility.toFixed(3)],
    ];

    perfMetrics.forEach((row) => csvContent.push(row.join(",")));
    csvContent.push("");

    // Expense Breakdown
    csvContent.push("💰 EXPENSE BREAKDOWN");
    csvContent.push("Category,Amount,Percentage,Analysis");

    // @ts-ignore
    data.expense_breakdown.forEach((breakdown) => {
      let analysis = "Normal";
      if (breakdown.percentage > 60) analysis = "High - Review Needed";
      else if (breakdown.percentage > 40) analysis = "Moderate - Monitor";

      csvContent.push(
        [
          breakdown.category,
          this._formatCurrency(breakdown.amount),
          `${breakdown.percentage.toFixed(2)}%`,
          analysis,
        ].join(",")
      );
    });
    csvContent.push("");

    // Detailed Monthly Data
    csvContent.push("📅 DETAILED PROFIT & LOSS DATA");
    csvContent.push(
      [
        "Period",
        "Revenue",
        "Cost of Goods Sold",
        "Operating Expenses",
        "Gross Profit",
        "Net Profit",
        "Profit Margin",
        "Status",
      ].join(",")
    );

    // Sort by period
    const sortedItems = [...data.profit_loss_data].sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    sortedItems.forEach((item) => {
      const status = item.netProfit >= 0 ? "Profitable" : "Loss";
      csvContent.push(
        [
          item.month,
          this._formatCurrency(item.revenue),
          this._formatCurrency(item.costOfGoodsSold),
          this._formatCurrency(item.operatingExpenses),
          this._formatCurrency(item.grossProfit),
          this._formatCurrency(item.netProfit),
          `${item.profitMargin.toFixed(2)}%`,
          status,
        ].join(",")
      );
    });
    csvContent.push("");

    // Financial Insights
    csvContent.push("💡 FINANCIAL INSIGHTS & RECOMMENDATIONS");
    csvContent.push("Priority,Type,Insight,Recommendation,Impact");

    // @ts-ignore
    data.insights.forEach((insight) => {
      csvContent.push(
        [
          insight.priority,
          insight.type,
          `"${insight.title}"`,
          `"${insight.action}"`,
          insight.impact,
        ].join(",")
      );
    });
    csvContent.push("");

    // Analytics Summary
    csvContent.push("📊 ANALYTICS SUMMARY");
    csvContent.push("Metric,Value,Interpretation");

    const analyticsSummary = [
      [
        "Average Monthly Revenue",
        this._formatCurrency(data.analytics.average_monthly_revenue),
        "Revenue consistency",
      ],
      [
        "Average Monthly Profit",
        this._formatCurrency(data.analytics.average_monthly_profit),
        "Profit stability",
      ],
      [
        "COGS Ratio",
        `${data.analytics.cogs_ratio.toFixed(1)}%`,
        "Production cost efficiency",
      ],
      [
        "Operating Expense Ratio",
        `${data.analytics.operating_expense_ratio.toFixed(1)}%`,
        "Operational efficiency",
      ],
      [
        "Profit Volatility",
        data.analytics.profit_volatility.toFixed(3),
        "Lower is better (<0.3 is stable)",
      ],
      [
        "Profitable Periods",
        `${data.analytics.profitable_periods} of ${data.analytics.total_periods_analyzed}`,
        "Business consistency",
      ],
    ];

    analyticsSummary.forEach((row) => csvContent.push(row.join(",")));
    csvContent.push("");

    // Footer
    csvContent.push("🏁 REPORT FOOTER");
    csvContent.push(
      "Generated by,InventoryPro Financial Management System v2.0"
    );
    csvContent.push("Data Source,Orders and Purchases Database");
    csvContent.push("Report Type,Profit & Loss Analysis");
    csvContent.push("Confidentiality,Internal Use Only");
    csvContent.push("Next Review,Next 30 Days");
    csvContent.push("Contact,Financial Manager");

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
      const filename = `profit_loss_report_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "InventoryPro Financial System";
      workbook.created = new Date();

      // ==================== COVER PAGE ====================
      const coverSheet = workbook.addWorksheet("Cover");

      // Add logo/header
      const logoRow = coverSheet.addRow(["FINANCIAL MANAGEMENT SYSTEM"]);
      logoRow.font = { size: 24, bold: true, color: { argb: "2C3E50" } };
      logoRow.height = 40;
      coverSheet.mergeCells(`A1:E1`);
      logoRow.alignment = { horizontal: "center", vertical: "middle" };

      coverSheet.addRow([]);

      const titleRow = coverSheet.addRow(["PROFIT & LOSS ANALYSIS REPORT"]);
      titleRow.font = { size: 28, bold: true, color: { argb: "3498DB" } };
      titleRow.height = 50;
      coverSheet.mergeCells(`A3:E3`);
      titleRow.alignment = { horizontal: "center", vertical: "middle" };

      coverSheet.addRow([]);
      coverSheet.addRow([]);

      // Report Details
      const details = [
        ["Report ID", `PLR-${Date.now()}`],
        ["Generated", new Date().toLocaleString()],
        ["Period Analyzed", data.filters.period],
        ["Group By", data.filters.group_by],
        ["Report Scope", "Financial Performance Analysis"],
        ["Total Periods", data.metadata.total_periods],
        [
          "Financial Health",
          `${data.summary.financial_health_score}/100 (${data.summary.financial_health_level})`,
        ],
        ["Profit Margin", `${data.summary.profitMargin.toFixed(2)}%`],
        ["Growth Rate", `${data.summary.growthRate.toFixed(2)}%`],
        ["Overall Status", this._getOverallStatus(data.summary)],
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
      const summaryTitle = coverSheet.addRow(["EXECUTIVE HIGHLIGHTS"]);
      summaryTitle.font = { size: 16, bold: true, color: { argb: "FFFFFF" } };
      summaryTitle.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: data.summary.financial_health_color.replace("#", "") },
      };
      summaryTitle.alignment = { horizontal: "center" };
      coverSheet.mergeCells(`A${summaryTitle.number}:E${summaryTitle.number}`);

      const summaryContent = [
        ["💰 Total Revenue", this._formatCurrency(data.summary.totalRevenue)],
        ["📈 Net Profit", this._formatCurrency(data.summary.netProfit)],
        ["🎯 Profit Margin", `${data.summary.profitMargin.toFixed(2)}%`],
        ["📊 Growth Rate", `${data.summary.growthRate.toFixed(2)}%`],
        ["🏥 Financial Health", `${data.summary.financial_health_score}/100`],
        ["📅 Periods Analyzed", data.metadata.total_periods],
        ["✅ Profitable Periods", data.analytics.profitable_periods],
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
          label: "Total Revenue",
          value: this._formatCurrency(data.summary.totalRevenue),
          color: "3498DB",
        },
        {
          label: "Net Profit",
          value: this._formatCurrency(data.summary.netProfit),
          color: data.summary.netProfit >= 0 ? "2ECC71" : "E74C3C",
        },
        {
          label: "Profit Margin",
          value: `${data.summary.profitMargin.toFixed(2)}%`,
          color: data.summary.profitMargin >= 10 ? "27AE60" : "F39C12",
        },
        {
          label: "Growth Rate",
          value: `${data.summary.growthRate.toFixed(2)}%`,
          color: data.summary.growthRate >= 0 ? "9B59B6" : "E74C3C",
        },
        {
          label: "Financial Health",
          value: `${data.summary.financial_health_score}/100`,
          color: data.summary.financial_health_color.replace("#", ""),
        },
        {
          label: "Profitable Periods",
          value: `${data.analytics.profitable_periods}/${data.analytics.total_periods_analyzed}`,
          color: "2C3E50",
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

      // Expense Distribution Chart Data
      rowIndex = 9;
      dashboardSheet.getCell(rowIndex, 1).value = "Expense Distribution";
      dashboardSheet.getCell(rowIndex, 1).font = { size: 14, bold: true };

      // @ts-ignore
      data.expense_breakdown.forEach((item, index) => {
        dashboardSheet.getCell(rowIndex + index + 1, 1).value = item.category;
        dashboardSheet.getCell(rowIndex + index + 1, 2).value = item.amount;
        dashboardSheet.getCell(rowIndex + index + 1, 3).value =
          `${item.percentage.toFixed(1)}%`;
      });

      // ==================== DETAILED DATA PAGE ====================
      const dataSheet = workbook.addWorksheet("Profit & Loss Data");

      // Column headers
      dataSheet.columns = [
        { header: "Period", key: "period", width: 15 },
        { header: "Revenue", key: "revenue", width: 15 },
        { header: "COGS", key: "cogs", width: 15 },
        { header: "Operating Expenses", key: "opex", width: 15 },
        { header: "Gross Profit", key: "gross", width: 15 },
        { header: "Net Profit", key: "net", width: 15 },
        { header: "Profit Margin", key: "margin", width: 12 },
        { header: "Status", key: "status", width: 12 },
        { header: "Trend", key: "trend", width: 10 },
      ];

      // Header styling
      const headerRow = dataSheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "2C3E50" },
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 25;

      // Add data rows with conditional formatting
      // @ts-ignore
      data.profit_loss_data.forEach((item, index) => {
        const row = dataSheet.addRow({
          period: item.month,
          revenue: this._formatCurrency(item.revenue),
          cogs: this._formatCurrency(item.costOfGoodsSold),
          opex: this._formatCurrency(item.operatingExpenses),
          gross: this._formatCurrency(item.grossProfit),
          net: this._formatCurrency(item.netProfit),
          margin: `${item.profitMargin.toFixed(2)}%`,
          status: item.netProfit >= 0 ? "Profitable" : "Loss",
          trend: this._getTrendIcon(index, data.profit_loss_data),
        });

        // Zebra striping
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F8F9F9" },
          };
        }

        // Net profit coloring
        const netCell = row.getCell("net");
        if (item.netProfit < 0) {
          netCell.font = { bold: true, color: { argb: "E74C3C" } };
        } else if (item.netProfit > 0) {
          netCell.font = { bold: true, color: { argb: "27AE60" } };
        }

        // Status coloring
        const statusCell = row.getCell("status");
        if (item.netProfit >= 0) {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "C6EFCE" },
          };
          statusCell.font = { bold: true, color: { argb: "006100" } };
        } else {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" },
          };
          statusCell.font = { bold: true, color: { argb: "9C0006" } };
        }

        // Margin coloring
        const marginCell = row.getCell("margin");
        if (item.profitMargin >= 20) {
          marginCell.font = { bold: true, color: { argb: "27AE60" } };
        } else if (item.profitMargin < 5) {
          marginCell.font = { bold: true, color: { argb: "E74C3C" } };
        }
      });

      // Auto-filter
      dataSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: dataSheet.rowCount, column: dataSheet.columnCount },
      };

      // ==================== ANALYTICS PAGE ====================
      const analyticsSheet = workbook.addWorksheet("Analytics");

      // Expense Breakdown
      analyticsSheet.getCell("A1").value = "Expense Analysis";
      analyticsSheet.getCell("A1").font = { size: 16, bold: true };

      const expenseHeaders = ["Category", "Amount", "Percentage", "Analysis"];
      analyticsSheet.addRow(expenseHeaders);

      // @ts-ignore
      data.expense_breakdown.forEach((item) => {
        let analysis = "Normal";
        if (item.percentage > 60) analysis = "High";
        else if (item.percentage > 40) analysis = "Moderate";

        analyticsSheet.addRow([
          item.category,
          this._formatCurrency(item.amount),
          `${item.percentage.toFixed(2)}%`,
          analysis,
        ]);
      });

      // Performance Metrics
      analyticsSheet.getCell("A15").value = "Performance Metrics";
      analyticsSheet.getCell("A15").font = { size: 16, bold: true };

      const metricsHeaders = ["Metric", "Value"];
      analyticsSheet.addRow(metricsHeaders);

      const metricsData = [
        ["Best Period", data.performance_metrics.bestMonth],
        ["Worst Period", data.performance_metrics.worstMonth],
        [
          "Highest Margin",
          `${data.performance_metrics.highestMargin.toFixed(2)}%`,
        ],
        [
          "Lowest Margin",
          `${data.performance_metrics.lowestMargin.toFixed(2)}%`,
        ],
        [
          "Average Margin",
          `${data.performance_metrics.averageMargin.toFixed(2)}%`,
        ],
        [
          "Average Monthly Revenue",
          this._formatCurrency(data.analytics.average_monthly_revenue),
        ],
        [
          "Average Monthly Profit",
          this._formatCurrency(data.analytics.average_monthly_profit),
        ],
        ["COGS Ratio", `${data.analytics.cogs_ratio.toFixed(1)}%`],
        ["OpEx Ratio", `${data.analytics.operating_expense_ratio.toFixed(1)}%`],
        ["Profit Volatility", data.analytics.profit_volatility.toFixed(3)],
      ];

      metricsData.forEach(([label, value]) => {
        analyticsSheet.addRow([label, value]);
      });

      // ==================== INSIGHTS PAGE ====================
      const insightsSheet = workbook.addWorksheet("Insights");

      insightsSheet.columns = [
        { header: "Priority", key: "priority", width: 10 },
        { header: "Type", key: "type", width: 15 },
        { header: "Insight", key: "insight", width: 40 },
        { header: "Recommendation", key: "recommendation", width: 40 },
        { header: "Impact", key: "impact", width: 10 },
      ];

      // @ts-ignore
      data.insights.forEach((insight, index) => {
        const row = insightsSheet.addRow({
          priority: insight.priority,
          type: insight.type,
          insight: insight.title,
          recommendation: insight.action,
          impact: insight.impact,
        });

        // Priority coloring
        const priorityCell = row.getCell("priority");
        if (insight.priority === "HIGH") {
          priorityCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE6E6" },
          };
          priorityCell.font = { bold: true, color: { argb: "E74C3C" } };
        } else if (insight.priority === "MEDIUM") {
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
            fgColor: { argb: "E6F7FF" },
          };
          priorityCell.font = { bold: true, color: { argb: "3498DB" } };
        }

        // Impact coloring
        const impactCell = row.getCell("impact");
        if (insight.impact === "Critical" || insight.impact === "High") {
          impactCell.font = { bold: true, color: { argb: "E74C3C" } };
        } else if (insight.impact === "Positive") {
          impactCell.font = { bold: true, color: { argb: "27AE60" } };
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
      const filename = `profit_loss_report_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      // Create PDF document
      const doc = new PDFKit({
        size: "A4",
        margin: 40,
        info: {
          Title: "Profit & Loss Analysis Report",
          Author: "InventoryPro Financial System",
          Subject: "Financial Performance Analysis",
          Keywords: "profit, loss, financial, analysis, report",
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
      this._createPerformanceMetrics(doc, data);
      pages.push(2);
      doc.addPage();

      // ==================== EXPENSE ANALYSIS ====================
      this._createExpenseAnalysis(doc, data);
      pages.push(3);
      doc.addPage();

      // ==================== DETAILED DATA ====================
      this._createDetailedData(doc, data);
      pages.push(4);
      doc.addPage();

      // ==================== INSIGHTS ====================
      this._createInsights(doc, data);
      pages.push(5);

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
    const headerHeight = 180;
    const headerPaddingTop = 30;
    const panelTop = headerHeight - 20;
    const panelHeight = 300;
    // @ts-ignore
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
      .text("PROFIT & LOSS", margin, headerPaddingTop, {
        width: pageWidth - margin * 2,
        align: "center",
        lineGap: 2,
      });

    doc
      .font("Helvetica")
      .fontSize(20)
      .fillColor("white")
      .text("FINANCIAL ANALYSIS", margin, headerPaddingTop + 44, {
        width: pageWidth - margin * 2,
        align: "center",
      });

    doc
      .fontSize(12)
      .fillColor(this.CHART_COLORS.light)
      .text(
        "Comprehensive Financial Performance Report",
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
      .text(
        "InventoryPro Financial Management System",
        margin,
        headerPaddingTop + 92,
        {
          width: pageWidth - margin * 2,
          align: "center",
        }
      );
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

    // Move cursor into the white panel with padding
    const contentX = margin + 16;
    let cursorY = panelTop + 18;

    // Report Details heading inside white panel
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(this.CHART_COLORS.dark)
      .text("REPORT OVERVIEW", contentX, cursorY);

    // underline effect
    const headingWidth = doc.widthOfString("REPORT OVERVIEW");
    doc
      .moveTo(contentX, cursorY + 18)
      .lineTo(contentX + headingWidth, cursorY + 18)
      .lineWidth(1)
      .strokeColor(this.CHART_COLORS.dark)
      .stroke();

    cursorY += 28;

    // Details rows
    const details = [
      ["Report ID", `PLR-${Date.now().toString().slice(-8)}`],
      ["Generated", new Date().toLocaleString()],
      ["Periods Analyzed", data.metadata.total_periods],
      ["Report Scope", data.metadata.report_type],
      [
        "Financial Health",
        `${data.summary.financial_health_score}/100 (${data.summary.financial_health_level})`,
      ],
      ["Overall Status", this._getOverallStatus(data.summary)],
      ["Profit Margin", `${data.summary.profitMargin.toFixed(2)}%`],
      ["Growth Rate", `${data.summary.growthRate.toFixed(2)}%`],
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

    // Financial Health Indicator
    cursorY += 12;
    const healthColor = data.summary.financial_health_color;
    const healthBoxWidth = 220;
    const healthBoxHeight = 28;
    const healthBoxX = contentX;
    const healthBoxY = cursorY;

    doc.save();
    doc
      .roundedRect(healthBoxX, healthBoxY, healthBoxWidth, healthBoxHeight, 4)
      .fill(healthColor);

    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(
        `FINANCIAL HEALTH: ${data.summary.financial_health_level}`,
        healthBoxX,
        healthBoxY + 6,
        {
          width: healthBoxWidth,
          align: "center",
        }
      );
    doc.restore();

    // Move doc cursor below the panel
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
    const analytics = data.analytics || {};

    // Section header
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(colors.dark)
      .text("EXECUTIVE SUMMARY", startX, doc.y, { underline: true });

    doc.moveDown(0.8);

    // KPI Grid (emoji-free icons)
    const kpis = [
      {
        label: "Total Revenue",
        value: formatCurrency(summary.totalRevenue ?? 0),
        icon: "REV",
      },
      {
        label: "Net Profit",
        value: formatCurrency(summary.netProfit ?? 0),
        icon: "NET",
      },
      {
        label: "Profit Margin",
        value:
          summary.profitMargin != null
            ? `${summary.profitMargin.toFixed(2)}%`
            : "N/A",
        icon: "PM",
      },
      {
        label: "Growth Rate",
        value:
          summary.growthRate != null
            ? `${summary.growthRate.toFixed(2)}%`
            : "N/A",
        icon: "GR",
      },
      {
        label: "Financial Health",
        value:
          summary.financial_health_score != null
            ? `${summary.financial_health_score}/100`
            : "N/A",
        icon: "FH",
      },
      {
        label: "Profitable Periods",
        value:
          analytics.profitable_periods != null &&
          analytics.total_periods_analyzed != null
            ? `${analytics.profitable_periods}/${analytics.total_periods_analyzed}`
            : "N/A",
        icon: "PP",
      },
      {
        label: "Avg Monthly Revenue",
        value: formatCurrency(analytics.average_monthly_revenue ?? 0),
        icon: "AVG",
      },
      {
        label: "Profit Volatility",
        value:
          analytics.profit_volatility != null
            ? analytics.profit_volatility.toFixed(3)
            : "N/A",
        icon: "VOL",
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

      // Icon area (left, text-based)
      const iconX = x + 10;
      const iconY = y + 10;
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
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
      .text("KEY FINANCIAL FINDINGS", startX, doc.y, { underline: true });

    doc.moveDown(0.5);

    // Findings list (safe access and formatting)
    const totalPeriods = analytics.total_periods_analyzed || 0;
    const profitable = analytics.profitable_periods || 0;
    const successRate =
      totalPeriods > 0 ? ((profitable / totalPeriods) * 100).toFixed(1) : "N/A";

    const findings = [
      `Net profit: ${formatCurrency(summary.netProfit ?? 0)}`,
      `Profit margin: ${summary.profitMargin != null ? `${summary.profitMargin.toFixed(2)}%` : "N/A"}`,
      `Revenue growth: ${summary.growthRate != null ? `${summary.growthRate.toFixed(2)}%` : "N/A"}`,
      `Financial health score: ${summary.financial_health_score != null ? `${summary.financial_health_score}/100` : "N/A"}${summary.financial_health_level ? ` (${summary.financial_health_level})` : ""}`,
      `Analyzed ${totalPeriods} periods`,
      `${profitable} profitable periods (${successRate === "N/A" ? "N/A" : `${successRate}%`} success rate)`,
      `Average monthly revenue: ${formatCurrency(analytics.average_monthly_revenue ?? 0)}`,
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

    // Summary (right aligned)
    doc.moveDown(0.6);
    const overall =
      typeof this._getOverallStatus === "function"
        ? this._getOverallStatus(summary)
        : "N/A";
    const summaryText = `Overall financial performance is ${String(overall).toLowerCase()}`;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#777777")
      .text(summaryText, startX, doc.y, {
        width: contentWidth,
        align: "right",
      });

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
      ["Best Performing Period", data.performance_metrics.bestMonth],
      ["Worst Performing Period", data.performance_metrics.worstMonth],
      [
        "Highest Profit Margin",
        `${data.performance_metrics.highestMargin.toFixed(2)}%`,
      ],
      [
        "Lowest Profit Margin",
        `${data.performance_metrics.lowestMargin.toFixed(2)}%`,
      ],
      [
        "Average Profit Margin",
        `${data.performance_metrics.averageMargin.toFixed(2)}%`,
      ],
      ["Profit Volatility", data.analytics.profit_volatility.toFixed(3)],
      ["COGS Ratio", `${data.analytics.cogs_ratio.toFixed(1)}%`],
      [
        "Operating Expense Ratio",
        `${data.analytics.operating_expense_ratio.toFixed(1)}%`,
      ],
      [
        "Average Monthly Revenue",
        this._formatCurrency(data.analytics.average_monthly_revenue),
      ],
      [
        "Average Monthly Profit",
        this._formatCurrency(data.analytics.average_monthly_profit),
      ],
    ];

    const colWidths = [200, 150];
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

      // Value with coloring for certain metrics
      doc.fontSize(10);

      if (label.includes("Profit Margin") && parseFloat(value) >= 20) {
        doc.fillColor("#27AE60");
      } else if (label.includes("Profit Margin") && parseFloat(value) < 5) {
        doc.fillColor("#E74C3C");
      } else if (label.includes("Volatility") && parseFloat(value) > 0.5) {
        doc.fillColor("#E74C3C");
      } else if (label.includes("Ratio") && parseFloat(value) > 50) {
        doc.fillColor("#F39C12");
      } else {
        doc.fillColor(this.CHART_COLORS.primary);
      }

      doc.text(value.toString(), startX + colWidths[0] + 10, y, {
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
   * Create expense analysis for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createExpenseAnalysis(doc, data = {}) {
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
    const colors = this.CHART_COLORS || { primary: "#1976D2", dark: "#263238" };

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(colors.dark)
      .text("EXPENSE ANALYSIS", startX, doc.y, { underline: true });

    doc.moveDown(0.8);

    const breakdown = Array.isArray(data.expense_breakdown)
      ? data.expense_breakdown
      : [];
    if (breakdown.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#666666")
        .text("No expense data available", startX, doc.y, {
          width: contentW,
          align: "center",
        });
      doc.moveDown(1);
      return;
    }

    // Table settings (responsive)
    const headers = ["Category", "Amount", "Percentage", "Analysis"];
    const colWeights = [3, 2, 1.5, 2];
    const totalWeight = colWeights.reduce((s, w) => s + w, 0);
    const colWidths = colWeights.map((w) =>
      Math.floor((w / totalWeight) * contentW)
    );
    const tableWidth = colWidths.reduce((s, w) => s + w, 0);
    const tableX =
      startX + Math.max(0, Math.floor((contentW - tableWidth) / 2));
    let y = doc.y;

    // Header row background
    const headerH = 22;
    doc.save();
    doc
      .rect(tableX - 4, y - 4, tableWidth + 8, headerH + 8)
      .fill(colors.primary);
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

    const ensureSpace = (/** @type {number} */ needed) => {
      if (y + needed > pageH - 80) {
        doc.addPage();
        y = margin;
      }
    };

    // Draw rows
    breakdown.forEach((/** @type {{ category: any; amount: any; percentage: any; }} */ item, /** @type {number} */ rowIndex) => {
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

      // Safe values
      const category = String(item.category ?? "Uncategorized");
      const amount = Number(item.amount ?? 0);
      const amountLabel = formatCurrency(amount);
      const pct =
        typeof item.percentage === "number"
          ? item.percentage
          : item.amount &&
              breakdown.reduce((/** @type {number} */ s, /** @type {{ amount: any; }} */ it) => s + (Number(it.amount) || 0), 0)
            ? (amount /
                breakdown.reduce((/** @type {number} */ s, /** @type {{ amount: any; }} */ it) => s + (Number(it.amount) || 0), 0)) *
              100
            : 0;
      const pctLabel = `${Number(pct).toFixed(2)}%`;

      // Analysis logic
      let analysis = "Normal";
      let analysisColor = "#333333";
      if (pct > 60) {
        analysis = "High";
        analysisColor = "#E74C3C";
      } else if (pct > 40) {
        analysis = "Moderate";
        analysisColor = "#F39C12";
      }

      // Render cells
      let cellX = tableX;
      // Category
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#263238")
        .text(category, cellX + 6, y + 5, { width: colWidths[0] - 12 });
      cellX += colWidths[0];

      // Amount (right aligned)
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(amountLabel, cellX + 6, y + 5, {
          width: colWidths[1] - 12,
          align: "right",
        });
      cellX += colWidths[1];

      // Percentage (center)
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(pctLabel, cellX + 6, y + 5, {
          width: colWidths[2] - 12,
          align: "center",
        });
      cellX += colWidths[2];

      // Analysis (colored)
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(analysisColor)
        .text(analysis, cellX + 6, y + 5, {
          width: colWidths[3] - 12,
          align: "left",
        });

      // Advance y
      y += rowH;
    });

    // Move doc cursor below table
    doc.y = y + 12;

    // Expense Distribution title
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(colors.dark)
      .text("Expense Distribution", startX, doc.y);
    doc.moveDown(0.5);

    // Simple horizontal stacked bar chart
    const chartX = startX;
    const chartY = doc.y;
    const chartWidth = Math.min(420, contentW);
    const chartHeight = 20;
    const totalExpenses =
      breakdown.reduce((/** @type {number} */ s, /** @type {{ amount: any; }} */ it) => s + (Number(it.amount) || 0), 0) || 1;

    // Colors palette
    const palette = [
      "#3498DB",
      "#2ECC71",
      "#E74C3C",
      "#F39C12",
      "#9B59B6",
      "#4DB6AC",
      "#90A4AE",
    ];

    // Draw stacked bars and labels
    let offset = 0;
    breakdown.forEach((/** @type {{ amount: any; category: any; }} */ item, /** @type {number} */ idx) => {
      const amt = Number(item.amount || 0);
      const w = Math.round((amt / totalExpenses) * chartWidth);
      if (w > 0) {
        const x = chartX + offset;
        doc.rect(x, chartY, w, chartHeight).fill(palette[idx % palette.length]);
        // Label inside bar if space allows, otherwise place above
        const label = `${String(item.category ?? "")}: ${((amt / totalExpenses) * 100).toFixed(1)}%`;
        if (w > 60) {
          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor("#FFFFFF")
            .text(label, x + 6, chartY + 5, { width: w - 10 });
        } else {
          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor("#333333")
            .text(label, x + w + 6, chartY + 2);
        }
        offset += w;
      }
    });

    // If small rounding gap remains, draw a light background for remainder
    if (offset < chartWidth) {
      doc
        .rect(chartX + offset, chartY, chartWidth - offset, chartHeight)
        .fill("#ECEFF1");
    }

    // Advance cursor below chart
    doc.y = chartY + chartHeight + 18;

    // Small summary line
    const totalLabel = `Total Expenses: ${formatCurrency(totalExpenses)}`;
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#777777")
      .text(totalLabel, startX, doc.y, { width: contentW, align: "left" });

    doc.moveDown(1);
  }

  /**
   * Create detailed data for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createDetailedData(doc, data) {
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
      .text("DETAILED PROFIT & LOSS DATA", startX, headerY, {
        underline: true,
      });

    doc.moveDown(0.4);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#666666")
      .text(
        `Showing ${Math.min(12, data.profit_loss_data.length)} of ${data.profit_loss_data.length} periods`,
        { align: "center" }
      );

    doc.moveDown(0.6);

    if (!data.profit_loss_data || data.profit_loss_data.length === 0) {
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("No profit/loss data available", { align: "center" });
      return;
    }

    // Responsive column ratios
    const colRatios = [0.15, 0.15, 0.15, 0.15, 0.15, 0.1, 0.15];
    const colWidths = colRatios.map((r) => Math.floor(contentWidth * r));
    const headers = [
      "Period",
      "Revenue",
      "COGS",
      "OpEx",
      "Gross Profit",
      "Margin",
      "Net Profit",
    ];
    const tableX = startX;
    let tableY = doc.y;

    // Ensure enough space helper
    // @ts-ignore
    const ensureSpace = (needed) => {
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
        headerHeight
      )
      .fill(this.CHART_COLORS.dark);
    doc.restore();

    // Header text
    let hx = tableX;
    headers.forEach((h, i) => {
      const cellWidth = Math.max(12, colWidths[i] - 12);
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
      const textY = tableY + Math.round((headerHeight - fontSize) / 2) - 1;
      doc.fontSize(fontSize).fillColor("white").text(h, hx, textY, {
        width: colWidths[i],
        align: "center",
        ellipsis: true,
      });

      hx += colWidths[i];
    });

    tableY += headerHeight;

    // Row settings
    const rowHeight = 24;
    const displayItems = data.profit_loss_data.slice(0, 12);

    // @ts-ignore
    displayItems.forEach((item, rowIndex) => {
      ensureSpace(rowHeight + 8);

      // Zebra background
      if (rowIndex % 2 === 0) {
        doc
          .rect(
            tableX,
            tableY,
            colWidths.reduce((a, b) => a + b, 0),
            rowHeight
          )
          .fillColor("#FAFBFB")
          .fill();
      }

      // Prepare values
      const values = [
        item.month,
        this._formatCurrency(item.revenue),
        this._formatCurrency(item.costOfGoodsSold),
        this._formatCurrency(item.operatingExpenses),
        this._formatCurrency(item.grossProfit),
        `${item.profitMargin.toFixed(1)}%`,
        this._formatCurrency(item.netProfit),
      ];

      // Draw cells
      let cx = tableX;
      values.forEach((text, ci) => {
        const cellX = cx + 6;
        const cellWidth = colWidths[ci] - 12;

        // Net profit cell - colored
        if (ci === values.length - 1) {
          if (item.netProfit < 0) {
            doc.fillColor("#E74C3C");
          } else if (item.netProfit > 0) {
            doc.fillColor("#27AE60");
          } else {
            doc.fillColor("#333333");
          }
        } else if (ci === 5) {
          // Margin cell
          if (item.profitMargin >= 20) {
            doc.fillColor("#27AE60");
          } else if (item.profitMargin < 5) {
            doc.fillColor("#E74C3C");
          } else {
            doc.fillColor("#333333");
          }
        } else {
          doc.fillColor("#333333");
        }

        // Center numeric columns
        const numericCols = [1, 2, 3, 4, 5, 6];
        if (numericCols.includes(ci)) {
          doc
            .font("Helvetica")
            .fontSize(9)
            .text(String(text), cx, tableY + 7, {
              width: colWidths[ci],
              align: "center",
              ellipsis: true,
            });
        } else {
          doc
            .font("Helvetica")
            .fontSize(9)
            .text(String(text), cellX, tableY + 7, {
              width: cellWidth,
              align: "left",
              ellipsis: true,
            });
        }

        cx += colWidths[ci];
      });

      tableY += rowHeight;
    });

    // Move doc cursor below table
    doc.y = tableY + 10;

    // Note if truncated
    if (data.profit_loss_data.length > 12) {
      doc
        .fontSize(9)
        .fillColor("#666666")
        .text(
          `* Showing first 12 of ${data.profit_loss_data.length} periods. See full data in Excel/CSV export.`,
          { align: "center" }
        );
      doc.moveDown(0.6);
    }
  }

  /**
   * Create insights for PDF
   * @param {any} doc
   * @param {any} data
   */
  _createInsights(doc, data) {
    doc
      .fontSize(18)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("FINANCIAL INSIGHTS & RECOMMENDATIONS", { underline: true });

    doc.moveDown(1);

    if (!data.insights || data.insights.length === 0) {
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("No insights generated", { align: "center" });
      return;
    }

    // @ts-ignore
    data.insights.forEach((insight, index) => {
      const y = doc.y;

      // Priority indicator
      let priorityColor;
      if (insight.priority === "HIGH") {
        priorityColor = "#E74C3C";
      } else if (insight.priority === "MEDIUM") {
        priorityColor = "#F39C12";
      } else {
        priorityColor = "#3498DB";
      }

      doc.rect(50, y, 10, 10).fillColor(priorityColor).fill();

      // Insight text
      doc
        .fontSize(11)
        .fillColor(this.CHART_COLORS.dark)
        .font("Helvetica-Bold")
        .text(`${index + 1}. ${insight.title}`, 70, y - 2);

      // Type and priority
      doc
        .fontSize(9)
        .fillColor(priorityColor)
        .text(`[${insight.type} - ${insight.priority} Priority]`, 70, doc.y);

      // Description
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor("#666666")
        .text(insight.description, 70, doc.y, { width: 400 });

      // Recommendation
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor(this.CHART_COLORS.primary)
        .font("Helvetica-Bold")
        .text(`Recommendation: ${insight.action}`, { indent: 20 });

      // Impact
      doc.moveDown(0.2);
      let impactColor = "#333333";
      if (insight.impact === "Critical" || insight.impact === "High") {
        impactColor = "#E74C3C";
      } else if (insight.impact === "Positive") {
        impactColor = "#27AE60";
      }

      doc
        .fontSize(9)
        .fillColor(impactColor)
        .text(`Impact: ${insight.impact}`, { indent: 20 });

      doc.moveDown(1);
    });

    // Financial Health Guidelines
    doc.moveDown(1);
    doc
      .fontSize(12)
      .fillColor(this.CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text("FINANCIAL HEALTH GUIDELINES:", { underline: true });

    doc.moveDown(0.5);

    const guidelines = [
      {
        score: "80-100",
        level: "EXCELLENT",
        description: "Strong financial performance, consider expansion",
      },
      {
        score: "60-79",
        level: "GOOD",
        description: "Healthy performance, maintain current strategy",
      },
      {
        score: "40-59",
        level: "AVERAGE",
        description: "Room for improvement, monitor closely",
      },
      {
        score: "20-39",
        level: "POOR",
        description: "Requires immediate attention and corrective actions",
      },
      {
        score: "0-19",
        level: "CRITICAL",
        description: "Urgent intervention required",
      },
    ];

    guidelines.forEach((guideline) => {
      doc
        .fontSize(9)
        .fillColor("#333333")
        .text(
          `• ${guideline.score}: ${guideline.level} - ${guideline.description}`,
          {
            indent: 20,
          }
        );
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
            `Profit & Loss Report | Generated: ${new Date().toLocaleDateString()} | InventoryPro Financial v2.0 | Report Type: ${data.metadata.report_type} | Confidential`,
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
   * Get export history using TypeORM
   */
  async getExportHistory() {
    try {
      // Check if table exists
      const tableCheck = await AppDataSource.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='profit_loss_export_history'"
      );

      if (!tableCheck || tableCheck.length === 0) {
        // Create table if it doesn't exist
        await AppDataSource.query(`
          CREATE TABLE IF NOT EXISTS profit_loss_export_history (
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
        "SELECT * FROM profit_loss_export_history WHERE filename LIKE '%profit_loss%' OR filename LIKE '%ProfitLoss%' ORDER BY generated_at DESC LIMIT 50"
      );

      // Parse filters_json
      const parsedHistory = history.map((/** @type {{ filters_json: string; }} */ item) => ({
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
   * Save export history using TypeORM
   * @param {{ filename: any; format: any; record_count: any; generated_at: any; file_size: any; filters: any; }} exportData
   */
  async _saveExportHistory(exportData) {
    try {
      await AppDataSource.query(
        `INSERT INTO profit_loss_export_history 
         (filename, format, record_count, generated_at, file_size, filters_json) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          exportData.filename,
          exportData.format,
          exportData.record_count,
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

  // ==================== HELPER METHODS ====================

  /**
   * Get performance status based on value
   * @param {number} value
   * @param {number} threshold
   * @param {string} type
   */
  _getPerformanceStatus(value, threshold, type) {
    if (type === "profit" || type === "revenue") {
      if (value > threshold * 2) return "Excellent";
      if (value > threshold) return "Good";
      if (value === threshold) return "Break-even";
      return "Poor";
    } else if (type === "margin") {
      if (value > 20) return "Excellent";
      if (value > 10) return "Good";
      if (value > 5) return "Fair";
      return "Poor";
    } else if (type === "growth") {
      if (value > 15) return "Strong";
      if (value > 5) return "Moderate";
      if (value >= 0) return "Stable";
      return "Declining";
    }
    return "Normal";
  }

  /**
   * Get impact level based on score
   * @param {number} score
   */
  _getImpactLevel(score) {
    if (score >= 80) return "Low";
    if (score >= 60) return "Medium";
    if (score >= 40) return "High";
    return "Critical";
  }

  /**
   * Get overall status
   * @param {{ financial_health_level: any; netProfit: number; profitMargin: number; growthRate: number; }} summary
   */
  _getOverallStatus(summary) {
    if (
      summary.financial_health_level === "Excellent" ||
      summary.financial_health_level === "Good"
    ) {
      return "Healthy";
    } else if (
      summary.netProfit > 0 &&
      summary.profitMargin > 10 &&
      summary.growthRate > 0
    ) {
      return "Stable";
    } else if (summary.netProfit < 0 || summary.profitMargin < 5) {
      return "Requires Attention";
    }
    return "Review Needed";
  }

  /**
   * Get trend icon based on comparison with previous period
   * @param {number} index
   * @param {any[]} data
   */
  _getTrendIcon(index, data) {
    if (index === 0) return "➖";

    const current = data[index];
    const previous = data[index - 1];

    if (current.netProfit > previous.netProfit * 1.1) return "↗️";
    if (current.netProfit < previous.netProfit * 0.9) return "↘️";
    return "➡️";
  }

  /**
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
        description: "Professional report with financial analysis and insights",
        icon: "📋",
      },
    ];
  }
}

// Create and export handler instance
const profitLossExportHandler = new ProfitLossExportHandler();

// Register IPC handler if in Electron environment
if (ipcMain) {
  ipcMain.handle("profitLossExport", async (event, payload) => {
    return await profitLossExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment"
  );
}

// Export for use in other modules
module.exports = { ProfitLossExportHandler, profitLossExportHandler };