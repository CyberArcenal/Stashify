// src/lib/api/dashboard.ts

export interface RecentActivity {
  id: number;
  action: string;
  details: string;
  time: string;
  status?: string; // Added to match response
}

export interface Totals {
  totalProducts: number;
  totalOrders: number;
  totalPurchases: number;
  totalSales: number;
  totalCustomers: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingOrders: number;
}

export interface GrowthMetrics {
  monthlyGrowth: number;
  salesGrowth: number;
  customerGrowth: number;
  orderGrowth: number;
  growthRateMethod: string;
  growthRateFallbackApplied: boolean;
}

export interface ProfitMetrics {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossProfitMargin: number;
  cogsToSalesRatio: number;
  operatingMargin: number;
}

export interface CustomerSegmentation {
  newCustomers: number;
  repeatCustomers: number;
  newCustomerPercentage: number;
  repeatCustomerPercentage: number;
}

export interface CustomerMetrics {
  customerLifetimeValue: number;
  repeatCustomerRate: number;
  churnRate: number;
  segmentation: CustomerSegmentation;
  totalCustomers: number;
  activeCustomers: number;
}

export interface StockBucket {
  quantity: number;
  percentage: number;
  description: string;
}

// Add validation interface
export interface StockAgingBucketsValidation {
  percentagesSum: number;
  isValid: boolean;
}

export interface StockAgingBuckets {
  recent: StockBucket;
  middle: StockBucket;
  aged: StockBucket;
  totalStock: number;
  validation?: StockAgingBucketsValidation; // Added to match response
}

export interface SupplierDetail {
  id: number;
  supplierName: string;
  averageLeadTime: number;
  fulfillmentRate: number;
  totalOrders: number;
  contactPerson: string;
  email: string;
}

export interface OverallSupplierPerformance {
  averageLeadTime: number;
  fulfillmentRate: number;
  supplierCount: number;
}

export interface SupplierPerformance {
  overallPerformance: OverallSupplierPerformance;
  supplierDetails: SupplierDetail[];
}

export interface InventoryHealth {
  inventoryTurnover: number;
  daysOfStockCoverage: number;
  stockAgingBuckets: StockAgingBuckets;
  stockAgingPercentage: number;
  supplierPerformance: SupplierPerformance;
  autoReorderTriggeredCount: number;
  inventoryValue: number;
  averageDailyCOGS: number;
  monthlyCOGS?: number; // Added to match response
}

export interface ExpenseBreakdown {
  salaries: number;
  rentUtilities: number;
  marketing: number;
  softwareTools: number;
  otherExpenses: number;
}

// Add expense validation interface
export interface ExpenseValidation {
  calculatedSum: number;
  expectedSum: number;
  difference: number;
  isValid: boolean;
  tolerance: number;
}

export interface CashflowTrendItem {
  month: string | null; // Updated to allow null
  inflow: number;
  outflow: number;
  netCashflow: number;
  cashflowStatus: string;
}

export interface CashflowMetrics {
  operatingExpenses: number;
  expenseBreakdown: ExpenseBreakdown;
  netProfit: number;
  cashflowStatus: string;
  cashflowTrend: CashflowTrendItem[];
  revenue: number;
  grossProfit: number;
  profitReconciliationStatus: string;
  expenseValidation?: ExpenseValidation; // Added to match response
}

export interface SalesTrendItem {
  month: string | null; // Updated to allow null
  revenue: number;
  profit: number;
  profitMargin: number;
  cogs: number;
  orders: number;
}

export interface CustomerTrendItem {
  month: string;
  newCustomers: number;
  repeatCustomers: number;
  totalCustomers: number;
  repeatRate: number;
  sampleGuardApplied?: boolean; // Added to match response
}

export interface OrderTrendItem {
  month: string | null; // Updated to allow null
  totalOrders: number;
  completed: number;
  pending: number;
  cancelled: number;
  confirmed: number;
  completionRate: number;
}

// Add trend validation interface
export interface TrendValidation {
  salesTrendValidated: boolean;
  customerTrendValidated: boolean;
  orderTrendValidated: boolean;
  generatedAt: string;
}

export interface TrendData {
  salesTrend: SalesTrendItem[];
  customerTrend: CustomerTrendItem[];
  orderTrend: OrderTrendItem[];
  validation?: TrendValidation; // Added to match response
}

export interface Metadata {
  generatedAt: string;
  formulaVersion: string;
  profitFormulaVersion: string;
  growthFormulaVersion: string;
  customerMetricsVersion: string;
  inventoryMetricsVersion: string;
  cashflowFormulaVersion: string;
  calculations: Record<string, string>;
  period: string;
  dataPoints: Record<string, number>;
  profitReconciliationStatus: string;
  reconciliationTolerance: number;
  reconciliationStatus: string;
  expenseCategories: string[];
  validationRules?: Record<string, string>; // Added to match response
  dataSource?: string; // Added to match response
  schemaVersion?: string; // Added to match response
}

export interface Traffic {
  labels: string[];
  data: number[];
}

// Add new interface for currentPeriodMetrics
export interface CurrentPeriodMetrics {
  currentPeriodRevenue: number;
  currentPeriodOrders: number;
  currentPeriodCustomers: number;
  periodStart: string;
  periodEnd: string;
}

export interface DashboardData {
  totals: Totals;
  currentPeriodMetrics?: CurrentPeriodMetrics; // Added to match response
  growthMetrics: GrowthMetrics;
  profitMetrics: ProfitMetrics;
  customerMetrics: CustomerMetrics;
  inventoryHealth: InventoryHealth;
  cashflowMetrics: CashflowMetrics;
  recentActivities: RecentActivity[];
  traffic: Traffic;
  trendData: TrendData;
  metadata: Metadata;
}

export interface DashboardResponse {
  status: boolean;
  message: string;
  data: DashboardData;
}

class DashboardAPI {
  async getDashboardData(): Promise<DashboardData> {
    try {
      if (!window.backendAPI || !window.backendAPI.dashboard) {
        throw new Error("Electron API not available");
      }
      const response = await window.backendAPI.dashboard({
        method: "getDashboardData",
      });

      if (response.status && response.data) {
        // console.log("Dashboard data fetched:", response.data);
        return response.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch dashboard data",
      );
    } catch (error: any) {
      // console.log(error);
      throw new Error(error.message || "Failed to fetch dashboard data");
    }
  }

  async refreshDashboardData(): Promise<DashboardData> {
    try {
      const response = await window.backendAPI.dashboard({
        method: "refreshDashboardData",
      });

      if (response.status && response.data) {
        return response.data;
      }
      throw new Error(
        response.data?.message || "Failed to refresh dashboard data",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to refresh dashboard data");
    }
  }
}

const dashboardAPI = new DashboardAPI();

export default dashboardAPI;
