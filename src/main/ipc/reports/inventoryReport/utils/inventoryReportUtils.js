//@ts-check
// @ts-ignore
const { Between, IsNull } = require("typeorm");
const Product = require("../../../../../entities/Product");
const Category = require("../../../../../entities/Category");
const StockItem = require("../../../../../entities/StockItem");
const StockMovement = require("../../../../../entities/StockMovement");
const ProductVariant = require("../../../../../entities/ProductVariant");

// Predefined color palette (tulad ng original)
const CATEGORY_COLORS = [
  "#0E9D7C",
  "#9ED9EC",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FF6B6B",
  "#4ECDC4",
  "#FF6384",
  "#36A2EB",
];

/**
 * Get stock by category – eksaktong replica ng original _getStockByCategoryData
 * @param {Object} options
 * @param {string} [options.category] - pangalan ng category para i-filter
 * @param {{ start?: Date; end?: Date }} [options.dateRange]
 * @returns {Promise<Array<{ name: string; value: number; color: string; stockValue: number }>>}
 */
async function getStockByCategory({ category, dateRange } = {}) {
   const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    const query = AppDataSource.createQueryBuilder()
      .from(Category, "c")
      .leftJoin(
        // @ts-ignore
        Product,
        "p",
        "c.id = p.category_id AND p.is_deleted = :deleted",
        { deleted: false },
      )
      .leftJoin(
        // @ts-ignore
        ProductVariant,
        "v",
        "p.id = v.product_id AND v.is_deleted = :deleted",
        { deleted: false },
      )
      .leftJoin(
        // @ts-ignore
        StockItem,
        "si",
        "(si.product_id = p.id AND si.variant_id IS NULL) OR (si.variant_id = v.id)",
      )
      .select("c.name", "category_name")
      .addSelect("COALESCE(SUM(si.quantity), 0)", "total_quantity")
      .addSelect(
        `COALESCE(SUM(
          si.quantity * COALESCE(v.cost_per_item, p.cost_per_item, 0)
        ), 0)`,
        "total_value",
      )
      .where("c.is_active = 1")
      .andWhere("(si.is_deleted = 0 OR si.is_deleted IS NULL)");

    if (dateRange?.start && dateRange?.end) {
      query.andWhere("DATE(si.updated_at) BETWEEN :start AND :end", {
        start: formatDateForSQL(dateRange.start),
        end: formatDateForSQL(dateRange.end),
      });
    }

    if (category) {
      query.andWhere("c.name = :category", { category });
    }

    query.groupBy("c.id, c.name").orderBy("total_quantity", "DESC");

    const results = await query.getRawMany();

    return results.map((row, idx) => ({
      name: row.category_name,
      value: parseFloat(row.total_quantity) || 0,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      stockValue: parseFloat(row.total_value) || 0,
    }));
  } catch (error) {
    console.error("getStockByCategory error:", error);
    return [];
  }
}

/**
 * Get low stock products – eksaktong replica ng original _getLowStockProductsData
 * @param {Object} options
 * @param {string} [options.category]
 * @param {number} [options.threshold] - custom threshold (overrides reorder level)
 * @param {{ start?: Date; end?: Date }} [options.dateRange]
 * @returns {Promise<Array<{
 *   name: string;
 *   stock: number;
 *   reorderLevel: number;
 *   category: string;
 *   productId: number;
 *   variantId: number | null;
 *   currentValue: number;
 * }>>}
 */
async function getLowStockProducts({ category, threshold, dateRange } = {}) {
   const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    const query = AppDataSource.createQueryBuilder()
      .from(Product, "p")
      .leftJoin(
        // @ts-ignore
        ProductVariant,
        "v",
        "p.id = v.product_id AND v.is_deleted = :deleted",
        { deleted: false },
      )
      .leftJoin(
        // @ts-ignore
        StockItem,
        "si",
        "(si.product_id = p.id AND si.variant_id IS NULL) OR (si.variant_id = v.id)",
      )
      // @ts-ignore
      .leftJoin(Category, "c", "p.category_id = c.id")
      .select([
        "p.id as product_id",
        "p.name as product_name",
        "v.id as variant_id",
        "v.name as variant_name",
        "c.name as category_name",
        "COALESCE(v.low_stock_threshold, p.low_stock_threshold, 10) as reorder_level",
        "COALESCE(v.cost_per_item, p.cost_per_item, 0) as unit_cost",
        "COALESCE(SUM(si.quantity), 0) as current_stock",
      ])
      .where("p.is_deleted = 0")
      .andWhere("p.track_quantity = 1")
      .andWhere("(si.is_deleted = 0 OR si.is_deleted IS NULL)");

    if (category) {
      query.andWhere("c.name = :category", { category });
    }

    if (dateRange?.start && dateRange?.end) {
      // Ang original ay hindi nagfa-filter ng date range sa low stock query
      // kaya hindi na natin isasama.
    }

    query.groupBy("p.id, v.id");
    query.having("current_stock > 0"); // original ay may HAVING current_stock > 0

    const products = await query.getRawMany();

    // Filter low stock
    const lowStockItems = products.filter((item) => {
      const stock = parseFloat(item.current_stock) || 0;
      const reorder = parseFloat(item.reorder_level) || 10;
      if (threshold !== undefined && threshold !== null) {
        return stock <= threshold;
      }
      return stock <= reorder;
    });

    return lowStockItems.map((item) => ({
      name: item.variant_name
        ? `${item.product_name} (${item.variant_name})`
        : item.product_name,
      stock: parseFloat(item.current_stock) || 0,
      reorderLevel: parseFloat(item.reorder_level) || 10,
      category: item.category_name || "Uncategorized",
      productId: parseInt(item.product_id),
      variantId: item.variant_id ? parseInt(item.variant_id) : null,
      currentValue:
        (parseFloat(item.current_stock) || 0) *
        (parseFloat(item.unit_cost) || 0),
    }));
  } catch (error) {
    console.error("getLowStockProducts error:", error);
    return [];
  }
}

/**
 * Get stock movements aggregated by period – replica ng original _getStockMovementsData
 * @param {Object} options
 * @param {{ start: Date; end: Date }} options.dateRange
 * @param {"day"|"week"|"month"} [options.groupBy]
 * @returns {Promise<Array<{ month: string; stockIn: number; stockOut: number; netChange: number }>>}
 */
async function getStockMovements({ dateRange, groupBy = "month" }) {
   const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    const { start, end } = dateRange;
    let groupFormat;
    switch (groupBy) {
      case "day":
        groupFormat = "strftime('%Y-%m-%d', sm.created_at)";
        break;
      case "week":
        groupFormat = "strftime('%Y-%W', sm.created_at)";
        break;
      default: // month
        groupFormat = "strftime('%Y-%m', sm.created_at)";
    }

    const movements = await AppDataSource.createQueryBuilder()
      .from(StockMovement, "sm")
      .select(groupFormat, "period")
      .addSelect(
        "SUM(CASE WHEN sm.change > 0 THEN sm.change ELSE 0 END)",
        "stockIn",
      )
      .addSelect(
        "SUM(CASE WHEN sm.change < 0 THEN ABS(sm.change) ELSE 0 END)",
        "stockOut",
      )
      .addSelect("SUM(sm.change)", "netChange")
      .where("sm.is_deleted = 0")
      .andWhere("sm.created_at BETWEEN :start AND :end", { start, end })
      .groupBy("period")
      .orderBy("period", "ASC")
      .getRawMany();

    // I-format ang display period tulad ng original
    return movements.map((m) => {
      let displayPeriod;
      if (groupBy === "day") {
        displayPeriod = m.period; // YYYY-MM-DD
      } else if (groupBy === "week") {
        const [year, week] = m.period.split("-");
        displayPeriod = `Week ${week}, ${year}`;
      } else {
        // month: "YYYY-MM" -> "MMM YYYY"
        const [year, month] = m.period.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        displayPeriod = date.toLocaleString("default", {
          month: "short",
          year: "numeric",
        });
      }
      return {
        month: displayPeriod,
        stockIn: parseFloat(m.stockIn) || 0,
        stockOut: parseFloat(m.stockOut) || 0,
        netChange: parseFloat(m.netChange) || 0,
      };
    });
  } catch (error) {
    console.error("getStockMovements error:", error);
    // Fallback: generate sample data (tulad ng original)
    return generateSampleMovements(12, groupBy);
  }
}

/**
 * Generate sample movements (kapag nag-error)
 */
// @ts-ignore
function generateSampleMovements(months, groupBy) {
  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    let period;
    if (groupBy === "day") {
      period = d.toISOString().split("T")[0];
    } else if (groupBy === "week") {
      const week = getWeekNumber(d);
      period = `Week ${week}, ${d.getFullYear()}`;
    } else {
      period = d.toLocaleString("default", { month: "short", year: "numeric" });
    }
    const stockIn = Math.floor(Math.random() * 100) + 50;
    const stockOut = Math.floor(Math.random() * 80) + 40;
    result.push({
      month: period,
      stockIn,
      stockOut,
      netChange: stockIn - stockOut,
    });
  }
  return result;
}

// Helper: get week number
// @ts-ignore
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  // @ts-ignore
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Get inventory summary – eksaktong replica ng original _calculateInventorySummary
 * @param {Object} options
 * @param {string} [options.category]
 * @param {{ start?: Date; end?: Date }} [options.dateRange]
 * @returns {Promise<{
 *   totalProducts: number;
 *   totalStock: number;
 *   lowStockCount: number;
 *   totalCategories: number;
 *   totalStockValue: number;
 *   growthRate: number;
 *   stockTurnoverRate: number;
 * }>}
 */
// @ts-ignore
async function getSummary({ category, dateRange, lowStockProducts = [] } = {}) {
   const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    // Total products
    const productRepo = AppDataSource.getRepository(Product);
    const totalProducts = await productRepo.count({
      where: { is_deleted: false },
    });

    // Total stock quantity and value (katulad ng stockByCategory pero walang grouping)
    const stockQuery = AppDataSource.createQueryBuilder()
      .from(StockItem, "si")
      // @ts-ignore
      .leftJoin(Product, "p", "si.product_id = p.id")
      // @ts-ignore
      .leftJoin(ProductVariant, "v", "si.variant_id = v.id")
      // @ts-ignore
      .leftJoin(Category, "c", "p.category_id = c.id")
      .select("COALESCE(SUM(si.quantity), 0)", "totalQuantity")
      .addSelect(
        `COALESCE(SUM(
          si.quantity * COALESCE(v.cost_per_item, p.cost_per_item, 0)
        ), 0)`,
        "totalValue",
      )
      .where("p.is_deleted = 0")
      .andWhere("(si.is_deleted = 0 OR si.is_deleted IS NULL)");

    if (category) {
      stockQuery.andWhere("c.name = :category", { category });
    }

    const stockResult = await stockQuery.getRawOne();
    const totalStock = parseFloat(stockResult?.totalQuantity) || 0;
    const totalStockValue = parseFloat(stockResult?.totalValue) || 0;

    // Low stock count (gamitin ang lowStockProducts array)
    const lowStockCount = lowStockProducts.length;

    // Total categories
    const categoryRepo = AppDataSource.getRepository(Category);
    const totalCategories = await categoryRepo.count({
      where: { is_active: true },
    });

    // Growth rate (based on quantity, tulad ng original)
    let growthRate = 0;
    if (dateRange?.start) {
      const previousStock = await getStockQuantityAtDate(dateRange.start);
      if (previousStock > 0) {
        growthRate = ((totalStock - previousStock) / previousStock) * 100;
      } else if (totalStock > 0) {
        growthRate = 100;
      }
    }

    // Stock turnover rate (quantity-based)
    let stockTurnoverRate = 0;
    if (dateRange?.start && dateRange?.end) {
      const totalStockOut = await getTotalStockOutBetween(
        dateRange.start,
        dateRange.end,
      );
      const avgStock = await getAverageStockBetween(
        dateRange.start,
        dateRange.end,
      );
      if (avgStock > 0) {
        stockTurnoverRate = totalStockOut / avgStock;
      }
    }

    return {
      totalProducts,
      totalStock,
      lowStockCount,
      totalCategories,
      totalStockValue,
      growthRate: parseFloat(growthRate.toFixed(2)),
      stockTurnoverRate: parseFloat(stockTurnoverRate.toFixed(2)),
    };
  } catch (error) {
    console.error("getSummary error:", error);
    return {
      totalProducts: 0,
      totalStock: 0,
      lowStockCount: 0,
      totalCategories: 0,
      totalStockValue: 0,
      growthRate: 0,
      stockTurnoverRate: 0,
    };
  }
}

/**
 * Get total stock quantity at a specific date (gamit ang updated_at)
 */
// @ts-ignore
async function getStockQuantityAtDate(date) {
   const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const result = await AppDataSource.createQueryBuilder()
    .from(StockItem, "si")
    .select("COALESCE(SUM(si.quantity), 0)", "total")
    .where("si.is_deleted = 0")
    .andWhere("DATE(si.updated_at) <= :date", { date: formatDateForSQL(date) })
    .getRawOne();
  return parseFloat(result?.total) || 0;
}

/**
 * Get total stock out (quantity) between dates
 */
// @ts-ignore
async function getTotalStockOutBetween(start, end) {
   const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const result = await AppDataSource.createQueryBuilder()
    .from(StockMovement, "sm")
    .select("COALESCE(SUM(ABS(sm.change)), 0)", "total")
    .where("sm.is_deleted = 0")
    .andWhere("sm.change < 0")
    .andWhere("sm.created_at BETWEEN :start AND :end", { start, end })
    .getRawOne();
  return parseFloat(result?.total) || 0;
}

/**
 * Get average stock between two dates (simplified: average of start and end stock)
 */
// @ts-ignore
async function getAverageStockBetween(start, end) {
  const startStock = await getStockQuantityAtDate(start);
  const endStock = await getStockQuantityAtDate(end);
  return (startStock + endStock) / 2;
}

/**
 * Get performance metrics – replica ng original _calculatePerformanceMetrics
 * @param {Array<{ name: string; value: number; stockValue: number }>} stockByCategory
 * @param {number} stockTurnoverRate
 * @returns {{
 *   highestStockCategory: string;
 *   highestStockCount: number;
 *   highestStockValue: number;
 *   stockTurnoverRate: number;
 *   averageStockValue: number;
 * }}
 */
function getPerformanceMetrics(stockByCategory, stockTurnoverRate) {
  let highestStockCategory = "N/A";
  let highestStockCount = 0;
  let highestStockValue = 0;

  for (const cat of stockByCategory) {
    if (cat.value > highestStockCount) {
      highestStockCount = cat.value;
      highestStockCategory = cat.name;
      highestStockValue = cat.stockValue || 0;
    }
  }

  const totalStockValue = stockByCategory.reduce(
    (sum, cat) => sum + (cat.stockValue || 0),
    0,
  );
  const averageStockValue =
    stockByCategory.length > 0 ? totalStockValue / stockByCategory.length : 0;

  return {
    highestStockCategory,
    highestStockCount,
    highestStockValue,
    stockTurnoverRate,
    averageStockValue,
  };
}

/**
 * Get date range from params – sumusuporta sa lahat ng period ng original
 * @param {Object} options
 * @param {string} [options.start_date]
 * @param {string} [options.end_date]
 * @param {string} [options.period] - "1week", "2weeks", "1month", "3months", "6months", "1year", "custom"
 * @returns {{ start: Date; end: Date }}
 */
function getDateRange({ start_date, end_date, period = "6months" }) {
  const end = end_date ? new Date(end_date) : new Date();
  let start;

  if (start_date) {
    start = new Date(start_date);
  } else {
    start = new Date(end);
    const daysMap = {
      "1week": 7,
      "2weeks": 14,
      "1month": 30,
      "3months": 90,
      "6months": 180,
      "1year": 365,
    };
    // @ts-ignore
    const days = daysMap[period] || 180;
    start.setDate(start.getDate() - days);
  }

  return { start, end };
}

/**
 * Format date for SQL (YYYY-MM-DD)
 */
// @ts-ignore
function formatDateForSQL(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Get metadata – pupunan ng actual counts
 * @param {Object} options
 * @param {{ start: Date; end: Date }} options.dateRange
 * @param {Object} options.params
 * @returns {Object}
 */
function getMetadata({
  // @ts-ignore
  dateRange,
  params,
  // @ts-ignore
  stockByCategory,
  // @ts-ignore
  lowStockProducts,
  // @ts-ignore
  stockMovements,
}) {
  return {
    generatedAt: new Date().toISOString(),
    totalCategories: stockByCategory.length,
    lowStockCount: lowStockProducts.length,
    totalMovements: stockMovements.length,
    filtersApplied: {
      // @ts-ignore
      period: params.period || "6months",
      // @ts-ignore
      category: params.category || null,
      // @ts-ignore
      low_stock_only: params.low_stock_only || false,
      // @ts-ignore
      group_by: params.group_by || "month",
    },
  };
}

module.exports = {
  getStockByCategory,
  getLowStockProducts,
  getStockMovements,
  getSummary,
  getPerformanceMetrics,
  getDateRange,
  getMetadata,
};
