//@ts-check
// @ts-ignore
const { Between } = require("typeorm");
const OrderItem = require("../../../../../entities/OrderItem");
const Purchase = require("../../../../../entities/Purchase");
const Order = require("../../../../../entities/Order");

// Version constants (tulad ng original)
const FORMULA_VERSION = "2.0";
const GROWTH_FORMULA_VERSION = "2.0-with-profit-fallback";

// ----------------------------------------------------------------------
// Helper: clamp percentage (hindi ginagamit sa original pero ilalagay natin para safe)
// @ts-ignore
function clampPercentage(value, min = -100, max = 100) {
  if (isNaN(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

// ----------------------------------------------------------------------
// Helper: format date for SQL (YYYY-MM-DD)
// @ts-ignore
function formatDateForSQL(date) {
  return date.toISOString().split("T")[0];
}

// ----------------------------------------------------------------------
// Helper: format period display (tulad ng original)
// @ts-ignore
function formatPeriodDisplay(periodKey, groupBy) {
  if (groupBy === "day") {
    const [year, month, day] = periodKey.split("-");
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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
// Helper: get date range from params (eksaktong replica ng _getDateRange)
// @ts-ignore
function getDateRange(params) {
  const { period, start_date, end_date } = params;
  const endDateObj = new Date();

  if (period === "custom" && start_date && end_date) {
    const startDateObj = new Date(start_date);
    endDateObj.setTime(new Date(end_date).getTime());
    return { start_date: startDateObj, end_date: endDateObj };
  } else {
    const periodDays = {
      "3months": 90,
      "6months": 180,
      "1year": 365,
    };
    // @ts-ignore
    const days = periodDays[period] || 365;
    const startDateObj = new Date(endDateObj);
    startDateObj.setDate(startDateObj.getDate() - days);
    return { start_date: startDateObj, end_date: endDateObj };
  }
}

// ----------------------------------------------------------------------
// Helper: get profit/loss by month (replica ng _getProfitLossByMonthData)
// @ts-ignore
async function getProfitLossByMonthData(dateRange, categoryFilter = null) {
   const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const manager = AppDataSource.manager;
  const { start_date, end_date } = dateRange;

  // --- NET REVENUE (line_net_total) ---
  let revenueQuery = manager
    .createQueryBuilder(OrderItem, "oi")
    .innerJoin("oi.order", "o")
    .select("strftime('%Y-%m', o.created_at)", "period")
    .addSelect("SUM(oi.line_net_total)", "revenue")
    .where("o.status = :status", { status: "completed" })
    .andWhere("o.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    });

  if (categoryFilter) {
    revenueQuery
      .innerJoin("oi.product", "p")
      .innerJoin("p.category", "c")
      .andWhere("c.name = :category", { category: categoryFilter });
  }

  revenueQuery.groupBy("period").orderBy("period");
  const revenueData = await revenueQuery.getRawMany();

  // --- COGS (with variant support) ---
  let cogsQuery = manager
    .createQueryBuilder(OrderItem, "oi")
    .innerJoin("oi.order", "o")
    .leftJoin("oi.product", "p")
    .leftJoin("oi.variant", "v")
    .select("strftime('%Y-%m', o.created_at)", "period")
    .addSelect(
      "SUM(oi.quantity * COALESCE(v.cost_per_item, p.cost_per_item, 0))",
      "cost_of_goods_sold",
    )
    .where("o.status = :status", { status: "completed" })
    .andWhere("oi.is_deleted = 0")
    .andWhere("o.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    });

  if (categoryFilter) {
    cogsQuery
      .innerJoin("oi.product", "p2")
      .innerJoin("p2.category", "c2")
      .andWhere("c2.name = :category", { category: categoryFilter });
  }

  cogsQuery.groupBy("period").orderBy("period");
  const cogsData = await cogsQuery.getRawMany();

  // --- OPERATING EXPENSES (from purchases) ---
  const operatingExpensesQuery = manager
    .createQueryBuilder(Purchase, "p")
    .select("strftime('%Y-%m', p.created_at)", "period")
    .addSelect("SUM(p.total)", "operating_expenses")
    .where("p.status = :status", { status: "received" })
    .andWhere("p.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    })
    .groupBy("period")
    .orderBy("period");

  const operatingExpensesData = await operatingExpensesQuery.getRawMany();

  // --- GROSS REVENUE (for comparison / VAT) ---
  let grossRevenueQuery = manager
    .createQueryBuilder(Order, "o")
    .select("strftime('%Y-%m', o.created_at)", "period")
    .addSelect("SUM(o.total)", "gross_revenue")
    .where("o.status = :status", { status: "completed" })
    .andWhere("o.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    });

  if (categoryFilter) {
    grossRevenueQuery
      .innerJoin("o.items", "oi")
      .innerJoin("oi.product", "p")
      .innerJoin("p.category", "c")
      .andWhere("c.name = :category", { category: categoryFilter });
  }

  grossRevenueQuery.groupBy("period").orderBy("period");
  const grossRevenueData = await grossRevenueQuery.getRawMany();

  // --- Pagsama-samahin ang lahat ---
  const periods = {};

  revenueData.forEach((row) => {
    const period = row.period;
    // @ts-ignore
    periods[period] = {
      month: formatPeriodDisplay(period, "month"),
      revenue: parseFloat(row.revenue) || 0,
      costOfGoodsSold: 0,
      operatingExpenses: 0,
      grossRevenue: 0,
      vatCollected: 0,
    };
  });

  cogsData.forEach((row) => {
    const period = row.period;
    // @ts-ignore
    if (!periods[period]) {
      // @ts-ignore
      periods[period] = {
        month: formatPeriodDisplay(period, "month"),
        revenue: 0,
        costOfGoodsSold: 0,
        operatingExpenses: 0,
        grossRevenue: 0,
        vatCollected: 0,
      };
    }
    // @ts-ignore
    periods[period].costOfGoodsSold = parseFloat(row.cost_of_goods_sold) || 0;
  });

  operatingExpensesData.forEach((row) => {
    const period = row.period;
    // @ts-ignore
    if (!periods[period]) {
      // @ts-ignore
      periods[period] = {
        month: formatPeriodDisplay(period, "month"),
        revenue: 0,
        costOfGoodsSold: 0,
        operatingExpenses: 0,
        grossRevenue: 0,
        vatCollected: 0,
      };
    }
    // @ts-ignore
    periods[period].operatingExpenses = parseFloat(row.operating_expenses) || 0;
  });

  grossRevenueData.forEach((row) => {
    const period = row.period;
    // @ts-ignore
    if (periods[period]) {
      // @ts-ignore
      periods[period].grossRevenue = parseFloat(row.gross_revenue) || 0;
      // @ts-ignore
      periods[period].vatCollected =
        // @ts-ignore
        periods[period].grossRevenue - periods[period].revenue;
    }
  });

  // --- Compute profit metrics ---
  const result = Object.values(periods).map((p) => {
    const grossProfit = p.revenue - p.costOfGoodsSold;
    const netProfit = grossProfit - p.operatingExpenses;
    const profitMargin = p.revenue > 0 ? (netProfit / p.revenue) * 100 : 0;
    const grossMargin = p.revenue > 0 ? (grossProfit / p.revenue) * 100 : 0;
    return {
      ...p,
      grossProfit,
      netProfit,
      profitMargin,
      grossMargin,
    };
  });

  return result.sort((a, b) => a.month.localeCompare(b.month));
}

// ----------------------------------------------------------------------
// Helper: get profit/loss by day
// @ts-ignore
async function getProfitLossByDay(dateRange, categoryFilter) {
   const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const manager = AppDataSource.manager;
  const { start_date, end_date } = dateRange;

  // NET REVENUE by day
  let revenueQuery = manager
    .createQueryBuilder(OrderItem, "oi")
    .innerJoin("oi.order", "o")
    .select("strftime('%Y-%m-%d', o.created_at)", "period")
    .addSelect("SUM(oi.line_net_total)", "revenue")
    .where("o.status = :status", { status: "completed" })
    .andWhere("o.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    });

  if (categoryFilter) {
    revenueQuery
      .innerJoin("oi.product", "p")
      .innerJoin("p.category", "c")
      .andWhere("c.name = :category", { category: categoryFilter });
  }
  revenueQuery.groupBy("period").orderBy("period");
  const revenueData = await revenueQuery.getRawMany();

  // COGS by day
  let cogsQuery = manager
    .createQueryBuilder(OrderItem, "oi")
    .innerJoin("oi.order", "o")
    .leftJoin("oi.product", "p")
    .leftJoin("oi.variant", "v")
    .select("strftime('%Y-%m-%d', o.created_at)", "period")
    .addSelect(
      "SUM(oi.quantity * COALESCE(v.cost_per_item, p.cost_per_item, 0))",
      "cost_of_goods_sold",
    )
    .where("o.status = :status", { status: "completed" })
    .andWhere("oi.is_deleted = 0")
    .andWhere("o.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    });

  if (categoryFilter) {
    cogsQuery
      .innerJoin("oi.product", "p2")
      .innerJoin("p2.category", "c2")
      .andWhere("c2.name = :category", { category: categoryFilter });
  }
  cogsQuery.groupBy("period").orderBy("period");
  const cogsData = await cogsQuery.getRawMany();

  // Operating expenses by day
  const operatingExpensesQuery = manager
    .createQueryBuilder(Purchase, "p")
    .select("strftime('%Y-%m-%d', p.created_at)", "period")
    .addSelect("SUM(p.total)", "operating_expenses")
    .where("p.status = :status", { status: "received" })
    .andWhere("p.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    })
    .groupBy("period")
    .orderBy("period");

  const operatingExpensesData = await operatingExpensesQuery.getRawMany();

  return processProfitLossData(
    revenueData,
    cogsData,
    operatingExpensesData,
    "day",
  );
}

// ----------------------------------------------------------------------
// Helper: get profit/loss by week
// @ts-ignore
async function getProfitLossByWeek(dateRange, categoryFilter) {
   const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const manager = AppDataSource.manager;
  const { start_date, end_date } = dateRange;

  // NET REVENUE by week (strftime('%Y-%W'))
  let revenueQuery = manager
    .createQueryBuilder(OrderItem, "oi")
    .innerJoin("oi.order", "o")
    .select("strftime('%Y-%W', o.created_at)", "period")
    .addSelect("SUM(oi.line_net_total)", "revenue")
    .where("o.status = :status", { status: "completed" })
    .andWhere("o.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    });

  if (categoryFilter) {
    revenueQuery
      .innerJoin("oi.product", "p")
      .innerJoin("p.category", "c")
      .andWhere("c.name = :category", { category: categoryFilter });
  }
  revenueQuery.groupBy("period").orderBy("period");
  const revenueData = await revenueQuery.getRawMany();

  // COGS by week
  let cogsQuery = manager
    .createQueryBuilder(OrderItem, "oi")
    .innerJoin("oi.order", "o")
    .leftJoin("oi.product", "p")
    .leftJoin("oi.variant", "v")
    .select("strftime('%Y-%W', o.created_at)", "period")
    .addSelect(
      "SUM(oi.quantity * COALESCE(v.cost_per_item, p.cost_per_item, 0))",
      "cost_of_goods_sold",
    )
    .where("o.status = :status", { status: "completed" })
    .andWhere("oi.is_deleted = 0")
    .andWhere("o.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    });

  if (categoryFilter) {
    cogsQuery
      .innerJoin("oi.product", "p2")
      .innerJoin("p2.category", "c2")
      .andWhere("c2.name = :category", { category: categoryFilter });
  }
  cogsQuery.groupBy("period").orderBy("period");
  const cogsData = await cogsQuery.getRawMany();

  // Operating expenses by week
  const operatingExpensesQuery = manager
    .createQueryBuilder(Purchase, "p")
    .select("strftime('%Y-%W', p.created_at)", "period")
    .addSelect("SUM(p.total)", "operating_expenses")
    .where("p.status = :status", { status: "received" })
    .andWhere("p.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    })
    .groupBy("period")
    .orderBy("period");

  const operatingExpensesData = await operatingExpensesQuery.getRawMany();

  return processProfitLossData(
    revenueData,
    cogsData,
    operatingExpensesData,
    "week",
  );
}

// ----------------------------------------------------------------------
// Helper: process raw data into profit/loss entries
function processProfitLossData(
  // @ts-ignore
  revenueData,
  // @ts-ignore
  cogsData,
  // @ts-ignore
  operatingExpensesData,
  // @ts-ignore
  groupBy,
) {
  const periods = {};

  // @ts-ignore
  revenueData.forEach((row) => {
    const period = row.period;
    // @ts-ignore
    periods[period] = {
      month: formatPeriodDisplay(period, groupBy),
      revenue: parseFloat(row.revenue) || 0,
      costOfGoodsSold: 0,
      operatingExpenses: 0,
    };
  });

  // @ts-ignore
  cogsData.forEach((row) => {
    const period = row.period;
    // @ts-ignore
    if (!periods[period]) {
      // @ts-ignore
      periods[period] = {
        month: formatPeriodDisplay(period, groupBy),
        revenue: 0,
        costOfGoodsSold: 0,
        operatingExpenses: 0,
      };
    }
    // @ts-ignore
    periods[period].costOfGoodsSold = parseFloat(row.cost_of_goods_sold) || 0;
  });

  // @ts-ignore
  operatingExpensesData.forEach((row) => {
    const period = row.period;
    // @ts-ignore
    if (!periods[period]) {
      // @ts-ignore
      periods[period] = {
        month: formatPeriodDisplay(period, groupBy),
        revenue: 0,
        costOfGoodsSold: 0,
        operatingExpenses: 0,
      };
    }
    // @ts-ignore
    periods[period].operatingExpenses = parseFloat(row.operating_expenses) || 0;
  });

  const result = Object.values(periods).map((p) => {
    const grossProfit = p.revenue - p.costOfGoodsSold;
    const netProfit = grossProfit - p.operatingExpenses;
    const profitMargin = p.revenue > 0 ? (netProfit / p.revenue) * 100 : 0;
    return {
      ...p,
      grossProfit,
      netProfit,
      profitMargin,
    };
  });

  return result.sort((a, b) => a.month.localeCompare(b.month));
}

// ----------------------------------------------------------------------
// Helper: get profit/loss by chosen group
// @ts-ignore
async function getProfitLossByGroup(dateRange, groupBy, categoryFilter) {
  if (groupBy === "day") {
    return await getProfitLossByDay(dateRange, categoryFilter);
  } else if (groupBy === "week") {
    return await getProfitLossByWeek(dateRange, categoryFilter);
  } else {
    return await getProfitLossByMonthData(dateRange, categoryFilter);
  }
}

// ----------------------------------------------------------------------
// Helper: get expense breakdown (replica ng _getExpenseBreakdown)
// @ts-ignore
async function getExpenseBreakdownData(dateRange, categoryFilter) {
   const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const manager = AppDataSource.manager;
  const { start_date, end_date } = dateRange;

  // Total COGS
  let cogsQuery = manager
    .createQueryBuilder(OrderItem, "oi")
    .innerJoin("oi.order", "o")
    .leftJoin("oi.product", "p")
    .leftJoin("oi.variant", "v")
    .select(
      "SUM(oi.quantity * COALESCE(v.cost_per_item, p.cost_per_item, 0))",
      "total_cogs",
    )
    .where("o.status = :status", { status: "completed" })
    .andWhere("oi.is_deleted = 0")
    .andWhere("o.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    });

  if (categoryFilter) {
    cogsQuery
      .innerJoin("oi.product", "p2")
      .innerJoin("p2.category", "c2")
      .andWhere("c2.name = :category", { category: categoryFilter });
  }
  const cogsResult = await cogsQuery.getRawOne();
  const totalCogs = parseFloat(cogsResult?.total_cogs) || 0;

  // Total operating expenses
  const opExQuery = manager
    .createQueryBuilder(Purchase, "p")
    .select("SUM(p.total)", "total_operating_expenses")
    .where("p.status = :status", { status: "received" })
    .andWhere("p.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    });
  const opExResult = await opExQuery.getRawOne();
  const totalOpEx = parseFloat(opExResult?.total_operating_expenses) || 0;

  // Total net revenue (for percentage of revenue)
  let revenueQuery = manager
    .createQueryBuilder(OrderItem, "oi")
    .innerJoin("oi.order", "o")
    .select("SUM(oi.line_net_total)", "total_net_revenue")
    .where("o.status = :status", { status: "completed" })
    .andWhere("o.created_at BETWEEN :start AND :end", {
      start: start_date,
      end: end_date,
    });

  if (categoryFilter) {
    revenueQuery
      .innerJoin("oi.product", "p")
      .innerJoin("p.category", "c")
      .andWhere("c.name = :category", { category: categoryFilter });
  }
  const revenueResult = await revenueQuery.getRawOne();
  const totalNetRevenue = parseFloat(revenueResult?.total_net_revenue) || 0;

  const totalExpenses = totalCogs + totalOpEx;

  if (totalExpenses === 0) return [];

  const cogsPercentage = (totalCogs / totalExpenses) * 100;
  const opExPercentage = (totalOpEx / totalExpenses) * 100;
  const cogsToRevenue =
    totalNetRevenue > 0 ? (totalCogs / totalNetRevenue) * 100 : 0;
  const opExToRevenue =
    totalNetRevenue > 0 ? (totalOpEx / totalNetRevenue) * 100 : 0;

  return [
    {
      category: "Cost of Goods Sold",
      amount: totalCogs,
      percentage: Math.round(cogsPercentage * 100) / 100,
      asPercentOfRevenue: Math.round(cogsToRevenue * 100) / 100,
      description: "Direct costs of products sold",
    },
    {
      category: "Operating Expenses",
      amount: totalOpEx,
      percentage: Math.round(opExPercentage * 100) / 100,
      asPercentOfRevenue: Math.round(opExToRevenue * 100) / 100,
      description: "Indirect business expenses",
    },
  ];
}

// ----------------------------------------------------------------------
// Helper: growth rate with fallback (replica ng _calculateProfitGrowthRateWithFallback)
async function calculateProfitGrowthRateWithFallback(
  // @ts-ignore
  dateRange,
  // @ts-ignore
  currentProfit,
  // @ts-ignore
  categoryFilter,
) {
  try {
    const previousProfit = await calculatePreviousPeriodProfit(
      dateRange,
      categoryFilter,
    );

    if (previousProfit === 0) {
      if (currentProfit > 0) {
        return {
          growth_rate: 100.0,
          method: "new_period_fallback",
          fallback_applied: true,
        };
      } else {
        return {
          growth_rate: 0.0,
          method: "zero_profit_fallback",
          fallback_applied: true,
        };
      }
    } else {
      const growthRate =
        ((currentProfit - previousProfit) / previousProfit) * 100;
      const bounded = clampPercentage(growthRate, -100, 500);
      return {
        growth_rate: bounded,
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
// Helper: previous period profit (replica ng _calculatePreviousPeriodProfit)
// @ts-ignore
async function calculatePreviousPeriodProfit(dateRange, categoryFilter) {
   const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    const periodDays = Math.ceil(
      (dateRange.end_date - dateRange.start_date) / (1000 * 60 * 60 * 24),
    );
    const prevStartDate = new Date(dateRange.start_date);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);
    const prevEndDate = new Date(dateRange.start_date);
    prevEndDate.setDate(prevEndDate.getDate() - 1);

    const manager = AppDataSource.manager;

    // Previous period net revenue
    let revenueQuery = manager
      .createQueryBuilder(OrderItem, "oi")
      .innerJoin("oi.order", "o")
      .select("SUM(oi.line_net_total)", "total_net_revenue")
      .where("o.status = :status", { status: "completed" })
      .andWhere("o.created_at BETWEEN :start AND :end", {
        start: prevStartDate,
        end: prevEndDate,
      });

    if (categoryFilter) {
      revenueQuery
        .innerJoin("oi.product", "p")
        .innerJoin("p.category", "c")
        .andWhere("c.name = :category", { category: categoryFilter });
    }
    const revenueResult = await revenueQuery.getRawOne();
    const prevRevenue = parseFloat(revenueResult?.total_net_revenue) || 0;

    // Previous period COGS
    let cogsQuery = manager
      .createQueryBuilder(OrderItem, "oi")
      .innerJoin("oi.order", "o")
      .leftJoin("oi.product", "p")
      .leftJoin("oi.variant", "v")
      .select(
        "SUM(oi.quantity * COALESCE(v.cost_per_item, p.cost_per_item, 0))",
        "total_cogs",
      )
      .where("o.status = :status", { status: "completed" })
      .andWhere("oi.is_deleted = 0")
      .andWhere("o.created_at BETWEEN :start AND :end", {
        start: prevStartDate,
        end: prevEndDate,
      });

    if (categoryFilter) {
      cogsQuery
        .innerJoin("oi.product", "p2")
        .innerJoin("p2.category", "c2")
        .andWhere("c2.name = :category", { category: categoryFilter });
    }
    const cogsResult = await cogsQuery.getRawOne();
    const prevCogs = parseFloat(cogsResult?.total_cogs) || 0;

    // Previous period operating expenses
    const opExQuery = manager
      .createQueryBuilder(Purchase, "p")
      .select("SUM(p.total)", "total_operating_expenses")
      .where("p.status = :status", { status: "received" })
      .andWhere("p.created_at BETWEEN :start AND :end", {
        start: prevStartDate,
        end: prevEndDate,
      });
    const opExResult = await opExQuery.getRawOne();
    const prevOpEx = parseFloat(opExResult?.total_operating_expenses) || 0;

    const prevGrossProfit = prevRevenue - prevCogs;
    const prevNetProfit = prevGrossProfit - prevOpEx;

    return prevNetProfit;
  } catch (error) {
    console.warn("Error calculating previous period profit:", error);
    return 0;
  }
}

// ----------------------------------------------------------------------
// Helper: summary (replica ng _getSummary)
// @ts-ignore
async function getSummary(profitLossByMonth, dateRange, categoryFilter) {
  // @ts-ignore
  const totalRevenue = profitLossByMonth.reduce((sum, m) => sum + m.revenue, 0);
  const totalCogs = profitLossByMonth.reduce(
    // @ts-ignore
    (sum, m) => sum + m.costOfGoodsSold,
    0,
  );
  const totalOpEx = profitLossByMonth.reduce(
    // @ts-ignore
    (sum, m) => sum + m.operatingExpenses,
    0,
  );
  const totalExpenses = totalCogs + totalOpEx;
  const grossProfit = totalRevenue - totalCogs;
  const netProfit = grossProfit - totalOpEx;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const growthData = await calculateProfitGrowthRateWithFallback(
    dateRange,
    netProfit,
    categoryFilter,
  );

  const summaryData = {
    totalRevenue,
    totalCostOfGoodsSold: totalCogs,
    totalOperatingExpenses: totalOpEx,
    totalExpenses,
    grossProfit,
    netProfit,
    profitMargin: Math.round(profitMargin * 100) / 100,
    growthRate: Math.round(growthData.growth_rate * 100) / 100,
    growthRateMethod: growthData.method,
    growthRateFallbackApplied: growthData.fallback_applied,
    formulaVersion: FORMULA_VERSION,
  };

  const issues = validateSummaryReconciliation(summaryData, profitLossByMonth);
  if (issues.length > 0) {
    // @ts-ignore
    summaryData.reconciliationStatus = "warnings";
    // @ts-ignore
    summaryData.reconciliationWarnings = issues;
  } else {
    // @ts-ignore
    summaryData.reconciliationStatus = "consistent";
  }

  return summaryData;
}

// ----------------------------------------------------------------------
// Helper: validate summary reconciliation (replica ng _validateSummaryReconciliation)
// @ts-ignore
function validateSummaryReconciliation(summary, profitLossByMonth) {
  const issues = [];

  const calculatedNetProfit =
    summary.totalRevenue -
    summary.totalCostOfGoodsSold -
    summary.totalOperatingExpenses;
  if (Math.abs(summary.netProfit - calculatedNetProfit) > 0.01) {
    issues.push(
      `Net profit mismatch: summary=${summary.netProfit.toFixed(2)}, calculated=${calculatedNetProfit.toFixed(2)}`,
    );
  }

  const calculatedExpenses =
    summary.totalCostOfGoodsSold + summary.totalOperatingExpenses;
  if (Math.abs(summary.totalExpenses - calculatedExpenses) > 0.01) {
    issues.push(
      `Expense total mismatch: summary=${summary.totalExpenses.toFixed(2)}, calculated=${calculatedExpenses.toFixed(2)}`,
    );
  }

  const calculatedGrossProfit =
    summary.totalRevenue - summary.totalCostOfGoodsSold;
  if (Math.abs(summary.grossProfit - calculatedGrossProfit) > 0.01) {
    issues.push(
      `Gross profit mismatch: summary=${summary.grossProfit.toFixed(2)}, calculated=${calculatedGrossProfit.toFixed(2)}`,
    );
  }

  if (summary.totalRevenue > 0) {
    const calculatedMargin = (summary.netProfit / summary.totalRevenue) * 100;
    if (Math.abs(summary.profitMargin - calculatedMargin) > 0.01) {
      issues.push(
        `Profit margin mismatch: summary=${summary.profitMargin.toFixed(2)}%, calculated=${calculatedMargin.toFixed(2)}%`,
      );
    }
  }

  return issues;
}

// ----------------------------------------------------------------------
// Helper: profit/loss trend (replica ng _getProfitLossTrend)
// @ts-ignore
function getProfitLossTrend(profitLossByMonth) {
  // @ts-ignore
  return profitLossByMonth.map((m) => ({
    month: m.month,
    revenue: m.revenue,
    expenses: m.costOfGoodsSold + m.operatingExpenses,
    netProfit: m.netProfit,
  }));
}

// ----------------------------------------------------------------------
// Helper: performance metrics (replica ng _getPerformanceMetrics)
// @ts-ignore
function getPerformanceMetrics(profitLossByMonth) {
  if (!profitLossByMonth || profitLossByMonth.length === 0) {
    return getFallbackPerformanceMetrics();
  }

  // @ts-ignore
  const bestMonth = profitLossByMonth.reduce((best, curr) =>
    curr.netProfit > best.netProfit ? curr : best,
  );
  // @ts-ignore
  const worstMonth = profitLossByMonth.reduce((worst, curr) =>
    curr.netProfit < worst.netProfit ? curr : worst,
  );

  const margins = profitLossByMonth
    // @ts-ignore
    .map((m) => m.profitMargin)
    // @ts-ignore
    .filter((v) => !isNaN(v));
  const highestMargin = margins.length ? Math.max(...margins) : 0;
  const lowestMargin = margins.length ? Math.min(...margins) : 0;
  const averageMargin = margins.length
    // @ts-ignore
    ? margins.reduce((a, b) => a + b, 0) / margins.length
    : 0;

  const profitableMonths = profitLossByMonth.filter(
    // @ts-ignore
    (m) => m.netProfit > 0,
  ).length;
  const successRate =
    profitLossByMonth.length > 0
      ? (profitableMonths / profitLossByMonth.length) * 100
      : 0;

  return {
    bestMonth: bestMonth.month,
    worstMonth: worstMonth.month,
    highestMargin: Math.round(highestMargin * 100) / 100,
    lowestMargin: Math.round(lowestMargin * 100) / 100,
    averageMargin: Math.round(averageMargin * 100) / 100,
    totalMonths: profitLossByMonth.length,
    profitableMonths,
    successRate: Math.round(successRate * 100) / 100,
  };
}

// ----------------------------------------------------------------------
// Helper: validate full report reconciliation (replica ng _validateProfitReconciliation)
// @ts-ignore
function validateProfitReconciliation(responseData) {
  const issues = [];
  const summary = responseData.summary;
  const expenseBreakdown = responseData.expenseBreakdown;

  if (expenseBreakdown && expenseBreakdown.length > 0) {
    const breakdownTotal = expenseBreakdown.reduce(
      // @ts-ignore
      (sum, item) => sum + item.amount,
      0,
    );
    if (Math.abs(summary.totalExpenses - breakdownTotal) > 0.01) {
      issues.push(
        `Expense breakdown total mismatch: summary=${summary.totalExpenses.toFixed(2)}, breakdown=${breakdownTotal.toFixed(2)}`,
      );
    }
  }

  const monthlyRevenue = responseData.profitLossByMonth.reduce(
    // @ts-ignore
    (sum, m) => sum + m.revenue,
    0,
  );
  const monthlyCogs = responseData.profitLossByMonth.reduce(
    // @ts-ignore
    (sum, m) => sum + m.costOfGoodsSold,
    0,
  );
  const monthlyExpenses = responseData.profitLossByMonth.reduce(
    // @ts-ignore
    (sum, m) => sum + m.operatingExpenses,
    0,
  );
  const monthlyNetProfit = responseData.profitLossByMonth.reduce(
    // @ts-ignore
    (sum, m) => sum + m.netProfit,
    0,
  );

  if (Math.abs(summary.totalRevenue - monthlyRevenue) > 0.01) {
    issues.push(
      `Monthly revenue aggregate mismatch: summary=${summary.totalRevenue.toFixed(2)}, monthly=${monthlyRevenue.toFixed(2)}`,
    );
  }
  if (Math.abs(summary.totalCostOfGoodsSold - monthlyCogs) > 0.01) {
    issues.push(
      `Monthly COGS aggregate mismatch: summary=${summary.totalCostOfGoodsSold.toFixed(2)}, monthly=${monthlyCogs.toFixed(2)}`,
    );
  }
  if (Math.abs(summary.totalOperatingExpenses - monthlyExpenses) > 0.01) {
    issues.push(
      `Monthly expenses aggregate mismatch: summary=${summary.totalOperatingExpenses.toFixed(2)}, monthly=${monthlyExpenses.toFixed(2)}`,
    );
  }
  if (Math.abs(summary.netProfit - monthlyNetProfit) > 0.01) {
    issues.push(
      `Monthly net profit aggregate mismatch: summary=${summary.netProfit.toFixed(2)}, monthly=${monthlyNetProfit.toFixed(2)}`,
    );
  }

  return issues;
}

// ----------------------------------------------------------------------
// Helper: metadata (replica ng _generateProfitLossMetadata)
// @ts-ignore
function generateMetadata(reportData, options) {
  return {
    generatedAt: new Date().toISOString(),
    formulaVersion: FORMULA_VERSION,
    growthFormulaVersion: GROWTH_FORMULA_VERSION,
    totalMonths: reportData.profitLossByMonth?.length || 0,
    filtersApplied: {
      period: options.period,
      category: options.category,
      group_by: options.group_by,
    },
    calculations: {
      revenue: "SUM(order_items.line_net_total) [NET PRICE, VAT-EXCLUSIVE]",
      cogs: "quantity × cost_per_item (with variant support)",
      grossProfit: "net_revenue - cost_of_goods_sold",
      netProfit: "gross_profit - operating_expenses",
      profitMargin: "(net_profit / net_revenue) × 100",
      growthRate:
        "((current_period_profit - previous_period_profit) / previous_period_profit) × 100 with fallback logic",
    },
    dataSource: "order_items.line_net_total for revenue",
    priceMethodology: "VAT-exclusive net pricing",
    vatHandling: "separated_from_revenue_accurate_accounting",
  };
}

// ----------------------------------------------------------------------
// Fallback functions
function getFallbackSummary() {
  return {
    totalRevenue: 0.0,
    totalCostOfGoodsSold: 0.0,
    totalOperatingExpenses: 0.0,
    totalExpenses: 0.0,
    grossProfit: 0.0,
    netProfit: 0.0,
    profitMargin: 0.0,
    growthRate: 0.0,
    growthRateMethod: "fallback",
    growthRateFallbackApplied: true,
    formulaVersion: FORMULA_VERSION,
    reconciliationStatus: "no_data",
  };
}

function getFallbackPerformanceMetrics() {
  return {
    bestMonth: "N/A",
    worstMonth: "N/A",
    highestMargin: 0,
    lowestMargin: 0,
    averageMargin: 0,
    totalMonths: 0,
    profitableMonths: 0,
    successRate: 0,
  };
}

// @ts-ignore
function getFallbackReportData(period, dateRange) {
  return {
    profitLossByMonth: [],
    expenseBreakdown: [],
    profitLossTrend: [],
    summary: getFallbackSummary(),
    performanceMetrics: getFallbackPerformanceMetrics(),
    dateRange: {
      startDate: formatDateForSQL(dateRange.start_date),
      endDate: formatDateForSQL(dateRange.end_date),
      period: period,
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      formulaVersion: FORMULA_VERSION,
      growthFormulaVersion: GROWTH_FORMULA_VERSION,
      calculations: {
        growthRate: "fallback_applied",
        netProfit: "fallback_applied",
        profitMargin: "fallback_applied",
      },
      growthRateMethod: "fallback",
      growthRateFallbackApplied: true,
      reconciliationStatus: "no_data",
      totalMonths: 0,
      fallbackUsed: true,
    },
  };
}

// ----------------------------------------------------------------------
// MAIN FUNCTION: generate profit/loss report (replica ng _generateProfitLossReportData)
async function generateProfitLossReport(params = {}) {
  const {
    // @ts-ignore
    period = "1year",
    // @ts-ignore
    start_date,
    // @ts-ignore
    end_date,
    // @ts-ignore
    group_by = "month",
    // @ts-ignore
    category,
  } = params;
  const dateRange = getDateRange({ period, start_date, end_date });

  try {
    const profitLossByMonth = await getProfitLossByGroup(
      dateRange,
      group_by,
      category,
    );

    if (!profitLossByMonth || profitLossByMonth.length === 0) {
      console.warn("No profit loss data found, returning fallback");
      return getFallbackReportData(period, dateRange);
    }

    const [expenseBreakdown, profitLossTrend, summary, performanceMetrics] =
      await Promise.all([
        getExpenseBreakdownData(dateRange, category),
        Promise.resolve(getProfitLossTrend(profitLossByMonth)),
        getSummary(profitLossByMonth, dateRange, category),
        Promise.resolve(getPerformanceMetrics(profitLossByMonth)),
      ]);

    const responseData = {
      profitLossByMonth,
      expenseBreakdown: expenseBreakdown || [],
      profitLossTrend: profitLossTrend || [],
      summary: summary || getFallbackSummary(),
      performanceMetrics: performanceMetrics || getFallbackPerformanceMetrics(),
      dateRange: {
        startDate: formatDateForSQL(dateRange.start_date),
        endDate: formatDateForSQL(dateRange.end_date),
        period,
      },
      metadata: generateMetadata(
        { profitLossByMonth, expenseBreakdown, summary, performanceMetrics },
        { period, category, group_by },
      ),
    };

    const reconciliationIssues = validateProfitReconciliation(responseData);
    if (reconciliationIssues.length > 0) {
      // @ts-ignore
      responseData.metadata.reconciliationStatus = "warnings";
      // @ts-ignore
      responseData.metadata.reconciliationWarnings = reconciliationIssues;
    }

    return responseData;
  } catch (error) {
    console.error("Error generating profit/loss report:", error);
    return getFallbackReportData(period, dateRange);
  }
}

module.exports = {
  generateProfitLossReport,
  getExpenseBreakdownData,
  getProfitLossTrend,
  getPerformanceMetrics,
  getDateRange,
};
