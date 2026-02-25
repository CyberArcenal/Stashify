//@ts-check
const { AppDataSource } = require("../../../../db/datasource");
// @ts-ignore
const { Between } = require("typeorm");
const Order = require("../../../../../entities/Order");
const OrderItem = require("../../../../../entities/OrderItem");

// ----------------------------------------------------------------------
// Helper: format date for SQL (YYYY-MM-DD)
// @ts-ignore
function formatDateForSQL(date) {
  return date.toISOString().split("T")[0];
}

// ----------------------------------------------------------------------
// Helper: get date range (eksaktong replica ng _getDateRange)
// @ts-ignore
function getDateRange(params) {
  const { period, start_date, end_date } = params;
  const endDateObj = new Date();

  if (period === "custom" && start_date && end_date) {
    const startDateObj = new Date(start_date);
    endDateObj.setTime(new Date(end_date).getTime());

    if (startDateObj > endDateObj) {
      throw new Error("Start date cannot be after end date");
    }
    if (startDateObj > new Date()) {
      throw new Error("Start date cannot be in the future");
    }

    return { start_date: startDateObj, end_date: endDateObj };
  } else {
    const periodDays = {
      "1week": 7,
      "2weeks": 14,
      "1month": 30,
      "3months": 90,
      "6months": 180,
      "1year": 365,
      "2years": 730,
    };
    // @ts-ignore
    const days = periodDays[period] || 365;
    const startDateObj = new Date(endDateObj);
    startDateObj.setDate(startDateObj.getDate() - days);
    return { start_date: startDateObj, end_date: endDateObj };
  }
}

// ----------------------------------------------------------------------
// Helper: kunin ang completed orders na may filters (replica ng _getCompletedOrders)
// @ts-ignore
async function getCompletedOrders(dateRange, category, productId) {
  const manager = AppDataSource.manager;
  const { start_date, end_date } = dateRange;

  const queryBuilder = manager
    .createQueryBuilder(Order, "o")
    .where("o.status = :status", { status: "completed" })
    .andWhere("o.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    });

  if (category) {
    queryBuilder
      .innerJoin("o.items", "oi")
      .innerJoin("oi.product", "p")
      .innerJoin("p.category", "c")
      .andWhere("c.name = :category", { category });
  }

  if (productId) {
    queryBuilder
      .innerJoin("o.items", "oi2")
      .andWhere("oi2.product_id = :productId", { productId });
  }

  const orders = await queryBuilder.getMany();
  return orders;
}

// ----------------------------------------------------------------------
// Helper: format period display (replica ng nasa _getSalesByPeriodWithProfit)
// @ts-ignore
function formatPeriodDisplay(periodKey, groupBy) {
  if (groupBy === "day") {
    return new Date(periodKey).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } else if (groupBy === "week") {
    const [year, week] = periodKey.split("-");
    return `Week ${week}, ${year}`;
  } else {
    const [year, month] = periodKey.split("-");
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
}

// ----------------------------------------------------------------------
// Helper: sales by period with profit (replica ng _getSalesByPeriodWithProfit)
// @ts-ignore
// @ts-ignore
async function getSalesByPeriodWithProfit(orders, groupBy, dateRange) {
  if (!orders.length) return [];

  const manager = AppDataSource.manager;
  // @ts-ignore
  const orderIds = orders.map((o) => o.id);

  // Determine grouping expression
  let groupExpr;
  if (groupBy === "day") {
    groupExpr = "strftime('%Y-%m-%d', o.created_at)";
  } else if (groupBy === "week") {
    groupExpr = "strftime('%Y-%W', o.created_at)";
  } else {
    groupExpr = "strftime('%Y-%m', o.created_at)";
  }

  // Sales data (gross order total)
  const salesData = await manager
    .createQueryBuilder(Order, "o")
    .select(groupExpr, "period")
    .addSelect("SUM(o.total)", "sales")
    .addSelect("COUNT(o.id)", "orders_count")
    .where("o.id IN (:...orderIds)", { orderIds })
    .groupBy("period")
    .orderBy("period")
    .getRawMany();

  // Profit data (gross revenue from order_items, COGS)
  const profitData = await manager
    .createQueryBuilder(OrderItem, "oi")
    .innerJoin("oi.order", "o")
    .leftJoin("oi.product", "p")
    .leftJoin("oi.variant", "v")
    .select(groupExpr, "period")
    .addSelect("SUM(oi.line_gross_total)", "revenue")
    .addSelect(
      "SUM(COALESCE(COALESCE(v.cost_per_item, p.cost_per_item, 0) * oi.quantity, 0))",
      "cogs",
    )
    .where("oi.order_id IN (:...orderIds)", { orderIds })
    .groupBy("period")
    .orderBy("period")
    .getRawMany();

  // Create profit lookup
  const profitByPeriod = {};
  profitData.forEach((row) => {
    if (row.period) {
      // @ts-ignore
      profitByPeriod[row.period] = {
        profit: (parseFloat(row.revenue) || 0) - (parseFloat(row.cogs) || 0),
        cogs: parseFloat(row.cogs) || 0,
        revenue: parseFloat(row.revenue) || 0,
      };
    }
  });

  // Combine
  // @ts-ignore
  const result = [];
  salesData.forEach((row) => {
    if (row.period) {
      // @ts-ignore
      const p = profitByPeriod[row.period] || {
        profit: 0,
        cogs: 0,
        revenue: 0,
      };
      const sales = parseFloat(row.sales) || 0;
      const profit = p.profit;
      const cogs = p.cogs;
      const profitMargin = sales > 0 ? (profit / sales) * 100 : 0;

      result.push({
        month: formatPeriodDisplay(row.period, groupBy),
        sales: Math.round(sales * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        cogs: Math.round(cogs * 100) / 100,
        orders: row.orders_count,
      });
    }
  });

  // @ts-ignore
  return result;
}

// ----------------------------------------------------------------------
// Helper: top products with profit margin (replica ng _getTopProductsWithProfitMargin)
// @ts-ignore
async function getTopProductsWithProfitMargin(
  // @ts-ignore
  orders,
  // @ts-ignore
  categoryFilter,
  // @ts-ignore
  productId,
  limit = 10,
) {
  if (!orders.length) return [];

  const manager = AppDataSource.manager;
  // @ts-ignore
  const orderIds = orders.map((o) => o.id);

  const queryBuilder = manager
    .createQueryBuilder(OrderItem, "oi")
    .leftJoin("oi.product", "p")
    .leftJoin("p.category", "c")
    .leftJoin("oi.variant", "v")
    .select("p.name", "product_name")
    .addSelect("c.name", "category_name")
    .addSelect("SUM(oi.line_gross_total)", "revenue")
    .addSelect("SUM(oi.quantity)", "units_sold")
    .addSelect("COUNT(DISTINCT oi.order_id)", "order_count")
    .addSelect(
      "SUM(COALESCE(COALESCE(v.cost_per_item, p.cost_per_item, 0) * oi.quantity, 0))",
      "cogs",
    )
    .where("oi.order_id IN (:...orderIds)", { orderIds })
    .groupBy("p.id, p.name, c.name");

  if (categoryFilter) {
    queryBuilder.andWhere("c.name = :category", { category: categoryFilter });
  }
  if (productId) {
    queryBuilder.andWhere("oi.product_id = :productId", { productId });
  }

  const topProducts = await queryBuilder
    .orderBy("revenue", "DESC")
    .limit(limit)
    .getRawMany();

  return topProducts.map((item) => {
    const revenue = parseFloat(item.revenue) || 0;
    const cogs = parseFloat(item.cogs) || 0;
    const profit = revenue - cogs;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return {
      name: item.product_name,
      value: item.order_count,
      revenue: Math.round(revenue * 100) / 100,
      units: item.units_sold,
      profit: Math.round(profit * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      cogs: Math.round(cogs * 100) / 100,
      category: item.category_name || "Uncategorized",
    };
  });
}

// ----------------------------------------------------------------------
// Helper: sales by category (replica ng _getSalesByCategory)
// @ts-ignore
async function getSalesByCategory(orders) {
  if (!orders.length) return [];

  const manager = AppDataSource.manager;
  // @ts-ignore
  const orderIds = orders.map((o) => o.id);

  const categorySales = await manager
    .createQueryBuilder(OrderItem, "oi")
    .innerJoin("oi.product", "p")
    .innerJoin("p.category", "c")
    .select("c.name", "category_name")
    .addSelect("SUM(oi.line_gross_total)", "sales")
    .where("oi.order_id IN (:...orderIds)", { orderIds })
    .andWhere("c.name IS NOT NULL")
    .groupBy("c.id, c.name")
    .orderBy("sales", "DESC")
    .getRawMany();

  const totalSales = categorySales.reduce(
    (sum, row) => sum + (parseFloat(row.sales) || 0),
    0,
  );

  return categorySales.map((row) => {
    const sales = parseFloat(row.sales) || 0;
    const percentage = totalSales > 0 ? (sales / totalSales) * 100 : 0;
    return {
      category: row.category_name,
      sales: Math.round(sales * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
    };
  });
}

// ----------------------------------------------------------------------
// Helper: sales trend (replica ng _getSalesTrend)
// @ts-ignore
function getSalesTrend(salesData) {
  if (!salesData.length) return [];
  // @ts-ignore
  const result = [];
  const baseTargetFactor = 1.1;

  // @ts-ignore
  salesData.forEach((item, index) => {
    let targetFactor = baseTargetFactor;
    if (index > 0) {
      const prevSales = salesData[index - 1].sales;
      const growthRate =
        prevSales > 0 ? (item.sales - prevSales) / prevSales : 0;
      targetFactor = 1.1 + Math.min(Math.max(growthRate, -0.1), 0.2);
    }
    const target = item.sales * targetFactor;
    result.push({
      month: item.month,
      sales: item.sales,
      profit: item.profit,
      cogs: item.cogs || 0,
      target: Math.round(target * 100) / 100,
    });
  });
  // @ts-ignore
  return result;
}

// ----------------------------------------------------------------------
// Helper: growth rate with fallback (replica ng _calculateSalesGrowthRateWithFallback)
// @ts-ignore
async function calculateGrowthRateWithFallback(
  // @ts-ignore
  dateRange,
  // @ts-ignore
  currentValue,
  // @ts-ignore
  categoryFilter,
  // @ts-ignore
  productId,
  valueType = "sales",
) {
  try {
    const previousValue = await calculatePreviousPeriodValue(
      dateRange,
      categoryFilter,
      productId,
      valueType,
    );
    if (previousValue === 0) {
      return {
        growth_rate: currentValue > 0 ? 100.0 : 0.0,
        method: "new_period_fallback",
        fallback_applied: true,
      };
    } else {
      const growthRate = ((currentValue - previousValue) / previousValue) * 100;
      const bounded = Math.max(Math.min(growthRate, 500), -100);
      return {
        growth_rate: Math.round(bounded * 100) / 100,
        method: "standard_calculation",
        fallback_applied: false,
      };
    }
  } catch (error) {
    return {
      growth_rate: 0.0,
      method: "error_fallback",
      fallback_applied: true,
    };
  }
}

// ----------------------------------------------------------------------
// Helper: previous period value (sales or orders)
// @ts-ignore
async function calculatePreviousPeriodValue(
  // @ts-ignore
  dateRange,
  // @ts-ignore
  categoryFilter,
  // @ts-ignore
  productId,
  valueType = "sales",
) {
  try {
    const periodDays = Math.ceil(
      (dateRange.end_date - dateRange.start_date) / (1000 * 60 * 60 * 24),
    );
    const prevStartDate = new Date(dateRange.start_date);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);
    const prevEndDate = new Date(dateRange.start_date);
    prevEndDate.setDate(prevEndDate.getDate() - 1);

    const manager = AppDataSource.manager;
    const queryBuilder = manager.createQueryBuilder(Order, "o");
    if (valueType === "sales") {
      queryBuilder.select("SUM(o.total)", "total");
    } else {
      queryBuilder.select("COUNT(o.id)", "count");
    }
    queryBuilder
      .where("o.status = :status", { status: "completed" })
      .andWhere("o.created_at BETWEEN :start AND :end", {
        start: prevStartDate,
        end: prevEndDate,
      });

    if (categoryFilter) {
      queryBuilder
        .innerJoin("o.items", "oi")
        .innerJoin("oi.product", "p")
        .innerJoin("p.category", "c")
        .andWhere("c.name = :category", { category: categoryFilter });
    }
    if (productId) {
      queryBuilder
        .innerJoin("o.items", "oi2")
        .andWhere("oi2.product_id = :productId", { productId });
    }

    const result = await queryBuilder.getRawOne();
    if (valueType === "sales") {
      return parseFloat(result?.total) || 0;
    } else {
      return parseInt(result?.count) || 0;
    }
  } catch (error) {
    return 0;
  }
}

// ----------------------------------------------------------------------
// Helper: quick stats with reconciliation (replica ng _getReconciledQuickStats)
// @ts-ignore
async function getQuickStats(orders, dateRange, categoryFilter, productId) {
  if (!orders.length) return getFallbackQuickStats();

  const manager = AppDataSource.manager;
  // @ts-ignore
  const orderIds = orders.map((o) => o.id);

  // Basic order stats
  const orderStats = await manager
    .createQueryBuilder(Order, "o")
    .select("SUM(o.total)", "total_sales")
    .addSelect("COUNT(o.id)", "total_orders")
    .addSelect("AVG(o.total)", "avg_order_value")
    .where("o.id IN (:...orderIds)", { orderIds })
    .getRawOne();

  // COGS and profit from order items
  const cogsProfit = await manager
    .createQueryBuilder(OrderItem, "oi")
    .leftJoin("oi.product", "p")
    .leftJoin("oi.variant", "v")
    .select("SUM(oi.line_gross_total)", "total_revenue")
    .addSelect(
      "SUM(COALESCE(COALESCE(v.cost_per_item, p.cost_per_item, 0) * oi.quantity, 0))",
      "total_cogs",
    )
    .where("oi.order_id IN (:...orderIds)", { orderIds })
    .getRawOne();

  const totalSales = parseFloat(orderStats?.total_sales) || 0;
  const totalOrders = parseInt(orderStats?.total_orders) || 0;
  const avgOrderValue = parseFloat(orderStats?.avg_order_value) || 0;
  const totalRevenue = parseFloat(cogsProfit?.total_revenue) || 0;
  const totalCogs = parseFloat(cogsProfit?.total_cogs) || 0;
  const totalProfit = totalRevenue - totalCogs;
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  const salesGrowth = await calculateGrowthRateWithFallback(
    dateRange,
    totalSales,
    categoryFilter,
    productId,
    "sales",
  );
  const ordersGrowth = await calculateGrowthRateWithFallback(
    dateRange,
    totalOrders,
    categoryFilter,
    productId,
    "orders",
  );

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalOrders,
    totalCOGS: Math.round(totalCogs * 100) / 100,
    averageOrderValue: Math.round(avgOrderValue * 100) / 100,
    growthRate: salesGrowth.growth_rate,
    ordersGrowthRate: ordersGrowth.growth_rate,
    profitMargin: Math.round(profitMargin * 100) / 100,
    reconciliationStatus: "consistent",
    growthRateMethod: salesGrowth.method,
    growthRateFallbackApplied: salesGrowth.fallback_applied,
  };
}

// ----------------------------------------------------------------------
// Helper: performance metrics (replica ng _getPerformanceMetrics)
// @ts-ignore
async function getPerformanceMetrics(orders, quickStats) {
  try {
    // @ts-ignore
    // @ts-ignore
    const totalOrders = quickStats.totalOrders;
    const totalSales = quickStats.totalSales;
    const totalProfit = quickStats.totalProfit;
    const totalCogs = quickStats.totalCOGS;
    const avgOrderValue = quickStats.averageOrderValue;
    // @ts-ignore
    // @ts-ignore
    const profitMargin = quickStats.profitMargin;

    const conversionRate = estimateConversionRate(orders);
    const customerSatisfaction = 4.7; // placeholder
    const clv = await calculateCLV(orders);
    const repeatRate = await calculateRepeatCustomerRate(orders);

    return {
      averageOrderValue: avgOrderValue,
      conversionRate,
      customerSatisfaction,
      customerLifetimeValue: clv,
      repeatCustomerRate: repeatRate,
      totalProfit,
      totalCOGS: totalCogs,
      cogsToSalesRatio:
        totalSales > 0
          ? Math.round((totalCogs / totalSales) * 100 * 100) / 100
          : 0,
    };
  } catch (error) {
    return getFallbackPerformanceMetrics();
  }
}

// Helper: estimate conversion rate (tulad ng original)
// @ts-ignore
function estimateConversionRate(orders) {
  try {
    const totalOrders = orders.length;
    const estimatedVisitors = Math.max(totalOrders * 20, 1000);
    const conversionRate = (totalOrders / estimatedVisitors) * 100;
    return Math.round(Math.min(conversionRate, 25.0) * 10) / 10;
  } catch {
    return 12.5;
  }
}

// Helper: calculate CLV (replica ng _calculateCLV)
// @ts-ignore
// @ts-ignore
async function calculateCLV(orders) {
  try {
    const manager = AppDataSource.manager;
    const customerStats = await manager
      .createQueryBuilder(Order, "o")
      .select("o.customer_id", "customer_id")
      .addSelect("SUM(o.total)", "total_spent")
      .addSelect("COUNT(o.id)", "order_count")
      .where("o.customer_id IS NOT NULL AND o.customer_id != ''")
      .groupBy("o.customer_id")
      .getRawMany();

    if (customerStats.length === 0) return 0.0;
    const totalSpent = customerStats.reduce(
      (sum, row) => sum + (parseFloat(row.total_spent) || 0),
      0,
    );
    return Math.round((totalSpent / customerStats.length) * 100) / 100;
  } catch {
    return 0.0;
  }
}

// Helper: calculate repeat customer rate (replica ng _calculateRepeatCustomerRate)
// @ts-ignore
// @ts-ignore
async function calculateRepeatCustomerRate(orders) {
  try {
    const manager = AppDataSource.manager;
    const customerOrders = await manager
      .createQueryBuilder(Order, "o")
      .select("o.customer_id", "customer_id")
      .addSelect("COUNT(o.id)", "order_count")
      .where("o.customer_id IS NOT NULL AND o.customer_id != ''")
      .groupBy("o.customer_id")
      .getRawMany();

    const totalCustomers = customerOrders.length;
    const repeatCustomers = customerOrders.filter(
      (c) => c.order_count > 1,
    ).length;
    if (totalCustomers > 0) {
      return Math.round((repeatCustomers / totalCustomers) * 100 * 10) / 10;
    }
    return 0.0;
  } catch {
    return 0.0;
  }
}

// ----------------------------------------------------------------------
// Fallback objects
function getFallbackQuickStats() {
  return {
    totalSales: 0.0,
    totalProfit: 0.0,
    totalOrders: 0,
    totalCOGS: 0.0,
    averageOrderValue: 0.0,
    growthRate: 0.0,
    ordersGrowthRate: 0.0,
    profitMargin: 0.0,
    reconciliationStatus: "no_data",
    growthRateMethod: "fallback",
    growthRateFallbackApplied: true,
  };
}

function getFallbackPerformanceMetrics() {
  return {
    averageOrderValue: 0.0,
    conversionRate: 0.0,
    customerSatisfaction: 0.0,
    customerLifetimeValue: 0.0,
    repeatCustomerRate: 0.0,
    totalProfit: 0.0,
    totalCOGS: 0.0,
    cogsToSalesRatio: 0.0,
  };
}

// @ts-ignore
function getFallbackReportData(period, dateRange) {
  return {
    salesByMonth: [],
    topProducts: [],
    salesTrend: [],
    salesByCategory: [],
    quickStats: getFallbackQuickStats(),
    performanceMetrics: getFallbackPerformanceMetrics(),
    dateRange: {
      startDate: formatDateForSQL(dateRange.start_date),
      endDate: formatDateForSQL(dateRange.end_date),
      period,
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      formulaVersion: "3.1",
      profitFormulaVersion: "3.1-with-cogs-integration",
      cogsIntegrationStatus: "integrated",
      totalMonths: 0,
      totalProducts: 0,
      totalCategories: 0,
      filtersApplied: {
        period,
        category: null,
        product_id: null,
        group_by: "month",
      },
      fallbackUsed: true,
    },
  };
}

// ----------------------------------------------------------------------
// Generate metadata (replica ng _generateSalesMetadata)
// @ts-ignore
function generateMetadata(reportData, options) {
  return {
    generatedAt: new Date().toISOString(),
    formulaVersion: "3.1",
    profitFormulaVersion: "3.1-with-cogs-integration",
    cogsIntegrationStatus: "integrated",
    totalMonths: reportData.salesByMonth?.length || 0,
    totalProducts: reportData.topProducts?.length || 0,
    totalCategories: reportData.salesByCategory?.length || 0,
    filtersApplied: {
      period: options.period,
      category: options.category,
      product_id: options.product_id,
      group_by: options.group_by,
    },
  };
}

// ----------------------------------------------------------------------
// MAIN: generate sales report (replica ng _generateSalesReportData)
async function generateSalesReport(params = {}) {
  // @ts-ignore
  const {
    // @ts-ignore
    period = "1year",
    // @ts-ignore
    start_date,
    // @ts-ignore
    end_date,
    // @ts-ignore
    category,
    // @ts-ignore
    product_id,
    // @ts-ignore
    group_by = "month",
  } = params;
  const dateRange = getDateRange({ period, start_date, end_date });

  try {
    const orders = await getCompletedOrders(dateRange, category, product_id);
    if (!orders.length) {
      return getFallbackReportData(period, dateRange);
    }

    const [
      salesByMonth,
      topProducts,
      salesByCategory,
      quickStats,
      performanceMetrics,
    ] = await Promise.all([
      getSalesByPeriodWithProfit(orders, group_by, dateRange),
      getTopProductsWithProfitMargin(orders, category, product_id, 10),
      getSalesByCategory(orders),
      getQuickStats(orders, dateRange, category, product_id),
      getPerformanceMetrics(
        orders,
        await getQuickStats(orders, dateRange, category, product_id),
      ),
    ]);

    const salesTrend = getSalesTrend(salesByMonth);

    return {
      salesByMonth,
      topProducts,
      salesTrend,
      salesByCategory,
      quickStats,
      performanceMetrics,
      dateRange: {
        startDate: formatDateForSQL(dateRange.start_date),
        endDate: formatDateForSQL(dateRange.end_date),
        period,
      },
      metadata: generateMetadata(
        {
          salesByMonth,
          topProducts,
          salesByCategory,
          quickStats,
          performanceMetrics,
        },
        { period, category, product_id, group_by },
      ),
    };
  } catch (error) {
    console.error("Error generating sales report:", error);
    return getFallbackReportData(period, dateRange);
  }
}

// ----------------------------------------------------------------------
// Exported functions para sa iba't ibang IPC handlers
async function getProductPerformance(params = {}) {
  // @ts-ignore
  const { start_date, end_date, category, limit = 10 } = params;
  const dateRange = getDateRange({ period: "custom", start_date, end_date });
  const orders = await getCompletedOrders(dateRange, category, null);
  return await getTopProductsWithProfitMargin(orders, category, null, limit);
}

async function getCategoryPerformance(params = {}) {
  // @ts-ignore
  const { start_date, end_date } = params;
  const dateRange = getDateRange({ period: "custom", start_date, end_date });
  const orders = await getCompletedOrders(dateRange, null, null);
  return await getSalesByCategory(orders);
}

async function getMonthlyTrends(params = {}) {
  // @ts-ignore
  const { start_date, end_date } = params;
  const dateRange = getDateRange({ period: "custom", start_date, end_date });
  const orders = await getCompletedOrders(dateRange, null, null);
  return await getSalesByPeriodWithProfit(orders, "month", dateRange);
}

async function getSalesTargets(params = {}) {
  // @ts-ignore
  const { start_date, end_date } = params;
  const dateRange = getDateRange({ period: "custom", start_date, end_date });
  const orders = await getCompletedOrders(dateRange, null, null);
  const salesByMonth = await getSalesByPeriodWithProfit(
    orders,
    "month",
    dateRange,
  );
  return getSalesTrend(salesByMonth);
}

module.exports = {
  generateSalesReport,
  getProductPerformance,
  getCategoryPerformance,
  getMonthlyTrends,
  getSalesTargets,
};
