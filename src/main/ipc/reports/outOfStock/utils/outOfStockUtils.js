//@ts-check
const { Between, IsNull } = require("typeorm");
const Purchase = require("../../../../../entities/Purchase");
const PurchaseItem = require("../../../../../entities/PurchaseItem");
const Supplier = require("../../../../../entities/Supplier");
const OrderItem = require("../../../../../entities/OrderItem");
const StockItem = require("../../../../../entities/StockItem");
const Product = require("../../../../../entities/Product");
const ProductVariant = require("../../../../../entities/ProductVariant");
const StockMovement = require("../../../../../entities/StockMovement");

// ----------------------------------------------------------------------
// Helper: compute days between two dates
// @ts-ignore
function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs(date1 - date2) / oneDay);
}

// ----------------------------------------------------------------------
// Helper: compute urgency score (tulad ng original)
// @ts-ignore
function computeUrgencyScore(currentStock, reorderLevel, salesVelocity) {
  if (currentStock <= 0) return 100.0;
  if (reorderLevel <= 0) return 0.0;
  const stockRatio = currentStock / reorderLevel;
  const stockFactor = Math.max(0, 1.0 - Math.min(stockRatio, 1.0));
  const velocityFactor = Math.min(salesVelocity / 10.0, 2.0);
  let urgency = stockFactor * 70 + velocityFactor * 15;
  return Math.max(0.0, Math.min(urgency, 100.0));
}

// ----------------------------------------------------------------------
// Kunin ang supplier mula sa purchase history (tulad ng original)
// @ts-ignore
async function getSupplierFromPurchases(manager, productId, variantId) {
  try {
    // Subukan kunin ang supplier na may eksaktong variant
    const purchaseWithVariant = await manager
      .createQueryBuilder(Purchase, "p")
      .innerJoin(PurchaseItem, "pi", "p.id = pi.purchaseId")
      .innerJoin(Supplier, "s", "p.supplierId = s.id")
      .select("s.name", "supplier_name")
      .where("pi.productId = :productId", { productId })
      .andWhere(
        variantId ? "pi.variantId = :variantId" : "pi.variantId IS NULL",
        variantId ? { variantId } : {},
      )
      .andWhere("p.is_deleted = 0")
      .andWhere("s.is_deleted = 0")
      .orderBy("p.created_at", "DESC")
      .limit(1)
      .getRawOne();

    if (purchaseWithVariant?.supplier_name) {
      return purchaseWithVariant.supplier_name;
    }

    // Fallback: supplier kahit walang variant
    const purchaseAny = await manager
      .createQueryBuilder(Purchase, "p")
      .innerJoin(PurchaseItem, "pi", "p.id = pi.purchaseId")
      .innerJoin(Supplier, "s", "p.supplierId = s.id")
      .select("s.name", "supplier_name")
      .where("pi.productId = :productId", { productId })
      .andWhere("p.is_deleted = 0")
      .orderBy("p.created_at", "DESC")
      .limit(1)
      .getRawOne();

    if (purchaseAny?.supplier_name) {
      return purchaseAny.supplier_name;
    }

    // Fallback: isama ang deleted suppliers
    const includeDeleted = await manager
      .createQueryBuilder(Purchase, "p")
      .innerJoin(PurchaseItem, "pi", "p.id = pi.purchaseId")
      .innerJoin(Supplier, "s", "p.supplierId = s.id")
      .select("s.name", "supplier_name")
      .where("pi.productId = :productId", { productId })
      .orderBy("p.created_at", "DESC")
      .limit(1)
      .getRawOne();

    return includeDeleted?.supplier_name || "Unknown";
  } catch (error) {
    console.error("Error getting supplier from purchases:", error);
    return "Unknown";
  }
}

// ----------------------------------------------------------------------
// Kunin ang huling sale date
// @ts-ignore
async function getLastSaleDate(manager, productId, variantId) {
  try {
    const result = await manager
      .createQueryBuilder(OrderItem, "oi")
      .innerJoin("oi.order", "o")
      .select("MAX(o.created_at)", "last_sale_date")
      .where("oi.productId = :productId", { productId })
      .andWhere(
        variantId ? "oi.variantId = :variantId" : "oi.variantId IS NULL",
        variantId ? { variantId } : {},
      )
      .andWhere("o.status = 'completed'")
      .getRawOne();

    return result?.last_sale_date
      ? new Date(result.last_sale_date).toISOString().split("T")[0]
      : null;
  } catch (error) {
    console.error("Error getting last sale date:", error);
    return null;
  }
}

// ----------------------------------------------------------------------
// Kunin ang ibang warehouses para sa parehong product/variant
async function getOtherWarehouses(
  // @ts-ignore
  manager,
  // @ts-ignore
  productId,
  // @ts-ignore
  variantId,
  // @ts-ignore
  excludeWarehouseId,
) {
  try {
    const query = manager
      .createQueryBuilder(StockItem, "stock")
      .leftJoin("stock.warehouse", "warehouse")
      .select("warehouse.name", "warehouse")
      .addSelect("warehouse.location", "location")
      .addSelect("stock.quantity", "quantity")
      .where("stock.productId = :productId", { productId })
      .andWhere("stock.warehouseId != :excludeId", {
        excludeId: excludeWarehouseId,
      })
      .andWhere("stock.is_deleted = 0");

    if (variantId) {
      query.andWhere("stock.variantId = :variantId", { variantId });
    } else {
      query.andWhere("stock.variantId IS NULL");
    }

    const results = await query.getRawMany();
    // @ts-ignore
    return results.map((r) => ({
      warehouse: r.warehouse,
      location: r.location || "Unknown",
      quantity: parseInt(r.quantity) || 0,
      status: r.quantity == 0 ? "Out of Stock" : "In Stock",
    }));
  } catch (error) {
    console.error("Error getting other warehouses:", error);
    return [];
  }
}

// ----------------------------------------------------------------------
// Kunin ang total tracked counts (para sa summary)
// @ts-ignore
async function getTotalTrackedCounts(manager) {
  const stockItemCount = await manager
    .createQueryBuilder(StockItem, "si")
    .innerJoin(Product, "p", "si.productId = p.id")
    .where("p.track_quantity = 1")
    .andWhere("p.is_deleted = 0")
    .andWhere("si.is_deleted = 0")
    .getCount();

  const productCount = await manager
    .createQueryBuilder(Product, "p")
    .where("p.track_quantity = 1")
    .andWhere("p.is_deleted = 0")
    .getCount();

  const variantCount = await manager
    .createQueryBuilder(ProductVariant, "v")
    .innerJoin(Product, "p", "v.productId = p.id")
    .where("p.track_quantity = 1")
    .andWhere("v.is_deleted = 0")
    .getCount();

  return { stockItemCount, productCount, variantCount };
}

// ----------------------------------------------------------------------
// Compute sales velocity (average daily sales) – last 30 days
// @ts-ignore
async function computeSalesVelocity(manager, productId, variantId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const result = await manager
      .createQueryBuilder(OrderItem, "oi")
      .innerJoin("oi.order", "o")
      .select("SUM(oi.quantity)", "totalSold")
      .where("oi.productId = :productId", { productId })
      .andWhere(
        variantId ? "oi.variantId = :variantId" : "oi.variantId IS NULL",
        variantId ? { variantId } : {},
      )
      .andWhere("o.status = 'completed'")
      .andWhere("o.created_at >= :date", { date: thirtyDaysAgo })
      .getRawOne();

    const totalSold = parseFloat(result?.totalSold) || 0;
    return totalSold / 30;
  } catch (error) {
    // Fallback random
    return Math.random() * (variantId ? 5 : 10);
  }
}

// ----------------------------------------------------------------------
// Compute days out of stock mula sa stock movements
// @ts-ignore
async function computeDaysOutOfStock(manager, stockItemId, lastUpdated) {
  try {
    const movement = await manager
      .createQueryBuilder(StockMovement, "sm")
      .select("MAX(sm.created_at)", "lastMovementDate")
      .where("sm.stock_item_id = :stockItemId", { stockItemId })
      .andWhere("sm.change < 0")
      .getRawOne();

    const referenceDate = movement?.lastMovementDate
      ? new Date(movement.lastMovementDate)
      : new Date(lastUpdated);
    const today = new Date();
    return Math.max(1, daysBetween(today, referenceDate));
  } catch (error) {
    return 1;
  }
}

// ----------------------------------------------------------------------
// Compute lost sales
// @ts-ignore
function computeLostSales(salesVelocity, daysOutOfStock, netPrice) {
  if (salesVelocity <= 0 || daysOutOfStock <= 0 || netPrice <= 0) return 0;
  const lostUnits = salesVelocity * daysOutOfStock;
  return Math.round(lostUnits * netPrice * 100) / 100;
}

// ----------------------------------------------------------------------
// Pagbuo ng buong out-of-stock report
// @ts-ignore
async function generateOutOfStockReport(params = {}, queryRunner) {
  const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const manager = queryRunner ? queryRunner.manager : AppDataSource.manager;
  // @ts-ignore
  const { category, include_backorder = false, limit = 100 } = params;

  // Kunin ang lahat ng out-of-stock stock items (quantity = 0)
  const stockQuery = manager
    .createQueryBuilder(StockItem, "stock")
    .leftJoinAndSelect("stock.product", "product")
    .leftJoinAndSelect("product.category", "category")
    .leftJoinAndSelect("stock.variant", "variant")
    .leftJoinAndSelect("stock.warehouse", "warehouse")
    .where("stock.quantity = 0")
    .andWhere("stock.is_deleted = 0")
    .andWhere("product.is_deleted = 0")
    .andWhere("warehouse.is_deleted = 0")
    .orderBy("warehouse.name")
    .addOrderBy("product.name")
    .addOrderBy("variant.name")
    .limit(limit);

  if (category) {
    stockQuery.andWhere("category.name = :category", { category });
  }

  const stockItems = await stockQuery.getMany();

  // I‑process ang bawat item
  const processedItems = [];
  const productIds = new Set();
  const variantIds = new Set();
  const warehouseIds = new Set();
  const categoryIds = new Set();

  for (const item of stockItems) {
    const product = item.product;
    const variant = item.variant;
    const warehouse = item.warehouse;
    const category = product.category;

    // Sales velocity
    const salesVelocity = await computeSalesVelocity(
      manager,
      product.id,
      variant?.id,
    );

    // Days out of stock
    const daysOutOfStock = await computeDaysOutOfStock(
      manager,
      item.id,
      item.updated_at,
    );

    // Supplier
    const supplier = await getSupplierFromPurchases(
      manager,
      product.id,
      variant?.id,
    );

    // Last sale date
    const lastSaleDate = await getLastSaleDate(
      manager,
      product.id,
      variant?.id,
    );

    // Other warehouses
    const otherWarehouses = await getOtherWarehouses(
      manager,
      product.id,
      variant?.id,
      warehouse.id,
    );

    // Reorder level
    const reorderLevel =
      variant?.low_stock_threshold || product.low_stock_threshold || 10;

    // Urgency score
    const urgencyScore = computeUrgencyScore(0, reorderLevel, salesVelocity);

    // Lost sales
    const netPrice = variant?.net_price || product.net_price || 0;
    const lostSales = computeLostSales(salesVelocity, daysOutOfStock, netPrice);

    // Potential revenue (kung magre‑reorder ng reorderLevel units)
    const potentialRevenue = reorderLevel * netPrice;

    // Sets for summary
    productIds.add(product.id);
    if (variant) variantIds.add(variant.id);
    warehouseIds.add(warehouse.id);
    if (category) categoryIds.add(category.id);

    processedItems.push({
      id: item.id,
      productId: product.id,
      variantId: variant?.id,
      warehouseId: warehouse.id,
      product: product.name,
      variant: variant?.name || "Base Product",
      category: category?.name || "Uncategorized",
      categoryId: category?.id,
      warehouse: warehouse.name,
      warehouseType: warehouse.type || "warehouse",
      warehouseLocation: warehouse.location || "",
      currentStock: 0,
      reorderLevel,
      effectiveReorderLevel: reorderLevel,
      allowBackorder: Boolean(product.allow_backorder),
      supplier,
      lastUpdated: item.updated_at.toISOString(),
      createdDate: item.created_at.toISOString(),
      daysOutOfStock,
      status: "Out of Stock",
      sku: variant?.sku || product.sku || "",
      estimatedLostSales: lostSales,
      salesVelocity,
      urgencyScore,
      lastSaleDate,
      costPerItem: variant?.cost_per_item || product.cost_per_item || 0,
      netPrice,
      potentialRevenue,
      itemType: variant ? "variant" : "product",
      otherWarehouses,
      warehouseDistribution: otherWarehouses, // legacy
    });
  }

  // Sort: una sa pinakamatagal na out of stock, tapos urgency score
  const sortedItems = processedItems.sort((a, b) => {
    if (b.daysOutOfStock !== a.daysOutOfStock) {
      return b.daysOutOfStock - a.daysOutOfStock;
    }
    return b.urgencyScore - a.urgencyScore;
  });

  // --- Summary stats (replica ng _calculateSummaryStats) ---
  const totalCounts = await getTotalTrackedCounts(manager);
  const outOfStockCount = sortedItems.length;
  const inStockCount = totalCounts.stockItemCount - outOfStockCount;

  const totalLostSales = sortedItems.reduce(
    (sum, i) => sum + (i.estimatedLostSales || 0),
    0,
  );
  const longestOutOfStock = sortedItems.length
    ? Math.max(...sortedItems.map((i) => i.daysOutOfStock))
    : 0;
  const avgDaysOutOfStock = sortedItems.length
    ? sortedItems.reduce((sum, i) => sum + i.daysOutOfStock, 0) /
      sortedItems.length
    : 0;
  const totalPotentialRevenue = sortedItems.reduce(
    (sum, i) => sum + (i.potentialRevenue || 0),
    0,
  );

  const outOfStockPercentage =
    totalCounts.stockItemCount > 0
      ? (outOfStockCount / totalCounts.stockItemCount) * 100
      : 0;

  const summary = {
    totalStockItems: totalCounts.stockItemCount,
    totalProducts: totalCounts.productCount,
    totalVariants: totalCounts.variantCount,
    outOfStockCount,
    inStockCount,
    affectedWarehouses: warehouseIds.size,
    affectedCategories: categoryIds.size,
    outOfStockPercentage,
    totalLostSales,
    longestOutOfStock,
    averageDaysOutOfStock: Math.round(avgDaysOutOfStock * 10) / 10,
    totalPotentialRevenue,
    itemBreakdown: {
      products: productIds.size,
      variants: variantIds.size,
      warehouses: warehouseIds.size,
    },
  };

  // --- Charts ---
  const barChart = buildBarChart(sortedItems);
  const categoryChart = buildCategoryChart(sortedItems);
  const warehouseChart = buildWarehouseChart(sortedItems);
  const pieChart = buildPieChart(summary);

  // --- Performance Summary (replica ng _getPerformanceSummary) ---
  const performanceSummary = buildPerformanceSummary(sortedItems, summary);

  // --- Recommendations (replica ng _generateRecommendations) ---
  const recommendations = generateRecommendations(
    sortedItems,
    summary,
    performanceSummary,
  );

  // --- Metadata ---
  const metadata = {
    generatedAt: new Date().toISOString(),
    totalStockItemsAnalyzed: totalCounts.stockItemCount,
    totalProductsAnalyzed: totalCounts.productCount,
    filtersApplied: {
      // @ts-ignore
      category: params.category,
      // @ts-ignore
      includeBackorder: params.include_backorder,
      // @ts-ignore
      limit: params.limit,
    },
    itemBreakdown: {
      products: productIds.size,
      variants: variantIds.size,
      warehouses: warehouseIds.size,
    },
    reportType: "per_stock_item",
  };

  return {
    stockItems: sortedItems,
    summary,
    charts: {
      barChart,
      pieChart,
      categoryChart,
      warehouseChart,
    },
    performanceSummary,
    recommendations,
    metadata,
  };
}

// ----------------------------------------------------------------------
// Bar chart (top 10 by category)
// @ts-ignore
function buildBarChart(items) {
  const categoryMap = new Map();
  // @ts-ignore
  items.forEach((item) => {
    const cat = item.category;
    const data = categoryMap.get(cat) || {
      count: 0,
      totalLostSales: 0,
      totalUrgency: 0,
    };
    data.count++;
    data.totalLostSales += item.estimatedLostSales || 0;
    data.totalUrgency += item.urgencyScore || 0;
    categoryMap.set(cat, data);
  });
  return Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalLostSales: Math.round(data.totalLostSales * 100) / 100,
      averageUrgency:
        data.count > 0
          ? Math.round((data.totalUrgency / data.count) * 10) / 10
          : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// ----------------------------------------------------------------------
// Category chart (pie)
// @ts-ignore
function buildCategoryChart(items) {
  const categoryMap = new Map();
  // @ts-ignore
  items.forEach((item) => {
    const cat = item.category;
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
  ];
  return Array.from(categoryMap.entries()).map(([name, count], idx) => ({
    name,
    value: count,
    color: colors[idx % colors.length],
  }));
}

// ----------------------------------------------------------------------
// Warehouse chart
// @ts-ignore
function buildWarehouseChart(items) {
  const whMap = new Map();
  // @ts-ignore
  items.forEach((item) => {
    const wh = item.warehouse;
    const data = whMap.get(wh) || {
      count: 0,
      totalLostSales: 0,
      totalUrgency: 0,
    };
    data.count++;
    data.totalLostSales += item.estimatedLostSales || 0;
    data.totalUrgency += item.urgencyScore || 0;
    whMap.set(wh, data);
  });
  return Array.from(whMap.entries()).map(([name, data]) => ({
    name,
    count: data.count,
    totalLostSales: Math.round(data.totalLostSales * 100) / 100,
    averageUrgency:
      data.count > 0
        ? Math.round((data.totalUrgency / data.count) * 10) / 10
        : 0,
  }));
}

// ----------------------------------------------------------------------
// Pie chart (out vs in)
// @ts-ignore
function buildPieChart(summary) {
  return [
    {
      name: "Out of Stock",
      value: summary.outOfStockCount,
      color: "#FF4C4C",
      percentage: Math.round(summary.outOfStockPercentage * 10) / 10,
    },
    {
      name: "In Stock",
      value: summary.inStockCount,
      color: "#00C49F",
      percentage: Math.round((100 - summary.outOfStockPercentage) * 10) / 10,
    },
  ];
}

// ----------------------------------------------------------------------
// Performance summary (tulad ng original)
// @ts-ignore
function buildPerformanceSummary(items, summary) {
  if (items.length === 0) {
    return {
      longestOutOfStock: 0,
      averageDaysOutOfStock: 0,
      mostAffectedCategory: "N/A",
      mostAffectedCategoryCount: 0,
      mostAffectedWarehouse: "N/A",
      mostAffectedWarehouseCount: 0,
      restockingPriority: "Low",
      totalLostSales: 0,
      highestUrgencyProduct: "N/A",
      highestUrgencyScore: 0,
      healthScore: 100,
      affectedWarehousesCount: 0,
      mostAffectedCategoryLostSales: 0,
      mostAffectedWarehouseLostSales: 0,
      highestUrgencyVariant: "N/A",
      highestUrgencyWarehouse: "N/A",
    };
  }

  const catCounts = {};
  const catLostSales = {};
  // @ts-ignore
  items.forEach((i) => {
    // @ts-ignore
    catCounts[i.category] = (catCounts[i.category] || 0) + 1;
    // @ts-ignore
    catLostSales[i.category] =
      // @ts-ignore
      (catLostSales[i.category] || 0) + (i.estimatedLostSales || 0);
  });
  const mostAffectedCategory =
    Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  // @ts-ignore
  const mostAffectedCategoryCount = catCounts[mostAffectedCategory] || 0;
  // @ts-ignore
  const mostAffectedCategoryLostSales = catLostSales[mostAffectedCategory] || 0;

  const whCounts = {};
  const whLostSales = {};
  // @ts-ignore
  items.forEach((i) => {
    // @ts-ignore
    whCounts[i.warehouse] = (whCounts[i.warehouse] || 0) + 1;
    // @ts-ignore
    whLostSales[i.warehouse] =
      // @ts-ignore
      (whLostSales[i.warehouse] || 0) + (i.estimatedLostSales || 0);
  });
  const mostAffectedWarehouse =
    Object.entries(whCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  // @ts-ignore
  const mostAffectedWarehouseCount = whCounts[mostAffectedWarehouse] || 0;
  const mostAffectedWarehouseLostSales =
    // @ts-ignore
    whLostSales[mostAffectedWarehouse] || 0;

  const highestUrgencyItem = items.reduce(
    // @ts-ignore
    (max, i) => (i.urgencyScore > max.urgencyScore ? i : max),
    items[0],
  );

  const healthScore = Math.max(
    0,
    100 -
      (summary.outOfStockPercentage * 2 +
        Math.min(summary.averageDaysOutOfStock * 3, 40)),
  );

  const restockingPriority = determineRestockingPriority(
    items.length,
    summary.longestOutOfStock,
    summary.totalLostSales,
  );

  return {
    longestOutOfStock: summary.longestOutOfStock,
    averageDaysOutOfStock: summary.averageDaysOutOfStock,
    mostAffectedCategory,
    mostAffectedCategoryCount,
    mostAffectedCategoryLostSales:
      Math.round(mostAffectedCategoryLostSales * 100) / 100,
    mostAffectedWarehouse,
    mostAffectedWarehouseCount,
    mostAffectedWarehouseLostSales:
      Math.round(mostAffectedWarehouseLostSales * 100) / 100,
    restockingPriority,
    totalLostSales: summary.totalLostSales,
    highestUrgencyProduct: highestUrgencyItem.product,
    highestUrgencyVariant: highestUrgencyItem.variant,
    highestUrgencyWarehouse: highestUrgencyItem.warehouse,
    highestUrgencyScore: highestUrgencyItem.urgencyScore,
    healthScore: Math.round(healthScore * 10) / 10,
    affectedWarehousesCount: summary.affectedWarehouses,
  };
}

// ----------------------------------------------------------------------
// Determine restocking priority (tulad ng original)
// @ts-ignore
function determineRestockingPriority(count, longestDays, lostSales) {
  let score = 0;
  if (count > 20) score += 3;
  else if (count > 10) score += 2;
  else if (count > 5) score += 1;

  if (longestDays > 14) score += 3;
  else if (longestDays > 7) score += 2;
  else if (longestDays > 3) score += 1;

  if (lostSales > 1000) score += 3;
  else if (lostSales > 500) score += 2;
  else if (lostSales > 100) score += 1;

  if (score >= 7) return "Critical";
  if (score >= 5) return "High";
  if (score >= 3) return "Medium";
  return "Low";
}

// ----------------------------------------------------------------------
// Recommendations (tulad ng original)
// @ts-ignore
function generateRecommendations(items, summary, perf) {
  const recs = [];
  if (summary.outOfStockCount > 0) {
    recs.push({
      type: "critical",
      title: "Immediate Restocking Required",
      description: `You have ${summary.outOfStockCount} stock items out of stock across ${summary.affectedWarehouses} warehouses, resulting in estimated lost sales of $${summary.totalLostSales.toLocaleString()}.`,
      action: "Prioritize restocking for items with highest urgency scores",
      priority: 1,
    });
  }
  if (perf.longestOutOfStock > 14) {
    recs.push({
      type: "high",
      title: "Address Long-Term Out of Stock Items",
      description: `Some items have been out of stock for ${perf.longestOutOfStock} days. This significantly impacts customer satisfaction.`,
      action:
        "Review and reorder items that have been out of stock for more than 2 weeks",
      priority: 2,
    });
  }
  if (perf.mostAffectedCategoryCount > summary.outOfStockCount * 0.5) {
    recs.push({
      type: "medium",
      title: "Category-Specific Inventory Issue",
      description: `The ${perf.mostAffectedCategory} category has ${perf.mostAffectedCategoryCount} out of stock items, representing over 50% of all out of stock items.`,
      action:
        "Review inventory strategy for this category and consider bulk ordering",
      priority: 3,
    });
  }
  if (perf.mostAffectedWarehouseCount > summary.outOfStockCount * 0.3) {
    recs.push({
      type: "warehouse",
      title: "Warehouse-Specific Inventory Issue",
      description: `The ${perf.mostAffectedWarehouse} warehouse has ${perf.mostAffectedWarehouseCount} out of stock items, representing significant inventory issues in this location.`,
      action:
        "Review warehouse inventory management and consider stock transfers from other warehouses",
      priority: 4,
    });
  }
  if (summary.totalLostSales > 1000) {
    recs.push({
      type: "financial",
      title: "Significant Revenue Impact",
      description: `Out of stock items are estimated to have cost $${summary.totalLostSales.toLocaleString()} in lost sales.`,
      action:
        "Expedite restocking of high-value items to minimize revenue loss",
      priority: 5,
    });
  }
  if (recs.length === 0 && items.length) {
    recs.push({
      type: "info",
      title: "Manageable Out of Stock Situation",
      description:
        "Your out of stock levels are within acceptable limits. Continue monitoring and restock as needed.",
      action: "Maintain current restocking procedures",
      priority: 6,
    });
  }
  return recs.sort((a, b) => a.priority - b.priority);
}

module.exports = { generateOutOfStockReport };
