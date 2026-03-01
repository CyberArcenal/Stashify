// src/lib/profitLossExportApi.ts - Profit & Loss Export API Interfaces

import { dialogs } from "../../utils/dialogs";
import { fileHandler } from "./fileHandler";
import type { ExportResult } from "./product";

export interface ProfitLossMonthlyData {
  month: string;
  revenue: number;
  costOfGoodsSold: number;
  operatingExpenses: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

export interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface ProfitLossTrend {
  month: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface ProfitLossSummary {
  totalRevenue: number;
  totalCostOfGoodsSold: number;
  totalOperatingExpenses: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  growthRate: number;
}

export interface PerformanceMetrics {
  bestMonth: string;
  worstMonth: string;
  highestMargin: number;
  lowestMargin: number;
  averageMargin: number;
}

export interface ProfitLossExportData {
  profitLossByMonth: ProfitLossMonthlyData[];
  expenseBreakdown: ExpenseBreakdown[];
  profitLossTrend: ProfitLossTrend[];
  summary: ProfitLossSummary;
  performanceMetrics: PerformanceMetrics;
  dateRange: {
    startDate: string;
    endDate: string;
    period: string;
  };
}

export interface ProfitLossExportParams {
  format?: "csv" | "excel" | "pdf";
  start_date?: string;
  end_date?: string;
  period?:
    | "1week"
    | "2weeks"
    | "1month"
    | "3months"
    | "6months"
    | "1year"
    | "custom";
  group_by?: "day" | "week" | "month";
  category?: string;
}

export interface ProfitLossExportResponse {
  status: boolean;
  message: string;
  data: ProfitLossExportData;
  metadata: {
    generated_at: string;
    total_records: number;
    filters: {
      period?: string;
      group_by?: string;
      category?: string;
    };
  };
}

export interface FinancialInsight {
  priority: "HIGH" | "MEDIUM" | "LOW";
  finding: string;
  recommendation: string;
  impact_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: "REVENUE" | "PROFIT" | "EXPENSE" | "MARGIN" | "GROWTH";
}

class ProfitLossExportAPI {
  /**
   * Export profit loss data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportProfitLoss(
    params: ProfitLossExportParams,
  ): Promise<ExportResult> {
    try {
      if (!window.backendAPI?.profitLossExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.profitLossExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `Profit & Loss report exported successfully in ${params.format?.toUpperCase()} format.\n\n` +
            `File: ${fileInfo.filename}\nLocation: ${fileInfo.fullPath}\n\n` +
            `Do you want to open the file now?`,
          confirmText: "Open File",
          cancelText: "Later",
          icon: "success",
          showCloseButton: true,
        });

        if (shouldOpen) {
          try {
            await fileHandler.openExportedFile(fileInfo.fullPath);
          } catch (openError) {
            console.error("Failed to open file:", openError);
            await dialogs.error(
              "The file was exported successfully but could not be opened automatically.\n" +
                "You can find it in your Stashify folder inside Downloads.",
              "File Export Complete",
            );
          }
        }

        // Return the file information for UI display
        return fileInfo;
      }

      throw new Error(response.message || "Failed to export profit loss data");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export profit loss data. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export profit loss data");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<ProfitLossExportParams, "format">,
  ): Promise<ProfitLossExportData> {
    try {
      if (!window.backendAPI || !window.backendAPI.profitLossExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.profitLossExport({
        method: "exportPreview",
        params,
      });

      if (response.status) {
        return response.data;
      }
      throw new Error(response.message || "Failed to get export preview");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get export preview");
    }
  }

  /**
   * Get available export formats
   */
  getSupportedFormats(): Array<{
    value: string;
    label: string;
    description: string;
  }> {
    return [
      {
        value: "csv",
        label: "CSV",
        description: "Comma-separated values for spreadsheet applications",
      },
      {
        value: "excel",
        label: "Excel",
        description:
          "Microsoft Excel format with multiple sheets and formatting",
      },
      {
        value: "pdf",
        label: "PDF",
        description: "Portable Document Format for printing and sharing",
      },
    ];
  }

  /**
   * Get period filter options
   */
  getPeriodOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "1week", label: "Last 7 Days" },
      { value: "2weeks", label: "Last 14 Days" },
      { value: "1month", label: "Last 30 Days" },
      { value: "3months", label: "Last 3 Months" },
      { value: "6months", label: "Last 6 Months" },
      { value: "1year", label: "Last 12 Months" },
      { value: "custom", label: "Custom Range" },
    ];
  }

  /**
   * Get group by options
   */
  getGroupByOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "day", label: "Daily" },
      { value: "week", label: "Weekly" },
      { value: "month", label: "Monthly" },
    ];
  }

  /**
   * Get category filter options
   */
  async getCategoryOptions(): Promise<Array<{ value: string; label: string }>> {
    try {
      if (!window.backendAPI || !window.backendAPI.profitLossExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.profitLossExport({
        method: "categoryOptions",
        params: {},
      });

      if (response.status) {
        return response.data;
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Generate financial insights from profit loss data
   */
  generateFinancialInsights(data: ProfitLossExportData): FinancialInsight[] {
    const insights: FinancialInsight[] = [];
    const summary = data.summary;
    const metrics = data.performanceMetrics;

    // Net profit insight
    if (summary.netProfit < 0) {
      insights.push({
        priority: "HIGH",
        finding: "Business is operating at a loss",
        recommendation:
          "Immediate cost reduction and revenue optimization required",
        impact_level: "CRITICAL",
        category: "PROFIT",
      });
    } else if (summary.netProfit < summary.totalRevenue * 0.05) {
      insights.push({
        priority: "MEDIUM",
        finding: "Low net profit margin",
        recommendation:
          "Review expense structure and consider price adjustments",
        impact_level: "HIGH",
        category: "PROFIT",
      });
    }

    // Revenue growth insight
    if (summary.growthRate < 0) {
      insights.push({
        priority: "HIGH",
        finding: "Revenue is declining",
        recommendation: "Review sales strategy and market position",
        impact_level: "HIGH",
        category: "REVENUE",
      });
    } else if (summary.growthRate > 20) {
      insights.push({
        priority: "LOW",
        finding: "Strong revenue growth",
        recommendation: "Consider scaling operations and investing in growth",
        impact_level: "MEDIUM",
        category: "REVENUE",
      });
    }

    // Profit margin insight
    if (summary.profitMargin < 5) {
      insights.push({
        priority: "MEDIUM",
        finding: `Low profit margin (${summary.profitMargin.toFixed(1)}%)`,
        recommendation: "Optimize pricing strategy and control costs",
        impact_level: "HIGH",
        category: "MARGIN",
      });
    } else if (summary.profitMargin > 20) {
      insights.push({
        priority: "LOW",
        finding: `Excellent profit margin (${summary.profitMargin.toFixed(1)}%)`,
        recommendation: "Maintain current business model and explore expansion",
        impact_level: "LOW",
        category: "MARGIN",
      });
    }

    // Expense ratio insight
    const expenseRatio = summary.totalExpenses / summary.totalRevenue;
    if (expenseRatio > 0.9) {
      insights.push({
        priority: "HIGH",
        finding: `High expense ratio (${(expenseRatio * 100).toFixed(1)}% of revenue)`,
        recommendation: "Implement cost control measures and expense review",
        impact_level: "HIGH",
        category: "EXPENSE",
      });
    }

    // Monthly performance volatility insight
    const monthlyProfits = data.profitLossByMonth.map((item) => item.netProfit);
    const profitVolatility = this.calculateVolatility(monthlyProfits);
    if (profitVolatility > 0.3) {
      insights.push({
        priority: "MEDIUM",
        finding: "High profit volatility across periods",
        recommendation:
          "Stabilize revenue streams and manage seasonal variations",
        impact_level: "MEDIUM",
        category: "PROFIT",
      });
    }

    // Gross profit margin insight
    const grossProfitMargin = summary.grossProfit / summary.totalRevenue;
    if (grossProfitMargin < 0.3) {
      insights.push({
        priority: "MEDIUM",
        finding: `Low gross profit margin (${(grossProfitMargin * 100).toFixed(1)}%)`,
        recommendation: "Review product pricing and supplier costs",
        impact_level: "MEDIUM",
        category: "MARGIN",
      });
    }

    // Default recommendation if no issues found
    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "Financial performance appears healthy and stable",
        recommendation:
          "Continue current business strategies and monitor key metrics",
        impact_level: "LOW",
        category: "PROFIT",
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate financial health score (0-100)
   */
  calculateFinancialHealthScore(data: ProfitLossExportData): number {
    let score = 100;
    const summary = data.summary;

    // Deduct for negative net profit
    if (summary.netProfit < 0) {
      score -= 40;
    } else if (summary.netProfit < summary.totalRevenue * 0.05) {
      score -= 20;
    }

    // Deduct for negative growth
    if (summary.growthRate < 0) {
      score -= 20;
    } else if (summary.growthRate < 5) {
      score -= 10;
    }

    // Deduct for low profit margin
    if (summary.profitMargin < 5) {
      score -= 15;
    } else if (summary.profitMargin < 10) {
      score -= 8;
    }

    // Deduct for high expense ratio
    const expenseRatio = summary.totalExpenses / summary.totalRevenue;
    if (expenseRatio > 0.9) {
      score -= 15;
    } else if (expenseRatio > 0.8) {
      score -= 8;
    }

    // Deduct for profit volatility
    const monthlyProfits = data.profitLossByMonth.map((item) => item.netProfit);
    const profitVolatility = this.calculateVolatility(monthlyProfits);
    if (profitVolatility > 0.4) {
      score -= 10;
    } else if (profitVolatility > 0.2) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get financial health level
   */
  getFinancialHealthLevel(
    score: number,
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 85) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "FAIR";
    return "POOR";
  }

  /**
   * Calculate volatility (coefficient of variation)
   */
  private calculateVolatility(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    return mean !== 0 ? stdDev / Math.abs(mean) : 0;
  }

  /**
   * Format financial data for display
   */
  formatFinancialDisplay(item: ProfitLossMonthlyData): string {
    return `${item.month}: $${this.formatNumber(item.revenue)} Revenue, $${this.formatNumber(item.netProfit)} Net Profit`;
  }

  /**
   * Get profit status color
   */
  getProfitStatusColor(netProfit: number): string {
    if (netProfit < 0) return "red";
    if (netProfit === 0) return "orange";
    return "green";
  }

  /**
   * Get profit status text
   */
  getProfitStatus(netProfit: number): string {
    if (netProfit < 0) return "Loss";
    if (netProfit === 0) return "Break-even";
    return "Profit";
  }

  /**
   * Get margin level color
   */
  getMarginLevelColor(margin: number): string {
    if (margin < 0) return "red";
    if (margin < 5) return "orange";
    if (margin < 15) return "yellow";
    return "green";
  }

  /**
   * Get margin level text
   */
  getMarginLevel(margin: number): string {
    if (margin < 0) return "Negative";
    if (margin < 5) return "Low";
    if (margin < 15) return "Moderate";
    if (margin < 25) return "Good";
    return "Excellent";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: ProfitLossExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.period === "custom" &&
      (!params.start_date || !params.end_date)
    ) {
      errors.push("Custom period requires both start and end dates");
    }

    if (
      params.start_date &&
      params.end_date &&
      params.start_date > params.end_date
    ) {
      errors.push("Start date cannot be after end date");
    }

    if (
      params.group_by &&
      !["day", "week", "month"].includes(params.group_by)
    ) {
      errors.push("Invalid group by option");
    }

    return errors;
  }

  /**
   * Get export history
   */
  async getExportHistory(): Promise<
    Array<{
      id: number;
      filename: string;
      format: string;
      record_count: number;
      generated_at: string;
      generated_by: string;
      file_size: string;
      filters: any;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.profitLossExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.profitLossExport({
        method: "exportHistory",
        params: {},
      });

      if (response.status) {
        return response.data;
      }
      throw new Error(response.message || "Failed to fetch export history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch export history");
    }
  }

  /**
   * Schedule recurring export
   */
  async scheduleExport(schedule: {
    frequency: "daily" | "weekly" | "monthly";
    time: string;
    format: string;
    filters: Omit<ProfitLossExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.profitLossExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.profitLossExport({
        method: "scheduleExport",
        params: schedule,
      });

      if (response.status) {
        return {
          id: response.data.id,
          message: response.message || "Export scheduled successfully",
        };
      }
      throw new Error(response.message || "Failed to schedule export");
    } catch (error: any) {
      throw new Error(error.message || "Failed to schedule export");
    }
  }

  /**
   * Cancel scheduled export
   */
  async cancelScheduledExport(scheduleId: number): Promise<void> {
    try {
      if (!window.backendAPI || !window.backendAPI.profitLossExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.profitLossExport({
        method: "cancelScheduledExport",
        params: { scheduleId },
      });

      if (response.status) {
        return;
      }
      throw new Error(response.message || "Failed to cancel scheduled export");
    } catch (error: any) {
      throw new Error(error.message || "Failed to cancel scheduled export");
    }
  }

  /**
   * Calculate key financial ratios
   */
  calculateFinancialRatios(data: ProfitLossExportData): {
    grossProfitMargin: number;
    netProfitMargin: number;
    expenseRatio: number;
    operatingRatio: number;
    growthRate: number;
    returnOnRevenue: number;
  } {
    const summary = data.summary;

    const grossProfitMargin =
      summary.totalRevenue > 0 ? summary.grossProfit / summary.totalRevenue : 0;
    const netProfitMargin =
      summary.totalRevenue > 0 ? summary.netProfit / summary.totalRevenue : 0;
    const expenseRatio =
      summary.totalRevenue > 0
        ? summary.totalExpenses / summary.totalRevenue
        : 0;
    const operatingRatio =
      summary.totalRevenue > 0
        ? (summary.totalCostOfGoodsSold + summary.totalOperatingExpenses) /
          summary.totalRevenue
        : 0;
    const returnOnRevenue =
      summary.totalRevenue > 0 ? summary.netProfit / summary.totalRevenue : 0;

    return {
      grossProfitMargin,
      netProfitMargin,
      expenseRatio,
      operatingRatio,
      growthRate: summary.growthRate / 100, // Convert from percentage
      returnOnRevenue,
    };
  }

  /**
   * Get trend analysis
   */
  getTrendAnalysis(data: ProfitLossExportData): {
    revenueTrend: "UP" | "DOWN" | "STABLE";
    profitTrend: "UP" | "DOWN" | "STABLE";
    marginTrend: "UP" | "DOWN" | "STABLE";
    last3MonthsGrowth: number;
  } {
    const monthlyData = data.profitLossByMonth;
    if (monthlyData.length < 2) {
      return {
        revenueTrend: "STABLE",
        profitTrend: "STABLE",
        marginTrend: "STABLE",
        last3MonthsGrowth: 0,
      };
    }

    // Analyze last 3 months vs previous 3 months
    const recentMonths = monthlyData.slice(-3);
    const previousMonths = monthlyData.slice(-6, -3);

    const recentRevenue = recentMonths.reduce(
      (sum, item) => sum + item.revenue,
      0,
    );
    const previousRevenue = previousMonths.reduce(
      (sum, item) => sum + item.revenue,
      0,
    );
    const recentProfit = recentMonths.reduce(
      (sum, item) => sum + item.netProfit,
      0,
    );
    const previousProfit = previousMonths.reduce(
      (sum, item) => sum + item.netProfit,
      0,
    );
    const recentMargin =
      recentMonths.reduce((sum, item) => sum + item.profitMargin, 0) /
      recentMonths.length;
    const previousMargin =
      previousMonths.reduce((sum, item) => sum + item.profitMargin, 0) /
      previousMonths.length;

    const revenueTrend =
      recentRevenue > previousRevenue * 1.05
        ? "UP"
        : recentRevenue < previousRevenue * 0.95
          ? "DOWN"
          : "STABLE";
    const profitTrend =
      recentProfit > previousProfit * 1.05
        ? "UP"
        : recentProfit < previousProfit * 0.95
          ? "DOWN"
          : "STABLE";
    const marginTrend =
      recentMargin > previousMargin + 1
        ? "UP"
        : recentMargin < previousMargin - 1
          ? "DOWN"
          : "STABLE";

    const last3MonthsGrowth =
      previousRevenue > 0
        ? ((recentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    return {
      revenueTrend,
      profitTrend,
      marginTrend,
      last3MonthsGrowth,
    };
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  /**
   * Format percentage for display
   */
  formatPercentage(value: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100); // Convert from percentage points to decimal
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  /**
   * Format number with commas
   */
  formatNumber(number: number): string {
    return new Intl.NumberFormat("en-US").format(Math.round(number));
  }

  /**
   * Get performance rating
   */
  getPerformanceRating(
    metric: number,
    type: "revenue" | "profit" | "margin" | "growth",
  ): string {
    switch (type) {
      case "revenue":
        return metric > 0 ? "🟢 Good" : "🔴 Poor";
      case "profit":
        return metric > 0 ? "🟢 Good" : "🔴 Poor";
      case "margin":
        if (metric > 20) return "🟢 Excellent";
        if (metric > 10) return "🟡 Good";
        if (metric > 0) return "🟡 Fair";
        return "🔴 Poor";
      case "growth":
        if (metric > 15) return "🟢 Excellent";
        if (metric > 5) return "🟡 Good";
        if (metric > 0) return "🟡 Fair";
        return "🔴 Poor";
      default:
        return "⚪ Unknown";
    }
  }

  // PRIVATE HELPER METHODS

  private _getMimeType(format: string): string {
    const mimeTypes: { [key: string]: string } = {
      csv: "text/csv",
      excel:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pdf: "application/pdf",
    };
    return mimeTypes[format] || "application/octet-stream";
  }

  private _formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

export const profitLossExportAPI = new ProfitLossExportAPI();
