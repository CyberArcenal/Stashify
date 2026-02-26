// src/lib/warehouseExportApi.ts - Warehouse Export API Interfaces

import { dialogs } from "../../utils/dialogs";
import { fileHandler } from "./fileHandler";
import type { ExportResult } from "./product";

export interface WarehouseBasic {
  id: number;
  name: string;
  location: string;
  type: "warehouse" | "store" | "online";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface WarehouseCapacity {
  warehouseId: number;
  max_capacity: number;
  current_utilization: number;
  available_space: number;
  utilization_percentage: number;
}

export interface WarehousePerformance {
  warehouseId: number;
  month: string;
  total_shipments: number;
  on_time_delivery: number;
  accuracy_rate: number;
  efficiency_score: number;
}

export interface WarehouseExportParams {
  format?: "csv" | "excel" | "pdf";
  type?: string;
  status?: "active" | "inactive";
  search?: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  time_range?: "24h" | "7d" | "30d";
}

export interface WarehouseStockAnalytics {
  total_items: number;
  total_quantity: number;
  low_stock_items: number;
  out_of_stock_items: number;
}

export interface WarehouseStockItem {
  product_name: string;
  quantity: number;
  reorder_level: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

export interface WarehouseExportData {
  id: number;
  name: string;
  location: string;
  type: string;
  type_display: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stock_analytics: WarehouseStockAnalytics;
  stock_items: WarehouseStockItem[];
}

export interface WarehouseExportAnalytics {
  total_warehouses: number;
  active_warehouses: number;
  inactive_warehouses: number;
  type_breakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export interface WarehouseExportResponse {
  status: boolean;
  message: string;
  data: {
    warehouses: WarehouseExportData[];
    analytics: WarehouseExportAnalytics;
    filters: {
      type?: string;
      status?: string;
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

class WarehouseExportAPI {
  /**
   * Export warehouses data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportWarehouses(params: WarehouseExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI?.warehouseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.warehouseExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `Warehouses exported successfully in ${params.format?.toUpperCase()} format.\n\n` +
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

      throw new Error(response.message || "Failed to export warehouses");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export warehouses. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export warehouses");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<WarehouseExportParams, "format">,
  ): Promise<WarehouseExportResponse["data"]> {
    try {
      if (!window.backendAPI || !window.backendAPI.warehouseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.warehouseExport({
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
   * Get warehouse type filter options
   */
  getWarehouseTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "warehouse", label: "Warehouse" },
      { value: "store", label: "Store" },
      { value: "online", label: "Online" },
    ];
  }

  /**
   * Get status filter options
   */
  getStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ];
  }

  /**
   * Generate business insights from analytics data
   */
  generateBusinessInsights(
    analytics: WarehouseExportAnalytics,
    warehouses: WarehouseExportData[],
  ): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    if (analytics.inactive_warehouses > 0) {
      insights.push({
        priority: "MEDIUM",
        finding: `${analytics.inactive_warehouses} inactive warehouses`,
        recommendation:
          "Review inactive warehouses for potential reactivation or closure",
        impact_level: "MEDIUM",
      });
    }

    const totalLowStock = warehouses.reduce(
      (sum, warehouse) => sum + warehouse.stock_analytics.low_stock_items,
      0,
    );
    if (totalLowStock > 0) {
      insights.push({
        priority: "HIGH",
        finding: `${totalLowStock} items across warehouses are low on stock`,
        recommendation: "Initiate stock replenishment for low stock items",
        impact_level: "HIGH",
      });
    }

    const totalOutOfStock = warehouses.reduce(
      (sum, warehouse) => sum + warehouse.stock_analytics.out_of_stock_items,
      0,
    );
    if (totalOutOfStock > 0) {
      insights.push({
        priority: "HIGH",
        finding: `${totalOutOfStock} items are out of stock`,
        recommendation:
          "Urgently restock out-of-stock items to avoid lost sales",
        impact_level: "CRITICAL",
      });
    }

    if (analytics.type_breakdown && analytics.type_breakdown.length > 0) {
      const mainType = analytics.type_breakdown.reduce((prev, current) =>
        prev.count > current.count ? prev : current,
      );
      const concentration = mainType.count / analytics.total_warehouses;

      if (concentration > 0.7) {
        insights.push({
          priority: "LOW",
          finding: `High concentration of '${mainType.type}' type warehouses (${(concentration * 100).toFixed(1)}%)`,
          recommendation:
            "Consider diversifying warehouse types for better distribution",
          impact_level: "LOW",
        });
      }
    }

    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "Warehouse management appears healthy",
        recommendation: "Continue current warehouse management practices",
        impact_level: "LOW",
      });
    }

    return insights;
  }

  /**
   * Calculate warehouse utilization score (0-100)
   */
  calculateWarehouseUtilizationScore(
    warehouses: WarehouseExportData[],
  ): number {
    if (warehouses.length === 0) return 100;

    let totalScore = 0;
    warehouses.forEach((warehouse) => {
      let score = 100;

      if (!warehouse.is_active) {
        score -= 50;
      }

      const lowStockRatio =
        warehouse.stock_analytics.low_stock_items /
        warehouse.stock_analytics.total_items;
      if (lowStockRatio > 0.1) {
        score -= 20;
      } else if (lowStockRatio > 0.05) {
        score -= 10;
      }

      const outOfStockRatio =
        warehouse.stock_analytics.out_of_stock_items /
        warehouse.stock_analytics.total_items;
      if (outOfStockRatio > 0.05) {
        score -= 30;
      } else if (outOfStockRatio > 0.02) {
        score -= 15;
      }

      totalScore += Math.max(0, score);
    });

    return totalScore / warehouses.length;
  }

  /**
   * Get warehouse utilization level
   */
  getWarehouseUtilizationLevel(
    score: number,
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 90) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "FAIR";
    return "POOR";
  }

  /**
   * Format warehouse data for display
   */
  formatWarehouseDisplay(warehouse: WarehouseExportData): string {
    return `${warehouse.name} - ${warehouse.location}`;
  }

  /**
   * Get warehouse status color
   */
  getWarehouseStatusColor(isActive: boolean): string {
    return isActive ? "green" : "red";
  }

  /**
   * Get warehouse type color
   */
  getWarehouseTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      warehouse: "blue",
      store: "green",
      online: "purple",
    };
    return colors[type] || "gray";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: WarehouseExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.type &&
      !this.getWarehouseTypeOptions().some((opt) => opt.value === params.type)
    ) {
      errors.push("Invalid warehouse type");
    }

    if (
      params.status &&
      !this.getStatusOptions().some((opt) => opt.value === params.status)
    ) {
      errors.push("Invalid status");
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
      if (!window.backendAPI || !window.backendAPI.warehouseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.warehouseExport({
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
    filters: Omit<WarehouseExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.warehouseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.warehouseExport({
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
      if (!window.backendAPI || !window.backendAPI.warehouseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.warehouseExport({
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
      filters: Omit<WarehouseExportParams, "format">;
      created_by: string;
      created_at: string;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.warehouseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.warehouseExport({
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
    filters: Omit<WarehouseExportParams, "format">;
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.warehouseExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.warehouseExport({
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
   * Get warehouse stock analytics summary
   */
  getWarehouseStockSummary(warehouses: WarehouseExportData[]): {
    total_warehouses: number;
    total_items: number;
    total_quantity: number;
    total_low_stock: number;
    total_out_of_stock: number;
    average_items_per_warehouse: number;
    average_quantity_per_warehouse: number;
  } {
    const total_warehouses = warehouses.length;
    const total_items = warehouses.reduce(
      (sum, warehouse) => sum + warehouse.stock_analytics.total_items,
      0,
    );
    const total_quantity = warehouses.reduce(
      (sum, warehouse) => sum + warehouse.stock_analytics.total_quantity,
      0,
    );
    const total_low_stock = warehouses.reduce(
      (sum, warehouse) => sum + warehouse.stock_analytics.low_stock_items,
      0,
    );
    const total_out_of_stock = warehouses.reduce(
      (sum, warehouse) => sum + warehouse.stock_analytics.out_of_stock_items,
      0,
    );

    return {
      total_warehouses,
      total_items,
      total_quantity,
      total_low_stock,
      total_out_of_stock,
      average_items_per_warehouse:
        total_warehouses > 0 ? total_items / total_warehouses : 0,
      average_quantity_per_warehouse:
        total_warehouses > 0 ? total_quantity / total_warehouses : 0,
    };
  }

  /**
   * Get warehouse performance metrics
   */
  getWarehousePerformanceMetrics(warehouse: WarehouseExportData): {
    stock_health: number;
    utilization: number;
    efficiency: number;
    overall_score: number;
  } {
    let stock_health = 100;
    let utilization = 100;
    let efficiency = 100;

    const totalItems = warehouse.stock_analytics.total_items;
    if (totalItems > 0) {
      const lowStockRatio =
        warehouse.stock_analytics.low_stock_items / totalItems;
      const outOfStockRatio =
        warehouse.stock_analytics.out_of_stock_items / totalItems;

      if (outOfStockRatio > 0.05) {
        stock_health -= 40;
      } else if (outOfStockRatio > 0.02) {
        stock_health -= 20;
      }

      if (lowStockRatio > 0.1) {
        stock_health -= 30;
      } else if (lowStockRatio > 0.05) {
        stock_health -= 15;
      }
    }

    if (totalItems < 10) {
      utilization = 50;
    } else if (totalItems < 50) {
      utilization = 75;
    } else {
      utilization = 95;
    }

    if (!warehouse.is_active) {
      efficiency = 30;
    }

    const overall_score = (stock_health + utilization + efficiency) / 3;

    return {
      stock_health: Math.max(0, stock_health),
      utilization: Math.max(0, utilization),
      efficiency: Math.max(0, efficiency),
      overall_score: Math.max(0, overall_score),
    };
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
}

export const warehouseExportAPI = new WarehouseExportAPI();
