import { resolvePath } from "react-router-dom";
import { fileHandler } from "../exports/fileHandler";
import type { ExportResult } from "../exports/product";
import { dialogs } from "../../utils/dialogs";

export interface LowStockItem {
  id: number; // Stock item ID
  productId: number;
  variantId?: number;
  warehouseId: number;
  product: string;
  variant: string;
  category: string;
  categoryId?: number;
  warehouse: string;
  warehouseType: string;
  warehouseLocation: string;
  currentStock: number;
  reorderLevel: number;
  effectiveReorderLevel: number;
  adjustedReorderLevel: number;
  supplier: string;
  lastUpdated: string;
  status: "Critical" | "Low Stock" | "Very Low" | "Out of Stock" | "Adequate";
  stockRatio: number;
  stockValue: number;
  salesVelocity: number;
  daysOfSupply: number | null;
  urgencyScore: number;
  sku?: string;
  costPerItem?: number;
  netPrice?: number;
  potentialRevenue?: number;
  itemType: "product" | "variant";
  deductionStrategy?: string;
  allowNegativeStock?: number;
  otherWarehouses: WarehouseInfo[];
  // Legacy field for compatibility
  warehouseDistribution: WarehouseInfo[];
}

export interface WarehouseInfo {
  warehouse: string;
  location: string;
  quantity: number;
  status: string;
}

export interface ChartData {
  name: string;
  stock?: number;
  reorderLevel?: number;
  urgencyScore?: number;
  category?: string;
  value?: number;
  count?: number;
  totalValue?: number;
  averageUrgency?: number;
  color?: string;
  warehouse?: string;
  criticalCount?: number;
  outOfStockCount?: number;
}

export interface PerformanceSummary {
  mostCriticalCategory: string;
  criticalProductsCount: number;
  mostCriticalWarehouse: string;
  criticalItemsInWarehouse: number;
  avgStockRatio: number;
  needsImmediateAttention: number;
  avgUrgencyScore: number;
  highestRiskProduct: string;
  highestRiskVariant: string;
  highestRiskWarehouse: string;
  highestRiskScore: number;
  outOfStockCount: number;
  totalAffectedWarehouses: number;
}

export interface Recommendation {
  type: string;
  title: string;
  description: string;
  action: string;
  priority: number;
}

export interface LowStockReportData {
  stockItems: LowStockItem[];
  summary: {
    totalStockItems: number;
    totalProducts: number;
    totalVariants: number;
    lowStockCount: number;
    affectedWarehouses: number;
    affectedCategories: number;
    criticalStockCount: number;
    veryLowStockCount: number;
    outOfStockCount: number;
    lowStockCountDetailed: number;
    lowStockPercentage: number;
    totalStockValue: number;
    estimatedReorderCost: number;
    potentialRevenueLoss: number;
    itemBreakdown: {
      products: number;
      variants: number;
      warehouses: number;
    };
  };
  charts: {
    barChart: ChartData[];
    pieChart: ChartData[];
    trendChart?: ChartData[];
    warehouseChart?: ChartData[];
  };
  performanceSummary: PerformanceSummary;
  recommendations?: Recommendation[];
  metadata?: {
    generatedAt: string;
    totalStockItemsAnalyzed: number;
    totalProductsAnalyzed: number;
    filtersApplied: {
      category?: string;
      thresholdMultiplier: number;
      limit: number;
    };
    itemBreakdown: {
      products: number;
      variants: number;
      warehouses: number;
    };
    reportType: string;
  };
}

export interface LowStockResponse {
  status: boolean;
  message: string;
  data: LowStockReportData;
}

export interface ExportResponse {
  status: boolean;
  message: string;
  data?: {
    downloadUrl?: string;
    csvContent?: string;
    fileName?: string;
    format?: string;
    generatedAt?: string;
  };
}

class LowStockAPI {
  async getLowStockReport(params?: {
    category?: string;
    threshold_multiplier?: number;
    limit?: number;
  }): Promise<LowStockReportData> {
    try {
      if (!window.backendAPI?.lowStock) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.lowStock({
        method: "getLowStockReport",
        params: params || {},
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to fetch low stock report data",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch low stock report data");
    }
  }

  async refreshLowStockReport(params?: {
    category?: string;
    threshold_multiplier?: number;
    limit?: number;
  }): Promise<LowStockReportData> {
    try {
      if (!window.backendAPI?.lowStock) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.lowStock({
        method: "refreshLowStockReport",
        params: {
          ...params,
          refresh: true,
          timestamp: new Date().getTime(),
        },
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to refresh low stock report data",
      );
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to refresh low stock report data",
      );
    }
  }

  async exportLowStock(params: {
    category?: string;
    threshold_multiplier?: number;
    format: "pdf" | "csv" | "excel";
  }): Promise<ExportResult> {
    try {
      if (!window.backendAPI || !window.backendAPI.lowOfStockExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.lowOfStockExport({
        method: "export", // ✅ matches LowStockExportHandler
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Ipakita ang success dialog na may option na i-open ang file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message: `Low stock report exported successfully to: ${fileInfo.filename}\n\nFile saved at: ${fileInfo.fullPath}\n\nDo you want to open the file now?`,
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
              "The file was exported successfully but could not be opened automatically. " +
                "You can find it in your Downloads folder.",
              "File Export Complete",
            );
          }
        }

        // Return the file information for UI display
        return fileInfo;
      }

      throw new Error(response.message || "Failed to export low stock report");
    } catch (error: any) {
      console.error("Export error:", error);

      await dialogs.error(
        error.message || "Failed to export low stock report. Please try again.",
        "Export Failed",
      );

      throw new Error(error.message || "Failed to export low stock report");
    }
  }
}

const lowStockAPI = new LowStockAPI();

export default lowStockAPI;
