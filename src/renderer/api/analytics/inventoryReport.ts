export interface StockByCategory {
  name: string;
  value: number; // quantity of items in category
  color: string; // chart color
  stockValue?: number; // monetary value of stock
}

export interface LowStockProduct {
  name: string;
  stock: number;
  reorderLevel: number;
  category: string;
  productId?: number;
  variantId?: number | null; // added to support variant-level tracking
  currentValue?: number; // valuation of current stock
}

export interface StockMovement {
  month: string; // e.g. "Dec 2025"
  stockIn: number;
  stockOut: number;
  netChange: number;
}

export interface InventorySummary {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  totalCategories: number;
  totalStockValue: number;
  growthRate: number;
  stockTurnoverRate: number;
}

export interface PerformanceMetrics {
  highestStockCategory: string;
  highestStockCount: number;
  highestStockValue?: number; // added for monetary value of top category
  stockTurnoverRate: number;
  averageStockValue: number;
}

export interface InventoryReportData {
  stockByCategory: StockByCategory[];
  lowStockProducts: LowStockProduct[];
  stockMovements: StockMovement[];
  summary: InventorySummary;
  performanceMetrics: PerformanceMetrics;
  dateRange: {
    startDate: string;
    endDate: string;
    period: string;
  };
  metadata?: {
    generatedAt: string;
    totalCategories: number;
    lowStockCount: number;
    totalMovements: number;
    filtersApplied: {
      period: string;
      low_stock_only: boolean;
      group_by: string;
    };
  };
}

export interface InventoryReportResponse {
  status: boolean;
  message: string;
  data: InventoryReportData;
}

export interface InventoryReportParams {
  start_date?: string;
  end_date?: string;
  period?: "3months" | "6months" | "1year" | "custom";
  category?: string;
  low_stock_only?: boolean;
  group_by?: "day" | "week" | "month" | "year";
}

class InventoryReportAPI {
  async getInventoryReport(
    params?: InventoryReportParams,
  ): Promise<InventoryReportData> {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryReport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryReport({
        method: "getInventoryReport",
        params,
      });

      if (response.status && response.data) {
        console.log("Inventory report data fetched:", response.data);
        return response.data;
      }
      throw new Error(
        response.message || "Failed to fetch inventory report data",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch inventory report data");
    }
  }

  async refreshInventoryReport(
    params?: InventoryReportParams,
  ): Promise<InventoryReportData> {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryReport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryReport({
        method: "refreshInventoryReport",
        params,
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to refresh inventory report data",
      );
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to refresh inventory report data",
      );
    }
  }

  async getLowStockProducts(params?: {
    start_date?: string;
    end_date?: string;
    threshold?: number;
  }): Promise<LowStockProduct[]> {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryReport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryReport({
        method: "getLowStockProducts",
        params,
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to fetch low stock products data",
      );
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to fetch low stock products data",
      );
    }
  }

  async getCategoryStock(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<StockByCategory[]> {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryReport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryReport({
        method: "getCategoryStock",
        params,
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to fetch category stock data",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch category stock data");
    }
  }

  async getStockMovements(params?: {
    start_date?: string;
    end_date?: string;
    months?: number;
  }): Promise<StockMovement[]> {
    try {
      if (!window.backendAPI || !window.backendAPI.inventoryReport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.inventoryReport({
        method: "getStockMovements",
        params,
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to fetch stock movements data",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch stock movements data");
    }
  }

  // Utility methods for data processing
  calculateStockValue(quantity: number, unitPrice: number): number {
    return quantity * unitPrice;
  }

  calculateStockTurnover(
    costOfGoodsSold: number,
    averageInventory: number,
  ): number {
    if (averageInventory === 0) return 0;
    return costOfGoodsSold / averageInventory;
  }

  formatCurrency(value: number, currency: string = "PHP"): string {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: currency,
    }).format(value);
  }

  // Analytics methods
  getHighestStockCategory(
    categories: StockByCategory[],
  ): StockByCategory | null {
    return categories.length > 0
      ? categories.reduce((max, category) =>
          category.value > max.value ? category : max,
        )
      : null;
  }

  getLowestStockCategory(
    categories: StockByCategory[],
  ): StockByCategory | null {
    return categories.length > 0
      ? categories.reduce((min, category) =>
          category.value < min.value ? category : min,
        )
      : null;
  }

  getMostCriticalLowStock(products: LowStockProduct[]): LowStockProduct | null {
    return products.length > 0
      ? products.reduce((mostCritical, product) => {
          const criticality = product.reorderLevel - product.stock;
          const currentCriticality =
            mostCritical.reorderLevel - mostCritical.stock;
          return criticality > currentCriticality ? product : mostCritical;
        })
      : null;
  }

  calculateStockOutRisk(product: LowStockProduct): number {
    if (product.reorderLevel === 0) return 0;
    const risk =
      ((product.reorderLevel - product.stock) / product.reorderLevel) * 100;
    return Math.min(Math.max(risk, 0), 100);
  }

  filterDataByDateRange<T extends { month: string }>(
    data: T[],
    startDate: string,
    endDate: string,
  ): T[] {
    // This is a simplified filter - in real implementation, you'd convert month to actual dates
    return data; // For now, return all data
  }
}

const inventoryReportAPI = new InventoryReportAPI();

export default inventoryReportAPI;
