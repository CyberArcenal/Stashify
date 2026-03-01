// src/lib/purchaseExportApi.ts - Purchase Export API Interfaces

import { dialogs } from "../../utils/dialogs";
import { fileHandler } from "./fileHandler";
import type { ExportResult } from "./product";

export interface PurchaseBasic {
  id: number;
  purchase_number: string;
  supplier_name: string;
  status: string;
  status_display: string;
  warehouse: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string;
  inventory_processed: boolean;
  proceed_by: string;
  created_at: string;
  updated_at: string;
  is_received: boolean;
  received_at: string;
}

export interface PurchaseItem {
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

export interface PurchaseExportData extends PurchaseBasic {
  items: PurchaseItem[];
}

export interface PurchaseExportAnalytics {
  total_purchases: number;
  total_value: number;
  total_tax: number;
  total_subtotal: number;
  status_breakdown: Array<{
    status: string;
    count: number;
    value: number;
    percentage: number;
  }>;
  warehouse_breakdown: Array<{
    warehouse__name: string;
    count: number;
    value: number;
    percentage: number;
  }>;
  supplier_breakdown: Array<{
    supplier_name: string;
    count: number;
    value: number;
  }>;
  recent_purchases: number;
  recent_value: number;
  processed_purchases: number;
  unprocessed_purchases: number;
}

export interface PurchaseExportParams {
  format?: "csv" | "excel" | "pdf";
  status?: string;
  supplier?: string;
  warehouse?: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  search?: string;
  time_range?: "24h" | "7d" | "30d";
  supplier_name?: string;
  min_total?: number | undefined;
  max_total?: number | undefined;
  inventory_processed?: boolean;
}

export interface PurchaseExportResponse {
  status: boolean;
  message: string;
  data: {
    purchases: PurchaseExportData[];
    analytics: PurchaseExportAnalytics;
    filters: {
      status?: string;
      supplier?: string;
      warehouse?: string;
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

class PurchaseExportAPI {
  /**
   * Export purchases data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportPurchases(params: PurchaseExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI?.purchaseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.purchaseExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `Purchases exported successfully in ${params.format?.toUpperCase()} format.\n\n` +
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

      throw new Error(response.message || "Failed to export purchases");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export purchases. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export purchases");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<PurchaseExportParams, "format">,
  ): Promise<PurchaseExportResponse["data"]> {
    try {
      if (!window.backendAPI || !window.backendAPI.purchaseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.purchaseExport({
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
   * Get purchase status filter options based on Django STATUS_CHOICES
   */
  getPurchaseStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "pending", label: "Pending" },
      { value: "ordered", label: "Ordered" },
      { value: "received", label: "Received" },
      { value: "cancelled", label: "Cancelled" },
      { value: "partially_received", label: "Partially Received" },
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
    analytics: PurchaseExportAnalytics,
    purchases: PurchaseExportData[],
  ): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    // Recent purchases insight
    if (analytics.recent_purchases === 0) {
      insights.push({
        priority: "HIGH",
        finding: "No purchases in the last 30 days",
        recommendation:
          "Review procurement strategy and supplier relationships",
        impact_level: "CRITICAL",
      });
    }

    // Unprocessed purchases insight
    if (analytics.unprocessed_purchases > 0) {
      insights.push({
        priority: "HIGH",
        finding: `${analytics.unprocessed_purchases} purchases need inventory processing`,
        recommendation: "Process pending purchases to update inventory levels",
        impact_level: "HIGH",
      });
    }

    // Average purchase value insight
    if (analytics.total_purchases > 0) {
      const avgValue = analytics.total_value / analytics.total_purchases;
      if (avgValue < 500) {
        insights.push({
          priority: "MEDIUM",
          finding: `Low average purchase value ($${avgValue.toFixed(2)})`,
          recommendation:
            "Consider bulk purchasing or negotiating better prices",
          impact_level: "HIGH",
        });
      }
    }

    // Pending purchases insight
    const pendingPurchases =
      analytics.status_breakdown.find((item) => item.status === "pending")
        ?.count || 0;
    if (pendingPurchases > 10) {
      insights.push({
        priority: "MEDIUM",
        finding: `High number of pending purchases (${pendingPurchases})`,
        recommendation: "Review and process pending purchase orders",
        impact_level: "MEDIUM",
      });
    }

    // Warehouse concentration insight
    if (
      analytics.warehouse_breakdown &&
      analytics.warehouse_breakdown.length > 0
    ) {
      const mainWarehouse = analytics.warehouse_breakdown.reduce(
        (prev, current) => (prev.count > current.count ? prev : current),
      );
      const concentration = mainWarehouse.count / analytics.total_purchases;

      if (concentration > 0.7) {
        insights.push({
          priority: "LOW",
          finding: `High warehouse concentration in '${mainWarehouse.warehouse__name}' (${(concentration * 100).toFixed(1)}%)`,
          recommendation: "Diversify warehouse usage to reduce risk",
          impact_level: "LOW",
        });
      }
    }

    // Supplier concentration insight
    if (
      analytics.supplier_breakdown &&
      analytics.supplier_breakdown.length > 0
    ) {
      const mainSupplier = analytics.supplier_breakdown.reduce(
        (prev, current) => (prev.value > current.value ? prev : current),
      );
      const concentration =
        analytics.total_value > 0
          ? mainSupplier.value / analytics.total_value
          : 0;

      if (concentration > 0.5) {
        insights.push({
          priority: "MEDIUM",
          finding: `High supplier concentration with '${mainSupplier.supplier_name}' (${(concentration * 100).toFixed(1)}%)`,
          recommendation: "Diversify supplier base to reduce dependency risk",
          impact_level: "MEDIUM",
        });
      }
    }

    // Processing efficiency insight
    const processingRate =
      analytics.total_purchases > 0
        ? analytics.processed_purchases / analytics.total_purchases
        : 0;

    if (processingRate < 0.9) {
      insights.push({
        priority: "MEDIUM",
        finding: `Low inventory processing rate (${(processingRate * 100).toFixed(1)}%)`,
        recommendation: "Improve purchase processing workflow efficiency",
        impact_level: "MEDIUM",
      });
    }

    // Default recommendation if no issues found
    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "Purchase performance appears healthy",
        recommendation:
          "Continue current procurement practices and monitor key metrics",
        impact_level: "LOW",
      });
    }

    return insights;
  }

  /**
   * Calculate purchase performance score (0-100)
   */
  calculatePurchasePerformanceScore(
    analytics: PurchaseExportAnalytics,
    purchases: PurchaseExportData[],
  ): number {
    let score = 100;

    // Deduct for no recent purchases
    if (analytics.recent_purchases === 0) {
      score -= 40;
    }

    // Deduct for unprocessed purchases
    const unprocessedRatio =
      analytics.total_purchases > 0
        ? analytics.unprocessed_purchases / analytics.total_purchases
        : 0;

    if (unprocessedRatio > 0.1) {
      score -= 30;
    } else if (unprocessedRatio > 0.05) {
      score -= 15;
    }

    // Deduct for low average value
    if (analytics.total_purchases > 0) {
      const avgValue = analytics.total_value / analytics.total_purchases;
      if (avgValue < 500) {
        score -= 10;
      } else if (avgValue < 200) {
        score -= 20;
      }
    }

    // Deduct for high pending rate
    const pendingPurchases =
      analytics.status_breakdown.find((item) => item.status === "pending")
        ?.count || 0;
    const pendingRate =
      analytics.total_purchases > 0
        ? pendingPurchases / analytics.total_purchases
        : 0;

    if (pendingRate > 0.2) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Get purchase performance level
   */
  getPurchasePerformanceLevel(
    score: number,
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 90) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "FAIR";
    return "POOR";
  }

  /**
   * Format purchase data for display
   */
  formatPurchaseDisplay(purchase: PurchaseExportData): string {
    return `${purchase.purchase_number} - ${purchase.supplier_name} - $${purchase.total}`;
  }

  /**
   * Get purchase status color
   */
  getPurchaseStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      pending: "orange",
      ordered: "blue",
      received: "green",
      cancelled: "red",
      partially_received: "yellow",
    };
    return colors[status] || "gray";
  }

  /**
   * Get inventory processing status color
   */
  getProcessingStatusColor(isProcessed: boolean): string {
    return isProcessed ? "green" : "red";
  }

  /**
   * Get receipt status color
   */
  getReceiptStatusColor(isReceived: boolean): string {
    return isReceived ? "green" : "orange";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: PurchaseExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.status &&
      !this.getPurchaseStatusOptions().some(
        (opt) => opt.value === params.status,
      )
    ) {
      errors.push("Invalid purchase status");
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
      if (!window.backendAPI || !window.backendAPI.purchaseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.purchaseExport({
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
    filters: Omit<PurchaseExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.purchaseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.purchaseExport({
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
      if (!window.backendAPI || !window.backendAPI.purchaseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.purchaseExport({
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
      filters: Omit<PurchaseExportParams, "format">;
      created_by: string;
      created_at: string;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.purchaseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.purchaseExport({
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
    filters: Omit<PurchaseExportParams, "format">;
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.purchaseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.purchaseExport({
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
   * Get purchase analytics summary
   */
  getPurchaseAnalyticsSummary(analytics: PurchaseExportAnalytics): {
    total_purchases: number;
    total_value: number;
    total_tax: number;
    average_purchase_value: number;
    processing_rate: number;
    recent_growth: number;
    top_supplier: string;
    top_warehouse: string;
  } {
    const topSupplier =
      analytics.supplier_breakdown && analytics.supplier_breakdown.length > 0
        ? analytics.supplier_breakdown.reduce((prev, current) =>
            prev.value > current.value ? prev : current,
          ).supplier_name
        : "N/A";

    const topWarehouse =
      analytics.warehouse_breakdown && analytics.warehouse_breakdown.length > 0
        ? analytics.warehouse_breakdown.reduce((prev, current) =>
            prev.count > current.count ? prev : current,
          ).warehouse__name
        : "N/A";

    return {
      total_purchases: analytics.total_purchases,
      total_value: analytics.total_value,
      total_tax: analytics.total_tax,
      average_purchase_value:
        analytics.total_purchases > 0
          ? analytics.total_value / analytics.total_purchases
          : 0,
      processing_rate:
        analytics.total_purchases > 0
          ? analytics.processed_purchases / analytics.total_purchases
          : 0,
      recent_growth:
        analytics.recent_purchases > 0
          ? analytics.recent_value /
            analytics.recent_purchases /
            (analytics.total_purchases > 0
              ? analytics.total_value / analytics.total_purchases
              : 1)
          : 0,
      top_supplier: topSupplier,
      top_warehouse: topWarehouse,
    };
  }

  /**
   * Get purchase performance metrics
   */
  getPurchasePerformanceMetrics(purchase: PurchaseExportData): {
    value_score: number;
    efficiency_score: number;
    completeness: number;
    overall_score: number;
  } {
    let value_score = 100;
    let efficiency_score = 100;
    let completeness = 100;

    // Value score calculation (higher value purchases are better)
    if (purchase.total < 100) {
      value_score = 60; // Low value
    } else if (purchase.total < 500) {
      value_score = 80; // Medium value
    } else {
      value_score = 95; // High value
    }

    // Efficiency score calculation
    if (!purchase.inventory_processed) {
      efficiency_score -= 40;
    }
    if (!purchase.is_received) {
      efficiency_score -= 30;
    }

    // Completeness calculation
    if (!purchase.notes || purchase.notes.length < 5) {
      completeness -= 20;
    }
    if (purchase.items.length === 0) {
      completeness -= 30;
    }

    const overall_score = (value_score + efficiency_score + completeness) / 3;

    return {
      value_score: Math.max(0, value_score),
      efficiency_score: Math.max(0, efficiency_score),
      completeness: Math.max(0, completeness),
      overall_score: Math.max(0, overall_score),
    };
  }

  /**
   * Calculate supplier performance metrics
   */
  calculateSupplierMetrics(analytics: PurchaseExportAnalytics): Array<{
    supplier_name: string;
    total_spent: number;
    purchase_count: number;
    average_order_value: number;
    performance_rating: number;
  }> {
    if (!analytics.supplier_breakdown) return [];

    return analytics.supplier_breakdown.map((supplier) => {
      const avgValue = supplier.count > 0 ? supplier.value / supplier.count : 0;

      // Simple performance rating based on order value and frequency
      let performance_rating = 50; // Base rating

      if (avgValue > 1000) performance_rating += 20;
      else if (avgValue > 500) performance_rating += 10;

      if (supplier.count > 10) performance_rating += 20;
      else if (supplier.count > 5) performance_rating += 10;

      return {
        supplier_name: supplier.supplier_name,
        total_spent: supplier.value,
        purchase_count: supplier.count,
        average_order_value: avgValue,
        performance_rating: Math.min(100, performance_rating),
      };
    });
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

  /**
   * Format number with commas
   */
  formatNumber(number: number): string {
    return new Intl.NumberFormat("en-US").format(number);
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

export const purchaseExportAPI = new PurchaseExportAPI();
