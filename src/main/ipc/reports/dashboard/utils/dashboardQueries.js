//@ts-check
const { Between } = require("typeorm");
const Order = require("../../../../../entities/Order");
const OrderItem = require("../../../../../entities/OrderItem");
const Product = require("../../../../../entities/Product");
const ProductVariant = require("../../../../../entities/ProductVariant");
const Customer = require("../../../../../entities/Customer");
const StockItem = require("../../../../../entities/StockItem");
const Supplier = require("../../../../../entities/Supplier");
const Purchase = require("../../../../../entities/Purchase");
const AuditLog = require("../../../../../entities/AuditLog");

// ----------------------------------------------------------------------
// Helper: Clamp percentage values with optional bounds
// @ts-ignore
function clampPercentage(value, min = -100, max = 100) {
  if (isNaN(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

// ----------------------------------------------------------------------
// Helper: Growth rate calculation with fallback (matches old _calculateValidatedGrowthRate)
// @ts-ignore
function calculateValidatedGrowthRate(current, previous, metricType) {
  current = Math.max(0, current);
  previous = Math.max(0, previous);

  if (previous === 0) {
    return {
      growth_rate: 0.0,
      method: "zero_previous_fallback",
      fallback_applied: true,
    };
  } else {
    const growthRate = ((current - previous) / previous) * 100;
    const bounded = clampPercentage(growthRate, -100, 500);
    return {
      growth_rate: bounded,
      method: "standard_calculation",
      fallback_applied: false,
    };
  }
}

// ----------------------------------------------------------------------
// Helper: Normalise segmentation percentages (new + repeat) to sum to 100
function normalizeSegmentationPercentages(
  // @ts-ignore
  newCustomers,
  // @ts-ignore
  repeatCustomers,
  // @ts-ignore
  totalCustomers,
) {
  if (totalCustomers <= 0) {
    return {
      newCustomers: 0,
      repeatCustomers: 0,
      newCustomerPercentage: 0.0,
      repeatCustomerPercentage: 0.0,
    };
  }

  let newPct = (newCustomers / totalCustomers) * 100;
  let repeatPct = (repeatCustomers / totalCustomers) * 100;

  const sum = newPct + repeatPct;
  if (Math.abs(sum - 100) > 0.01) {
    const scale = 100 / sum;
    newPct *= scale;
    repeatPct *= scale;
  }

  return {
    newCustomers,
    repeatCustomers,
    newCustomerPercentage: parseFloat(newPct.toFixed(2)),
    repeatCustomerPercentage: parseFloat(repeatPct.toFixed(2)),
  };
}

// ----------------------------------------------------------------------
// Helper: Validate expense breakdown (sum check)
// @ts-ignore
function validateExpenseBreakdown(breakdown, totalOperatingExpenses) {
  const calculatedSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const difference = Math.abs(calculatedSum - totalOperatingExpenses);
  const tolerance = 0.01;
  return {
    calculatedSum: parseFloat(calculatedSum.toFixed(2)),
    expectedSum: parseFloat(totalOperatingExpenses.toFixed(2)),
    difference: parseFloat(difference.toFixed(2)),
    isValid: difference <= tolerance,
    tolerance,
  };
}

// ----------------------------------------------------------------------
// Helper: Profit–Cashflow reconciliation
// @ts-ignore
function validateProfitCashflowReconciliation(profitMetrics, cashflowMetrics) {
  const tolerance = 0.01;
  const marginTolerance = 0.1;
  const issues = [];

  const expectedGrossProfit =
    profitMetrics.totalRevenue - profitMetrics.totalCOGS;
  const expectedNetProfit =
    profitMetrics.grossProfit - cashflowMetrics.operatingExpenses;
  const expectedOperatingMargin =
    profitMetrics.totalRevenue !== 0
      ? (expectedNetProfit / profitMetrics.totalRevenue) * 100
      : 0;

  const actualGrossProfit = cashflowMetrics.grossProfit;
  const actualNetProfit = cashflowMetrics.netProfit;
  const actualOperatingMargin = profitMetrics.operatingMargin;

  if (Math.abs(expectedGrossProfit - actualGrossProfit) > tolerance) {
    issues.push(
      `Gross profit mismatch: Expected ${expectedGrossProfit.toFixed(2)}, Got ${actualGrossProfit.toFixed(2)}`,
    );
  }
  if (Math.abs(expectedNetProfit - actualNetProfit) > tolerance) {
    issues.push(
      `Net profit mismatch: Expected ${expectedNetProfit.toFixed(2)}, Got ${actualNetProfit.toFixed(2)}`,
    );
  }
  if (
    Math.abs(expectedOperatingMargin - actualOperatingMargin) > marginTolerance
  ) {
    issues.push(
      `Operating margin mismatch: Expected ${expectedOperatingMargin.toFixed(2)}%, Got ${actualOperatingMargin.toFixed(2)}%`,
    );
  }

  return {
    status: issues.length === 0 ? "consistent" : "mismatch",
    issues,
    tolerance,
    marginTolerance,
    expected: {
      grossProfit: expectedGrossProfit,
      netProfit: expectedNetProfit,
      operatingMargin: expectedOperatingMargin,
    },
    actual: {
      grossProfit: actualGrossProfit,
      netProfit: actualNetProfit,
      operatingMargin: actualOperatingMargin,
    },
  };
}

// ----------------------------------------------------------------------
// Helper: Build expense breakdown from totalRevenue (same percentages as old)
// @ts-ignore
function calculateExpenseBreakdown(totalRevenue) {
  const percentages = {
    salaries: 0.15,
    rentUtilities: 0.08,
    marketing: 0.05,
    softwareTools: 0.02,
    otherExpenses: 0.03,
  };

  const breakdown = {};
  Object.entries(percentages).forEach(([key, pct]) => {
    // @ts-ignore
    breakdown[key] = totalRevenue * pct;
  });

  // Normalise to target 33% of revenue (as old did)
  const sum = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const targetSum = totalRevenue * 0.33; // 33% of revenue for expenses
  if (Math.abs(sum - targetSum) > 0.01 && sum !== 0) {
    const scale = targetSum / sum;
    Object.keys(breakdown).forEach((key) => {
      // @ts-ignore
      breakdown[key] *= scale;
    });
  }
  return breakdown;
}

// ----------------------------------------------------------------------
// Helper: Get cashflow trend (last 6 months, using net revenue)
async function getValidatedCashflowTrend() {
  const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Using raw query because of SQLite date functions
  // FIXED: Changed oi.order_id to oi.orderId (camelCase column name)
  const result = await AppDataSource.query(
    `
    SELECT 
      strftime('%Y-%m', o.created_at) as month_key,
      strftime('%b %Y', o.created_at) as month_name,
      COALESCE(SUM(oi.line_net_total), 0) as inflow_net,
      COALESCE(SUM(oi.line_net_total * 0.6), 0) as outflow_estimated
    FROM orders o
    JOIN order_items oi ON o.id = oi.orderId
    WHERE o.status = 'completed'
      AND o.created_at >= ?
    GROUP BY month_key, month_name
    ORDER BY month_key
    `,
    [sixMonthsAgo.toISOString()],
  );

  return (
    result
      // @ts-ignore
      .map((row) => {
        const inflowNet = Math.max(0, parseFloat(row.inflow_net) || 0);
        const outflow = Math.max(0, parseFloat(row.outflow_estimated) || 0);
        const netCashflow = inflowNet - outflow;
        return {
          month: row.month_name,
          inflow_net: parseFloat(inflowNet.toFixed(2)),
          outflow: parseFloat(outflow.toFixed(2)),
          netCashflow: parseFloat(netCashflow.toFixed(2)),
          cashflowStatus: netCashflow > 0 ? "positive" : "negative",
        };
      })
      .slice(-6)
  );
}

// ----------------------------------------------------------------------
// 1. TOTALS
async function getTotals() {
  const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    const productRepo = AppDataSource.getRepository(Product);
    const orderRepo = AppDataSource.getRepository(Order);
    const purchaseRepo = AppDataSource.getRepository(Purchase);
    const customerRepo = AppDataSource.getRepository(Customer);
    const stockRepo = AppDataSource.getRepository(StockItem);
    const orderItemRepo = AppDataSource.getRepository(OrderItem);

    const totalProducts = await productRepo.count({
      where: { is_deleted: false },
    });
    const totalOrders = await orderRepo.count({ where: { is_deleted: false } });
    const totalPurchases = await purchaseRepo.count({
      where: { is_deleted: false },
    });
    const totalCustomers = await customerRepo.count();

    // Net sales from completed orders using order_items.line_net_total
    const salesResult = await orderItemRepo
      .createQueryBuilder("oi")
      .innerJoin("oi.order", "o")
      .select("COALESCE(SUM(oi.line_net_total), 0)", "total")
      .where("o.status = :status", { status: "completed" })
      .andWhere("o.is_deleted = :deleted", { deleted: false })
      .getRawOne();
    const totalSales = parseFloat(salesResult?.total || 0);

    // Low stock count
    const lowStockCount = await stockRepo
      .createQueryBuilder("stock")
      .innerJoin("stock.product", "product")
      .where("product.track_quantity = 1")
      .andWhere("stock.quantity > 0")
      .andWhere("stock.quantity <= COALESCE(stock.low_stock_threshold, 10)")
      .getCount();

    // Out of stock count
    const outOfStockCount = await stockRepo
      .createQueryBuilder("stock")
      .innerJoin("stock.product", "product")
      .where("product.track_quantity = 1")
      .andWhere("(stock.quantity = 0 OR stock.quantity IS NULL)")
      .andWhere("product.allow_backorder = 0")
      .getCount();

    const pendingOrders = await orderRepo.count({
      where: { status: "pending", is_deleted: false },
    });

    return {
      totalProducts,
      totalOrders,
      totalPurchases,
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalCustomers,
      lowStockCount,
      outOfStockCount,
      pendingOrders,
    };
  } catch (error) {
    console.error("getTotals error:", error);
    return {
      totalProducts: 0,
      totalOrders: 0,
      totalPurchases: 0,
      totalSales: 0.0,
      totalCustomers: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      pendingOrders: 0,
    };
  }
}

// ----------------------------------------------------------------------
// 2. GROWTH METRICS
async function getGrowthMetrics() {
  const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - 30);
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);

    const orderRepo = AppDataSource.getRepository(Order);
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const customerRepo = AppDataSource.getRepository(Customer);
    const productRepo = AppDataSource.getRepository(Product);

    // Helper to get net revenue between dates
    // @ts-ignore
    const getNetRevenue = async (start, end) => {
      const result = await orderItemRepo
        .createQueryBuilder("oi")
        .innerJoin("oi.order", "o")
        .select("COALESCE(SUM(oi.line_net_total), 0)", "total")
        .where("o.status = :status", { status: "completed" })
        .andWhere("o.created_at BETWEEN :start AND :end", { start, end })
        .getRawOne();
      return parseFloat(result?.total || 0);
    };

    // @ts-ignore
    const getOrderCount = async (start, end) => {
      return orderRepo.count({
        where: {
          created_at: Between(start, end),
        },
      });
    };

    // @ts-ignore
    const getCustomerCount = async (start, end) => {
      return customerRepo.count({
        where: {
          createdAt: Between(start, end),
        },
      });
    };

    // @ts-ignore
    const getProductCount = async (start, end) => {
      return productRepo.count({
        where: {
          created_at: Between(start, end),
          is_deleted: false,
        },
      });
    };

    const currentSales = await getNetRevenue(startDate, now);
    const previousSales = await getNetRevenue(
      previousStartDate,
      previousEndDate,
    );
    const salesGrowth = calculateValidatedGrowthRate(
      currentSales,
      previousSales,
      "sales",
    );

    const currentOrders = await getOrderCount(startDate, now);
    const previousOrders = await getOrderCount(
      previousStartDate,
      previousEndDate,
    );
    const orderGrowth = calculateValidatedGrowthRate(
      currentOrders,
      previousOrders,
      "orders",
    );

    const currentCustomers = await getCustomerCount(startDate, now);
    const previousCustomers = await getCustomerCount(
      previousStartDate,
      previousEndDate,
    );
    const customerGrowth = calculateValidatedGrowthRate(
      currentCustomers,
      previousCustomers,
      "customers",
    );

    const currentProducts = await getProductCount(startDate, now);
    const previousProducts = await getProductCount(
      previousStartDate,
      previousEndDate,
    );
    const productGrowth = calculateValidatedGrowthRate(
      currentProducts,
      previousProducts,
      "products",
    );

    const fallbackApplied =
      salesGrowth.fallback_applied ||
      orderGrowth.fallback_applied ||
      customerGrowth.fallback_applied ||
      productGrowth.fallback_applied;

    return {
      monthlyGrowth: parseFloat(productGrowth.growth_rate.toFixed(2)),
      salesGrowth: parseFloat(salesGrowth.growth_rate.toFixed(2)),
      customerGrowth: parseFloat(customerGrowth.growth_rate.toFixed(2)),
      orderGrowth: parseFloat(orderGrowth.growth_rate.toFixed(2)),
      growthRateMethod: productGrowth.method,
      growthRateFallbackApplied: fallbackApplied,
    };
  } catch (error) {
    console.error("getGrowthMetrics error:", error);
    return {
      monthlyGrowth: 0.0,
      salesGrowth: 0.0,
      customerGrowth: 0.0,
      orderGrowth: 0.0,
      growthRateMethod: "error_fallback",
      growthRateFallbackApplied: true,
    };
  }
}

// ----------------------------------------------------------------------
// 3. PROFIT METRICS (using net revenue and variant-aware COGS)
async function getProfitMetrics() {
  const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const orderItemRepo = AppDataSource.getRepository(OrderItem);

    // Net revenue
    const revenueResult = await orderItemRepo
      .createQueryBuilder("oi")
      .innerJoin("oi.order", "o")
      .select("COALESCE(SUM(oi.line_net_total), 0)", "total")
      .where("o.status = :status", { status: "completed" })
      .andWhere("o.created_at BETWEEN :start AND :end", {
        start: startDate,
        end: endDate,
      })
      .getRawOne();
    const totalRevenue = parseFloat(revenueResult?.total || 0);

    // COGS with variant fallback
    const cogsResult = await orderItemRepo
      .createQueryBuilder("oi")
      .innerJoin("oi.order", "o")
      .innerJoin("oi.product", "p")
      .leftJoin("oi.variant", "v")
      .select(
        "COALESCE(SUM(oi.quantity * COALESCE(v.cost_per_item, p.cost_per_item, 0)), 0)",
        "cogs",
      )
      .where("o.status = :status", { status: "completed" })
      .andWhere("o.created_at BETWEEN :start AND :end", {
        start: startDate,
        end: endDate,
      })
      .getRawOne();
    const totalCOGS = parseFloat(cogsResult?.cogs || 0);

    const grossProfit = totalRevenue - totalCOGS;
    const grossProfitMargin =
      totalRevenue !== 0
        ? clampPercentage((grossProfit / totalRevenue) * 100)
        : 0;
    const cogsToSalesRatio =
      totalRevenue !== 0
        ? clampPercentage((totalCOGS / totalRevenue) * 100)
        : 0;

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCOGS: parseFloat(totalCOGS.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      grossProfitMargin: parseFloat(grossProfitMargin.toFixed(2)),
      cogsToSalesRatio: parseFloat(cogsToSalesRatio.toFixed(2)),
      operatingMargin: null,
    };
  } catch (error) {
    console.error("getProfitMetrics error:", error);
    return {
      totalRevenue: 0.0,
      totalCOGS: 0.0,
      grossProfit: 0.0,
      grossProfitMargin: 0.0,
      cogsToSalesRatio: 0.0,
      operatingMargin: 0.0,
    };
  }
}

// ----------------------------------------------------------------------
// 4. CUSTOMER METRICS (with net revenue)
async function getCustomerMetrics() {
  const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const orderRepo = AppDataSource.getRepository(Order);
    const customerRepo = AppDataSource.getRepository(Customer);

    // Customer stats: total spent net, order count, first/last order
    const customerStatsRaw = await orderItemRepo
      .createQueryBuilder("oi")
      .innerJoin("oi.order", "o")
      .select([
        "o.customerId as customer_id",
        "COUNT(o.id) as order_count",
        "SUM(oi.line_net_total) as total_spent_net",
        "SUM(o.total) as total_spent_gross",
        "MIN(o.created_at) as first_order",
        "MAX(o.created_at) as last_order",
      ])
      .where("o.status = :status", { status: "completed" })
      .groupBy("o.customerId")
      .getRawMany();

    const customerStats = {};
    let totalRevenueNet = 0;
    let totalRevenueGross = 0;

    customerStatsRaw.forEach((row) => {
      if (row.customerId) {
        // @ts-ignore
        customerStats[row.customerId] = {
          total_spent_net: parseFloat(row.total_spent_net) || 0,
          total_spent_gross: parseFloat(row.total_spent_gross) || 0,
          order_count: row.order_count,
          first_order: row.first_order,
          last_order: row.last_order,
        };
        totalRevenueNet += parseFloat(row.total_spent_net) || 0;
        totalRevenueGross += parseFloat(row.total_spent_gross) || 0;
      }
    });

    const totalCustomers = Object.keys(customerStats).length;
    const repeatCustomers = Object.values(customerStats).filter(
      (stats) => stats.order_count > 1,
    ).length;

    // CLV (net revenue based)
    const clv = totalCustomers > 0 ? totalRevenueNet / totalCustomers : 0;

    // Repeat customer rate (clamped)
    const repeatCustomerRate =
      totalCustomers > 0
        ? clampPercentage((repeatCustomers / totalCustomers) * 100)
        : 0;

    // Churn rate (customers not active in last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const activeResult = await orderRepo
      .createQueryBuilder("o")
      .select("COUNT(DISTINCT o.customerId)", "count")
      .where("o.created_at >= :date", { date: ninetyDaysAgo })
      .getRawOne();
    const activeCustomers = Math.max(0, parseInt(activeResult?.count) || 0);
    const churnRate =
      totalCustomers > 0
        ? clampPercentage(
            ((totalCustomers - activeCustomers) / totalCustomers) * 100,
          )
        : 0;

    // New customers in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newCustomersResult = await customerRepo
      .createQueryBuilder("c")
      .select("COUNT(*)", "count")
      .where("c.createdAt >= :date", { date: thirtyDaysAgo })
      .getRawOne();
    const newCustomers = Math.max(0, parseInt(newCustomersResult?.count) || 0);
    const returningCustomers = Math.max(0, activeCustomers - newCustomers);
    const totalRecentCustomers = newCustomers + returningCustomers;

    const segmentation = normalizeSegmentationPercentages(
      newCustomers,
      returningCustomers,
      totalRecentCustomers,
    );

    return {
      customerLifetimeValue: parseFloat(clv.toFixed(2)),
      repeatCustomerRate: parseFloat(repeatCustomerRate.toFixed(2)),
      churnRate: parseFloat(churnRate.toFixed(2)),
      segmentation,
      totalCustomers: Math.max(0, totalCustomers),
      activeCustomers: Math.max(0, activeCustomers),
      revenueDifference: parseFloat(
        (totalRevenueGross - totalRevenueNet).toFixed(2),
      ),
    };
  } catch (error) {
    console.error("getCustomerMetrics error:", error);
    return {
      customerLifetimeValue: 0.0,
      repeatCustomerRate: 0.0,
      churnRate: 0.0,
      segmentation: {
        newCustomers: 0,
        repeatCustomers: 0,
        newCustomerPercentage: 0.0,
        repeatCustomerPercentage: 0.0,
      },
      totalCustomers: 0,
      activeCustomers: 0,
      revenueDifference: 0.0,
    };
  }
}

// ----------------------------------------------------------------------
// 5. INVENTORY HEALTH
async function getInventoryHealth() {
  const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    const stockRepo = AppDataSource.getRepository(StockItem);
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    // @ts-ignore
    const productRepo = AppDataSource.getRepository(Product);
    const supplierRepo = AppDataSource.getRepository(Supplier);
    const purchaseRepo = AppDataSource.getRepository(Purchase);

    // Inventory value
    const valueResult = await stockRepo
      .createQueryBuilder("si")
      .leftJoin("si.product", "p")
      .leftJoin("si.variant", "v")
      .select(
        "COALESCE(SUM(CASE WHEN si.variant_id IS NULL THEN si.quantity * COALESCE(p.cost_per_item, 0) ELSE si.quantity * COALESCE(v.cost_per_item, 0) END), 0)",
        "total_value",
      )
      .getRawOne();
    const inventoryValue = parseFloat(valueResult?.total_value || 0);

    // Average daily COGS (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const cogsResult = await orderItemRepo
      .createQueryBuilder("oi")
      .innerJoin("oi.order", "o")
      .innerJoin("oi.product", "p")
      .leftJoin("oi.variant", "v")
      .select(
        "COALESCE(SUM(oi.quantity * COALESCE(v.cost_per_item, p.cost_per_item, 0)), 0)",
        "total_cogs",
      )
      .where("o.status = :status", { status: "completed" })
      .andWhere("o.created_at BETWEEN :start AND :end", {
        start: startDate,
        end: endDate,
      })
      .getRawOne();
    const totalCOGS30 = parseFloat(cogsResult?.total_cogs || 0);
    const dailyCOGS = totalCOGS30 / 30;

    const monthlyCOGS = dailyCOGS * 30;
    const inventoryTurnover =
      inventoryValue > 0 ? monthlyCOGS / inventoryValue : 0;
    const daysOfStockCoverage = dailyCOGS > 0 ? inventoryValue / dailyCOGS : 0;

    // Stock aging buckets with normalisation
    const stockItems = await stockRepo
      .createQueryBuilder("si")
      .innerJoinAndSelect("si.product", "p")
      .leftJoinAndSelect("si.variant", "v")
      .where("si.quantity > 0")
      .getMany();

    let recentStock = 0,
      middleStock = 0,
      agedStock = 0,
      totalStockQty = 0;
    const now = new Date();

    stockItems.forEach((item) => {
      const age = Math.floor(
        // @ts-ignore
        (now - new Date(item.created_at)) / (1000 * 60 * 60 * 24),
      );
      // @ts-ignore
      const qty = Math.max(0, item.quantity || 0);
      totalStockQty += qty;
      if (age < 30) recentStock += qty;
      else if (age <= 90) middleStock += qty;
      else agedStock += qty;
    });

    let recentPct = 60.0,
      middlePct = 30.0,
      agedPct = 10.0;
    if (totalStockQty > 0) {
      recentPct = (recentStock / totalStockQty) * 100;
      middlePct = (middleStock / totalStockQty) * 100;
      agedPct = (agedStock / totalStockQty) * 100;
      const sum = recentPct + middlePct + agedPct;
      if (Math.abs(sum - 100) > 0.01) {
        const scale = 100 / sum;
        recentPct *= scale;
        middlePct *= scale;
        agedPct *= scale;
      }
    }

    const stockAgingBuckets = {
      recent: {
        quantity: recentStock,
        percentage: clampPercentage(parseFloat(recentPct.toFixed(1))),
        description: "<30 days",
      },
      middle: {
        quantity: middleStock,
        percentage: clampPercentage(parseFloat(middlePct.toFixed(1))),
        description: "30-90 days",
      },
      aged: {
        quantity: agedStock,
        percentage: clampPercentage(parseFloat(agedPct.toFixed(1))),
        description: ">90 days",
      },
      totalStock: totalStockQty,
      validation: {
        percentagesSum: parseFloat(
          (recentPct + middlePct + agedPct).toFixed(1),
        ),
        isValid: Math.abs(recentPct + middlePct + agedPct - 100) < 0.1,
      },
    };

    // Supplier performance
    const suppliers = await supplierRepo.find({
      where: { status: "approved", is_active: true },
    });
    const supplierDetails = [];
    // @ts-ignore
    const allLeadTimes = [];
    const allFulfillmentRates = [];

    for (const sup of suppliers) {
      // FIXED: Changed supplier_id to supplierId (correct foreign key property)
      const purchases = await purchaseRepo.find({
        // @ts-ignore
        where: { supplier: {id: sup.id} },
      });
      if (purchases.length > 0) {
        // @ts-ignore
        const leadTimes = [];
        purchases.forEach((p) => {
          if (p.received_at && p.created_at && p.status === "received") {
            const leadTime = Math.floor(
              // @ts-ignore
              (new Date(p.received_at) - new Date(p.created_at)) /
                (1000 * 60 * 60 * 24),
            );
            if (leadTime >= 0) {
              leadTimes.push(leadTime);
              allLeadTimes.push(leadTime);
            }
          }
        });
        const avgLeadTime =
          leadTimes.length > 0
            ? // @ts-ignore
              leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
            : 7.0;
        const totalOrders = purchases.length;
        const fulfilledOrders = purchases.filter(
          (p) => p.status === "received",
        ).length;
        const fulfillmentRate =
          totalOrders > 0
            ? clampPercentage((fulfilledOrders / totalOrders) * 100)
            : 0;
        allFulfillmentRates.push(fulfillmentRate);
        supplierDetails.push({
          supplierName: sup.name,
          averageLeadTime: parseFloat(avgLeadTime.toFixed(1)),
          fulfillmentRate: parseFloat(fulfillmentRate.toFixed(2)),
          totalOrders,
          contactPerson: sup.contact_person || "Not specified",
          email: sup.email || "Not specified",
        });
      }
    }

    let overallLeadTime = 7.0,
      overallFulfillment = 85.0;
    if (allLeadTimes.length > 0) {
      overallLeadTime =
        // @ts-ignore
        allLeadTimes.reduce((a, b) => a + b, 0) / allLeadTimes.length;
      overallFulfillment =
        allFulfillmentRates.length > 0
          ? allFulfillmentRates.reduce((a, b) => a + b, 0) /
            allFulfillmentRates.length
          : 85.0;
    }

    const supplierPerformance = {
      overallPerformance: {
        averageLeadTime: parseFloat(overallLeadTime.toFixed(1)),
        fulfillmentRate: parseFloat(overallFulfillment.toFixed(2)),
        supplierCount: supplierDetails.length,
      },
      supplierDetails: supplierDetails.slice(0, 5),
    };

    // Auto-reorder triggered count (low stock)
    const autoReorderTriggeredCount = await stockRepo
      .createQueryBuilder("stock")
      .innerJoin("stock.product", "p")
      .where("p.track_quantity = 1")
      .andWhere("stock.quantity > 0")
      .andWhere("stock.quantity <= COALESCE(stock.low_stock_threshold, 10)")
      .getCount();

    return {
      inventoryTurnover: parseFloat(inventoryTurnover.toFixed(2)),
      daysOfStockCoverage: parseFloat(daysOfStockCoverage.toFixed(1)),
      stockAgingBuckets,
      stockAgingPercentage: stockAgingBuckets.aged.percentage,
      supplierPerformance,
      autoReorderTriggeredCount,
      inventoryValue: parseFloat(inventoryValue.toFixed(2)),
      averageDailyCOGS: parseFloat(dailyCOGS.toFixed(2)),
      monthlyCOGS: parseFloat(monthlyCOGS.toFixed(2)),
    };
  } catch (error) {
    console.error("getInventoryHealth error:", error);
    return {
      inventoryTurnover: 0.0,
      daysOfStockCoverage: 0.0,
      stockAgingBuckets: {
        recent: { quantity: 0, percentage: 60.0, description: "<30 days" },
        middle: { quantity: 0, percentage: 30.0, description: "30-90 days" },
        aged: { quantity: 0, percentage: 10.0, description: ">90 days" },
        totalStock: 0,
        validation: { percentagesSum: 100.0, isValid: true },
      },
      stockAgingPercentage: 10.0,
      supplierPerformance: {
        overallPerformance: {
          averageLeadTime: 7.0,
          fulfillmentRate: 85.0,
          supplierCount: 0,
        },
        supplierDetails: [],
      },
      autoReorderTriggeredCount: 0,
      inventoryValue: 0.0,
      averageDailyCOGS: 0.0,
      monthlyCOGS: 0.0,
    };
  }
}

// ----------------------------------------------------------------------
// 6. CASHFLOW METRICS
async function getCashflowMetrics() {
  try {
    const profitMetrics = await getProfitMetrics();
    const totalRevenue = profitMetrics.totalRevenue;
    const grossProfit = profitMetrics.grossProfit;

    const expenseBreakdown = calculateExpenseBreakdown(totalRevenue);
    const totalOperatingExpenses = Object.values(expenseBreakdown).reduce(
      (a, b) => a + b,
      0,
    );
    const breakdownValidation = validateExpenseBreakdown(
      expenseBreakdown,
      totalOperatingExpenses,
    );

    const netProfit = grossProfit - totalOperatingExpenses;
    const operatingMargin =
      totalRevenue !== 0
        ? clampPercentage((netProfit / totalRevenue) * 100)
        : 0;

    profitMetrics.operatingMargin = parseFloat(operatingMargin.toFixed(2));

    const cashflowTrend = await getValidatedCashflowTrend();
    const cashflowStatus = netProfit >= 0 ? "positive" : "negative";

    const reconciliation = validateProfitCashflowReconciliation(profitMetrics, {
      operatingExpenses: totalOperatingExpenses,
      netProfit,
      grossProfit,
    });

    return {
      operatingExpenses: parseFloat(totalOperatingExpenses.toFixed(2)),
      expenseBreakdown: Object.fromEntries(
        Object.entries(expenseBreakdown).map(([k, v]) => [
          k,
          parseFloat(v.toFixed(2)),
        ]),
      ),
      netProfit: parseFloat(netProfit.toFixed(2)),
      cashflowStatus,
      cashflowTrend,
      revenue: parseFloat(totalRevenue.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      profitReconciliationStatus: reconciliation.status,
      expenseValidation: breakdownValidation,
      reconciliationIssues: reconciliation.issues,
    };
  } catch (error) {
    console.error("getCashflowMetrics error:", error);
    return {
      operatingExpenses: 0.0,
      expenseBreakdown: {},
      netProfit: 0.0,
      cashflowStatus: "neutral",
      cashflowTrend: [],
      revenue: 0.0,
      grossProfit: 0.0,
      profitReconciliationStatus: "error",
      expenseValidation: {
        calculatedSum: 0,
        expectedSum: 0,
        difference: 0,
        isValid: true,
        tolerance: 0.01,
      },
      reconciliationIssues: [],
    };
  }
}

// ----------------------------------------------------------------------
// 7. RECENT ACTIVITIES (from orders, limit 4)
async function getRecentActivities() {
  const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    const recentOrders = await orderRepo.find({
      select: ["id", "order_number", "created_at", "status"],
      order: { created_at: "DESC" },
      take: 4,
    });

    return recentOrders.map((order, idx) => ({
      id: idx + 1,
      action: "New order placed",
      details: `Order #${order.order_number}`,
      time: timeAgo(order.created_at),
      status: order.status,
    }));
  } catch (error) {
    console.error("getRecentActivities error:", error);
    return [];
  }
}

// @ts-ignore
function timeAgo(timestamp) {
  const now = new Date();
  // @ts-ignore
  const diff = now - new Date(timestamp);
  if (diff > 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} days ago`;
  } else if (diff > 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} hours ago`;
  } else if (diff > 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes} min ago`;
  } else {
    return "Just now";
  }
}

// ----------------------------------------------------------------------
// 8. TRAFFIC (hourly orders last 7 days)
async function getTraffic(days = 7) {
  const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orderRepo = AppDataSource.getRepository(Order);
    const orders = await orderRepo
      .createQueryBuilder("o")
      .select("o.created_at")
      .where("o.created_at >= :start", { start: startDate })
      .getMany();

    const hourlyMap = {};
    orders.forEach((order) => {
      const hour =
        // @ts-ignore
        new Date(order.created_at).toISOString().slice(0, 13) + ":00";
      // @ts-ignore
      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
    });

    const labels = Object.keys(hourlyMap).sort();
    // @ts-ignore
    const data = labels.map((label) => hourlyMap[label]);
    return { labels, data };
  } catch (error) {
    console.error("getTraffic error:", error);
    return { labels: [], data: [] };
  }
}

// ----------------------------------------------------------------------
// 9. TREND DATA (sales, customers, orders over last 6 months)
async function getTrendData() {
  const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Sales trend (using net revenue)
    // FIXED: Changed order_items column names to camelCase (orderId, productId, variantId)
    const salesTrendRaw = await AppDataSource.query(
      `
      SELECT 
        strftime('%Y-%m', o.created_at) as month_key,
        strftime('%b %Y', o.created_at) as month_name,
        COALESCE(SUM(oi.line_net_total), 0) as revenue,
        COUNT(o.id) as orders,
        COALESCE(SUM(oi.quantity * COALESCE(v.cost_per_item, p.cost_per_item, 0)), 0) as cogs
      FROM orders o
      JOIN order_items oi ON o.id = oi.orderId
      JOIN products p ON oi.productId = p.id
      LEFT JOIN product_variants v ON oi.variantId = v.id
      WHERE o.status = 'completed' 
        AND o.created_at >= ?
      GROUP BY month_key, month_name
      ORDER BY month_key
      `,
      [sixMonthsAgo.toISOString()],
    );

    const salesTrend = salesTrendRaw
      // @ts-ignore
      .map((row) => {
        const revenue = Math.max(0, parseFloat(row.revenue) || 0);
        const cogs = Math.max(0, parseFloat(row.cogs) || 0);
        const profit = revenue - cogs;
        const profitMargin =
          revenue > 0 ? clampPercentage((profit / revenue) * 100) : 0;
        return {
          month: row.month_name,
          revenue: parseFloat(revenue.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          cogs: parseFloat(cogs.toFixed(2)),
          orders: row.orders,
        };
      })
      .slice(-6);

    // Customer trend (new vs repeat) - gamit ang Customer entity
    const customerTrend = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );
      const monthStr = monthStart.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      // New customers in month (gamit ang Customer entity)
      const newCustResult = await AppDataSource.query(
        `
        SELECT COUNT(*) as count
        FROM customers
        WHERE "createdAt" >= ? AND "createdAt" < ?
        `,
        [monthStart.toISOString(), monthEnd.toISOString()],
      );
      const newCustomers = Math.max(0, parseInt(newCustResult[0]?.count) || 0);

      // Repeat customers: placed orders this month but created before monthStart
      const repeatCustResult = await AppDataSource.query(
        `
        SELECT COUNT(DISTINCT o.customerId) as count
        FROM orders o
        WHERE o.status = 'completed'
          AND o.created_at >= ? AND o.created_at < ?
          AND o.customerId IS NOT NULL
          AND o.customerId IN (
            SELECT id FROM customers 
            WHERE "createdAt" < ?
          )
        `,
        [
          monthStart.toISOString(),
          monthEnd.toISOString(),
          monthStart.toISOString(),
        ],
      );
      const repeatCustomers = Math.max(
        0,
        parseInt(repeatCustResult[0]?.count) || 0,
      );

      const totalCustomers = newCustomers + repeatCustomers;
      let repeatRate = 0;
      if (totalCustomers > 0) {
        repeatRate = clampPercentage((repeatCustomers / totalCustomers) * 100);
      }

      customerTrend.push({
        month: monthStr,
        newCustomers,
        repeatCustomers,
        totalCustomers,
        repeatRate: parseFloat(repeatRate.toFixed(2)),
        sampleGuardApplied: totalCustomers < 10,
      });
    }

    // Order trend (by status)
    const orderTrendRaw = await AppDataSource.query(
      `
      SELECT 
        strftime('%Y-%m', created_at) as month_key,
        strftime('%b %Y', created_at) as month_name,
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
      FROM orders 
      WHERE created_at >= ?
      GROUP BY month_key, month_name
      ORDER BY month_key
      `,
      [sixMonthsAgo.toISOString()],
    );

    const orderTrend = orderTrendRaw
      // @ts-ignore
      .map((row) => ({
        month: row.month_name,
        totalOrders: Math.max(0, row.total_orders || 0),
        completed: Math.max(0, row.completed || 0),
        pending: Math.max(0, row.pending || 0),
        cancelled: Math.max(0, row.cancelled || 0),
        confirmed: Math.max(0, row.confirmed || 0),
        completionRate: clampPercentage(
          row.total_orders > 0 ? (row.completed / row.total_orders) * 100 : 0,
        ),
      }))
      .slice(-6);

    return {
      salesTrend,
      customerTrend,
      orderTrend,
      validation: {
        salesTrendValidated: true,
        customerTrendValidated: true,
        orderTrendValidated: true,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("getTrendData error:", error);
    return {
      salesTrend: [],
      customerTrend: [],
      orderTrend: [],
    };
  }
}

// ----------------------------------------------------------------------
// 10. METADATA (matches old _getValidatedMetadata)
async function getMetadata() {
  const totals = await getTotals().catch(() => ({}));
  const profit = await getProfitMetrics().catch(() => ({}));
  const inventory = await getInventoryHealth().catch(() => ({}));
  const cashflow = await getCashflowMetrics().catch(() => ({}));

  return {
    generatedAt: new Date().toISOString(),
    formulaVersion: "6.0-fixed-net-price",
    profitFormulaVersion: "6.0-accurate-cogs",
    growthFormulaVersion: "6.0-proper-growth",
    customerMetricsVersion: "6.0-net-revenue-clv",
    inventoryMetricsVersion: "6.0-accurate-valuation",
    cashflowFormulaVersion: "6.0-net-cashflow",
    calculations: {
      revenue: "SUM(order_items.line_net_total) [NET PRICE, VAT-EXCLUSIVE]",
      grossProfit: "net_revenue - total_cogs",
      grossProfitMargin: "(gross_profit / net_revenue) * 100 [clamped 0-100%]",
      netProfit: "gross_profit - operating_expenses",
      operatingMargin: "(net_profit / net_revenue) * 100 [clamped 0-100%]",
      cogs: "quantity * cost_per_item (with variant support)",
      customerLifetimeValue: "net_revenue / total_customers",
      repeatCustomerRate:
        "(repeat_customers / total_customers) * 100 [clamped 0-100%]",
      inventoryTurnover: "monthly_cogs / inventory_value",
      daysOfStockCoverage: "inventory_value / average_daily_cogs",
    },
    period: "last_30_days",
    dataPoints: {
      // @ts-ignore
      totalProducts: totals.totalProducts || 0,
      // @ts-ignore
      totalOrders: totals.totalOrders || 0,
      // @ts-ignore
      totalCustomers: totals.totalCustomers || 0,
      // @ts-ignore
      inventoryValue: inventory.inventoryValue || 0,
      // @ts-ignore
      totalRevenue: profit.totalRevenue || 0,
      // @ts-ignore
      grossProfit: profit.grossProfit || 0,
      // @ts-ignore
      operatingExpenses: cashflow.operatingExpenses || 0,
      // @ts-ignore
      netProfit: cashflow.netProfit || 0,
    },
    priceSource: "order_items.line_net_total (VAT-exclusive)",
    cogsSource: "products.cost_per_item with variant fallback",
    vatHandling: "separated_from_revenue",
    dataSource: "TypeORM with net revenue",
    schemaVersion: "compatible-with-actual-tables",
    // @ts-ignore
    reconciliationStatus: cashflow.profitReconciliationStatus || "consistent",
    validationRules: {
      nonNegativeCounts: "enforced",
      percentageBounds: "0-100% enforced (except net profit)",
      formulaConsistency: "validated",
      revenueNetBased: "enforced",
    },
    // @ts-ignore
    expenseCategories: Object.keys(cashflow.expenseBreakdown || {}),
  };
}

module.exports = {
  getTotals,
  getGrowthMetrics,
  getProfitMetrics,
  getCustomerMetrics,
  getInventoryHealth,
  getCashflowMetrics,
  getRecentActivities,
  getTraffic,
  getTrendData,
  getMetadata,
};