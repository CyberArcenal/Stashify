// src/lib/variantExportApi.ts - Variant Export API Interfaces

import { dialogs } from "../../utils/dialogs";
import { fileHandler } from "./fileHandler";
import type { ExportResult } from "./product";

export interface VariantBasic {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  product_name: string;
  product_sku: string;
  category: string;
  net_price: number;
  display_price: number;
  cost_per_item: number;
  vat_amount: number;
  total_stock: number;
  product_low_stock_threshold: number;
  stock_status: string;
  is_low_stock: boolean;
  created_at: string;
}

export interface WarehouseQuantity {
  [warehouse: string]: number;
}

export interface VariantExportData extends VariantBasic {
  warehouse_distribution: WarehouseQuantity;
}

export interface VariantExportAnalytics {
  total_variants: number;
  total_stock_value: number;
  low_stock_variants: number;
  out_of_stock_variants: number;
  avg_net_price: number;
  product_breakdown: Array<{
    product__name: string;
    product__sku: string;
    variant_count: number;
  }>;
}

export interface VariantExportParams {
  format?: "csv" | "excel" | "pdf";
  product?: string;
  category?: string;
  low_stock?: "true" | "false";
  search?: string;
}

export interface VariantExportResponse {
  status: boolean;
  message: string;
  data: {
    variants: VariantExportData[];
    analytics: VariantExportAnalytics;
    filters: {
      product?: string;
      category?: string;
      low_stock?: string;
      search?: string;
    };
    metadata: {
      generated_at: string;
      total_records: number;
    };
  };
}

export interface VariantBusinessInsight {
  priority: "HIGH" | "MEDIUM" | "LOW";
  finding: string;
  recommendation: string;
  impact_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

class VariantExportAPI {
  /**
   * Export variants data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportVariants(params: VariantExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI?.variantExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.variantExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `Variants exported successfully in ${params.format?.toUpperCase()} format.\n\n` +
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

      throw new Error(response.message || "Failed to export variants");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export variants. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export variants");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<VariantExportParams, "format">,
  ): Promise<VariantExportResponse["data"]> {
    try {
      if (!window.backendAPI || !window.backendAPI.variantExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.variantExport({
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
   * Get product filter options
   */
  getProductOptions(): Array<{ value: string; label: string }> {
    return [{ value: "all", label: "All Products" }];
  }

  /**
   * Get low stock filter options
   */
  getLowStockOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "true", label: "Low Stock Only" },
      { value: "false", label: "All Stock Levels" },
    ];
  }

  /**
   * Generate business insights from analytics data
   */
  generateBusinessInsights(
    analytics: VariantExportAnalytics,
    variants: VariantExportData[],
  ): VariantBusinessInsight[] {
    const insights: VariantBusinessInsight[] = [];

    if (analytics.out_of_stock_variants > 0) {
      insights.push({
        priority: "HIGH",
        finding: `${analytics.out_of_stock_variants} variants are out of stock`,
        recommendation:
          "Prioritize restocking out-of-stock variants to avoid lost sales",
        impact_level: "CRITICAL",
      });
    }

    if (analytics.low_stock_variants > 0) {
      insights.push({
        priority: "MEDIUM",
        finding: `${analytics.low_stock_variants} variants are low on stock`,
        recommendation:
          "Review inventory levels and place replenishment orders for low stock variants",
        impact_level: "HIGH",
      });
    }

    if (analytics.total_stock_value < 1000) {
      insights.push({
        priority: "LOW",
        finding: `Low total stock value (${this.formatCurrency(analytics.total_stock_value)})`,
        recommendation: "Consider increasing inventory investment for variants",
        impact_level: "MEDIUM",
      });
    }

    if (analytics.product_breakdown && analytics.product_breakdown.length > 0) {
      const mainProduct = analytics.product_breakdown.reduce((prev, current) =>
        prev.variant_count > current.variant_count ? prev : current,
      );
      const concentration =
        mainProduct.variant_count / analytics.total_variants;

      if (concentration > 0.5) {
        insights.push({
          priority: "LOW",
          finding: `High variant concentration in '${mainProduct.product__name}' (${(concentration * 100).toFixed(1)}%)`,
          recommendation:
            "Diversify variants across more products to reduce risk",
          impact_level: "LOW",
        });
      }
    }

    if (analytics.avg_net_price < 5) {
      insights.push({
        priority: "LOW",
        finding: `Low average variant price (${this.formatCurrency(analytics.avg_net_price)})`,
        recommendation:
          "Consider premium variants or price optimization strategies",
        impact_level: "MEDIUM",
      });
    }

    const variantsWithSingleWarehouse = variants.filter(
      (variant) => Object.keys(variant.warehouse_distribution).length === 1,
    ).length;

    if (variantsWithSingleWarehouse / variants.length > 0.8) {
      insights.push({
        priority: "MEDIUM",
        finding: `High percentage of variants (${((variantsWithSingleWarehouse / variants.length) * 100).toFixed(1)}%) stored in single warehouse`,
        recommendation:
          "Consider distributing inventory across multiple warehouses for better availability",
        impact_level: "MEDIUM",
      });
    }

    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "Variant portfolio appears healthy",
        recommendation: "Continue current inventory management practices",
        impact_level: "LOW",
      });
    }

    return insights;
  }

  /**
   * Calculate variant portfolio score (0-100)
   */
  calculateVariantPortfolioScore(
    analytics: VariantExportAnalytics,
    variants: VariantExportData[],
  ): number {
    let score = 100;

    if (analytics.out_of_stock_variants > 0) {
      const outOfStockRatio =
        analytics.out_of_stock_variants / analytics.total_variants;
      if (outOfStockRatio > 0.1) {
        score -= 40;
      } else if (outOfStockRatio > 0.05) {
        score -= 20;
      } else {
        score -= 10;
      }
    }

    if (analytics.low_stock_variants > 0) {
      const lowStockRatio =
        analytics.low_stock_variants / analytics.total_variants;
      if (lowStockRatio > 0.2) {
        score -= 20;
      } else if (lowStockRatio > 0.1) {
        score -= 10;
      } else {
        score -= 5;
      }
    }

    if (analytics.avg_net_price < 5) {
      score -= 10;
    }

    const variantsWithMultipleWarehouses = variants.filter(
      (variant) => Object.keys(variant.warehouse_distribution).length > 1,
    ).length;

    const multiWarehouseRatio =
      variantsWithMultipleWarehouses / variants.length;
    if (multiWarehouseRatio < 0.2) {
      score -= 10;
    } else if (multiWarehouseRatio < 0.4) {
      score -= 5;
    }

    return Math.max(0, score);
  }

  /**
   * Get variant portfolio level
   */
  getVariantPortfolioLevel(
    score: number,
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 90) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "FAIR";
    return "POOR";
  }

  /**
   * Format variant data for display
   */
  formatVariantDisplay(variant: VariantExportData): string {
    return `${variant.sku} - ${variant.name} - $${variant.display_price}`;
  }

  /**
   * Get stock status color
   */
  getStockStatusColor(stockStatus: string): string {
    switch (stockStatus) {
      case "Out of Stock":
        return "red";
      case "Critical":
        return "red";
      case "Very Low":
        return "orange";
      case "Low Stock":
        return "orange";
      case "Adequate":
        return "green";
      default:
        return "gray";
    }
  }

  /**
   * Get stock priority
   */
  getStockPriority(stockStatus: string): "HIGH" | "MEDIUM" | "LOW" {
    switch (stockStatus) {
      case "Out of Stock":
      case "Critical":
        return "HIGH";
      case "Very Low":
      case "Low Stock":
        return "MEDIUM";
      default:
        return "LOW";
    }
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: VariantExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.low_stock &&
      !this.getLowStockOptions().some((opt) => opt.value === params.low_stock)
    ) {
      errors.push("Invalid low stock filter");
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
      if (!window.backendAPI || !window.backendAPI.variantExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.variantExport({
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
    filters: Omit<VariantExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.variantExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.variantExport({
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
      if (!window.backendAPI || !window.backendAPI.variantExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.variantExport({
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
      filters: Omit<VariantExportParams, "format">;
      created_by: string;
      created_at: string;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.variantExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.variantExport({
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
    filters: Omit<VariantExportParams, "format">;
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.variantExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.variantExport({
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
   * Get variant analytics summary
   */
  getVariantAnalyticsSummary(analytics: VariantExportAnalytics): {
    total_variants: number;
    total_stock_value: number;
    low_stock_variants: number;
    out_of_stock_variants: number;
    stock_health_score: number;
    average_price: number;
    variants_per_product: number;
  } {
    const variantsPerProduct =
      analytics.product_breakdown.length > 0
        ? analytics.total_variants / analytics.product_breakdown.length
        : 0;

    return {
      total_variants: analytics.total_variants,
      total_stock_value: analytics.total_stock_value,
      low_stock_variants: analytics.low_stock_variants,
      out_of_stock_variants: analytics.out_of_stock_variants,
      stock_health_score:
        analytics.total_variants > 0
          ? 100 -
            ((analytics.out_of_stock_variants + analytics.low_stock_variants) /
              analytics.total_variants) *
              100
          : 100,
      average_price: analytics.avg_net_price,
      variants_per_product: variantsPerProduct,
    };
  }

  /**
   * Get variant performance metrics
   */
  getVariantPerformanceMetrics(variant: VariantExportData): {
    stock_health: number;
    pricing_score: number;
    warehouse_distribution: number;
    overall_score: number;
  } {
    let stock_health = 100;
    let pricing_score = 100;
    let warehouse_distribution = 100;

    switch (variant.stock_status) {
      case "Out of Stock":
        stock_health = 0;
        break;
      case "Critical":
        stock_health = 20;
        break;
      case "Very Low":
        stock_health = 40;
        break;
      case "Low Stock":
        stock_health = 60;
        break;
      default:
        stock_health = 100;
    }

    if (variant.net_price < 2) {
      pricing_score = 70;
    } else if (variant.net_price < 10) {
      pricing_score = 85;
    } else if (variant.net_price > 50) {
      pricing_score = 90;
    }

    const warehouseCount = Object.keys(variant.warehouse_distribution).length;
    if (warehouseCount === 0) {
      warehouse_distribution = 0;
    } else if (warehouseCount === 1) {
      warehouse_distribution = 60;
    } else if (warehouseCount >= 2) {
      warehouse_distribution = 100;
    }

    const overall_score =
      (stock_health + pricing_score + warehouse_distribution) / 3;

    return {
      stock_health: Math.max(0, stock_health),
      pricing_score: Math.max(0, pricing_score),
      warehouse_distribution: Math.max(0, warehouse_distribution),
      overall_score: Math.max(0, overall_score),
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

  /**
   * Get product options from analytics
   */
  getProductOptionsFromAnalytics(
    analytics: VariantExportAnalytics,
  ): Array<{ value: string; label: string }> {
    if (!analytics.product_breakdown) return [];

    return analytics.product_breakdown.map((product) => ({
      value: product.product__sku,
      label: `${product.product__name} (${product.variant_count} variants)`,
    }));
  }

  /**
   * Calculate inventory turnover metrics for variants
   */
  calculateVariantInventoryMetrics(variants: VariantExportData[]): {
    total_inventory_value: number;
    average_inventory_value: number;
    slow_moving_variants: number;
    fast_moving_variants: number;
    warehouse_coverage: number;
  } {
    const total_inventory_value = variants.reduce(
      (sum, variant) => sum + variant.net_price * variant.total_stock,
      0,
    );

    const average_inventory_value =
      variants.length > 0 ? total_inventory_value / variants.length : 0;

    const slow_moving_variants = variants.filter(
      (variant) => variant.total_stock > 20 && variant.net_price > 25,
    ).length;

    const fast_moving_variants = variants.filter(
      (variant) => variant.total_stock < 5 && variant.net_price < 15,
    ).length;

    const variantsWithMultipleWarehouses = variants.filter(
      (variant) => Object.keys(variant.warehouse_distribution).length > 1,
    ).length;

    const warehouse_coverage =
      variants.length > 0
        ? variantsWithMultipleWarehouses / variants.length
        : 0;

    return {
      total_inventory_value,
      average_inventory_value,
      slow_moving_variants,
      fast_moving_variants,
      warehouse_coverage,
    };
  }

  /**
   * Get warehouse distribution summary
   */
  getWarehouseDistributionSummary(variants: VariantExportData[]): {
    warehouse_counts: { [warehouse: string]: number };
    total_warehouses: number;
    most_used_warehouse: string;
  } {
    const warehouseCounts: { [warehouse: string]: number } = {};

    variants.forEach((variant) => {
      Object.keys(variant.warehouse_distribution).forEach((warehouse) => {
        warehouseCounts[warehouse] = (warehouseCounts[warehouse] || 0) + 1;
      });
    });

    const totalWarehouses = Object.keys(warehouseCounts).length;
    const mostUsedWarehouse =
      totalWarehouses > 0
        ? Object.keys(warehouseCounts).reduce((a, b) =>
            warehouseCounts[a] > warehouseCounts[b] ? a : b,
          )
        : "None";

    return {
      warehouse_counts: warehouseCounts,
      total_warehouses: totalWarehouses,
      most_used_warehouse: mostUsedWarehouse,
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
}

export const variantExportAPI = new VariantExportAPI();
