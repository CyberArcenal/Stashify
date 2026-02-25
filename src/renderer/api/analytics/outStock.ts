import { dialogs } from "../../utils/dialogs";
import { fileHandler } from "../exports/fileHandler";

export interface OutOfStockItem {
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
  allowBackorder: boolean;
  supplier: string;
  lastUpdated: string;
  createdDate?: string;
  daysOutOfStock: number;
  status: string;
  sku?: string;
  estimatedLostSales?: number;
  salesVelocity?: number;
  urgencyScore?: number;
  lastSaleDate?: string | null;
  costPerItem?: number;
  netPrice?: number;
  potentialRevenue?: number;
  itemType: "product" | "variant";
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
  count?: number;
  value?: number;
  color?: string;
  products?: string[];
  totalLostSales?: number;
  averageUrgency?: number;
  percentage?: number;
  warehouse?: string;
}

export interface PerformanceSummary {
  longestOutOfStock: number;
  averageDaysOutOfStock: number;
  mostAffectedCategory: string;
  mostAffectedCategoryCount: number;
  mostAffectedWarehouse: string;
  mostAffectedWarehouseCount: number;
  restockingPriority: string;
  mostAffectedCategoryLostSales?: number;
  mostAffectedWarehouseLostSales?: number;
  totalLostSales?: number;
  highestUrgencyProduct?: string;
  highestUrgencyVariant?: string;
  highestUrgencyWarehouse?: string;
  highestUrgencyScore?: number;
  healthScore?: number;
  affectedWarehousesCount?: number;
}

export interface Recommendation {
  type: string;
  title: string;
  description: string;
  action: string;
  priority: number;
}

export interface OutOfStockReportData {
  stockItems: OutOfStockItem[];
  summary: {
    totalStockItems: number;
    totalProducts: number;
    totalVariants: number;
    outOfStockCount: number;
    inStockCount: number;
    affectedWarehouses: number;
    affectedCategories: number;
    outOfStockPercentage: number;
    totalLostSales?: number;
    longestOutOfStock?: number;
    averageDaysOutOfStock?: number;
    totalPotentialRevenue?: number;
    itemBreakdown: {
      products: number;
      variants: number;
      warehouses: number;
    };
  };
  charts: {
    barChart: ChartData[];
    pieChart: ChartData[];
    categoryChart?: ChartData[];
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
      includeBackorder: boolean;
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

export interface OutOfStockResponse {
  status: boolean;
  message: string;
  data: OutOfStockReportData;
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

class OutOfStockAPI {
  async getOutOfStockReport(): Promise<OutOfStockReportData> {
    try {
      const response = await window.backendAPI.outOfStock({
        method: "getOutOfStockReport",
        params: {},
      });

      if (response.status && response.data) {
        //
        return response.data;
      }
      throw new Error(
        response.message || "Failed to fetch out of stock report data",
      );
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to fetch out of stock report data",
      );
    }
  }

  async refreshOutOfStockReport(): Promise<OutOfStockReportData> {
    try {
      const response = await window.backendAPI.outOfStock({
        method: "refreshOutOfStockReport",
        params: {},
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to refresh out of stock report data",
      );
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to refresh out of stock report data",
      );
    }
  }

  async exportReport(
    format: "pdf" | "csv" | "excel",
    params: {
      category?: string;
      include_backorder?: boolean;
      threshold_multiplier?: number;
    },
  ): Promise<ExportResponse | undefined> {
    try {
      // Confirm export
      const confirmed = await dialogs.confirm({
        title: "Export Report",
        message: `Are you sure you want to export this report in ${format.toUpperCase()} format?`,
        icon: "info",
      });
      if (!confirmed) return;

      // Prepare request params for backend
      const requestParams: any = {
        ...params,
        format: format, // backend expects "excel" for xlsx
      };

      // Call unified export method on electron API
      if (!window.backendAPI || !window.backendAPI.outOfStockExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.outOfStockExport({
        method: "export", // unified handler on backend
        params: requestParams,
      });

      if (!(response?.status && response?.data)) {
        throw new Error(response?.message || "Failed to export report");
      }

      const data = response.data;

      // If backend returned a file path / filename, prefer that for open dialog
      const filename =
        data.filename ||
        `out_of_stock_report_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "xlsx" : format}`;
      const fullPath = data.fullPath; // may be undefined if backend returned raw content only

      // If backend already saved file and returned fullPath, optionally let user open it
      const showOpenDialog = !!fullPath;
      if (showOpenDialog) {
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message: `Report exported successfully to: ${filename}\n\nFile saved at: ${fullPath}\n\nDo you want to open the file now?`,
          confirmText: "Open File",
          cancelText: "Later",
          icon: "success",
          showCloseButton: true,
        });

        if (shouldOpen) {
          try {
            await fileHandler.openExportedFile(fullPath);
          } catch (openError) {
            console.error("Failed to open file:", openError);
            await dialogs.error(
              "The file was exported successfully but could not be opened automatically. You can find it in your Downloads folder.",
              "File Export Complete",
            );
          }
        }
      } else {
        // No fullPath available — show a simple success toast/dialog
        await dialogs.confirm({
          title: "Export Successful!",
          message: `Report exported successfully as ${filename}. The file has been downloaded to your browser's default download location.`,
          confirmText: "OK",
          icon: "success",
        });
      }

      // Return file info for caller if needed
      return data;
    } catch (error: any) {
      console.error("Export failed:", error);
      // Show error dialog
      try {
        await dialogs.error(
          error?.message || "Failed to export report. Please try again.",
          "Export Failed",
        );
      } catch (dialogErr) {
        console.warn("Failed to show error dialog:", dialogErr);
      }
      throw new Error(error?.message || "Failed to export report");
    }
  }
}

const outOfStockAPI = new OutOfStockAPI();

export default outOfStockAPI;
