// src/lib/logExportApi.ts - Inventory Log Export API Interfaces

import { dialogs } from "../../utils/dialogs";
import { fileHandler } from "./fileHandler";
import type { ExportResult } from "./product";

// Inventory Log Interfaces
export interface InventoryLogBasic {
  id: number;
  product?: number;
  variant?: number;
  action: string;
  change_amount: number;
  quantity_before: number;
  quantity_after: number;
  performed_by?: number;
  warehouse?: number;
  notes: string;
  created_at: string;
}

export interface LogExportParams {
  format?: "csv" | "excel" | "pdf";
  warehouse?: string;
  product?: string;
  action?: string;
  user?: string;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
  search?: string;
  time_range?: "24h" | "7d" | "30d" | "90d";
  change_type?: "increase" | "decrease" | "all";
}

export interface LogExportData {
  id: number;
  product_name: string;
  product_sku: string;
  action: string;
  action_code: string;
  change_amount: number;
  quantity_before: number;
  quantity_after: number;
  performed_by: string;
  warehouse: string;
  warehouse_location: string;
  notes: string;
  created_at: string;
  change_type: string;
  net_effect: number;
}

export interface LogExportAnalytics {
  total_log_entries: number;
  total_quantity_changed: number;
  action_breakdown: Array<{
    action: string;
    count: number;
    total_change: number;
    percentage: number;
  }>;
  warehouse_breakdown: Array<{
    warehouse__name: string;
    count: number;
    total_change: number;
    percentage: number;
  }>;
  user_breakdown: Array<{
    performed_by__username: string;
    count: number;
    total_change: number;
  }>;
  recent_activity: Array<{
    created_at__date: string;
    daily_count: number;
    daily_change: number;
  }>;
}

export interface LogExportResponse {
  status: boolean;
  message: string;
  data: {
    log_entries: LogExportData[];
    analytics: LogExportAnalytics;
    filters: {
      warehouse?: string;
      product?: string;
      action?: string;
      date_from?: string;
      date_to?: string;
      user?: string;
      search?: string;
    };
    metadata: {
      date_range: string;
      generated_at: string;
      total_records: number;
    };
  };
}

export interface LogBusinessInsight {
  priority: "HIGH" | "MEDIUM" | "LOW";
  finding: string;
  recommendation: string;
  impact_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

class LogExportAPI {
  /**
   * Export inventory logs data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportLogs(params: LogExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI?.inventoryLogExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryLogExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `Inventory logs exported successfully in ${params.format?.toUpperCase()} format.\n\n` +
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

      throw new Error(response.message || "Failed to export inventory logs");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export inventory logs. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export inventory logs");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<LogExportParams, "format">,
  ): Promise<LogExportResponse["data"]> {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryLogExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryLogExport({
        method: "getExportPreview",
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
   * Get action type filter options
   */
  getActionTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "order_allocation", label: "Order Allocation" },
      { value: "order_cancellation", label: "Order Cancellation" },
      { value: "order_confirmation", label: "Order Confirmation" },
      { value: "manual_adjustment", label: "Manual Adjustment" },
      { value: "return", label: "Return / Restock" },
      { value: "transfer_in", label: "Stock Transfer In" },
      { value: "transfer_out", label: "Stock Transfer Out" },
      { value: "damage", label: "Stock Damage / Write-off" },
      { value: "replenishment", label: "Stock Replenishment" },
      { value: "stock_take", label: "Stock Take" },
      { value: "purchase_receive", label: "Purchase Receive" },
    ];
  }

  /**
   * Get change type filter options
   */
  getChangeTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "increase", label: "Increase Only" },
      { value: "decrease", label: "Decrease Only" },
      { value: "all", label: "All Changes" },
    ];
  }

  /**
   * Generate business insights from analytics data
   */
  generateBusinessInsights(
    analytics: LogExportAnalytics,
  ): LogBusinessInsight[] {
    const insights: LogBusinessInsight[] = [];

    // High frequency of adjustments insight
    const adjustmentActions = [
      "manual_adjustment",
      "correction",
      "quick_increase",
      "quick_decrease",
    ];
    const adjustmentCount = analytics.action_breakdown
      .filter((breakdown) => adjustmentActions.includes(breakdown.action))
      .reduce((sum, breakdown) => sum + breakdown.count, 0);

    if (adjustmentCount > 0) {
      const adjustmentPercentage =
        (adjustmentCount / analytics.total_log_entries) * 100;
      if (adjustmentPercentage > 20) {
        insights.push({
          priority: "HIGH",
          finding: `High manual adjustment rate (${adjustmentPercentage.toFixed(1)}% of transactions)`,
          recommendation:
            "Review processes to reduce manual adjustments and improve system accuracy",
          impact_level: "HIGH",
        });
      }
    }

    // Stockout transactions insight
    const stockoutActions = ["order_cancellation", "damage", "theft"];
    const stockoutCount = analytics.action_breakdown
      .filter((breakdown) => stockoutActions.includes(breakdown.action))
      .reduce((sum, breakdown) => sum + breakdown.count, 0);

    if (stockoutCount > 0) {
      insights.push({
        priority: "MEDIUM",
        finding: `${stockoutCount} stock reduction transactions detected`,
        recommendation:
          "Analyze root causes of stock losses and implement preventive measures",
        impact_level: "MEDIUM",
      });
    }

    // User activity concentration insight
    if (analytics.user_breakdown && analytics.user_breakdown.length > 0) {
      const topUser = analytics.user_breakdown.reduce((prev, current) =>
        prev.count > current.count ? prev : current,
      );
      const concentration = topUser.count / analytics.total_log_entries;

      if (concentration > 0.5) {
        insights.push({
          priority: "LOW",
          finding: `High transaction concentration with user '${topUser.performed_by__username}' (${(concentration * 100).toFixed(1)}%)`,
          recommendation:
            "Distribute inventory management tasks across multiple team members",
          impact_level: "LOW",
        });
      }
    }

    // Default recommendation if no specific insights
    if (insights.length === 0) {
      const totalIncreases = analytics.action_breakdown
        .filter((breakdown) => breakdown.total_change > 0)
        .reduce((sum, breakdown) => sum + breakdown.total_change, 0);

      const totalDecreases = Math.abs(
        analytics.action_breakdown
          .filter((breakdown) => breakdown.total_change < 0)
          .reduce((sum, breakdown) => sum + breakdown.total_change, 0),
      );

      const netBalance = totalIncreases - totalDecreases;

      if (netBalance > 0) {
        insights.push({
          priority: "LOW",
          finding: `Positive inventory net change (+${netBalance} units)`,
          recommendation:
            "Inventory levels are growing positively, maintain current practices",
          impact_level: "LOW",
        });
      } else {
        insights.push({
          priority: "MEDIUM",
          finding: `Negative inventory net change (${netBalance} units)`,
          recommendation:
            "Monitor inventory trends and adjust procurement strategies",
          impact_level: "MEDIUM",
        });
      }
    }

    return insights;
  }

  /**
   * Calculate log activity score (0-100)
   */
  calculateActivityHealthScore(analytics: LogExportAnalytics): number {
    let score = 100;

    // High adjustment rate penalty
    const adjustmentActions = [
      "manual_adjustment",
      "correction",
      "quick_increase",
      "quick_decrease",
    ];
    const adjustmentCount = analytics.action_breakdown
      .filter((breakdown) => adjustmentActions.includes(breakdown.action))
      .reduce((sum, breakdown) => sum + breakdown.count, 0);

    const adjustmentRatio = adjustmentCount / analytics.total_log_entries;
    if (adjustmentRatio > 0.3) {
      score -= 30;
    } else if (adjustmentRatio > 0.2) {
      score -= 15;
    }

    // High negative change penalty
    const negativeChange = Math.abs(
      analytics.action_breakdown
        .filter((breakdown) => breakdown.total_change < 0)
        .reduce((sum, breakdown) => sum + breakdown.total_change, 0),
    );

    const positiveChange = analytics.action_breakdown
      .filter((breakdown) => breakdown.total_change > 0)
      .reduce((sum, breakdown) => sum + breakdown.total_change, 0);

    if (negativeChange > positiveChange * 2) {
      score -= 25;
    }

    return Math.max(0, score);
  }

  /**
   * Get activity health level
   */
  getActivityHealthLevel(
    score: number,
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 90) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "FAIR";
    return "POOR";
  }

  /**
   * Format log entry data for display
   */
  formatLogEntryDisplay(logEntry: LogExportData): string {
    return `${logEntry.product_name} - ${logEntry.action} by ${logEntry.performed_by}`;
  }

  /**
   * Get action type color
   */
  getActionTypeColor(action: string): string {
    const colors: { [key: string]: string } = {
      order_allocation: "blue",
      order_cancellation: "red",
      manual_adjustment: "orange",
      return: "green",
      transfer_in: "teal",
      transfer_out: "purple",
      damage: "red",
      replenishment: "green",
      stock_take: "blue",
      purchase_receive: "green",
    };
    return colors[action] || "gray";
  }

  /**
   * Get change type icon
   */
  getChangeTypeIcon(changeAmount: number): string {
    if (changeAmount > 0) return "⬆️";
    if (changeAmount < 0) return "⬇️";
    return "➡️";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: LogExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.action &&
      !this.getActionTypeOptions().some((opt) => opt.value === params.action)
    ) {
      errors.push("Invalid action type");
    }

    if (
      params.change_type &&
      !["increase", "decrease", "all"].includes(params.change_type)
    ) {
      errors.push("Invalid change type");
    }

    if (params.date_from && params.date_to) {
      const start = new Date(params.date_from);
      const end = new Date(params.date_to);
      if (start > end) {
        errors.push("Start date cannot be after end date");
      }
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
      if (!window.backendAPI || !window.backendAPI.inventoryLogExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryLogExport({
        method: "getExportHistory",
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
    filters: Omit<LogExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryLogExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryLogExport({
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
      if (!window.backendAPI || !window.backendAPI.inventoryLogExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryLogExport({
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
      filters: Omit<LogExportParams, "format">;
      created_by: string;
      created_at: string;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryLogExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryLogExport({
        method: "getExportTemplates",
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
    filters: Omit<LogExportParams, "format">;
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryLogExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryLogExport({
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
   * Get transaction analytics
   */
  calculateTransactionAnalytics(logEntries: LogExportData[]): {
    total_transactions: number;
    total_increases: number;
    total_decreases: number;
    net_change: number;
    average_change_per_transaction: number;
    most_active_user: string | null;
    most_common_action: string | null;
    transactions_by_hour: Array<{ hour: number; count: number }>;
  } {
    if (logEntries.length === 0) {
      return {
        total_transactions: 0,
        total_increases: 0,
        total_decreases: 0,
        net_change: 0,
        average_change_per_transaction: 0,
        most_active_user: null,
        most_common_action: null,
        transactions_by_hour: [],
      };
    }

    const total_increases = logEntries
      .filter((entry) => entry.change_amount > 0)
      .reduce((sum, entry) => sum + entry.change_amount, 0);

    const total_decreases = Math.abs(
      logEntries
        .filter((entry) => entry.change_amount < 0)
        .reduce((sum, entry) => sum + entry.change_amount, 0),
    );

    const net_change = total_increases - total_decreases;
    const average_change_per_transaction = net_change / logEntries.length;

    // Most active user
    const userCounts = logEntries.reduce(
      (acc, entry) => {
        acc[entry.performed_by] = (acc[entry.performed_by] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number },
    );

    const most_active_user = Object.entries(userCounts).reduce((a, b) =>
      a[1] > b[1] ? a : b,
    )[0];

    // Most common action
    const actionCounts = logEntries.reduce(
      (acc, entry) => {
        acc[entry.action] = (acc[entry.action] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number },
    );

    const most_common_action = Object.entries(actionCounts).reduce((a, b) =>
      a[1] > b[1] ? a : b,
    )[0];

    // Transactions by hour
    const transactions_by_hour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: logEntries.filter((entry) => {
        const entryHour = new Date(entry.created_at).getHours();
        return entryHour === hour;
      }).length,
    }));

    return {
      total_transactions: logEntries.length,
      total_increases,
      total_decreases,
      net_change,
      average_change_per_transaction,
      most_active_user,
      most_common_action,
      transactions_by_hour,
    };
  }

  /**
   * Get user activity recommendations
   */
  getUserActivityRecommendations(
    userBreakdown: LogExportAnalytics["user_breakdown"],
  ): string[] {
    const recommendations: string[] = [];

    if (userBreakdown.length === 0) return recommendations;

    const topUser = userBreakdown.reduce((prev, current) =>
      prev.count > current.count ? prev : current,
    );

    const concentration =
      topUser.count / userBreakdown.reduce((sum, user) => sum + user.count, 0);

    if (concentration > 0.6) {
      recommendations.push(
        `High activity concentration with user '${topUser.performed_by__username}' - consider cross-training`,
      );
    }

    const inactiveUsers = userBreakdown.filter((user) => user.count < 5);
    if (inactiveUsers.length > 0) {
      recommendations.push(
        `${inactiveUsers.length} users with low activity - review training needs`,
      );
    }

    return recommendations;
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Format number with commas
   */
  formatNumber(number: number): string {
    return new Intl.NumberFormat("en-US").format(number);
  }

  /**
   * Get time range options
   */
  getTimeRangeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "24h", label: "Last 24 Hours" },
      { value: "7d", label: "Last 7 Days" },
      { value: "30d", label: "Last 30 Days" },
      { value: "90d", label: "Last 90 Days" },
    ];
  }

  /**
   * Calculate date range from time range
   */
  calculateDateRange(timeRange: string): {
    date_from: string;
    date_to: string;
  } {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case "24h":
        start.setDate(start.getDate() - 1);
        break;
      case "7d":
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start.setDate(start.getDate() - 30);
        break;
      case "90d":
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 30); // Default to 30 days
    }

    return {
      date_from: start.toISOString().split("T")[0],
      date_to: end.toISOString().split("T")[0],
    };
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

export const logExportAPI = new LogExportAPI();
