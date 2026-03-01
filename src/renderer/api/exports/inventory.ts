// src/lib/inventoryExportApi.ts - Inventory Export API Interfaces

import { dialogs } from "../../utils/dialogs";
import { fileHandler } from "./fileHandler";
import type { ExportResult } from "./product";

export interface InventoryItem {
  id: number;
  productId: number;
  product_name: string;
  product_sku: string;
  category: string;
  variantId?: number;
  variant_name?: string;
  variant_sku?: string;
  quantity: number;
  low_stock_threshold: number;
  cost_per_item: number;
  stock_value: number;
  warehouse: string;
  location: string;
  last_movement_date: string;
  movement_type: "IN" | "OUT" | "ADJUSTMENT";
  movement_quantity: number;
  current_stock: number;
}

export interface StockMovement {
  id: number;
  productId: number;
  product_name: string;
  product_sku: string;
  variantId?: number;
  variant_name?: string;
  movement_type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reference_number: string;
  reason: string;
  notes: string;
  created_by: string;
  created_at: string;
  warehouse: string;
  cost_impact: number;
}

export interface CategoryStock {
  categoryId: number;
  category_name: string;
  total_quantity: number;
  total_value: number;
  product_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  percentage_of_total: number;
}

export interface InventoryExportData {
  inventory_items: InventoryItem[];
  stock_movements: StockMovement[];
  category_breakdown: CategoryStock[];
  summary: InventorySummary;
  performance_metrics: PerformanceMetrics;
  date_range: {
    start_date: string;
    end_date: string;
    period: string;
  };
}

export interface InventorySummary {
  total_products: number;
  total_stock_quantity: number;
  total_stock_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_categories: number;
  total_warehouses: number;
  growth_rate: number;
  stock_turnover_rate: number;
  average_stock_value: number;
}

export interface PerformanceMetrics {
  highest_stock_category: string;
  highest_stock_count: number;
  lowest_stock_category: string;
  lowest_stock_count: number;
  stock_turnover_rate: number;
  average_stock_value: number;
  inventory_accuracy: number;
  stockout_rate: number;
  carrying_cost_rate: number;
}

export interface InventoryExportParams {
  format?: "csv" | "excel" | "pdf";
  category?: string;
  warehouse?: string;
  low_stock_only?: "true" | "false";
  out_of_stock_only?: "true" | "false";
  period?:
    | "1week"
    | "2weeks"
    | "1month"
    | "3months"
    | "6months"
    | "1year"
    | "custom";
  start_date?: string;
  end_date?: string;
  movement_type?: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
  group_by?: "day" | "week" | "month" | "category" | "warehouse";
}

export interface InventoryExportResponse {
  status: boolean;
  message: string;
  data: InventoryExportData;
  metadata: {
    generated_at: string;
    total_records: number;
    filters: {
      category?: string;
      warehouse?: string;
      period?: string;
      movement_type?: string;
    };
  };
}

export interface InventoryInsight {
  priority: "HIGH" | "MEDIUM" | "LOW";
  finding: string;
  recommendation: string;
  impact_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: "STOCK" | "MOVEMENT" | "PERFORMANCE" | "COST";
}

class InventoryExportAPI {
  /**
   * Export inventory data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportInventory(params: InventoryExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI?.inventoryExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `Inventory report exported successfully in ${params.format?.toUpperCase()} format.\n\n` +
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

      throw new Error(response.message || "Failed to export inventory data");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export inventory data. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export inventory data");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<InventoryExportParams, "format">,
  ): Promise<InventoryExportData> {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryExport({
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
   * Get category filter options
   */
  async getCategoryOptions(): Promise<Array<{ value: string; label: string }>> {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryExport({
        method: "getCategoryOptions",
        params: {},
      });

      if (response.status) {
        return response.data;
      }
      throw new Error(response.message || "Failed to get category options");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get category options");
    }
  }

  /**
   * Get warehouse filter options
   */
  async getWarehouseOptions(): Promise<
    Array<{ value: string; label: string }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryExport({
        method: "getWarehouseOptions",
        params: {},
      });

      if (response.status) {
        return response.data;
      }
      throw new Error(response.message || "Failed to get warehouse options");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get warehouse options");
    }
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
   * Get movement type filter options
   */
  getMovementTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "IN", label: "Stock In" },
      { value: "OUT", label: "Stock Out" },
      { value: "ADJUSTMENT", label: "Adjustment" },
      { value: "TRANSFER", label: "Transfer" },
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
      { value: "category", label: "By Category" },
      { value: "warehouse", label: "By Warehouse" },
    ];
  }

  /**
   * Generate business insights from inventory data
   */
  generateBusinessInsights(data: InventoryExportData): InventoryInsight[] {
    const insights: InventoryInsight[] = [];
    const summary = data.summary;
    const metrics = data.performance_metrics;

    // Out of stock insight
    if (summary.out_of_stock_items > 0) {
      insights.push({
        priority: "HIGH",
        finding: `${summary.out_of_stock_items} products are out of stock`,
        recommendation: "Prioritize restocking out-of-stock items immediately",
        impact_level: "CRITICAL",
        category: "STOCK",
      });
    }

    // Low stock insight
    if (summary.low_stock_items > 0) {
      insights.push({
        priority: "MEDIUM",
        finding: `${summary.low_stock_items} products are below reorder levels`,
        recommendation:
          "Review and place replenishment orders for low stock items",
        impact_level: "HIGH",
        category: "STOCK",
      });
    }

    // High carrying cost insight
    if (metrics.carrying_cost_rate > 0.25) {
      insights.push({
        priority: "MEDIUM",
        finding: `High inventory carrying cost rate (${(metrics.carrying_cost_rate * 100).toFixed(1)}%)`,
        recommendation: "Optimize inventory levels to reduce carrying costs",
        impact_level: "MEDIUM",
        category: "COST",
      });
    }

    // Low turnover rate insight
    if (metrics.stock_turnover_rate < 2) {
      insights.push({
        priority: "MEDIUM",
        finding: `Low stock turnover rate (${metrics.stock_turnover_rate})`,
        recommendation: "Review product mix and promote slow-moving items",
        impact_level: "MEDIUM",
        category: "PERFORMANCE",
      });
    }

    // High stockout rate insight
    if (metrics.stockout_rate > 0.1) {
      insights.push({
        priority: "HIGH",
        finding: `High stockout rate (${(metrics.stockout_rate * 100).toFixed(1)}%)`,
        recommendation: "Improve demand forecasting and safety stock levels",
        impact_level: "HIGH",
        category: "PERFORMANCE",
      });
    }

    // Inventory accuracy insight
    if (metrics.inventory_accuracy < 0.95) {
      insights.push({
        priority: "MEDIUM",
        finding: `Low inventory accuracy (${(metrics.inventory_accuracy * 100).toFixed(1)}%)`,
        recommendation:
          "Conduct cycle counting and improve inventory processes",
        impact_level: "MEDIUM",
        category: "PERFORMANCE",
      });
    }

    // Category concentration insight
    const topCategory = data.category_breakdown[0];
    if (topCategory && topCategory.percentage_of_total > 0.4) {
      insights.push({
        priority: "LOW",
        finding: `High concentration in '${topCategory.category_name}' category (${topCategory.percentage_of_total.toFixed(1)}%)`,
        recommendation: "Diversify inventory across categories to reduce risk",
        impact_level: "LOW",
        category: "STOCK",
      });
    }

    // Default recommendation if no issues found
    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "Inventory management appears efficient",
        recommendation: "Continue current inventory management practices",
        impact_level: "LOW",
        category: "PERFORMANCE",
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate inventory health score (0-100)
   */
  calculateInventoryHealthScore(data: InventoryExportData): number {
    let score = 100;
    const summary = data.summary;
    const metrics = data.performance_metrics;

    // Deduct for out of stock items
    if (summary.out_of_stock_items > 0) {
      const outOfStockRatio =
        summary.out_of_stock_items / summary.total_products;
      if (outOfStockRatio > 0.1) {
        score -= 30;
      } else if (outOfStockRatio > 0.05) {
        score -= 20;
      } else {
        score -= 10;
      }
    }

    // Deduct for low stock items
    if (summary.low_stock_items > 0) {
      const lowStockRatio = summary.low_stock_items / summary.total_products;
      if (lowStockRatio > 0.2) {
        score -= 20;
      } else if (lowStockRatio > 0.1) {
        score -= 10;
      } else {
        score -= 5;
      }
    }

    // Deduct for low turnover
    if (metrics.stock_turnover_rate < 2) {
      score -= 15;
    } else if (metrics.stock_turnover_rate < 4) {
      score -= 8;
    }

    // Deduct for low inventory accuracy
    if (metrics.inventory_accuracy < 0.95) {
      score -= 10;
    } else if (metrics.inventory_accuracy < 0.98) {
      score -= 5;
    }

    // Deduct for high stockout rate
    if (metrics.stockout_rate > 0.1) {
      score -= 15;
    } else if (metrics.stockout_rate > 0.05) {
      score -= 8;
    }

    return Math.max(0, Math.min(100, score));
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
   * Format inventory data for display
   */
  formatInventoryDisplay(item: InventoryItem): string {
    const baseName = item.variant_name
      ? `${item.product_name} - ${item.variant_name}`
      : item.product_name;
    return `${item.product_sku} - ${baseName} - Stock: ${item.quantity}`;
  }

  /**
   * Get stock status color
   */
  getStockStatusColor(quantity: number, lowStockThreshold: number): string {
    if (quantity === 0) return "red";
    if (quantity <= lowStockThreshold) return "orange";
    return "green";
  }

  /**
   * Get stock status text
   */
  getStockStatus(quantity: number, lowStockThreshold: number): string {
    if (quantity === 0) return "Out of Stock";
    if (quantity <= lowStockThreshold) return "Low Stock";
    return "In Stock";
  }

  /**
   * Get movement type color
   */
  getMovementTypeColor(movementType: string): string {
    const colors: { [key: string]: string } = {
      IN: "green",
      OUT: "red",
      ADJUSTMENT: "blue",
      TRANSFER: "orange",
    };
    return colors[movementType] || "gray";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: InventoryExportParams): string[] {
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
      params.movement_type &&
      !["IN", "OUT", "ADJUSTMENT", "TRANSFER"].includes(params.movement_type)
    ) {
      errors.push("Invalid movement type");
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
      if (!window.backendAPI || !window.backendAPI.inventoryExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryExport({
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
    filters: Omit<InventoryExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryExport({
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
   * Calculate inventory metrics
   */
  calculateInventoryMetrics(data: InventoryExportData): {
    total_inventory_value: number;
    average_stock_value: number;
    slow_moving_ratio: number;
    fast_moving_ratio: number;
    inventory_coverage: number; // in days
    stock_velocity: number;
  } {
    const summary = data.summary;

    // Calculate slow/fast moving ratios (simplified)
    const totalItems = data.inventory_items.length;
    const slowMovingItems = data.inventory_items.filter(
      (item) => item.quantity > item.low_stock_threshold * 3,
    ).length;
    const fastMovingItems = data.inventory_items.filter(
      (item) => item.quantity < item.low_stock_threshold,
    ).length;

    // Simplified calculations - in real scenario, use historical sales data
    const inventory_coverage =
      summary.total_stock_quantity > 0
        ? 30 / (summary.stock_turnover_rate / 12) // Estimated coverage in days
        : 0;

    const stock_velocity =
      summary.total_stock_quantity > 0
        ? summary.stock_turnover_rate / summary.total_stock_quantity
        : 0;

    return {
      total_inventory_value: summary.total_stock_value,
      average_stock_value: summary.average_stock_value,
      slow_moving_ratio: totalItems > 0 ? slowMovingItems / totalItems : 0,
      fast_moving_ratio: totalItems > 0 ? fastMovingItems / totalItems : 0,
      inventory_coverage,
      stock_velocity,
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

export const inventoryExportAPI = new InventoryExportAPI();
