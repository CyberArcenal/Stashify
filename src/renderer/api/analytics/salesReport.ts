// salesReport.ts

// ==================== INTERFACES ====================

export interface SalesByMonth {
  month: string;
  sales: number;
  profit: number;
  orders: number;
  profitMargin?: number; // % margin for the month
  cogs?: number; // cost of goods sold
}

export interface TopProduct {
  name: string;
  value: number; // ranking or weight
  revenue: number;
  units: number;
  profit?: number;
  profitMargin?: number;
  cogs?: number;
  category?: string;
}

export interface SalesTrend {
  month: string;
  sales: number;
  target: number; // sales target for the month
  profit?: number;
  cogs?: number;
}

export interface SalesByCategory {
  category: string;
  sales: number;
  percentage: number; // % share of total sales
}

export interface QuickStats {
  totalSales: number;
  totalProfit: number;
  totalOrders: number;
  growthRate: number;
  totalCOGS?: number;
  averageOrderValue?: number;
  profitMargin?: number;
  ordersGrowthRate?: number;
  reconciliationStatus?: string;
  growthRateMethod?: string;
  growthRateFallbackApplied?: boolean;
}

export interface PerformanceMetrics {
  averageOrderValue: number;
  conversionRate: number; // e.g. 0.2 = 20%
  customerSatisfaction: number; // rating out of 5
  customerLifetimeValue?: number | object; // can be numeric or structured
  repeatCustomerRate?: number | object; // can be numeric or structured
  totalProfit?: number;
  totalCOGS?: number;
  cogsToSalesRatio?: number; // % ratio of COGS to sales
}

export interface SalesReportData {
  salesByMonth: SalesByMonth[];
  topProducts: TopProduct[];
  salesTrend: SalesTrend[];
  salesByCategory: SalesByCategory[];
  quickStats: QuickStats;
  performanceMetrics: PerformanceMetrics;
  dateRange: {
    startDate: string;
    endDate: string;
    period: string;
  };
  metadata?: {
    generatedAt: string;
    formulaVersion: string;
    profitFormulaVersion: string;
    cogsIntegrationStatus: string;
    totalMonths: number;
    totalProducts: number;
    totalCategories: number;
    filtersApplied?: {
      period: string;
      group_by: string;
    };
    reconciliationWarnings?: string[];
  };
}

export interface SalesReportResponse {
  status: boolean;
  message: string;
  data: SalesReportData;
}

export interface SalesReportParams {
  start_date?: string;
  end_date?: string;
  period?:
    | "1week"
    | "2weeks"
    | "1month"
    | "3months"
    | "6months"
    | "1year"
    | "2years"
    | "custom";
  category?: string;
  product_id?: number;
  group_by?: "day" | "week" | "month" | "year";
  refresh?: boolean;
}

export interface ProductPerformanceParams {
  start_date?: string;
  end_date?: string;
  page_size?: number;
  category?: string;
  limit?: number;
}

export interface MonthlyTrendsParams {
  year?: number;
  months?: number;
}

export interface SalesTargetsParams {
  year?: number;
  quarter?: number;
}

const CURRENCY_CONFIG = {
  currency: "PHP",
  locale: "en-PH",
} as const;

// ==================== ERROR HANDLING ====================
class SalesReportError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "SalesReportError";
  }
}

const handleApiError = (error: any): never => {
  if (error.response?.data?.message) {
    throw new SalesReportError(
      error.response.data.message,
      error.response.data.code,
      error.response.status,
    );
  }
  throw new SalesReportError(
    error.message || "Failed to fetch sales report data",
  );
};

// ==================== UTILITY FUNCTIONS ====================
const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const formatCurrency = (
  value: number,
  currency: string = CURRENCY_CONFIG.currency,
): string => {
  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: "currency",
    currency: currency,
  }).format(value);
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const calculateProfitMargin = (revenue: number, cost: number): number => {
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
};

// ==================== ANALYTICS SERVICE ====================
class SalesAnalyticsService {
  static getBestSellingProduct(products: TopProduct[]): TopProduct | null {
    return products.length > 0
      ? products.reduce((best, current) =>
          current.revenue > best.revenue ? current : best,
        )
      : null;
  }

  static getWorstSellingProduct(products: TopProduct[]): TopProduct | null {
    return products.length > 0
      ? products.reduce((worst, current) =>
          current.revenue < worst.revenue ? current : worst,
        )
      : null;
  }

  static getTotalRevenueByCategory(categories: SalesByCategory[]): number {
    return categories.reduce((sum, category) => sum + category.sales, 0);
  }

  static getSalesTargetAchievement(sales: number, target: number): number {
    if (target === 0) return 0;
    return (sales / target) * 100;
  }

  static getTopPerformingCategories(
    categories: SalesByCategory[],
    limit: number = 3,
  ): SalesByCategory[] {
    return [...categories]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, limit);
  }

  static calculateMonthlyGrowth(
    salesByMonth: SalesByMonth[],
  ): Array<{ month: string; growthRate: number }> {
    return salesByMonth.map((current, index, array) => {
      if (index === 0) return { month: current.month, growthRate: 0 };

      const previous = array[index - 1];
      const growthRate = calculateGrowthRate(current.sales, previous.sales);
      return { month: current.month, growthRate };
    });
  }
}

// ==================== MAIN API CLASS ====================
class SalesReportAPI {
  async getSalesReport(params?: SalesReportParams): Promise<SalesReportData> {
    try {
      if (!window.backendAPI || !window.backendAPI.salesReport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesReport({
        method: "getSalesReport",
        params,
      });

      if (response.status && response.data) {
        console.log("Sales report data fetched:", response.data);
        return response.data;
      }
      throw new Error(response.message || "Failed to fetch sales report data");
    } catch (error: any) {
      throw new SalesReportError(
        error.message || "Failed to fetch sales report data",
      );
    }
  }

  async refreshSalesReport(
    params?: SalesReportParams,
  ): Promise<SalesReportData> {
    try {
      if (!window.backendAPI || !window.backendAPI.salesReport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesReport({
        method: "refreshSalesReport",
        params: { ...params, refresh: true },
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to refresh sales report data",
      );
    } catch (error: any) {
      throw new SalesReportError(
        error.message || "Failed to refresh sales report data",
      );
    }
  }

  async getProductPerformance(
    params?: ProductPerformanceParams,
  ): Promise<TopProduct[]> {
    try {
      if (!window.backendAPI || !window.backendAPI.salesReport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesReport({
        method: "getProductPerformance",
        params,
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to fetch product performance data",
      );
    } catch (error: any) {
      throw new SalesReportError(
        error.message || "Failed to fetch product performance data",
      );
    }
  }

  async getCategoryPerformance(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<SalesByCategory[]> {
    try {
      if (!window.backendAPI || !window.backendAPI.salesReport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesReport({
        method: "getCategoryPerformance",
        params,
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to fetch category performance data",
      );
    } catch (error: any) {
      throw new SalesReportError(
        error.message || "Failed to fetch category performance data",
      );
    }
  }

  async getMonthlyTrends(
    params?: MonthlyTrendsParams,
  ): Promise<SalesByMonth[]> {
    try {
      if (!window.backendAPI || !window.backendAPI.salesReport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesReport({
        method: "getMonthlyTrends",
        params,
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to fetch monthly trends data",
      );
    } catch (error: any) {
      throw new SalesReportError(
        error.message || "Failed to fetch monthly trends data",
      );
    }
  }

  async getSalesTargets(params?: SalesTargetsParams): Promise<SalesTrend[]> {
    try {
      if (!window.backendAPI || !window.backendAPI.salesReport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.salesReport({
        method: "getSalesTargets",
        params,
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Failed to fetch sales targets data");
    } catch (error: any) {
      throw new SalesReportError(
        error.message || "Failed to fetch sales targets data",
      );
    }
  }

  // Public utility methods
  calculateGrowthRate = calculateGrowthRate;
  formatCurrency = formatCurrency;
  formatPercentage = formatPercentage;
  calculateProfitMargin = calculateProfitMargin;

  // Analytics methods (delegated to service)
  getBestSellingProduct = SalesAnalyticsService.getBestSellingProduct;
  getWorstSellingProduct = SalesAnalyticsService.getWorstSellingProduct;
  getTotalRevenueByCategory = SalesAnalyticsService.getTotalRevenueByCategory;
  getSalesTargetAchievement = SalesAnalyticsService.getSalesTargetAchievement;
  getTopPerformingCategories = SalesAnalyticsService.getTopPerformingCategories;
  calculateMonthlyGrowth = SalesAnalyticsService.calculateMonthlyGrowth;
}

// ==================== EXPORTS ====================
const salesReportAPI = new SalesReportAPI();

export {
  SalesReportError,
  SalesAnalyticsService,
  calculateGrowthRate,
  formatCurrency,
  formatPercentage,
  calculateProfitMargin,
};

export default salesReportAPI;
