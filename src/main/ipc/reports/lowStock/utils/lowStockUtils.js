//@ts-check
const StockItem = require("../../../../../entities/StockItem");
const Product = require("../../../../../entities/Product");
const ProductVariant = require("../../../../../entities/ProductVariant");
const OrderItem = require("../../../../../entities/OrderItem");
const { stringify } = require("csv-stringify/sync");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// Predefined colors (tulad ng original)
const STATUS_COLORS = {
  "Out of Stock": "#FF4444",
  Critical: "#FF8800",
  "Very Low": "#FFBB33",
  "Low Stock": "#FFD966",
  Adequate: "#00C851",
};

// @ts-ignore
const CATEGORY_COLORS = [
  "#FF6384",
  "#36A2EB",
  "#FFCE56",
  "#4BC0C0",
  "#9966FF",
  "#FF9F40",
  "#C9CBCF",
  "#7C4DFF",
  "#FF6B6B",
  "#4ECDC4",
];

// ----------------------------------------------------------------------
// Status determination (eksaktong replica ng _getStockStatus)
// @ts-ignore
function determineStatus(currentStock, reorderLevel) {
  if (currentStock <= 0) return "Out of Stock";
  if (currentStock <= reorderLevel * 0.2) return "Critical";
  if (currentStock <= reorderLevel * 0.5) return "Very Low";
  if (currentStock <= reorderLevel) return "Low Stock";
  return "Adequate";
}

// ----------------------------------------------------------------------
// Urgency score (eksaktong replica ng _computeUrgencyScore)
// @ts-ignore
function computeUrgencyScore(currentStock, reorderLevel, salesVelocity) {
  if (currentStock <= 0) return 100.0;
  if (reorderLevel <= 0) return 0.0;

  const stockRatio = currentStock / reorderLevel;
  const stockFactor = Math.max(0, 1.0 - Math.min(stockRatio, 1.0));
  const velocityFactor = Math.min(salesVelocity / 10.0, 2.0);

  let urgency = stockFactor * 70 + velocityFactor * 15;
  urgency = Math.max(0.0, Math.min(urgency, 100.0));
  return urgency;
}

// ----------------------------------------------------------------------
// Days of supply (eksaktong replica ng _computeDaysOfSupply)
// @ts-ignore
function computeDaysOfSupply(currentStock, salesVelocity) {
  if (currentStock <= 0 || salesVelocity <= 0) return null;
  return parseFloat((currentStock / salesVelocity).toFixed(1));
}

// ----------------------------------------------------------------------
// Hash function para sa supplier (replica ng _hashString)
// @ts-ignore
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// ----------------------------------------------------------------------
// Kunin ang supplier name (replica ng _getSupplier)
// @ts-ignore
function getSupplierName(item) {
  const suppliers = [
    "Tech Supplier Inc.",
    "Office Depot",
    "Peripherals Co.",
    "Furniture World",
    "Audio Tech",
    "Writing Co.",
    "Global Supplies Ltd.",
    "Premium Vendors Co.",
  ];
  const hash = hashString(item.sku || item.productName);
  const index = hash % suppliers.length;
  return suppliers[index];
}

// ----------------------------------------------------------------------
// Status ng warehouse batay sa quantity
// @ts-ignore
function getWarehouseStatus(quantity) {
  const qty = parseInt(quantity) || 0;
  if (qty <= 0) return "Out of Stock";
  if (qty <= 5) return "Low";
  if (qty <= 20) return "Medium";
  return "Adequate";
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
  const query = manager
    .createQueryBuilder(StockItem, "stock")
    .leftJoin("stock.warehouse", "warehouse")
    .select("warehouse.name", "warehouse")
    .addSelect("warehouse.location", "location")
    .addSelect("stock.quantity", "quantity")
    .where("stock.productId = :productId", { productId })
    .andWhere("stock.warehouseId != :excludeId", {
      excludeId: excludeWarehouseId,
    });

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
    quantity: parseFloat(r.quantity) || 0,
    status: getWarehouseStatus(r.quantity),
  }));
}

// ----------------------------------------------------------------------
// Compute sales velocity (average daily sales) – last 30 days
// @ts-ignore
async function computeSalesVelocity(manager) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const orderItems = await manager
    .createQueryBuilder(OrderItem, "oi")
    .select("oi.productId", "productId")
    .addSelect("oi.variantId", "variantId")
    .addSelect("SUM(oi.quantity)", "totalSold")
    .where("oi.created_at >= :date", { date: thirtyDaysAgo })
    .groupBy("oi.productId, oi.variantId")
    .getRawMany();

  const map = new Map();
  for (const row of orderItems) {
    const key = row.variantId
      ? `variant-${row.variantId}`
      : `product-${row.productId}`;
    const totalSold = parseFloat(row.totalSold) || 0;
    map.set(key, totalSold / 30);
  }
  return map;
}

// ----------------------------------------------------------------------
// Kunin ang lahat ng tracked stock items (para sa total counts)
// @ts-ignore
async function getTotalTrackedCounts(manager) {
  const stockItemCount = await manager
    .createQueryBuilder(StockItem, "si")
    .innerJoin(Product, "p", "si.productId = p.id")
    .where("p.track_quantity = 1")
    .andWhere("p.is_deleted = 0")
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
// Pagbuo ng buong low stock report
// @ts-ignore
async function buildLowStockReport(params = {}, queryRunner) {
  const { AppDataSource } = require("../../../../db/datasource");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const manager = queryRunner ? queryRunner.manager : AppDataSource.manager;
  // @ts-ignore
  const thresholdMultiplier = params.threshold_multiplier || 1.0;
  // @ts-ignore
  const categoryId = params.category ? parseInt(params.category) : undefined;
  // @ts-ignore
  const limit = params.limit || 1000;

  // Kunin ang total tracked counts (para sa summary)
  const totalCounts = await getTotalTrackedCounts(manager);

  // Kunin ang lahat ng stock items na may track_quantity = 1
  const stockQuery = manager
    .createQueryBuilder(StockItem, "stock")
    .leftJoinAndSelect("stock.product", "product")
    .leftJoinAndSelect("stock.variant", "variant")
    .leftJoinAndSelect("stock.warehouse", "warehouse")
    .leftJoinAndSelect("product.category", "category")
    .where("product.track_quantity = 1")
    .andWhere("product.is_deleted = 0")
    .andWhere("(variant.id IS NULL OR variant.is_deleted = 0)")
    .andWhere("warehouse.is_active = 1")
    .andWhere("warehouse.is_deleted = 0")
    .orderBy("stock.quantity", "ASC")
    .limit(limit);

  if (categoryId) {
    stockQuery.andWhere("category.id = :categoryId", { categoryId });
  }

  const stockItems = await stockQuery.getMany();

  // Pre‑compute sales velocity
  const salesVelocityMap = await computeSalesVelocity(manager);

  // I‑process ang bawat stock item
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

    const effectiveReorderLevel =
      (variant?.low_stock_threshold || product.low_stock_threshold || 10) *
      thresholdMultiplier;
    const stock = item.quantity;
    const status = determineStatus(stock, effectiveReorderLevel);
    const costPerItem = variant?.cost_per_item || product.cost_per_item || 0;
    const netPrice = variant?.net_price || product.net_price || 0;
    const stockValue = stock * costPerItem;

    const key = variant ? `variant-${variant.id}` : `product-${product.id}`;
    const salesVelocity = salesVelocityMap.get(key) || 0;
    const urgencyScore = computeUrgencyScore(
      stock,
      effectiveReorderLevel,
      salesVelocity,
    );
    const daysOfSupply = computeDaysOfSupply(stock, salesVelocity);
    const stockRatio =
      effectiveReorderLevel > 0 ? stock / effectiveReorderLevel : 1;

    // Kunin ang ibang warehouses
    const otherWarehouses = await getOtherWarehouses(
      manager,
      product.id,
      variant?.id,
      warehouse.id,
    );

    // Supplier (kung wala sa product, gamitin ang dummy)
    const supplier =
      product.supplier?.name ||
      getSupplierName({
        sku: variant?.sku || product.sku,
        productName: product.name,
      });

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
      variant: variant?.name || "",
      category: category?.name || "Uncategorized",
      categoryId: category?.id,
      warehouse: warehouse.name,
      warehouseType: warehouse.type || "warehouse",
      warehouseLocation: warehouse.location || "",
      currentStock: stock,
      reorderLevel:
        variant?.low_stock_threshold || product.low_stock_threshold || 0,
      effectiveReorderLevel,
      adjustedReorderLevel: effectiveReorderLevel,
      supplier,
      lastUpdated:
        item.updated_at?.toISOString() || item.created_at.toISOString(),
      status,
      stockRatio,
      stockValue,
      salesVelocity,
      daysOfSupply,
      urgencyScore,
      sku: variant?.sku || product.sku || "",
      costPerItem,
      netPrice,
      potentialRevenue: stock * netPrice,
      itemType: variant ? "variant" : "product",
      deductionStrategy: product.deduction_strategy || "highest_first",
      allowNegativeStock: product.allow_backorder ? 1 : 0,
      otherWarehouses,
      warehouseDistribution: otherWarehouses, // legacy
    });
  }

  // Sort tulad ng original: criticality order, then urgency score
  const criticalityOrder = {
    "Out of Stock": 0,
    Critical: 1,
    "Very Low": 2,
    "Low Stock": 3,
    Adequate: 4,
  };
  const sortedItems = processedItems.sort((a, b) => {
    // @ts-ignore
    const orderDiff = criticalityOrder[a.status] - criticalityOrder[b.status];
    if (orderDiff !== 0) return orderDiff;
    return b.urgencyScore - a.urgencyScore;
  });

  // ===== Summary statistics (eksaktong replica ng _calculateSummaryStats) =====
  const lowStockCount = sortedItems.filter(
    (i) => i.status !== "Adequate" && i.status !== "Out of Stock",
  ).length;
  const outOfStockCount = sortedItems.filter(
    (i) => i.status === "Out of Stock",
  ).length;
  const criticalStockCount = sortedItems.filter(
    (i) => i.status === "Critical",
  ).length;
  const veryLowStockCount = sortedItems.filter(
    (i) => i.status === "Very Low",
  ).length;
  const lowStockCountDetailed = sortedItems.filter(
    (i) => i.status === "Low Stock",
  ).length;

  const totalStockValue = sortedItems.reduce((sum, i) => sum + i.stockValue, 0);
  const estimatedReorderCost = sortedItems.reduce((sum, i) => {
    if (i.status !== "Adequate" && i.status !== "Out of Stock") {
      const needed = Math.max(0, i.effectiveReorderLevel - i.currentStock);
      return sum + needed * i.costPerItem;
    }
    return sum;
  }, 0);
  const potentialRevenueLoss = estimatedReorderCost * 2; // gaya ng original

  const lowStockPercentage =
    totalCounts.stockItemCount > 0
      ? (lowStockCount / totalCounts.stockItemCount) * 100
      : 0;

  const summary = {
    totalStockItems: totalCounts.stockItemCount,
    totalProducts: totalCounts.productCount,
    totalVariants: totalCounts.variantCount,
    lowStockCount,
    affectedWarehouses: warehouseIds.size,
    affectedCategories: categoryIds.size,
    outOfStockCount,
    criticalStockCount,
    veryLowStockCount,
    lowStockCountDetailed,
    totalStockValue,
    estimatedReorderCost,
    potentialRevenueLoss,
    lowStockPercentage: parseFloat(lowStockPercentage.toFixed(1)),
    itemBreakdown: {
      products: productIds.size,
      variants: variantIds.size,
      warehouses: warehouseIds.size,
    },
  };

  // ===== Charts =====
  const barChart = buildBarChart(sortedItems);
  const pieChart = buildPieChart(sortedItems);
  const warehouseChart = buildWarehouseChart(sortedItems);

  // ===== Performance Summary (replica ng _getPerformanceSummary) =====
  const performanceSummary = buildPerformanceSummary(sortedItems);

  // ===== Recommendations (replica ng _generateRecommendations) =====
  const recommendations = generateRecommendations(sortedItems, summary);

  // ===== Metadata =====
  const metadata = {
    generatedAt: new Date().toISOString(),
    totalStockItemsAnalyzed: sortedItems.length,
    totalProductsAnalyzed: productIds.size,
    filtersApplied: {
      // @ts-ignore
      category: params.category,
      thresholdMultiplier,
      limit,
    },
    itemBreakdown: {
      products: productIds.size,
      variants: variantIds.size,
      warehouses: warehouseIds.size,
    },
    reportType: "low_stock",
  };

  return {
    stockItems: sortedItems,
    summary,
    charts: { barChart, pieChart, warehouseChart },
    performanceSummary,
    recommendations,
    metadata,
  };
}

// ----------------------------------------------------------------------
// Bar chart (top 10 most urgent)
// @ts-ignore
function buildBarChart(items) {
  return (
    items
      // @ts-ignore
      .filter((i) => i.status !== "Adequate")
      // @ts-ignore
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, 10)
      // @ts-ignore
      .map((i) => ({
        name: i.variant ? `${i.product} (${i.variant})` : i.product,
        stock: i.currentStock,
        reorderLevel: i.effectiveReorderLevel,
        urgencyScore: i.urgencyScore,
        category: i.category,
        // @ts-ignore
        color: STATUS_COLORS[i.status] || "#888",
      }))
  );
}

// ----------------------------------------------------------------------
// Pie chart (distribution by status)
// @ts-ignore
function buildPieChart(items) {
  const counts = {
    "Out of Stock": 0,
    Critical: 0,
    "Very Low": 0,
    "Low Stock": 0,
    Adequate: 0,
  };
  // @ts-ignore
  items.forEach((i) => counts[i.status]++);
  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    // @ts-ignore
    color: STATUS_COLORS[name] || "#888",
  }));
}

// ----------------------------------------------------------------------
// Warehouse chart (low stock per warehouse)
// @ts-ignore
function buildWarehouseChart(items) {
  const warehouseMap = new Map();
  // @ts-ignore
  items.forEach((i) => {
    if (i.status !== "Adequate") {
      if (!warehouseMap.has(i.warehouse)) {
        warehouseMap.set(i.warehouse, {
          criticalCount: 0,
          outOfStockCount: 0,
          totalLowStock: 0,
        });
      }
      const stats = warehouseMap.get(i.warehouse);
      stats.totalLowStock++;
      if (i.status === "Critical") stats.criticalCount++;
      if (i.status === "Out of Stock") stats.outOfStockCount++;
    }
  });
  return Array.from(warehouseMap.entries()).map(([warehouse, stats]) => ({
    name: warehouse,
    criticalCount: stats.criticalCount,
    outOfStockCount: stats.outOfStockCount,
    count: stats.totalLowStock,
  }));
}

// ----------------------------------------------------------------------
// Performance summary (eksaktong replica ng _getPerformanceSummary)
// @ts-ignore
function buildPerformanceSummary(items) {
  // @ts-ignore
  const lowStockItems = items.filter((i) => i.status !== "Adequate");
  if (lowStockItems.length === 0) {
    return {
      mostCriticalCategory: "N/A",
      criticalProductsCount: 0,
      mostCriticalWarehouse: "N/A",
      criticalItemsInWarehouse: 0,
      avgStockRatio: 0,
      needsImmediateAttention: 0,
      avgUrgencyScore: 0,
      highestRiskProduct: "N/A",
      highestRiskVariant: "N/A",
      highestRiskWarehouse: "N/A",
      highestRiskScore: 0,
      highestRiskType: "N/A",
      outOfStockCount: 0,
      totalAffectedWarehouses: 0,
    };
  }

  // Category with most critical items
  const catCounts = {};
  // @ts-ignore
  lowStockItems.forEach((i) => {
    if (i.status === "Critical" || i.status === "Out of Stock") {
      // @ts-ignore
      catCounts[i.category] = (catCounts[i.category] || 0) + 1;
    }
  });
  let mostCriticalCategory = "N/A";
  let maxCat = 0;
  for (const [cat, cnt] of Object.entries(catCounts)) {
    if (cnt > maxCat) {
      maxCat = cnt;
      mostCriticalCategory = cat;
    }
  }

  // Warehouse with most critical items
  const whCounts = {};
  // @ts-ignore
  lowStockItems.forEach((i) => {
    if (i.status === "Critical" || i.status === "Out of Stock") {
      // @ts-ignore
      whCounts[i.warehouse] = (whCounts[i.warehouse] || 0) + 1;
    }
  });
  let mostCriticalWarehouse = "N/A";
  let maxWh = 0;
  for (const [wh, cnt] of Object.entries(whCounts)) {
    if (cnt > maxWh) {
      maxWh = cnt;
      mostCriticalWarehouse = wh;
    }
  }

  const avgStockRatio =
    // @ts-ignore
    lowStockItems.reduce((sum, i) => sum + i.stockRatio, 0) /
    lowStockItems.length;
  const needsImmediateAttention = lowStockItems.filter(
    // @ts-ignore
    (i) => i.status === "Critical" || i.status === "Out of Stock",
  ).length;
  const avgUrgencyScore =
    // @ts-ignore
    lowStockItems.reduce((sum, i) => sum + i.urgencyScore, 0) /
    lowStockItems.length;

  const highestRisk = lowStockItems.reduce(
    // @ts-ignore
    (max, i) => (i.urgencyScore > max.urgencyScore ? i : max),
    lowStockItems[0],
  );
  const outOfStockCount = lowStockItems.filter(
    // @ts-ignore
    (i) => i.status === "Out of Stock",
  ).length;
  // @ts-ignore
  const totalAffectedWarehouses = new Set(lowStockItems.map((i) => i.warehouse))
    .size;

  return {
    mostCriticalCategory,
    criticalProductsCount: maxCat,
    mostCriticalWarehouse,
    criticalItemsInWarehouse: maxWh,
    avgStockRatio: parseFloat((avgStockRatio * 100).toFixed(1)),
    needsImmediateAttention,
    avgUrgencyScore: parseFloat(avgUrgencyScore.toFixed(1)),
    highestRiskProduct: highestRisk.product,
    highestRiskVariant: highestRisk.variant || "",
    highestRiskWarehouse: highestRisk.warehouse,
    highestRiskScore: highestRisk.urgencyScore,
    highestRiskType: highestRisk.itemType,
    outOfStockCount,
    totalAffectedWarehouses,
  };
}

// ----------------------------------------------------------------------
// Recommendations (eksaktong replica ng _generateRecommendations)
// @ts-ignore
function generateRecommendations(items, summary) {
  const recommendations = [];

  if (summary.outOfStockCount > 0) {
    recommendations.push({
      type: "critical",
      title: "Immediate Restocking Needed",
      description: `You have ${summary.outOfStockCount} stock items out of stock that need immediate attention.`,
      action: "Review and reorder out of stock items immediately",
      priority: 1,
    });
  }

  if (summary.criticalStockCount > 5) {
    recommendations.push({
      type: "high",
      title: "High Priority Restocking",
      description: `You have ${summary.criticalStockCount} stock items at critical stock levels across ${summary.affectedWarehouses} warehouses.`,
      action: "Prioritize reordering for critical stock items this week",
      priority: 2,
    });
  }

  if (summary.lowStockPercentage > 20) {
    recommendations.push({
      type: "medium",
      title: "Review Inventory Strategy",
      description: `${summary.lowStockPercentage}% of your tracked stock items are low on stock. Consider adjusting reorder levels.`,
      action:
        "Analyze and optimize reorder levels for frequently low-stock items",
      priority: 3,
    });
  }

  if (summary.estimatedReorderCost > 10000) {
    recommendations.push({
      type: "financial",
      title: "Budget Planning Required",
      description: `Estimated reorder cost is $${summary.estimatedReorderCost.toLocaleString()}. Plan your inventory budget accordingly.`,
      action: "Review budget and prioritize high-velocity items",
      priority: 4,
    });
  }

  if (summary.itemBreakdown.variants > summary.itemBreakdown.products) {
    recommendations.push({
      type: "info",
      title: "Variant Stock Management",
      description: `Most of your low stock items are variants (${summary.itemBreakdown.variants} variants vs ${summary.itemBreakdown.products} base products).`,
      action: "Consider implementing variant-specific reorder levels",
      priority: 5,
    });
  }

  if (summary.affectedWarehouses > 1) {
    recommendations.push({
      type: "warehouse",
      title: "Cross-Warehouse Inventory Distribution",
      description: `Low stock items are spread across ${summary.affectedWarehouses} warehouses. Consider redistributing inventory.`,
      action: "Review warehouse stock levels and transfer items if needed",
      priority: 6,
    });
  }

  if (recommendations.length === 0 && items.length > 0) {
    recommendations.push({
      type: "info",
      title: "Inventory Status Normal",
      description:
        "Your inventory levels are generally healthy with manageable low stock items.",
      action: "Continue monitoring inventory levels regularly",
      priority: 7,
    });
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
}

// ===== EXPORT FUNCTIONS =====

// @ts-ignore
function generateCSV(data) {
  const rows = [
    [
      "Product ID",
      "Product",
      "Variant",
      "Category",
      "Warehouse",
      "Current Stock",
      "Reorder Level",
      "Effective Reorder",
      "Status",
      "Stock Ratio",
      "Stock Value",
      "Urgency Score",
      "SKU",
      "Supplier",
      "Last Updated",
    ],
  ];
  // @ts-ignore
  data.stockItems.forEach((i) => {
    rows.push([
      i.productId,
      i.product,
      i.variant,
      i.category,
      i.warehouse,
      i.currentStock,
      i.reorderLevel,
      i.effectiveReorderLevel,
      i.status,
      i.stockRatio.toFixed(2),
      i.stockValue.toFixed(2),
      i.urgencyScore.toFixed(0),
      i.sku,
      i.supplier,
      i.lastUpdated,
    ]);
  });
  return Buffer.from(stringify(rows));
}

// @ts-ignore
async function generateExcel(data) {
  const workbook = new ExcelJS.Workbook();

  // Low Stock Items sheet
  const sheet = workbook.addWorksheet("Low Stock Items");
  sheet.columns = [
    { header: "Product ID", key: "productId" },
    { header: "Product", key: "product" },
    { header: "Variant", key: "variant" },
    { header: "Category", key: "category" },
    { header: "Warehouse", key: "warehouse" },
    { header: "Current Stock", key: "currentStock" },
    { header: "Reorder Level", key: "reorderLevel" },
    { header: "Effective Reorder", key: "effectiveReorderLevel" },
    { header: "Status", key: "status" },
    { header: "Stock Ratio", key: "stockRatio" },
    { header: "Stock Value", key: "stockValue" },
    { header: "Urgency Score", key: "urgencyScore" },
    { header: "SKU", key: "sku" },
    { header: "Supplier", key: "supplier" },
    { header: "Last Updated", key: "lastUpdated" },
  ];
  sheet.addRows(
    // @ts-ignore
    data.stockItems.map((i) => ({
      ...i,
      stockRatio: i.stockRatio.toFixed(2),
      stockValue: i.stockValue.toFixed(2),
      urgencyScore: i.urgencyScore.toFixed(0),
    })),
  );

  // Summary sheet
  const sumSheet = workbook.addWorksheet("Summary");
  sumSheet.addRow(["Metric", "Value"]);
  sumSheet.addRow(["Total Stock Items", data.summary.totalStockItems]);
  sumSheet.addRow(["Total Products", data.summary.totalProducts]);
  sumSheet.addRow(["Total Variants", data.summary.totalVariants]);
  sumSheet.addRow(["Low Stock Count", data.summary.lowStockCount]);
  sumSheet.addRow(["Critical Stock", data.summary.criticalStockCount]);
  sumSheet.addRow(["Very Low Stock", data.summary.veryLowStockCount]);
  sumSheet.addRow(["Out of Stock", data.summary.outOfStockCount]);
  sumSheet.addRow(["Total Stock Value", data.summary.totalStockValue]);
  sumSheet.addRow(["Est. Reorder Cost", data.summary.estimatedReorderCost]);
  sumSheet.addRow([
    "Potential Revenue Loss",
    data.summary.potentialRevenueLoss,
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// @ts-ignore
async function generatePDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    // @ts-ignore
    const buffers = [];
    // @ts-ignore
    doc.on("data", buffers.push.bind(buffers));
    // @ts-ignore
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    doc.fontSize(16).text("Low Stock Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text("Summary");
    doc.fontSize(10).text(`Total Stock Items: ${data.summary.totalStockItems}`);
    doc.text(`Low Stock Items: ${data.summary.lowStockCount}`);
    doc.text(`Critical: ${data.summary.criticalStockCount}`);
    doc.text(`Very Low: ${data.summary.veryLowStockCount}`);
    doc.text(`Out of Stock: ${data.summary.outOfStockCount}`);
    doc.text(`Total Stock Value: $${data.summary.totalStockValue.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(14).text("Top Critical Items");
    const critical = data.stockItems
      // @ts-ignore
      .filter((i) => i.status === "Critical" || i.status === "Out of Stock")
      .slice(0, 20);
    // @ts-ignore
    critical.forEach((item, idx) => {
      doc
        .fontSize(8)
        .text(
          `${idx + 1}. ${item.product} ${item.variant ? "- " + item.variant : ""} - ` +
            `Stock: ${item.currentStock}, Reorder: ${item.effectiveReorderLevel}, Status: ${item.status}`,
        );
    });

    doc.end();
  });
}

module.exports = {
  buildLowStockReport,
  generateCSV,
  generateExcel,
  generatePDF,
};
