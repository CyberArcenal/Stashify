// src/lib/stockMovementExportApi.ts - Stock Movement Export API Interfaces

import { UserNestedData } from "../user";
import { fileHandler } from "./fileHandler";
import { dialogs } from "@/renderer/utils/dialogs";

// Stock Movement Interfaces
export interface StockMovementBasic {
  id: number;
  stock_item: number;
  warehouse?: number;
  change: number;
  movement_type: string;
  reference_code?: string;
  reason?: string;
  created_by?: number;
  metadata?: any;
  created_at: string;
  is_deleted: boolean;
}

export interface StockMovementExportParams {
  format?: "csv" | "excel" | "pdf";
  warehouse?: string;
  stock_item?: string;
  movement_type?: string;
  user?: string;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
  search?: string;
  time_range?: "24h" | "7d" | "30d" | "90d";
  change_direction?: "in" | "out" | "all";
}

export interface StockMovementExportData {
  id: number;
  stock_item_name: string;
  stock_item_sku: string;
  movement_type: string;
  movement_type_code: string;
  change_amount: number;
  warehouse: string;
  warehouse_location: string;
  created_by: string;
  created_by_data: UserNestedData;
  reference_code: string;
  reason: string;
  created_at: string;
  change_direction: string;
  net_effect: number;
  metadata: any;
}

export interface StockMovementExportAnalytics {
  total_movements: number;
  total_quantity_moved: number;
  movement_breakdown: Array<{
    movement_type: string;
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
    created_by__username: string;
    count: number;
    total_change: number;
  }>;
  recent_activity: Array<{
    created_at__date: string;
    daily_count: number;
    daily_change: number;
  }>;
}

export interface StockMovementExportResponse {
  status: boolean;
  message: string;
  data: {
    movements: StockMovementExportData[];
    analytics: StockMovementExportAnalytics;
    filters: {
      warehouse?: string;
      stock_item?: string;
      movement_type?: string;
      date_from?: string;
      date_to?: string;
      user?: string;
      search?: string;
    };
    metadata: {
      generated_at: string;
      total_records: number;
    };
  };
}

export interface StockMovementBusinessInsight {
  priority: "HIGH" | "MEDIUM" | "LOW";
  finding: string;
  recommendation: string;
  impact_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

class StockMovementExportAPI {
  /**
   * Export stock movements data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportMovements(params: StockMovementExportParams): Promise<Blob> {
    try {
      if (!window.backendAPI?.stockMovementExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockMovementExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `Stock movements exported successfully in ${params.format.toUpperCase()} format.\n\n` +
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
                "You can find it in your Downloads folder.",
              "File Export Complete",
            );
          }
        }

        // Return file info for UI display
        return fileInfo;
      }

      throw new Error(response.message || "Failed to export stock movements");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export stock movements. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export stock movements");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<StockMovementExportParams, "format">,
  ): Promise<StockMovementExportResponse["data"]> {
    try {
      if (!window.backendAPI || !window.backendAPI.stockMovementExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockMovementExport({
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
   * Get movement type filter options
   */
  getMovementTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "in", label: "Stock In" },
      { value: "out", label: "Stock Out" },
      { value: "transfer_out", label: "Transfer Out" },
      { value: "transfer_in", label: "Transfer In" },
      { value: "adjustment", label: "Adjustment" },
    ];
  }

  /**
   * Get change direction filter options
   */
  getChangeDirectionOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "in", label: "Stock In Only" },
      { value: "out", label: "Stock Out Only" },
      { value: "all", label: "All Movements" },
    ];
  }

  /**
   * Generate business insights from analytics data
   */
  generateBusinessInsights(
    analytics: StockMovementExportAnalytics,
  ): StockMovementBusinessInsight[] {
    const insights: StockMovementBusinessInsight[] = [];

    // High frequency of adjustments insight
    const adjustmentMovements = ["adjustment"];
    const adjustmentCount = analytics.movement_breakdown
      .filter((breakdown) =>
        adjustmentMovements.includes(breakdown.movement_type),
      )
      .reduce((sum, breakdown) => sum + breakdown.count, 0);

    if (adjustmentCount > 0) {
      const adjustmentPercentage =
        (adjustmentCount / analytics.total_movements) * 100;
      if (adjustmentPercentage > 20) {
        insights.push({
          priority: "HIGH",
          finding: `High adjustment rate (${adjustmentPercentage.toFixed(1)}% of movements)`,
          recommendation:
            "Review processes to reduce adjustments and improve inventory accuracy",
          impact_level: "HIGH",
        });
      }
    }

    // Stock out movements insight
    const stockoutMovements = ["out", "transfer_out"];
    const stockoutCount = analytics.movement_breakdown
      .filter((breakdown) =>
        stockoutMovements.includes(breakdown.movement_type),
      )
      .reduce((sum, breakdown) => sum + breakdown.count, 0);

    if (stockoutCount > 0) {
      const stockoutPercentage =
        (stockoutCount / analytics.total_movements) * 100;
      insights.push({
        priority: "MEDIUM",
        finding: `${stockoutCount} stock out movements detected (${stockoutPercentage.toFixed(1)}%)`,
        recommendation:
          "Monitor stock levels and reorder points to prevent shortages",
        impact_level: "MEDIUM",
      });
    }

    // Transfer efficiency insight
    const transferMovements = ["transfer_in", "transfer_out"];
    const transferCount = analytics.movement_breakdown
      .filter((breakdown) =>
        transferMovements.includes(breakdown.movement_type),
      )
      .reduce((sum, breakdown) => sum + breakdown.count, 0);

    if (transferCount > 0) {
      const transferPercentage =
        (transferCount / analytics.total_movements) * 100;
      if (transferPercentage > 30) {
        insights.push({
          priority: "MEDIUM",
          finding: `High transfer activity (${transferPercentage.toFixed(1)}% of movements)`,
          recommendation:
            "Evaluate warehouse layout and transfer processes for optimization",
          impact_level: "MEDIUM",
        });
      }
    }

    // User activity concentration insight
    if (analytics.user_breakdown && analytics.user_breakdown.length > 0) {
      const topUser = analytics.user_breakdown.reduce((prev, current) =>
        prev.count > current.count ? prev : current,
      );
      const concentration = topUser.count / analytics.total_movements;

      if (concentration > 0.5) {
        insights.push({
          priority: "LOW",
          finding: `High movement concentration with user '${topUser.created_by__username}' (${(concentration * 100).toFixed(1)}%)`,
          recommendation:
            "Distribute stock management tasks across multiple team members",
          impact_level: "LOW",
        });
      }
    }

    // Default recommendation if no specific insights
    if (insights.length === 0) {
      const totalIncreases = analytics.movement_breakdown
        .filter((breakdown) => breakdown.total_change > 0)
        .reduce((sum, breakdown) => sum + breakdown.total_change, 0);

      const totalDecreases = Math.abs(
        analytics.movement_breakdown
          .filter((breakdown) => breakdown.total_change < 0)
          .reduce((sum, breakdown) => sum + breakdown.total_change, 0),
      );

      const netBalance = totalIncreases - totalDecreases;

      if (netBalance > 0) {
        insights.push({
          priority: "LOW",
          finding: `Positive stock net change (+${netBalance} units)`,
          recommendation:
            "Stock levels are growing positively, maintain current practices",
          impact_level: "LOW",
        });
      } else {
        insights.push({
          priority: "MEDIUM",
          finding: `Negative stock net change (${netBalance} units)`,
          recommendation:
            "Monitor stock trends and adjust procurement strategies",
          impact_level: "MEDIUM",
        });
      }
    }

    return insights;
  }

  /**
   * Calculate movement activity score (0-100)
   */
  calculateActivityHealthScore(
    analytics: StockMovementExportAnalytics,
  ): number {
    let score = 100;

    // High adjustment rate penalty
    const adjustmentMovements = ["adjustment"];
    const adjustmentCount = analytics.movement_breakdown
      .filter((breakdown) =>
        adjustmentMovements.includes(breakdown.movement_type),
      )
      .reduce((sum, breakdown) => sum + breakdown.count, 0);

    const adjustmentRatio = adjustmentCount / analytics.total_movements;
    if (adjustmentRatio > 0.3) {
      score -= 30;
    } else if (adjustmentRatio > 0.2) {
      score -= 15;
    }

    // High negative change penalty
    const negativeChange = Math.abs(
      analytics.movement_breakdown
        .filter((breakdown) => breakdown.total_change < 0)
        .reduce((sum, breakdown) => sum + breakdown.total_change, 0),
    );

    const positiveChange = analytics.movement_breakdown
      .filter((breakdown) => breakdown.total_change > 0)
      .reduce((sum, breakdown) => sum + breakdown.total_change, 0);

    if (negativeChange > positiveChange * 2) {
      score -= 25;
    }

    // High transfer activity penalty (may indicate inefficiency)
    const transferMovements = ["transfer_in", "transfer_out"];
    const transferCount = analytics.movement_breakdown
      .filter((breakdown) =>
        transferMovements.includes(breakdown.movement_type),
      )
      .reduce((sum, breakdown) => sum + breakdown.count, 0);

    const transferRatio = transferCount / analytics.total_movements;
    if (transferRatio > 0.4) {
      score -= 20;
    } else if (transferRatio > 0.25) {
      score -= 10;
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
   * Format movement entry data for display
   */
  formatMovementDisplay(movement: StockMovementExportData): string {
    return `${movement.stock_item_name} - ${movement.movement_type} by ${movement.created_by}`;
  }

  /**
   * Get movement type color
   */
  getMovementTypeColor(movementType: string): string {
    const colors: { [key: string]: string } = {
      in: "green",
      out: "red",
      transfer_in: "teal",
      transfer_out: "orange",
      adjustment: "purple",
    };
    return colors[movementType] || "gray";
  }

  /**
   * Get change direction icon
   */
  getChangeDirectionIcon(changeAmount: number): string {
    if (changeAmount > 0) return "⬆️";
    if (changeAmount < 0) return "⬇️";
    return "➡️";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: StockMovementExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.movement_type &&
      !this.getMovementTypeOptions().some(
        (opt) => opt.value === params.movement_type,
      )
    ) {
      errors.push("Invalid movement type");
    }

    if (
      params.change_direction &&
      !["in", "out", "all"].includes(params.change_direction)
    ) {
      errors.push("Invalid change direction");
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
      if (!window.backendAPI || !window.backendAPI.stockMovementExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockMovementExport({
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
    filters: Omit<StockMovementExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.stockMovementExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockMovementExport({
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
      if (!window.backendAPI || !window.backendAPI.stockMovementExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockMovementExport({
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
      filters: Omit<StockMovementExportParams, "format">;
      created_by: string;
      created_at: string;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.stockMovementExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockMovementExport({
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
    filters: Omit<StockMovementExportParams, "format">;
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.stockMovementExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockMovementExport({
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
   * Get movement analytics
   */
  calculateMovementAnalytics(movements: StockMovementExportData[]): {
    total_movements: number;
    total_increases: number;
    total_decreases: number;
    net_change: number;
    average_change_per_movement: number;
    most_active_user: string | null;
    most_common_movement_type: string | null;
    movements_by_hour: Array<{ hour: number; count: number }>;
    movement_efficiency: number;
  } {
    if (movements.length === 0) {
      return {
        total_movements: 0,
        total_increases: 0,
        total_decreases: 0,
        net_change: 0,
        average_change_per_movement: 0,
        most_active_user: null,
        most_common_movement_type: null,
        movements_by_hour: [],
        movement_efficiency: 0,
      };
    }

    const total_increases = movements
      .filter((entry) => entry.change_amount > 0)
      .reduce((sum, entry) => sum + entry.change_amount, 0);

    const total_decreases = Math.abs(
      movements
        .filter((entry) => entry.change_amount < 0)
        .reduce((sum, entry) => sum + entry.change_amount, 0),
    );

    const net_change = total_increases - total_decreases;
    const average_change_per_movement = net_change / movements.length;

    // Most active user
    const userCounts = movements.reduce(
      (acc, entry) => {
        acc[entry.created_by] = (acc[entry.created_by] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number },
    );

    const most_active_user = Object.entries(userCounts).reduce((a, b) =>
      a[1] > b[1] ? a : b,
    )[0];

    // Most common movement type
    const movementTypeCounts = movements.reduce(
      (acc, entry) => {
        acc[entry.movement_type] = (acc[entry.movement_type] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number },
    );

    const most_common_movement_type = Object.entries(movementTypeCounts).reduce(
      (a, b) => (a[1] > b[1] ? a : b),
    )[0];

    // Movements by hour
    const movements_by_hour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: movements.filter((entry) => {
        const entryHour = new Date(entry.created_at).getHours();
        return entryHour === hour;
      }).length,
    }));

    // Movement efficiency (percentage of stock-in movements)
    const positiveMovements = movements.filter(
      (entry) => entry.change_amount > 0,
    ).length;
    const movement_efficiency = (positiveMovements / movements.length) * 100;

    return {
      total_movements: movements.length,
      total_increases,
      total_decreases,
      net_change,
      average_change_per_movement,
      most_active_user,
      most_common_movement_type,
      movements_by_hour,
      movement_efficiency,
    };
  }

  /**
   * Get user activity recommendations
   */
  getUserActivityRecommendations(
    userBreakdown: StockMovementExportAnalytics["user_breakdown"],
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
        `High activity concentration with user '${topUser.created_by__username}' - consider cross-training`,
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
        start.setDate(start.getDate() - 30);
    }

    return {
      date_from: start.toISOString().split("T")[0],
      date_to: end.toISOString().split("T")[0],
    };
  }

  /**
   * Get movement statistics summary
   */
  getMovementStatistics(movements: StockMovementExportData[]): {
    totalStockIn: number;
    totalStockOut: number;
    totalTransfers: number;
    totalAdjustments: number;
    netStockChange: number;
    movementFrequency: number;
  } {
    if (movements.length === 0) {
      return {
        totalStockIn: 0,
        totalStockOut: 0,
        totalTransfers: 0,
        totalAdjustments: 0,
        netStockChange: 0,
        movementFrequency: 0,
      };
    }

    const totalStockIn = movements
      .filter((m) => m.change_direction === "IN")
      .reduce((sum, m) => sum + m.net_effect, 0);

    const totalStockOut = movements
      .filter((m) => m.change_direction === "OUT")
      .reduce((sum, m) => sum + m.net_effect, 0);

    const totalTransfers = movements.filter(
      (m) =>
        m.movement_type_code === "transfer_in" ||
        m.movement_type_code === "transfer_out",
    ).length;

    const totalAdjustments = movements.filter(
      (m) => m.movement_type_code === "adjustment",
    ).length;

    const netStockChange = totalStockIn - totalStockOut;

    // Calculate movement frequency (movements per day)
    const dates = movements.map((m) => new Date(m.created_at).toDateString());
    const uniqueDays = new Set(dates).size;
    const movementFrequency = movements.length / Math.max(uniqueDays, 1);

    return {
      totalStockIn,
      totalStockOut,
      totalTransfers,
      totalAdjustments,
      netStockChange,
      movementFrequency,
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

export const stockMovementExportAPI = new StockMovementExportAPI();
