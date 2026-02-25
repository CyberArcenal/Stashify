// src/lib/productExportApi.ts - Product Export API Interfaces

import { dialogs } from "@/renderer/utils/dialogs";
import { fileHandler } from "./fileHandler";
import { formatCurrency } from "@/renderer/utils/formatters";

export interface ProductBasic {
  id: number;
  name: string;
  slug: string;
  sku: string;
  category: string;
  description: string;
  net_price: number;
  display_price: number;
  cost_per_item: number;
  total_quantity: number;
  low_stock_threshold: number;
  low_stock: boolean;
  availability_status: string;
  track_quantity: boolean;
  allow_backorder: boolean;
  compare_price: number;
  barcode: string;
  weight: number;
  dimensions: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  name: string;
  sku: string;
  net_price: number;
  display_price: number;
  cost_per_item: number;
  barcode: string;
  total_quantity: number;
}

export interface ProductExportData extends ProductBasic {
  variants: ProductVariant[];
  warehouse_quantities: { [warehouse: string]: number };
}

export interface ProductExportAnalytics {
  total_products: number;
  published_products: number;
  unpublished_products: number;
  total_stock_value: number;
  low_stock_products: number;
  out_of_stock_products: number;
  avg_net_price: number;
  max_net_price: number;
  min_net_price: number;
  category_breakdown: Array<{
    category__name: string;
    count: number;
    percentage: number;
  }>;
}

export interface ProductExportParams {
  format?: "csv" | "excel" | "pdf";
  category?: string;
  status?: "published" | "unpublished";
  low_stock?: "true" | "false";
  search?: string;
  time_range?: "24h" | "7d" | "30d";
}

export interface ExportResult {
  filename: string;
  fileSize: string;
  mimeType: string;
  fullPath: string;
  downloadUrl?: string; // Optional: for direct download if needed
}

export interface ProductExportResponse {
  status: boolean;
  message: string;
  data: {
    products: ProductExportData[];
    analytics: ProductExportAnalytics;
    filters: {
      category?: string;
      status?: string;
      low_stock?: string;
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

export interface ExportHistoryItem {
  id: number;
  filename: string;
  format: string;
  record_count: number;
  generated_at: string;
  generated_by: string;
  file_size: string;
  filters: any;
  export_type: string;
  created_at: string;
}

export interface ExportTemplate {
  id: number;
  name: string;
  description: string;
  filters: Omit<ProductExportParams, "format">;
  created_by: string;
  created_at: string;
}

class ProductExportAPI {
  /**
   * Export products data in specified format
   * @param params Export parameters including format and filters
   * @returns Export result with file information
   */
  async exportProducts(params: ProductExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI || !window.backendAPI.productExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.productExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Ipakita ang success dialog na may option na i-open ang file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message: `Products exported successfully to: ${fileInfo.filename}\n\nFile saved at: ${fileInfo.fullPath}\n\nDo you want to open the file now?`,
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
            // Ipakita ang error kung hindi ma-open ang file
            await dialogs.error(
              "The file was exported successfully but could not be opened automatically. " +
                "You can find it in your Downloads folder.",
              "File Export Complete",
            );
          }
        }

        // Return the file information for UI display
        return fileInfo;
      }
      throw new Error(response.message || "Failed to export products");
    } catch (error: any) {
      console.error("Export error:", error);

      // Ipakita ang error dialog
      await dialogs.error(
        error.message || "Failed to export products. Please try again.",
        "Export Failed",
      );

      throw new Error(error.message || "Failed to export products");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<ProductExportParams, "format">,
  ): Promise<ProductExportResponse["data"]> {
    try {
      if (!window.backendAPI || !window.backendAPI.productExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.productExport({
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
   * Get product status filter options
   */
  getProductStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "published", label: "Published" },
      { value: "unpublished", label: "Unpublished" },
    ];
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
    analytics: ProductExportAnalytics,
    products: ProductExportData[],
  ): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    // Out of stock insight
    if (analytics.out_of_stock_products > 0) {
      insights.push({
        priority: "HIGH",
        finding: `${analytics.out_of_stock_products} products are out of stock`,
        recommendation:
          "Prioritize restocking out-of-stock items to avoid lost sales",
        impact_level: "CRITICAL",
      });
    }

    // Low stock insight
    if (analytics.low_stock_products > 0) {
      insights.push({
        priority: "MEDIUM",
        finding: `${analytics.low_stock_products} products are low on stock`,
        recommendation:
          "Review inventory levels and place replenishment orders",
        impact_level: "HIGH",
      });
    }

    // Unpublished products insight
    const unpublishedRate =
      analytics.total_products > 0
        ? analytics.unpublished_products / analytics.total_products
        : 0;

    if (unpublishedRate > 0.5) {
      insights.push({
        priority: "MEDIUM",
        finding: `High percentage of unpublished products (${(unpublishedRate * 100).toFixed(1)}%)`,
        recommendation:
          "Review and publish products to increase storefront visibility",
        impact_level: "MEDIUM",
      });
    }

    // Pricing insight
    if (analytics.avg_net_price < 10) {
      insights.push({
        priority: "LOW",
        finding: `Low average product price (${formatCurrency(analytics.avg_net_price)})`,
        recommendation:
          "Consider premium products or price optimization strategies",
        impact_level: "MEDIUM",
      });
    }

    // Category concentration insight
    if (
      analytics.category_breakdown &&
      analytics.category_breakdown.length > 0
    ) {
      const mainCategory = analytics.category_breakdown.reduce(
        (prev, current) => (prev.count > current.count ? prev : current),
      );
      const concentration = mainCategory.count / analytics.total_products;

      if (concentration > 0.5) {
        insights.push({
          priority: "LOW",
          finding: `High category concentration in '${mainCategory.category__name}' (${(concentration * 100).toFixed(1)}%)`,
          recommendation: "Diversify product categories to reduce risk",
          impact_level: "LOW",
        });
      }
    }

    // Stock value insight
    if (analytics.total_stock_value < 1000) {
      insights.push({
        priority: "LOW",
        finding: `Low total stock value (${formatCurrency(analytics.total_stock_value)})`,
        recommendation: "Consider increasing inventory investment",
        impact_level: "MEDIUM",
      });
    }

    // Default recommendation if no issues found
    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "Product portfolio appears healthy",
        recommendation: "Continue current inventory management practices",
        impact_level: "LOW",
      });
    }

    return insights;
  }

  /**
   * Calculate product portfolio score (0-100)
   */
  calculateProductPortfolioScore(
    analytics: ProductExportAnalytics,
    products: ProductExportData[],
  ): number {
    let score = 100;

    // Deduct for out of stock products
    if (analytics.out_of_stock_products > 0) {
      const outOfStockRatio =
        analytics.out_of_stock_products / analytics.total_products;
      if (outOfStockRatio > 0.1) {
        score -= 40;
      } else if (outOfStockRatio > 0.05) {
        score -= 20;
      } else {
        score -= 10;
      }
    }

    // Deduct for low stock products
    if (analytics.low_stock_products > 0) {
      const lowStockRatio =
        analytics.low_stock_products / analytics.total_products;
      if (lowStockRatio > 0.2) {
        score -= 20;
      } else if (lowStockRatio > 0.1) {
        score -= 10;
      } else {
        score -= 5;
      }
    }

    // Deduct for low publication rate
    const publicationRate =
      analytics.published_products / analytics.total_products;
    if (publicationRate < 0.5) {
      score -= 15;
    } else if (publicationRate < 0.7) {
      score -= 8;
    }

    // Deduct for low average price
    if (analytics.avg_net_price < 10) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Get product portfolio level
   */
  getProductPortfolioLevel(
    score: number,
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 90) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "FAIR";
    return "POOR";
  }

  /**
   * Format product data for display
   */
  formatProductDisplay(product: ProductExportData): string {
    return `${product.sku} - ${product.name} - $${product.display_price}`;
  }

  /**
   * Get product status color
   */
  getProductStatusColor(isPublished: boolean): string {
    return isPublished ? "green" : "orange";
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
   * Get availability status text
   */
  getAvailabilityStatus(
    quantity: number,
    lowStockThreshold: number,
    allowBackorder: boolean,
  ): string {
    if (quantity === 0) {
      return allowBackorder ? "Backorder" : "Out of Stock";
    }
    if (quantity <= lowStockThreshold) return "Low Stock";
    return "In Stock";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: ProductExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.status &&
      !this.getProductStatusOptions().some((opt) => opt.value === params.status)
    ) {
      errors.push("Invalid product status");
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
  async getExportHistory(): Promise<ExportHistoryItem[]> {
    try {
      if (!window.backendAPI || !window.backendAPI.productExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.productExport({
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
    filters: Omit<ProductExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.productExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.productExport({
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
      if (!window.backendAPI || !window.backendAPI.productExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.productExport({
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
  async getExportTemplates(): Promise<ExportTemplate[]> {
    try {
      if (!window.backendAPI || !window.backendAPI.productExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.productExport({
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
    filters: Omit<ProductExportParams, "format">;
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.productExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.productExport({
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
   * Get product analytics summary
   */
  getProductAnalyticsSummary(analytics: ProductExportAnalytics): {
    total_products: number;
    published_products: number;
    unpublished_products: number;
    total_stock_value: number;
    low_stock_products: number;
    out_of_stock_products: number;
    publication_rate: number;
    stock_health_score: number;
    average_price: number;
  } {
    return {
      total_products: analytics.total_products,
      published_products: analytics.published_products,
      unpublished_products: analytics.unpublished_products,
      total_stock_value: analytics.total_stock_value,
      low_stock_products: analytics.low_stock_products,
      out_of_stock_products: analytics.out_of_stock_products,
      publication_rate:
        analytics.total_products > 0
          ? analytics.published_products / analytics.total_products
          : 0,
      stock_health_score:
        analytics.total_products > 0
          ? 100 -
            ((analytics.out_of_stock_products + analytics.low_stock_products) /
              analytics.total_products) *
              100
          : 100,
      average_price: analytics.avg_net_price,
    };
  }

  /**
   * Get product performance metrics
   */
  getProductPerformanceMetrics(product: ProductExportData): {
    stock_health: number;
    pricing_score: number;
    completeness: number;
    overall_score: number;
  } {
    let stock_health = 100;
    let pricing_score = 100;
    let completeness = 100;

    // Stock health calculation
    if (product.total_quantity === 0) {
      stock_health = product.allow_backorder ? 50 : 0;
    } else if (product.low_stock) {
      stock_health = 60;
    }

    // Pricing score calculation
    if (product.net_price < 5) {
      pricing_score = 70; // Very low price
    } else if (product.net_price < 20) {
      pricing_score = 85; // Low price
    } else if (product.net_price > 200) {
      pricing_score = 90; // Premium price
    }

    // Completeness calculation
    if (!product.is_published) {
      completeness -= 30;
    }
    if (!product.description || product.description.length < 10) {
      completeness -= 20;
    }
    if (!product.barcode) {
      completeness -= 10;
    }

    const overall_score = (stock_health + pricing_score + completeness) / 3;

    return {
      stock_health: Math.max(0, stock_health),
      pricing_score: Math.max(0, pricing_score),
      completeness: Math.max(0, completeness),
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
   * Get category options from analytics
   */
  getCategoryOptions(
    analytics: ProductExportAnalytics,
  ): Array<{ value: string; label: string }> {
    if (!analytics.category_breakdown) return [];

    return analytics.category_breakdown.map((category) => ({
      value: category.category__name,
      label: `${category.category__name} (${category.count})`,
    }));
  }

  /**
   * Calculate inventory turnover metrics
   */
  calculateInventoryMetrics(products: ProductExportData[]): {
    total_inventory_value: number;
    average_inventory_value: number;
    slow_moving_items: number;
    fast_moving_items: number;
    inventory_turnover_estimate: number;
  } {
    const total_inventory_value = products.reduce(
      (sum, product) => sum + product.net_price * product.total_quantity,
      0,
    );

    const average_inventory_value =
      products.length > 0 ? total_inventory_value / products.length : 0;

    // Simplified estimation - in real scenario, you'd have sales data
    const slow_moving_items = products.filter(
      (product) => product.total_quantity > 50 && product.net_price > 100,
    ).length;

    const fast_moving_items = products.filter(
      (product) => product.total_quantity < 10 && product.net_price < 50,
    ).length;

    const inventory_turnover_estimate =
      total_inventory_value > 0
        ? (total_inventory_value * 0.3) / total_inventory_value // Simplified ratio
        : 0;

    return {
      total_inventory_value,
      average_inventory_value,
      slow_moving_items,
      fast_moving_items,
      inventory_turnover_estimate,
    };
  }

  /**
   * Open exported file in default application
   */
}

export const productExportAPI = new ProductExportAPI();
