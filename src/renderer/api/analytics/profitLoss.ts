// profitLossAPI.ts

export interface ProfitLossByMonth {
  month: string;
  revenue: number;
  costOfGoodsSold: number;
  operatingExpenses: number;
  grossRevenue?: number;
  vatCollected?: number;
  grossProfit?: number;
  netProfit?: number;
  profitMargin?: number;
  grossMargin?: number;
}

export interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentage: number;
  asPercentOfRevenue?: number;
  description?: string;
}

export interface ProfitLossTrend {
  month: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface ProfitLossSummary {
  totalRevenue: number;
  totalCostOfGoodsSold: number;
  totalOperatingExpenses: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  growthRate: number;
  growthRateMethod?: string;
  growthRateFallbackApplied?: boolean;
  formulaVersion?: string;
  reconciliationStatus?: string;
}

export interface PerformanceMetrics {
  bestMonth: string;
  worstMonth: string;
  highestMargin: number;
  lowestMargin: number;
  averageMargin: number;
  totalMonths?: number;
  profitableMonths?: number;
  successRate?: number;
}

export interface ReportMetadata {
  generatedAt: string;
  formulaVersion: string;
  growthFormulaVersion: string;
  totalMonths: number;
  filtersApplied: {
    period: string;
    group_by: string;
  };
  calculations: {
    revenue: string;
    cogs: string;
    grossProfit: string;
    netProfit: string;
    profitMargin: string;
    growthRate: string;
  };
  dataSource: string;
  priceMethodology: string;
  vatHandling: string;
}

export interface ProfitLossReportData {
  profitLossByMonth: ProfitLossByMonth[];
  expenseBreakdown: ExpenseBreakdown[];
  profitLossTrend: ProfitLossTrend[];
  summary: ProfitLossSummary;
  performanceMetrics: PerformanceMetrics;
  dateRange: {
    startDate: string;
    endDate: string;
    period: string;
  };
  metadata?: ReportMetadata;
}

export interface ProfitLossReportResponse {
  status: boolean;
  message: string;
  data: ProfitLossReportData;
}

export interface ProfitLossReportParams {
  start_date?: string;
  end_date?: string;
  period?: "3months" | "6months" | "1year" | "custom";
  group_by?: "day" | "week" | "month" | "year";
  category?: string;
}

// Note: The rest of the class remains the same

class ProfitLossAPI {
  async getProfitLossReport(
    params?: ProfitLossReportParams,
  ): Promise<ProfitLossReportData> {
    try {
      const response = await window.backendAPI.profitLoss({
        method: "getProfitLossReport",
        params,
      });

      if (response.status && response.data) {
        // console.log("Profit & Loss report data fetched:", response.data);
        return response.data;
      }
      throw new Error(
        response.message || "Failed to fetch profit & loss report data",
      );
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to fetch profit & loss report data",
      );
    }
  }

  async refreshProfitLossReport(
    params?: ProfitLossReportParams,
  ): Promise<ProfitLossReportData> {
    try {
      const response = await window.backendAPI.profitLoss({
        method: "refreshProfitLossReport",
        params,
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to refresh profit & loss report data",
      );
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to refresh profit & loss report data",
      );
    }
  }

  async getExpenseBreakdown(params?: {
    start_date?: string;
    end_date?: string;
    category?: string;
  }): Promise<ExpenseBreakdown[]> {
    try {
      const response = await window.backendAPI.profitLoss({
        method: "getExpenseBreakdown",
        params,
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to fetch expense breakdown data",
      );
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to fetch expense breakdown data",
      );
    }
  }

  async getMonthlyTrends(params?: {
    year?: number;
    months?: number;
  }): Promise<ProfitLossTrend[]> {
    try {
      const response = await window.backendAPI.profitLoss({
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
      throw new Error(error.message || "Failed to fetch monthly trends data");
    }
  }

  async getPerformanceMetrics(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<PerformanceMetrics> {
    try {
      const response = await window.backendAPI.profitLoss({
        method: "getPerformanceMetrics",
        params,
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to fetch performance metrics data",
      );
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to fetch performance metrics data",
      );
    }
  }
  // Utility methods for data processing
  calculateNetProfit(
    revenue: number,
    cogs: number,
    operatingExpenses: number,
  ): number {
    return revenue - (cogs + operatingExpenses);
  }

  calculateProfitMargin(revenue: number, netProfit: number): number {
    if (revenue === 0) return 0;
    return (netProfit / revenue) * 100;
  }

  calculateGrossProfit(revenue: number, cogs: number): number {
    return revenue - cogs;
  }

  calculateGrossProfitMargin(revenue: number, grossProfit: number): number {
    if (revenue === 0) return 0;
    return (grossProfit / revenue) * 100;
  }

  formatCurrency(value: number, currency: string = "PHP"): string {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: currency,
    }).format(value);
  }

  // Analytics methods
  getBestPerformingMonth(data: ProfitLossByMonth[]): ProfitLossByMonth | null {
    if (data.length === 0) return null;
    return data.reduce((best, current) =>
      (current.netProfit || 0) > (best.netProfit || 0) ? current : best,
    );
  }

  getWorstPerformingMonth(data: ProfitLossByMonth[]): ProfitLossByMonth | null {
    if (data.length === 0) return null;
    return data.reduce((worst, current) =>
      (current.netProfit || 0) < (worst.netProfit || 0) ? current : worst,
    );
  }

  getHighestProfitMargin(data: ProfitLossByMonth[]): ProfitLossByMonth | null {
    if (data.length === 0) return null;
    return data.reduce((best, current) =>
      (current.profitMargin || 0) > (best.profitMargin || 0) ? current : best,
    );
  }

  getExpenseToRevenueRatio(expenses: number, revenue: number): number {
    if (revenue === 0) return 0;
    return (expenses / revenue) * 100;
  }

  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
}

const profitLossAPI = new ProfitLossAPI();

export default profitLossAPI;
