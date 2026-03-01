// src/lib/stockExportApi.ts - Stock Item Export API Interfaces

import { dialogs } from "../../utils/dialogs";
import { fileHandler } from "./fileHandler";
import type { ExportResult } from "./product";

// src/lib/stock.ts - Additional interfaces for Stock models
export interface StockItemBasic {
  id: number;
  product: number;
  variant?: number;
  warehouse: number;
  quantity: number;
  reorder_level: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface StockMovement {
  id: number;
  stock_item: number;
  warehouse: number;
  change: number;
  movement_type: string;
  reference_code?: string;
  reason: string;
  created_by?: number;
  metadata: any;
  created_at: string;
}

export interface StockAlert {
  id: number;
  stock_item: number;
  alert_type: "low_stock" | "out_of_stock" | "replenished";
  message: string;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

export interface StockExportParams {
  format?: "csv" | "excel" | "pdf";
  warehouses?: string;
  warehouse?: string;
  product?: string;
  stock_status?: "low_stock" | "out_of_stock" | "normal";
  search?: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  time_range?: "24h" | "7d" | "30d";
}

export interface StockItemExportData {
  id: number;
  product_name: string;
  product_sku: string;
  warehouse: string;
  warehouse_location: string;
  quantity: number;
  reorder_level: number;
  cost_per_item: number;
  total_value: number;
  stock_status: string;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockExportAnalytics {
  total_stock_items: number;
  total_quantity: number;
  low_stock_items: number;
  out_of_stock_items: number;
  normal_stock_items: number;
  warehouse_breakdown: Array<{
    warehouse__name: string;
    count: number;
    total_quantity: number;
    percentage: number;
  }>;
  category_breakdown: Array<{
    product__category__name: string;
    count: number;
    total_quantity: number;
  }>;
}

export interface StockExportResponse {
  status: boolean;
  message: string;
  data: {
    stock_items: StockItemExportData[];
    analytics: StockExportAnalytics;
    filters: {
      warehouse?: string;
      product?: string;
      stock_status?: string;
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

class StockExportAPI {
  /**
   * Export stock items data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportStockItems(params: StockExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI?.stockExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `Stock items exported successfully in ${params.format?.toUpperCase()} format.\n\n` +
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

      throw new Error(response.message || "Failed to export stock items");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export stock items. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export stock items");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<StockExportParams, "format">,
  ): Promise<StockExportResponse["data"]> {
    try {
      if (!window.backendAPI || !window.backendAPI.stockExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockExport({
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
   * Get stock status filter options
   */
  getStockStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "low_stock", label: "Low Stock" },
      { value: "out_of_stock", label: "Out of Stock" },
      { value: "normal", label: "Normal Stock" },
    ];
  }

  /**
   * Generate business insights from analytics data
   */
  generateBusinessInsights(analytics: StockExportAnalytics): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    // Out of stock insight
    if (analytics.out_of_stock_items > 0) {
      insights.push({
        priority: "HIGH",
        finding: `${analytics.out_of_stock_items} items are out of stock`,
        recommendation:
          "Urgently restock out-of-stock items to avoid lost sales",
        impact_level: "CRITICAL",
      });
    }

    // Low stock insight
    if (analytics.low_stock_items > 0) {
      insights.push({
        priority: "MEDIUM",
        finding: `${analytics.low_stock_items} items are low on stock`,
        recommendation: "Initiate stock replenishment for low stock items",
        impact_level: "HIGH",
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
      const concentration = mainWarehouse.count / analytics.total_stock_items;

      if (concentration > 0.6) {
        insights.push({
          priority: "LOW",
          finding: `High stock concentration in '${mainWarehouse.warehouse__name}' warehouse (${(concentration * 100).toFixed(1)}%)`,
          recommendation:
            "Consider redistributing inventory across multiple warehouses",
          impact_level: "MEDIUM",
        });
      }
    }

    // Default recommendation if no issues found
    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "Inventory levels appear healthy",
        recommendation: "Continue current inventory management practices",
        impact_level: "LOW",
      });
    }

    return insights;
  }

  /**
   * Calculate inventory health score (0-100)
   */
  calculateInventoryHealthScore(analytics: StockExportAnalytics): number {
    let score = 100;

    // Deduct for out of stock items
    const outOfStockRatio =
      analytics.out_of_stock_items / analytics.total_stock_items;
    if (outOfStockRatio > 0.1) {
      score -= 40;
    } else if (outOfStockRatio > 0.05) {
      score -= 20;
    }

    // Deduct for low stock items
    const lowStockRatio =
      analytics.low_stock_items / analytics.total_stock_items;
    if (lowStockRatio > 0.2) {
      score -= 30;
    } else if (lowStockRatio > 0.1) {
      score -= 15;
    }

    return Math.max(0, score);
  }

  /**
   * Get inventory health level
   */
  getInventoryHealthLevel(
    score: number,
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 90) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "FAIR";
    return "POOR";
  }

  /**
   * Format stock item data for display
   */
  formatStockItemDisplay(stockItem: StockItemExportData): string {
    return `${stockItem.product_name} (${stockItem.product_sku}) - ${stockItem.warehouse}`;
  }

  /**
   * Get stock status color
   */
  getStockStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      "Out of Stock": "red",
      "Low Stock": "orange",
      Normal: "green",
    };
    return colors[status] || "gray";
  }

  /**
   * Get stock status icon
   */
  getStockStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      "Out of Stock": "❌",
      "Low Stock": "⚠️",
      Normal: "✅",
    };
    return icons[status] || "📦";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: StockExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.stock_status &&
      !this.getStockStatusOptions().some(
        (opt) => opt.value === params.stock_status,
      )
    ) {
      errors.push("Invalid stock status");
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
      if (!window.backendAPI || !window.backendAPI.stockExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockExport({
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
    filters: Omit<StockExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.stockExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockExport({
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
      if (!window.backendAPI || !window.backendAPI.stockExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockExport({
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
      filters: Omit<StockExportParams, "format">;
      created_by: string;
      created_at: string;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.stockExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockExport({
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
    filters: Omit<StockExportParams, "format">;
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.stockExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.stockExport({
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
   * Get stock value analytics
   */
  calculateStockValueAnalytics(stockItems: StockItemExportData[]): {
    total_value: number;
    average_value_per_item: number;
    highest_value_item: StockItemExportData | null;
    lowest_value_item: StockItemExportData | null;
    value_by_warehouse: Array<{ warehouse: string; total_value: number }>;
  } {
    if (stockItems.length === 0) {
      return {
        total_value: 0,
        average_value_per_item: 0,
        highest_value_item: null,
        lowest_value_item: null,
        value_by_warehouse: [],
      };
    }

    const total_value = stockItems.reduce(
      (sum, item) => sum + item.total_value,
      0,
    );
    const average_value_per_item = total_value / stockItems.length;

    const highest_value_item = stockItems.reduce((prev, current) =>
      prev.total_value > current.total_value ? prev : current,
    );

    const lowest_value_item = stockItems.reduce((prev, current) =>
      prev.total_value < current.total_value ? prev : current,
    );

    const value_by_warehouse = stockItems.reduce(
      (acc, item) => {
        const existing = acc.find(
          (entry) => entry.warehouse === item.warehouse,
        );
        if (existing) {
          existing.total_value += item.total_value;
        } else {
          acc.push({
            warehouse: item.warehouse,
            total_value: item.total_value,
          });
        }
        return acc;
      },
      [] as Array<{ warehouse: string; total_value: number }>,
    );

    return {
      total_value,
      average_value_per_item,
      highest_value_item,
      lowest_value_item,
      value_by_warehouse,
    };
  }

  /**
   * Get stock level recommendations
   */
  getStockLevelRecommendations(stockItem: StockItemExportData): string[] {
    const recommendations: string[] = [];

    if (stockItem.is_out_of_stock) {
      recommendations.push("Urgent restock required - item is out of stock");
    } else if (stockItem.is_low_stock) {
      recommendations.push(
        `Consider restocking - current quantity (${stockItem.quantity}) is below reorder level (${stockItem.reorder_level})`,
      );
    }

    if (stockItem.quantity > stockItem.reorder_level * 3) {
      recommendations.push(
        "Potential overstock - consider reducing inventory levels",
      );
    }

    if (stockItem.total_value > 10000) {
      recommendations.push("High value item - consider insurance coverage");
    }

    return recommendations;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format number with commas
   */
  formatNumber(number: number): string {
    return new Intl.NumberFormat("en-US").format(number);
  }

  /**
   * Get warehouse utilization from analytics
   */
  getWarehouseUtilization(analytics: StockExportAnalytics): Array<{
    warehouse: string;
    item_count: number;
    total_quantity: number;
    percentage: number;
    utilization_level: "LOW" | "MEDIUM" | "HIGH";
  }> {
    return analytics.warehouse_breakdown.map((breakdown) => {
      let utilization_level: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";

      if (breakdown.percentage < 20) {
        utilization_level = "LOW";
      } else if (breakdown.percentage > 60) {
        utilization_level = "HIGH";
      }

      return {
        warehouse: breakdown.warehouse__name,
        item_count: breakdown.count,
        total_quantity: breakdown.total_quantity,
        percentage: breakdown.percentage,
        utilization_level,
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

export const stockExportAPI = new StockExportAPI();
