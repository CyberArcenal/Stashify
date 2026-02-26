import { dialogs } from "../../utils/dialogs";
import { fileHandler } from "./fileHandler";
import type { ExportResult } from "./product";

export interface SalesByPeriod {
  month: string;
  sales: number;
  profit: number;
  orders: number;
}

export interface TopProduct {
  name: string;
  value: number; // Number of orders containing this product
  revenue: number;
  units: number;
  profit: number;
  profitMargin: number;
  category: string;
}

export interface SalesTrend {
  month: string;
  sales: number;
  target: number;
}

export interface SalesByCategory {
  category: string;
  sales: number;
  percentage: number;
}

export interface QuickStats {
  totalSales: number;
  totalProfit: number;
  totalOrders: number;
  averageOrderValue: number;
  salesGrowthRate: number;
  ordersGrowthRate: number;
}

export interface PerformanceMetrics {
  averageOrderValue: number;
  conversionRate: number;
  customerSatisfaction: number;
  customerLifetimeValue: number;
  repeatCustomerRate: number;
}

export interface SalesExportData {
  salesByMonth: SalesByPeriod[];
  topProducts: TopProduct[];
  salesTrend: SalesTrend[];
  salesByCategory: SalesByCategory[];
  quickStats: QuickStats;
  performanceMetrics: PerformanceMetrics;
  dateRange: {
    startDate: string;
    endDate: string;
    period: string;
  };
}

export interface SalesExportParams {
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
    | "2years"
    | "custom";
  group_by?: "day" | "week" | "month";
  category?: string;
  productId?: string;
}

export interface SalesExportResponse {
  status: boolean;
  message: string;
  data: SalesExportData;
  metadata: {
    generated_at: string;
    total_records: number;
    filters: {
      period?: string;
      group_by?: string;
      category?: string;
      productId?: string;
    };
  };
}

export interface SalesInsight {
  priority: "HIGH" | "MEDIUM" | "LOW";
  finding: string;
  recommendation: string;
  impact_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category:
    | "REVENUE"
    | "PROFIT"
    | "GROWTH"
    | "CONVERSION"
    | "CUSTOMER"
    | "PRODUCT";
}

class SalesExportAPI {
  /**
   * Export sales data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportSales(params: SalesExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI?.salesExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `Sales report exported successfully in ${params.format?.toUpperCase()} format.\n\n` +
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
                "You can find it in your stashly folder inside Downloads.",
              "File Export Complete",
            );
          }
        }

        // Return the file information for UI display
        return fileInfo;
      }

      throw new Error(response.message || "Failed to export sales data");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export sales data. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export sales data");
    }
  }
  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<SalesExportParams, "format">,
  ): Promise<SalesExportData> {
    try {
      if (!window.backendAPI || !window.backendAPI.salesExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesExport({
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
      { value: "2years", label: "Last 24 Months" },
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
      if (!window.backendAPI || !window.backendAPI.salesExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesExport({
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
   * Generate sales insights from data
   */
  generateSalesInsights(data: SalesExportData): SalesInsight[] {
    const insights: SalesInsight[] = [];
    const quickStats = data.quickStats;
    const performance = data.performanceMetrics;

    // Sales growth insight
    if (quickStats.salesGrowthRate < 0) {
      insights.push({
        priority: "HIGH",
        finding: `Negative sales growth of ${quickStats.salesGrowthRate}%`,
        recommendation:
          "Review marketing strategies and promotional activities",
        impact_level: "CRITICAL",
        category: "GROWTH",
      });
    } else if (quickStats.salesGrowthRate > 20) {
      insights.push({
        priority: "LOW",
        finding: `Strong sales growth of ${quickStats.salesGrowthRate}%`,
        recommendation:
          "Scale successful strategies and consider inventory expansion",
        impact_level: "HIGH",
        category: "GROWTH",
      });
    }

    // Profit margin insight
    const profitMargin = (quickStats.totalProfit / quickStats.totalSales) * 100;
    if (profitMargin < 15) {
      insights.push({
        priority: "HIGH",
        finding: `Low profit margin of ${profitMargin.toFixed(1)}%`,
        recommendation:
          "Review product pricing and cost optimization strategies",
        impact_level: "HIGH",
        category: "PROFIT",
      });
    }

    // Conversion rate insight
    if (performance.conversionRate < 5) {
      insights.push({
        priority: "MEDIUM",
        finding: `Low conversion rate of ${performance.conversionRate}%`,
        recommendation: "Optimize website UX and checkout process",
        impact_level: "MEDIUM",
        category: "CONVERSION",
      });
    }

    // Customer satisfaction insight
    if (performance.customerSatisfaction < 4.0) {
      insights.push({
        priority: "MEDIUM",
        finding: `Customer satisfaction rating of ${performance.customerSatisfaction}/5.0 needs improvement`,
        recommendation:
          "Implement customer feedback system and service improvements",
        impact_level: "MEDIUM",
        category: "CUSTOMER",
      });
    }

    // Average order value insight
    if (quickStats.averageOrderValue < 50) {
      insights.push({
        priority: "MEDIUM",
        finding: `Low average order value of ${this.formatCurrency(quickStats.averageOrderValue)}`,
        recommendation: "Implement upselling and cross-selling strategies",
        impact_level: "MEDIUM",
        category: "REVENUE",
      });
    }

    // Top product performance insight
    if (data.topProducts.length > 0) {
      const topProduct = data.topProducts[0];
      if (topProduct.profitMargin > 30) {
        insights.push({
          priority: "LOW",
          finding: `High-performing product "${topProduct.name}" with ${topProduct.profitMargin}% margin`,
          recommendation:
            "Increase promotion and inventory for high-margin products",
          impact_level: "MEDIUM",
          category: "PRODUCT",
        });
      }
    }

    // Category concentration insight
    if (data.salesByCategory.length > 0) {
      const topCategory = data.salesByCategory[0];
      if (topCategory.percentage > 40) {
        insights.push({
          priority: "LOW",
          finding: `High sales concentration in "${topCategory.category}" (${topCategory.percentage}%)`,
          recommendation: "Diversify product offerings across categories",
          impact_level: "MEDIUM",
          category: "REVENUE",
        });
      }
    }

    // Default recommendation if no issues found
    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "Sales performance appears healthy across all metrics",
        recommendation:
          "Continue current strategies and monitor key performance indicators",
        impact_level: "LOW",
        category: "REVENUE",
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate sales performance score (0-100)
   */
  calculateSalesPerformanceScore(data: SalesExportData): number {
    let score = 100;
    const quickStats = data.quickStats;
    const performance = data.performanceMetrics;

    // Deduct for negative growth
    if (quickStats.salesGrowthRate < 0) {
      score -= 30;
    } else if (quickStats.salesGrowthRate < 5) {
      score -= 15;
    }

    // Deduct for low profit margin
    const profitMargin = (quickStats.totalProfit / quickStats.totalSales) * 100;
    if (profitMargin < 10) {
      score -= 20;
    } else if (profitMargin < 15) {
      score -= 10;
    }

    // Deduct for low conversion rate
    if (performance.conversionRate < 5) {
      score -= 15;
    } else if (performance.conversionRate < 8) {
      score -= 8;
    }

    // Deduct for low customer satisfaction
    if (performance.customerSatisfaction < 4.0) {
      score -= 10;
    } else if (performance.customerSatisfaction < 4.3) {
      score -= 5;
    }

    // Deduct for low average order value
    if (quickStats.averageOrderValue < 50) {
      score -= 10;
    } else if (quickStats.averageOrderValue < 75) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get sales performance level
   */
  getSalesPerformanceLevel(
    score: number,
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 85) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "FAIR";
    return "POOR";
  }

  /**
   * Calculate trend analysis
   */
  getTrendAnalysis(data: SalesExportData): {
    salesTrend: "UP" | "DOWN" | "STABLE";
    profitTrend: "UP" | "DOWN" | "STABLE";
    ordersTrend: "UP" | "DOWN" | "STABLE";
    last3MonthsGrowth: number;
  } {
    const monthlyData = data.salesByMonth;
    if (monthlyData.length < 2) {
      return {
        salesTrend: "STABLE",
        profitTrend: "STABLE",
        ordersTrend: "STABLE",
        last3MonthsGrowth: 0,
      };
    }

    // Analyze last 3 months vs previous 3 months
    const recentMonths = monthlyData.slice(-3);
    const previousMonths = monthlyData.slice(-6, -3);

    const recentSales = recentMonths.reduce((sum, item) => sum + item.sales, 0);
    const previousSales = previousMonths.reduce(
      (sum, item) => sum + item.sales,
      0,
    );
    const recentProfit = recentMonths.reduce(
      (sum, item) => sum + item.profit,
      0,
    );
    const previousProfit = previousMonths.reduce(
      (sum, item) => sum + item.profit,
      0,
    );
    const recentOrders = recentMonths.reduce(
      (sum, item) => sum + item.orders,
      0,
    );
    const previousOrders = previousMonths.reduce(
      (sum, item) => sum + item.orders,
      0,
    );

    const salesTrend =
      recentSales > previousSales * 1.05
        ? "UP"
        : recentSales < previousSales * 0.95
          ? "DOWN"
          : "STABLE";
    const profitTrend =
      recentProfit > previousProfit * 1.05
        ? "UP"
        : recentProfit < previousProfit * 0.95
          ? "DOWN"
          : "STABLE";
    const ordersTrend =
      recentOrders > previousOrders * 1.05
        ? "UP"
        : recentOrders < previousOrders * 0.95
          ? "DOWN"
          : "STABLE";

    const last3MonthsGrowth =
      previousSales > 0
        ? ((recentSales - previousSales) / previousSales) * 100
        : 0;

    return {
      salesTrend,
      profitTrend,
      ordersTrend,
      last3MonthsGrowth,
    };
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: SalesExportParams): string[] {
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
      if (!window.backendAPI || !window.backendAPI.salesExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesExport({
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
    filters: Omit<SalesExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.salesExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesExport({
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
      if (!window.backendAPI || !window.backendAPI.salesExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesExport({
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
   * Get export templates
   */
  async getExportTemplates(): Promise<
    Array<{
      id: number;
      name: string;
      description: string;
      filters: Omit<SalesExportParams, "format">;
      created_by: string;
      created_at: string;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.salesExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesExport({
        method: "exportTemplates",
        params: {},
      });

      if (response.status) {
        return response.data;
      }
      throw new Error(response.message || "Failed to fetch export templates");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch export templates");
    }
  }

  /**
   * Save export template
   */
  async saveExportTemplate(template: {
    name: string;
    description: string;
    filters: Omit<SalesExportParams, "format">;
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.salesExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesExport({
        method: "saveExportTemplate",
        params: template,
      });

      if (response.status) {
        return {
          id: response.data.id,
          message: response.message || "Template saved successfully",
        };
      }
      throw new Error(response.message || "Failed to save template");
    } catch (error: any) {
      throw new Error(error.message || "Failed to save template");
    }
  }

  /**
   * Calculate key sales metrics
   */
  calculateSalesMetrics(data: SalesExportData): {
    grossProfitMargin: number;
    netProfitMargin: number;
    salesGrowthRate: number;
    customerAcquisitionCost: number; // Simplified
    customerLifetimeValue: number;
    repeatPurchaseRate: number;
  } {
    const quickStats = data.quickStats;
    const performance = data.performanceMetrics;

    const grossProfitMargin =
      quickStats.totalSales > 0
        ? (quickStats.totalProfit / quickStats.totalSales) * 100
        : 0;
    const netProfitMargin =
      quickStats.totalSales > 0
        ? (quickStats.totalProfit / quickStats.totalSales) * 100
        : 0; // Simplified
    const salesGrowthRate = quickStats.salesGrowthRate;

    // Simplified calculations - in real scenario, use actual marketing spend
    const customerAcquisitionCost =
      quickStats.totalSales > 0
        ? (quickStats.totalSales * 0.1) / quickStats.totalOrders
        : 0;
    const customerLifetimeValue = performance.customerLifetimeValue;
    const repeatPurchaseRate = performance.repeatCustomerRate;

    return {
      grossProfitMargin,
      netProfitMargin,
      salesGrowthRate,
      customerAcquisitionCost,
      customerLifetimeValue,
      repeatPurchaseRate,
    };
  }

  /**
   * Get performance rating
   */
  getPerformanceRating(
    value: number,
    metric: "sales" | "profit" | "conversion" | "satisfaction" | "growth",
  ): string {
    switch (metric) {
      case "sales":
        return value > 0 ? "🟢 Good" : "🔴 Poor";
      case "profit":
        return value > 0 ? "🟢 Good" : "🔴 Poor";
      case "conversion":
        if (value > 15) return "🟢 Excellent";
        if (value > 8) return "🟡 Good";
        if (value > 3) return "🟡 Fair";
        return "🔴 Poor";
      case "satisfaction":
        if (value > 4.5) return "🟢 Excellent";
        if (value > 4.0) return "🟡 Good";
        if (value > 3.5) return "🟡 Fair";
        return "🔴 Poor";
      case "growth":
        if (value > 15) return "🟢 Excellent";
        if (value > 5) return "🟡 Good";
        if (value > 0) return "🟡 Fair";
        return "🔴 Poor";
      default:
        return "⚪ Unknown";
    }
  }

  /**
   * Format sales data for display
   */
  formatSalesDisplay(item: SalesByPeriod): string {
    return `${item.month}: $${this.formatNumber(item.sales)} Sales, ${item.orders} Orders`;
  }

  /**
   * Get growth status color
   */
  getGrowthStatusColor(growthRate: number): string {
    if (growthRate > 10) return "green";
    if (growthRate > 0) return "orange";
    return "red";
  }

  /**
   * Get growth status text
   */
  getGrowthStatus(growthRate: number): string {
    if (growthRate > 10) return "Strong Growth";
    if (growthRate > 0) return "Moderate Growth";
    if (growthRate === 0) return "Stable";
    return "Declining";
  }

  /**
   * Get profit margin level
   */
  getProfitMarginLevel(margin: number): string {
    if (margin > 25) return "Excellent";
    if (margin > 15) return "Good";
    if (margin > 5) return "Fair";
    return "Poor";
  }

  /**
   * Get profit margin color
   */
  getProfitMarginColor(margin: number): string {
    if (margin > 25) return "green";
    if (margin > 15) return "blue";
    if (margin > 5) return "orange";
    return "red";
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
    }).format(value / 100);
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
   * Calculate target achievement
   */
  calculateTargetAchievement(
    actual: number,
    target: number,
  ): {
    achievement: number;
    status: "EXCEEDED" | "ACHIEVED" | "BELOW";
  } {
    const achievement = (actual / target) * 100;
    const status =
      achievement > 100 ? "EXCEEDED" : achievement >= 95 ? "ACHIEVED" : "BELOW";

    return {
      achievement,
      status,
    };
  }

  /**
   * Get category performance insights
   */
  getCategoryPerformanceInsights(categories: SalesByCategory[]): Array<{
    category: string;
    performance: "HIGH" | "MEDIUM" | "LOW";
    insight: string;
  }> {
    if (!categories.length) return [];

    const averagePercentage =
      categories.reduce((sum, cat) => sum + cat.percentage, 0) /
      categories.length;

    return categories.map((category) => {
      let performance: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
      let insight = "";

      if (category.percentage > averagePercentage * 1.5) {
        performance = "HIGH";
        insight = "Top performing category - consider expanding";
      } else if (category.percentage < averagePercentage * 0.5) {
        performance = "LOW";
        insight = "Underperforming category - review strategy";
      } else {
        performance = "MEDIUM";
        insight = "Stable performance - maintain current approach";
      }

      return {
        category: category.category,
        performance,
        insight,
      };
    });
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

export const salesExportAPI = new SalesExportAPI();
