// src/lib/orderExportApi.ts - Order Export API Interfaces

import { dialogs } from "@/renderer/utils/dialogs";
import { fileHandler } from "./fileHandler";
import { ExportResult } from "./product";
import { formatCurrency } from "@/renderer/utils/formatters";

export interface OrderBasic {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  status_display: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  created_at: string;
  updated_at: string;
  notes: string;
  inventory_processed: boolean;
  proceed_by: string;
}

export interface OrderItem {
  product_name: string;
  variant: string;
  quantity: number;
  price: number;
  total: number;
  net_price: number;
  tax_amount: number;
  discount_amount: number;
}

export interface OrderExportData extends OrderBasic {
  items: OrderItem[];
}

export interface OrderExportAnalytics {
  total_orders: number;
  total_revenue: number;
  total_tax: number;
  recent_orders: number;
  recent_revenue: number;
  status_breakdown: Array<{
    status: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
}

export interface OrderExportParams {
  format?: "csv" | "excel" | "pdf";
  status?: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  search?: string;
  time_range?: "24h" | "7d" | "30d";
}

export interface OrderExportResponse {
  status: boolean;
  message: string;
  data: {
    orders: OrderExportData[];
    analytics: OrderExportAnalytics;
    filters: {
      status?: string;
      start_date?: string;
      end_date?: string;
      search?: string;
    };
    metadata: {
      generated_at: string;
      total_records: number;
    };
  };
}

export interface BusinessInsight {
  priority: "HIGH" | "MEDIUM" | "LOW";
  finding: string;
  recommendation: string;
  impact_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

class OrderExportAPI {
  /**
   * Export orders data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportOrders(params: OrderExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI?.orderExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.orderExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `Orders exported successfully in ${params.format.toUpperCase()} format.\n\n` +
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
                "You can find it in your InventoryPro folder inside Downloads.",
              "File Export Complete",
            );
          }
        }

        // Return the file information for UI display
        return fileInfo;
      }

      throw new Error(response.message || "Failed to export orders");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export orders. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export orders");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<OrderExportParams, "format">,
  ): Promise<OrderExportResponse["data"]> {
    try {
      if (!window.backendAPI || !window.backendAPI.orderExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.orderExport({
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
   * Get order status filter options based on Django ORDER_STATUS
   */
  getOrderStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "pending", label: "Pending" },
      { value: "processing", label: "Processing" },
      { value: "completed", label: "Completed" },
      { value: "cancelled", label: "Cancelled" },
      { value: "refunded", label: "Refunded" },
    ];
  }

  /**
   * Get time range filter options
   */
  getTimeRangeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "24h", label: "Last 24 Hours" },
      { value: "7d", label: "Last 7 Days" },
      { value: "30d", label: "Last 30 Days" },
    ];
  }

  /**
   * Generate business insights from analytics data
   */
  generateBusinessInsights(
    analytics: OrderExportAnalytics,
    orders: OrderExportData[],
  ): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    // Recent orders insight
    if (analytics.recent_orders === 0) {
      insights.push({
        priority: "HIGH",
        finding: "No orders in the last 30 days",
        recommendation: "Review sales and marketing strategies to boost orders",
        impact_level: "CRITICAL",
      });
    }

    // Average order value insight
    if (analytics.total_orders > 0) {
      const aov = analytics.total_revenue / analytics.total_orders;
      if (aov < 50) {
        insights.push({
          priority: "MEDIUM",
          finding: `Low average order value (${formatCurrency(aov)})`,
          recommendation: "Implement upselling and cross-selling strategies",
          impact_level: "HIGH",
        });
      }
    }

    // Order completion rate insight
    const completedOrders =
      analytics.status_breakdown.find((item) => item.status === "completed")
        ?.count || 0;
    const completionRate =
      analytics.total_orders > 0 ? completedOrders / analytics.total_orders : 0;

    if (completionRate < 0.7) {
      insights.push({
        priority: "MEDIUM",
        finding: `Low order completion rate (${(completionRate * 100).toFixed(1)}%)`,
        recommendation: "Review order fulfillment process and customer support",
        impact_level: "MEDIUM",
      });
    }

    // Pending orders insight
    const pendingOrders =
      analytics.status_breakdown.find((item) => item.status === "pending")
        ?.count || 0;
    if (pendingOrders > 10) {
      insights.push({
        priority: "LOW",
        finding: `High number of pending orders (${pendingOrders})`,
        recommendation:
          "Process pending orders to improve customer satisfaction",
        impact_level: "MEDIUM",
      });
    }

    // Revenue concentration insight
    if (analytics.status_breakdown.length > 0) {
      const mainStatus = analytics.status_breakdown.reduce((prev, current) =>
        prev.revenue > current.revenue ? prev : current,
      );
      const revenueConcentration = mainStatus.revenue / analytics.total_revenue;

      if (revenueConcentration > 0.8) {
        insights.push({
          priority: "LOW",
          finding: `High revenue concentration in '${mainStatus.status}' status (${(revenueConcentration * 100).toFixed(1)}%)`,
          recommendation: "Diversify order status distribution for stability",
          impact_level: "LOW",
        });
      }
    }

    // Default recommendation if no issues found
    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "Order performance appears healthy",
        recommendation: "Continue current operations and monitor key metrics",
        impact_level: "LOW",
      });
    }

    return insights;
  }

  /**
   * Calculate order performance score (0-100)
   */
  calculateOrderPerformanceScore(
    analytics: OrderExportAnalytics,
    orders: OrderExportData[],
  ): number {
    let score = 100;

    // Deduct for no recent orders
    if (analytics.recent_orders === 0) {
      score -= 40;
    }

    // Deduct for low completion rate
    const completedOrders =
      analytics.status_breakdown.find((item) => item.status === "completed")
        ?.count || 0;
    const completionRate =
      analytics.total_orders > 0 ? completedOrders / analytics.total_orders : 0;

    if (completionRate < 0.7) {
      score -= 20;
    } else if (completionRate < 0.5) {
      score -= 30;
    }

    // Deduct for low AOV
    if (analytics.total_orders > 0) {
      const aov = analytics.total_revenue / analytics.total_orders;
      if (aov < 50) {
        score -= 15;
      } else if (aov < 25) {
        score -= 25;
      }
    }

    // Deduct for high pending orders
    const pendingOrders =
      analytics.status_breakdown.find((item) => item.status === "pending")
        ?.count || 0;
    if (pendingOrders > analytics.total_orders * 0.2) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Get order performance level
   */
  getOrderPerformanceLevel(
    score: number,
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 90) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "FAIR";
    return "POOR";
  }

  /**
   * Format order data for display
   */
  formatOrderDisplay(order: OrderExportData): string {
    return `${order.order_number} - ${order.customer_name} - $${order.total}`;
  }

  /**
   * Get order status color
   */
  getOrderStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      pending: "orange",
      processing: "blue",
      completed: "green",
      cancelled: "red",
      refunded: "gray",
    };
    return colors[status] || "gray";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: OrderExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.status &&
      !this.getOrderStatusOptions().some((opt) => opt.value === params.status)
    ) {
      errors.push("Invalid order status");
    }

    if (params.start_date && params.end_date) {
      const start = new Date(params.start_date);
      const end = new Date(params.end_date);
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
      if (!window.backendAPI || !window.backendAPI.orderExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.orderExport({
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
    filters: Omit<OrderExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.orderExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.orderExport({
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
      if (!window.backendAPI || !window.backendAPI.orderExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.orderExport({
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
      filters: Omit<OrderExportParams, "format">;
      created_by: string;
      created_at: string;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.orderExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.orderExport({
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
    filters: Omit<OrderExportParams, "format">;
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.orderExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.orderExport({
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
   * Get order analytics summary
   */
  getOrderAnalyticsSummary(analytics: OrderExportAnalytics): {
    total_orders: number;
    total_revenue: number;
    total_tax: number;
    average_order_value: number;
    completion_rate: number;
    recent_growth: number;
  } {
    const completedOrders =
      analytics.status_breakdown.find((item) => item.status === "completed")
        ?.count || 0;

    return {
      total_orders: analytics.total_orders,
      total_revenue: analytics.total_revenue,
      total_tax: analytics.total_tax,
      average_order_value:
        analytics.total_orders > 0
          ? analytics.total_revenue / analytics.total_orders
          : 0,
      completion_rate:
        analytics.total_orders > 0
          ? completedOrders / analytics.total_orders
          : 0,
      recent_growth:
        analytics.recent_orders > 0
          ? analytics.recent_revenue /
            analytics.recent_orders /
            (analytics.total_orders > 0
              ? analytics.total_revenue / analytics.total_orders
              : 1)
          : 0,
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
    }).format(value);
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

export const orderExportAPI = new OrderExportAPI();
