//@ts-check
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  inventoryReportHandler,
} = require("../../../reports/inventoryReport/index.ipc");

// Currency symbol (will be fetched asynchronously)
let currency = "$";
(async () => {
  try {
    const {
      getGeneralCurrencySign,
    } = require("../../../../../utils/settings/system");
    // @ts-ignore
    currency = await getGeneralCurrencySign();
  } catch (error) {
    // @ts-ignore
    console.warn(
      "Failed to load currency sign, using default $",
      // @ts-ignore
      error.message,
    );
  }
})();

const SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
const EXPORT_DIR = path.join(
  os.homedir(),
  "Downloads",
  "Stashify",
  "inventory_report_exports",
);

// Create export directory if it doesn't exist
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// Optional dependencies
// @ts-ignore
let excelJS = null;
// @ts-ignore
let PDFKit = null;

try {
  excelJS = require("exceljs");
} catch (error) {
  // @ts-ignore
  console.warn(
    "ExcelJS not available for enhanced Excel export:",
    // @ts-ignore
    error.message,
  );
}

try {
  PDFKit = require("pdfkit");
} catch (error) {
  // @ts-ignore
  console.warn("PDFKit not available for PDF export:", error.message);
}

// Status colors for Excel
const STATUS_COLORS = {
  "Out of Stock": { argb: "FF5252" },
  Critical: { argb: "FF9800" },
  "Very Low": { argb: "FFEB3B" },
  "Low Stock": { argb: "8BC34A" },
  Adequate: { argb: "4CAF50" },
};

const CHART_COLORS = {
  primary: "#3498db",
  secondary: "#2ecc71",
  danger: "#e74c3c",
  warning: "#f39c12",
  info: "#9b59b6",
  dark: "#2c3e50",
  light: "#ecf0f1",
};

// ----------------------------------------------------------------------
// Helper: get inventory report data from main handler
// @ts-ignore
async function getInventoryReportData(params) {
  try {
    // Call the main inventoryReport handler's method
    const response = await inventoryReportHandler.getInventoryReport(params);
    if (!response.status) {
      throw new Error(response.message);
    }
    return response.data;
  } catch (error) {
    console.error("Failed to get inventory report data:", error);
    throw error;
  }
}

// ----------------------------------------------------------------------
// Helper: transform data to export format
// @ts-ignore
function transformInventoryReportData(reportData, params) {
  const {
    stockByCategory,
    lowStockProducts,
    stockMovements,
    summary,
    performanceMetrics,
    dateRange,
    metadata,
  } = reportData;

  // Transform stock by category
  // @ts-ignore
  const transformedCategories = (stockByCategory || []).map((item, index) => ({
    id: index,
    name: item.name,
    stock_quantity: item.value,
    stock_value: item.stockValue || 0,
    color: item.color,
    percentage: item.percentage || 0,
  }));

  // Transform low stock products
  // @ts-ignore
  const transformedLowStock = (lowStockProducts || []).map((item, index) => ({
    id: index,
    product_name: item.name,
    current_stock: item.stock,
    reorder_level: item.reorderLevel,
    category: item.category,
    stock_value: item.currentValue || 0,
    productId: item.productId,
    variantId: item.variantId || null,
    stock_status: getStockStatus(item.stock, item.reorderLevel),
  }));

  // Calculate additional analytics
  const analytics = calculateAnalyticsFromReport(
    transformedCategories,
    transformedLowStock,
    stockMovements,
    summary,
  );

  return {
    stock_by_category: transformedCategories,
    low_stock_products: transformedLowStock,
    stock_movements: stockMovements || [],
    summary: summary || {},
    performance_metrics: performanceMetrics || {},
    analytics,
    date_range: dateRange || {},
    filters: {
      period: params.period || "6months",
      category: params.category || null,
      low_stock_only: params.low_stock_only || false,
      group_by: params.group_by || "month",
    },
    metadata: {
      ...(metadata || {}),
      generated_at: new Date().toISOString(),
      total_categories: transformedCategories.length,
      low_stock_count: transformedLowStock.length,
      total_movements: (stockMovements || []).length,
      currency,
      report_type: "inventory_analysis",
    },
  };
}

// ----------------------------------------------------------------------
// Helper: determine stock status
// @ts-ignore
function getStockStatus(currentStock, reorderLevel) {
  if (currentStock === 0) return "Out of Stock";
  if (currentStock <= reorderLevel * 0.2) return "Critical";
  if (currentStock <= reorderLevel * 0.5) return "Very Low";
  if (currentStock <= reorderLevel) return "Low Stock";
  return "Adequate";
}

// ----------------------------------------------------------------------
// Helper: calculate analytics from report
// @ts-ignore
function calculateAnalyticsFromReport(
  // @ts-ignore
  categories,
  // @ts-ignore
  lowStock,
  // @ts-ignore
  movements,
  // @ts-ignore
  summary,
) {
  // @ts-ignore
  const categoryDistribution = categories.map((cat) => ({
    name: cat.name,
    quantity: cat.stock_quantity,
    value: cat.stock_value,
    percentage: cat.percentage,
  }));

  // @ts-ignore
  const movementTrends = (movements || []).map((mov) => ({
    period: mov.month,
    stock_in: mov.stockIn,
    stock_out: mov.stockOut,
    net_change: mov.netChange,
    trend:
      mov.netChange > 0
        ? "positive"
        : mov.netChange < 0
          ? "negative"
          : "neutral",
  }));

  // @ts-ignore
  const lowStockAnalysis = lowStock.reduce((acc, item) => {
    const status = item.stock_status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // @ts-ignore
  const totalInventoryValue = categories.reduce(
    // @ts-ignore
    (sum, cat) => sum + cat.stock_value,
    0,
  );
  // @ts-ignore
  const lowStockValue = lowStock.reduce(
    // @ts-ignore
    (sum, item) => sum + item.stock_value,
    0,
  );
  const lowStockPercentage =
    totalInventoryValue > 0 ? (lowStockValue / totalInventoryValue) * 100 : 0;
  const averageStockValue =
    summary.totalStockValue / (summary.totalProducts || 1);
  const stockTurnoverRate = summary.stockTurnoverRate || 0;
  const growthRate = summary.growthRate || 0;

  return {
    category_distribution: categoryDistribution,
    movement_trends: movementTrends,
    low_stock_analysis: lowStockAnalysis,
    total_inventory_value: totalInventoryValue,
    low_stock_value: lowStockValue,
    low_stock_percentage: lowStockPercentage,
    average_stock_value: averageStockValue,
    stock_turnover_rate: stockTurnoverRate,
    growth_rate: growthRate,
  };
}

// ----------------------------------------------------------------------
// Helper: determine risk level
// @ts-ignore
function getRiskLevel(data) {
  const lowStockPercentage =
    (data.summary.lowStockCount / data.summary.totalProducts) * 100;
  const valueAtRiskPercentage = data.analytics.low_stock_percentage;

  if (lowStockPercentage > 30 || valueAtRiskPercentage > 20) return "HIGH";
  if (lowStockPercentage > 15 || valueAtRiskPercentage > 10) return "MEDIUM";
  return "LOW";
}

// ----------------------------------------------------------------------
// Helper: generate recommendations
// @ts-ignore
function generateRecommendations(data) {
  const recommendations = [];

  if (data.summary.lowStockCount > 10) {
    recommendations.push({
      priority: "HIGH",
      area: "Stock Management",
      recommendation: `Prioritize replenishment of ${data.summary.lowStockCount} low stock items`,
      impact: "Prevent stockouts and lost sales",
    });
  }

  if (data.summary.growthRate < 0) {
    recommendations.push({
      priority: "MEDIUM",
      area: "Inventory Planning",
      recommendation: "Review purchasing strategy due to negative growth rate",
      impact: "Optimize inventory levels and reduce carrying costs",
    });
  } else if (data.summary.growthRate > 20) {
    recommendations.push({
      priority: "MEDIUM",
      area: "Inventory Planning",
      recommendation:
        "Monitor for potential overstocking with high growth rate",
      impact: "Reduce risk of excess inventory",
    });
  }

  if (data.summary.stockTurnoverRate < 2) {
    recommendations.push({
      priority: "MEDIUM",
      area: "Product Performance",
      recommendation: "Review slow-moving items and consider promotions",
      impact: "Improve inventory turnover and free up capital",
    });
  }

  if (data.stock_by_category.length > 0) {
    const topCategory = data.stock_by_category[0];
    if (topCategory.percentage > 40) {
      recommendations.push({
        priority: "LOW",
        area: "Category Diversification",
        recommendation: `Diversify inventory beyond '${topCategory.name}' category`,
        impact: "Reduce risk exposure to single category",
      });
    }
  }

  const lowStockValuePercentage = data.analytics.low_stock_percentage;
  if (lowStockValuePercentage > 15) {
    recommendations.push({
      priority: "HIGH",
      area: "Financial Risk",
      recommendation: `Address low stock items representing ${lowStockValuePercentage.toFixed(1)}% of inventory value`,
      impact: "Protect significant portion of inventory value",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: "LOW",
      area: "Performance",
      recommendation: "Continue current inventory management practices",
      impact: "Maintain current performance levels",
    });
  }

  return recommendations;
}

// ----------------------------------------------------------------------
// CSV export
// @ts-ignore
// @ts-ignore
async function exportCSV(data, params) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `inventory_report_${timestamp}.csv`;
  const filepath = path.join(EXPORT_DIR, filename);

  const lines = [];

  // Header
  lines.push("📊 INVENTORY ANALYSIS REPORT");
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push(`Report Type,${data.metadata.report_type}`);
  lines.push(
    `Date Range,${data.date_range.startDate} to ${data.date_range.endDate}`,
  );
  lines.push(`Period,${data.filters.period}`);
  lines.push(`Currency,${data.metadata.currency}`);
  lines.push("");

  // Executive Summary
  lines.push("📈 EXECUTIVE SUMMARY");
  lines.push("Metric,Value,Status,Impact");

  const execSummary = [
    ["Total Products", data.summary.totalProducts, "All Items", "High"],
    ["Total Stock Quantity", data.summary.totalStock, "All Items", "High"],
    [
      "Total Stock Value",
      formatCurrency(data.summary.totalStockValue),
      "Financial",
      "Critical",
    ],
    [
      "Low Stock Items",
      data.summary.lowStockCount,
      "Action Required",
      "Medium",
    ],
    ["Total Categories", data.summary.totalCategories, "Classification", "Low"],
    [
      "Growth Rate",
      `${data.summary.growthRate}%`,
      data.summary.growthRate > 0 ? "Positive" : "Negative",
      "Medium",
    ],
    [
      "Stock Turnover Rate",
      data.summary.stockTurnoverRate,
      data.summary.stockTurnoverRate > 3 ? "Good" : "Average",
      "High",
    ],
  ];
  execSummary.forEach((row) => lines.push(row.join(",")));
  lines.push("");

  // Performance Metrics
  lines.push("🎯 PERFORMANCE METRICS");
  lines.push("Metric,Value,Details");
  const perfMetrics = [
    [
      "Highest Stock Category",
      data.performance_metrics.highestStockCategory,
      "Category with most stock",
    ],
    [
      "Highest Stock Count",
      data.performance_metrics.highestStockCount,
      "Quantity in highest category",
    ],
    [
      "Highest Stock Value",
      formatCurrency(data.performance_metrics.highestStockValue),
      "Value in highest category",
    ],
    [
      "Average Stock Value",
      formatCurrency(data.performance_metrics.averageStockValue),
      "Per product average",
    ],
    [
      "Stock Turnover Rate",
      data.performance_metrics.stockTurnoverRate,
      "Times per year",
    ],
  ];
  perfMetrics.forEach((row) => lines.push(row.join(",")));
  lines.push("");

  // Stock by Category
  lines.push("📦 STOCK BY CATEGORY");
  lines.push("Category,Stock Quantity,Stock Value,Percentage,Color");
  // @ts-ignore
  data.stock_by_category.forEach((category) => {
    lines.push(
      [
        category.name,
        category.stock_quantity,
        formatCurrency(category.stock_value),
        `${category.percentage || 0}%`,
        category.color,
      ].join(","),
    );
  });
  lines.push("");

  // Low Stock Alerts
  lines.push("⚠️ LOW STOCK ALERTS");
  lines.push(
    "Product,Current Stock,Reorder Level,Category,Stock Value,Status,Product ID",
  );
  // @ts-ignore
  data.low_stock_products.forEach((item) => {
    lines.push(
      [
        `"${item.product_name}"`,
        item.current_stock,
        item.reorder_level,
        `"${item.category}"`,
        formatCurrency(item.stock_value),
        item.stock_status,
        item.productId,
      ].join(","),
    );
  });
  lines.push("");

  // Stock Movements
  lines.push("📈 STOCK MOVEMENTS");
  lines.push("Period,Stock In,Stock Out,Net Change,Trend");
  // @ts-ignore
  data.stock_movements.forEach((movement) => {
    const trend =
      movement.netChange > 0
        ? "📈 Positive"
        : movement.netChange < 0
          ? "📉 Negative"
          : "➡️ Stable";
    lines.push(
      [
        movement.month,
        movement.stockIn,
        movement.stockOut,
        movement.netChange,
        trend,
      ].join(","),
    );
  });
  lines.push("");

  // Analytics Summary
  lines.push("📊 ANALYTICS SUMMARY");
  lines.push("Metric,Value,Description");
  const analyticsSummary = [
    [
      "Total Inventory Value",
      formatCurrency(data.analytics.total_inventory_value),
      "Total value of all inventory",
    ],
    [
      "Low Stock Value",
      formatCurrency(data.analytics.low_stock_value),
      "Value of low stock items",
    ],
    [
      "Low Stock %",
      `${data.analytics.low_stock_percentage.toFixed(1)}%`,
      "Percentage of value at risk",
    ],
    [
      "Average Stock Value",
      formatCurrency(data.analytics.average_stock_value),
      "Average value per item",
    ],
    [
      "Stock Turnover Rate",
      data.analytics.stock_turnover_rate.toFixed(2),
      "Inventory turnover rate",
    ],
    [
      "Growth Rate",
      `${data.analytics.growth_rate.toFixed(1)}%`,
      "Inventory growth rate",
    ],
  ];
  analyticsSummary.forEach((row) => lines.push(row.join(",")));
  lines.push("");

  // Recommendations
  lines.push("💡 RECOMMENDATIONS");
  lines.push("Priority,Area,Recommendation,Expected Impact");
  const recommendations = generateRecommendations(data);
  recommendations.forEach((rec) => {
    lines.push(
      [
        rec.priority,
        rec.area,
        `"${rec.recommendation}"`,
        `"${rec.impact}"`,
      ].join(","),
    );
  });
  lines.push("");

  // Footer
  lines.push("🏁 REPORT FOOTER");
  lines.push("Generated by,Stashify Management System v2.0");
  lines.push("Data Source,Inventory Database");
  lines.push("Report Type,Comprehensive Inventory Analysis");
  lines.push("Confidentiality,Internal Use Only");
  lines.push("Next Review,Next 30 Days");
  lines.push("Contact,Inventory Manager");

  fs.writeFileSync(filepath, lines.join("\n"), "utf8");
  const stats = fs.statSync(filepath);

  return { filename, fileSize: formatFileSize(stats.size) };
}

// ----------------------------------------------------------------------
// Excel export
// @ts-ignore
async function exportExcel(data, params) {
  // @ts-ignore
  if (!excelJS) {
    return await exportCSV(data, params);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `inventory_report_${timestamp}.xlsx`;
  const filepath = path.join(EXPORT_DIR, filename);

  const workbook = new excelJS.Workbook();
  workbook.creator = "Stashify Management System";
  workbook.created = new Date();

  // Cover Page
  const coverSheet = workbook.addWorksheet("Cover");
  coverSheet.getCell("A1").value = "Stashify SYSTEM";
  coverSheet.getCell("A1").font = {
    size: 24,
    bold: true,
    color: { argb: "2C3E50" },
  };
  coverSheet.mergeCells("A1:E1");
  coverSheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  coverSheet.getRow(1).height = 40;

  coverSheet.getCell("A3").value = "INVENTORY ANALYSIS REPORT";
  coverSheet.getCell("A3").font = {
    size: 28,
    bold: true,
    color: { argb: "3498DB" },
  };
  coverSheet.mergeCells("A3:E3");
  coverSheet.getCell("A3").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  coverSheet.getRow(3).height = 50;

  // Report details
  const details = [
    ["Report ID", `INV-${Date.now()}`],
    ["Generated", new Date().toLocaleString()],
    [
      "Date Range",
      `${data.date_range.startDate} to ${data.date_range.endDate}`,
    ],
    ["Period", data.filters.period],
    ["Currency", data.metadata.currency],
    ["Total Products", data.summary.totalProducts],
    ["Total Stock Value", formatCurrency(data.summary.totalStockValue)],
    ["Low Stock Items", data.summary.lowStockCount],
    ["Total Categories", data.summary.totalCategories],
    ["Growth Rate", `${data.summary.growthRate}%`],
  ];
  let rowIdx = 5;
  details.forEach(([label, value], idx) => {
    coverSheet.getCell(`A${rowIdx}`).value = label;
    coverSheet.getCell(`A${rowIdx}`).font = { bold: true };
    coverSheet.getCell(`E${rowIdx}`).value = value;
    if (idx % 2 === 0) {
      for (let col = 1; col <= 5; col++) {
        coverSheet.getCell(rowIdx, col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F8F9F9" },
        };
      }
    }
    rowIdx++;
  });

  // Executive Summary box
  const summaryTitleRow = rowIdx + 2;
  coverSheet.mergeCells(`A${summaryTitleRow}:E${summaryTitleRow}`);
  coverSheet.getCell(`A${summaryTitleRow}`).value = "EXECUTIVE SUMMARY";
  coverSheet.getCell(`A${summaryTitleRow}`).font = {
    size: 16,
    bold: true,
    color: { argb: "FFFFFF" },
  };
  coverSheet.getCell(`A${summaryTitleRow}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "3498DB" },
  };
  coverSheet.getCell(`A${summaryTitleRow}`).alignment = {
    horizontal: "center",
  };

  const summaryContent = [
    ["📊 Total Products", data.summary.totalProducts],
    ["📦 Total Stock", data.summary.totalStock],
    ["💰 Total Value", formatCurrency(data.summary.totalStockValue)],
    ["⚠️ Low Stock Items", data.summary.lowStockCount],
    ["📈 Growth Rate", `${data.summary.growthRate}%`],
    ["🔄 Turnover Rate", data.summary.stockTurnoverRate],
    ["📂 Categories", data.summary.totalCategories],
  ];
  rowIdx = summaryTitleRow + 1;
  summaryContent.forEach(([label, value]) => {
    coverSheet.getCell(`A${rowIdx}`).value = label;
    coverSheet.getCell(`A${rowIdx}`).font = { bold: true };
    coverSheet.getCell(`E${rowIdx}`).value = value;
    rowIdx++;
  });

  coverSheet.columns = [
    { width: 30 },
    { width: 5 },
    { width: 5 },
    { width: 30 },
    { width: 5 },
  ];

  // Dashboard Page
  const dashboardSheet = workbook.addWorksheet("Dashboard");
  const kpis = [
    {
      label: "Total Products",
      value: data.summary.totalProducts,
      color: "3498DB",
    },
    { label: "Total Stock", value: data.summary.totalStock, color: "2ECC71" },
    {
      label: "Total Value",
      value: formatCurrency(data.summary.totalStockValue),
      color: "9B59B6",
    },
    { label: "Low Stock", value: data.summary.lowStockCount, color: "E74C3C" },
    {
      label: "Categories",
      value: data.summary.totalCategories,
      color: "F39C12",
    },
    {
      label: "Growth Rate",
      value: `${data.summary.growthRate}%`,
      color: "1ABC9C",
    },
  ];
  kpis.forEach((kpi, idx) => {
    const col = (idx % 3) * 2 + 1;
    const row = Math.floor(idx / 3) * 3 + 1;
    dashboardSheet.mergeCells(row, col, row, col + 1);
    const titleCell = dashboardSheet.getCell(row, col);
    titleCell.value = kpi.label;
    titleCell.font = { bold: true, color: { argb: "FFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: kpi.color },
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    dashboardSheet.mergeCells(row + 1, col, row + 1, col + 1);
    const valueCell = dashboardSheet.getCell(row + 1, col);
    valueCell.value = kpi.value;
    valueCell.font = { size: 16, bold: true };
    valueCell.alignment = { horizontal: "center", vertical: "middle" };
    valueCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Stock Analysis Page
  const analysisSheet = workbook.addWorksheet("Stock Analysis");
  analysisSheet.columns = [
    { header: "Category", key: "category", width: 25 },
    { header: "Stock Quantity", key: "quantity", width: 15 },
    { header: "Stock Value", key: "value", width: 15 },
    { header: "Percentage", key: "percentage", width: 12 },
    { header: "Color", key: "color", width: 10 },
  ];
  const analysisHeader = analysisSheet.getRow(1);
  analysisHeader.font = { bold: true, color: { argb: "FFFFFF" } };
  analysisHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "2C3E50" },
  };
  analysisHeader.alignment = { horizontal: "center", vertical: "middle" };
  analysisHeader.height = 25;
  // @ts-ignore
  data.stock_by_category.forEach((category, idx) => {
    const row = analysisSheet.addRow({
      category: category.name,
      quantity: category.stock_quantity,
      value: formatCurrency(category.stock_value),
      percentage: `${category.percentage || 0}%`,
      color: category.color,
    });
    if (idx % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F8F9F9" },
      };
    }
    row.getCell("color").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: category.color.replace("#", "") },
    };
  });

  // Low Stock Alerts Page
  const alertsSheet = workbook.addWorksheet("Low Stock Alerts");
  alertsSheet.columns = [
    { header: "Product", key: "product", width: 30 },
    { header: "Current Stock", key: "stock", width: 15 },
    { header: "Reorder Level", key: "reorder", width: 15 },
    { header: "Category", key: "category", width: 20 },
    { header: "Stock Value", key: "value", width: 15 },
    { header: "Status", key: "status", width: 12 },
  ];
  const alertsHeader = alertsSheet.getRow(1);
  alertsHeader.font = { bold: true, color: { argb: "FFFFFF" } };
  alertsHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "E74C3C" },
  };
  alertsHeader.alignment = { horizontal: "center", vertical: "middle" };
  alertsHeader.height = 25;
  // @ts-ignore
  data.low_stock_products.forEach((item, idx) => {
    const row = alertsSheet.addRow({
      product: item.product_name,
      stock: item.current_stock,
      reorder: item.reorder_level,
      category: item.category,
      value: formatCurrency(item.stock_value),
      status: item.stock_status,
    });
    if (idx % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F8F9F9" },
      };
    }
    // @ts-ignore
    const statusColor = STATUS_COLORS[item.stock_status] || { argb: "CCCCCC" };
    row.getCell("status").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: statusColor,
    };
    row.getCell("status").font = { bold: true };
  });

  // Stock Movements Page
  const movementsSheet = workbook.addWorksheet("Stock Movements");
  movementsSheet.columns = [
    { header: "Period", key: "period", width: 20 },
    { header: "Stock In", key: "in", width: 15 },
    { header: "Stock Out", key: "out", width: 15 },
    { header: "Net Change", key: "net", width: 15 },
    { header: "Trend", key: "trend", width: 12 },
  ];
  const movementsHeader = movementsSheet.getRow(1);
  movementsHeader.font = { bold: true, color: { argb: "FFFFFF" } };
  movementsHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "3498DB" },
  };
  movementsHeader.alignment = { horizontal: "center", vertical: "middle" };
  movementsHeader.height = 25;
  // @ts-ignore
  data.stock_movements.forEach((movement, idx) => {
    const trend =
      movement.netChange > 0
        ? "📈 Positive"
        : movement.netChange < 0
          ? "📉 Negative"
          : "➡️ Stable";
    const row = movementsSheet.addRow({
      period: movement.month,
      in: movement.stockIn,
      out: movement.stockOut,
      net: movement.netChange,
      trend: trend,
    });
    if (idx % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F8F9F9" },
      };
    }
    const netCell = row.getCell("net");
    if (movement.netChange > 0) {
      netCell.font = { bold: true, color: { argb: "27AE60" } };
    } else if (movement.netChange < 0) {
      netCell.font = { bold: true, color: { argb: "E74C3C" } };
    }
  });

  // Analytics Page
  const analyticsSheet = workbook.addWorksheet("Analytics");
  analyticsSheet.getCell("A1").value = "Performance Metrics";
  analyticsSheet.getCell("A1").font = { size: 16, bold: true };
  const perfRows = [
    ["Highest Stock Category", data.performance_metrics.highestStockCategory],
    ["Highest Stock Count", data.performance_metrics.highestStockCount],
    [
      "Highest Stock Value",
      formatCurrency(data.performance_metrics.highestStockValue),
    ],
    [
      "Average Stock Value",
      formatCurrency(data.performance_metrics.averageStockValue),
    ],
    ["Stock Turnover Rate", data.performance_metrics.stockTurnoverRate],
  ];
  perfRows.forEach(([label, value], idx) => {
    analyticsSheet.getCell(`A${idx + 3}`).value = label;
    analyticsSheet.getCell(`A${idx + 3}`).font = { bold: true };
    analyticsSheet.getCell(`B${idx + 3}`).value = value;
  });

  analyticsSheet.getCell("A10").value = "Financial Analytics";
  analyticsSheet.getCell("A10").font = { size: 16, bold: true };
  const financialRows = [
    [
      "Total Inventory Value",
      formatCurrency(data.analytics.total_inventory_value),
    ],
    ["Low Stock Value", formatCurrency(data.analytics.low_stock_value)],
    ["Low Stock %", `${data.analytics.low_stock_percentage.toFixed(1)}%`],
    ["Growth Rate", `${data.analytics.growth_rate.toFixed(1)}%`],
    ["Stock Turnover", data.analytics.stock_turnover_rate.toFixed(2)],
  ];
  financialRows.forEach(([label, value], idx) => {
    analyticsSheet.getCell(`A${idx + 12}`).value = label;
    analyticsSheet.getCell(`A${idx + 12}`).font = { bold: true };
    analyticsSheet.getCell(`B${idx + 12}`).value = value;
  });

  // Recommendations Page
  const recSheet = workbook.addWorksheet("Recommendations");
  recSheet.columns = [
    { header: "Priority", key: "priority", width: 10 },
    { header: "Area", key: "area", width: 15 },
    { header: "Recommendation", key: "recommendation", width: 50 },
    { header: "Expected Impact", key: "impact", width: 40 },
  ];
  const recommendations = generateRecommendations(data);
  // @ts-ignore
  // @ts-ignore
  recommendations.forEach((rec, idx) => {
    const row = recSheet.addRow({
      priority: rec.priority,
      area: rec.area,
      recommendation: rec.recommendation,
      impact: rec.impact,
    });
    const priorityCell = row.getCell("priority");
    if (rec.priority === "HIGH") {
      priorityCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6E6" },
      };
      priorityCell.font = { bold: true, color: { argb: "E74C3C" } };
    } else if (rec.priority === "MEDIUM") {
      priorityCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2E6" },
      };
      priorityCell.font = { bold: true, color: { argb: "F39C12" } };
    } else {
      priorityCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "E6FFE6" },
      };
      priorityCell.font = { bold: true, color: { argb: "27AE60" } };
    }
  });

  await workbook.xlsx.writeFile(filepath);
  const stats = fs.statSync(filepath);
  return { filename, fileSize: formatFileSize(stats.size) };
}

// ----------------------------------------------------------------------
// PDF export
// @ts-ignore
async function exportPDF(data, params) {
  // @ts-ignore
  if (!PDFKit) {
    return await exportCSV(data, params);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `inventory_report_${timestamp}.pdf`;
  const filepath = path.join(EXPORT_DIR, filename);

  const doc = new PDFKit({ size: "A4", margin: 40 });
  const writeStream = fs.createWriteStream(filepath);
  doc.pipe(writeStream);

  // Cover page
  doc.save();
  doc.rect(0, 0, doc.page.width, 180).fill(CHART_COLORS.dark);
  doc
    .fillColor("white")
    .fontSize(32)
    .font("Helvetica-Bold")
    .text("INVENTORY", 40, 50, { width: doc.page.width - 80, align: "center" });
  doc.fontSize(20).text("ANALYSIS REPORT", 40, 94, { align: "center" });
  doc
    .fontSize(12)
    .fillColor(CHART_COLORS.light)
    .text("Comprehensive Inventory Performance Analysis", 40, 124, {
      align: "center",
    });
  doc
    .fontSize(10)
    .text("Stashify Management System", 40, 142, { align: "center" });
  doc.restore();

  // White panel
  const panelTop = 170;
  doc
    .fillColor("white")
    .rect(40, panelTop, doc.page.width - 80, 300)
    .fill();
  doc
    .lineWidth(0.5)
    .strokeColor("#e6e6e6")
    .rect(40, panelTop, doc.page.width - 80, 300)
    .stroke();

  let cursorY = panelTop + 18;
  doc
    .fontSize(14)
    .fillColor(CHART_COLORS.dark)
    .font("Helvetica-Bold")
    .text("REPORT DETAILS", 56, cursorY);
  doc
    .moveTo(56, cursorY + 18)
    .lineTo(56 + 120, cursorY + 18)
    .lineWidth(1)
    .strokeColor(CHART_COLORS.dark)
    .stroke();
  cursorY += 28;

  const details = [
    ["Report ID", `INV-${Date.now().toString().slice(-8)}`],
    ["Generated", new Date().toLocaleString()],
    [
      "Date Range",
      `${data.date_range.startDate} to ${data.date_range.endDate}`,
    ],
    ["Period", data.filters.period],
    ["Currency", data.metadata.currency],
    ["Total Products", data.summary.totalProducts],
    ["Total Stock Value", formatCurrency(data.summary.totalStockValue)],
    ["Low Stock Items", data.summary.lowStockCount],
  ];
  details.forEach(([label, value]) => {
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(CHART_COLORS.dark)
      .text(label, 56, cursorY);
    doc
      .font("Helvetica")
      .fillColor("#666666")
      .text(String(value), 250, cursorY);
    cursorY += 18;
  });

  const riskLevel = getRiskLevel(data);
  const riskColor =
    riskLevel === "HIGH"
      ? CHART_COLORS.danger
      : riskLevel === "MEDIUM"
        ? CHART_COLORS.warning
        : CHART_COLORS.secondary;
  doc.save();
  doc.roundedRect(56, cursorY + 10, 220, 28, 4).fill(riskColor);
  doc
    .fillColor("white")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(`RISK LEVEL: ${riskLevel}`, 56, cursorY + 16, {
      width: 220,
      align: "center",
    });
  doc.restore();

  doc.addPage();

  // Executive Summary
  doc
    .fontSize(18)
    .fillColor(CHART_COLORS.dark)
    .font("Helvetica-Bold")
    .text("EXECUTIVE SUMMARY", 40, doc.y, { underline: true });
  doc.moveDown(0.8);

  const kpis = [
    { label: "Total Products", value: data.summary.totalProducts, icon: "P" },
    { label: "Total Stock", value: data.summary.totalStock, icon: "S" },
    {
      label: "Total Value",
      value: formatCurrency(data.summary.totalStockValue),
      icon: "$",
    },
    { label: "Low Stock Items", value: data.summary.lowStockCount, icon: "!" },
    { label: "Categories", value: data.summary.totalCategories, icon: "C" },
    { label: "Growth Rate", value: `${data.summary.growthRate}%`, icon: "↑" },
    {
      label: "Turnover Rate",
      value: data.summary.stockTurnoverRate,
      icon: "↻",
    },
    {
      label: "Stock Movements",
      value: data.metadata.total_movements,
      icon: "M",
    },
  ];

  const colCount = 3;
  const gap = 14;
  const boxWidth = Math.floor(
    (doc.page.width - 80 - gap * (colCount - 1)) / colCount,
  );
  const boxHeight = 64;
  let y = doc.y;
  for (let idx = 0; idx < kpis.length; idx++) {
    const row = Math.floor(idx / colCount);
    const col = idx % colCount;
    const x = 40 + col * (boxWidth + gap);
    const boxY = y + row * (boxHeight + gap);
    if (row > 0 && boxY + boxHeight > doc.page.height - 80) {
      doc.addPage();
      y = 40;
    }
    doc
      .roundedRect(x, boxY, boxWidth, boxHeight, 6)
      .fill("#FFFFFF")
      .lineWidth(0.6)
      .strokeColor("#E6E6E6")
      .stroke();
    doc
      .fontSize(16)
      .fillColor(CHART_COLORS.primary)
      .text(kpis[idx].icon, x + 10, boxY + 10);
    doc
      .fontSize(9)
      .fillColor("#666666")
      .text(kpis[idx].label, x + 44, boxY + 10, { width: boxWidth - 54 });
    doc
      .fontSize(13)
      .fillColor(CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text(String(kpis[idx].value), x + 44, boxY + 30, {
        width: boxWidth - 54,
      });
  }

  doc.y = y + Math.ceil(kpis.length / colCount) * (boxHeight + gap) + 10;

  doc
    .fontSize(14)
    .fillColor(CHART_COLORS.dark)
    .font("Helvetica-Bold")
    .text("KEY FINDINGS", 40, doc.y, { underline: true });
  doc.moveDown(0.5);
  const findings = [
    `Total inventory value: ${formatCurrency(data.summary.totalStockValue)}`,
    `${data.summary.lowStockCount} items require attention (low stock)`,
    `Inventory growth rate: ${data.summary.growthRate}%`,
    `Stock turnover rate: ${data.summary.stockTurnoverRate} times per year`,
    `Average stock value: ${formatCurrency(data.performance_metrics.averageStockValue)} per product`,
  ];
  findings.forEach((f) => {
    if (doc.y + 36 > doc.page.height - 80) doc.addPage();
    doc
      .fontSize(10)
      .fillColor("#333333")
      .text(`• ${f}`, 44, doc.y, { width: doc.page.width - 80 });
    doc.moveDown(0.4);
  });

  doc.addPage();

  // Performance Metrics
  doc
    .fontSize(18)
    .fillColor(CHART_COLORS.dark)
    .font("Helvetica-Bold")
    .text("PERFORMANCE METRICS", 40, doc.y, { underline: true });
  doc.moveDown(1);
  const perfData = [
    ["Highest Stock Category", data.performance_metrics.highestStockCategory],
    ["Highest Stock Count", data.performance_metrics.highestStockCount],
    [
      "Highest Stock Value",
      formatCurrency(data.performance_metrics.highestStockValue),
    ],
    [
      "Average Stock Value",
      formatCurrency(data.performance_metrics.averageStockValue),
    ],
    ["Stock Turnover Rate", data.performance_metrics.stockTurnoverRate],
  ];
  perfData.forEach(([label, value], idx) => {
    const y = doc.y + idx * 25;
    if (y + 25 > doc.page.height - 80) doc.addPage();
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#333333")
      .text(label, 40, y);
    doc
      .fontSize(10)
      .fillColor(CHART_COLORS.primary)
      .text(value.toString(), 240, y);
    if (idx < perfData.length - 1) {
      doc
        .moveTo(40, y + 20)
        .lineTo(doc.page.width - 40, y + 20)
        .strokeColor("#EEEEEE")
        .lineWidth(0.5)
        .stroke();
    }
  });

  doc.addPage();

  // Stock by Category
  doc
    .fontSize(18)
    .fillColor(CHART_COLORS.dark)
    .font("Helvetica-Bold")
    .text("STOCK BY CATEGORY", 40, doc.y, { underline: true });
  doc.moveDown(1);
  const headers = ["Category", "Quantity", "Value", "%"];
  const colWidths = [150, 80, 100, 50];
  let tableY = doc.y;
  let tableX = 40;
  // Header
  doc.save();
  doc.rect(tableX, tableY, colWidths[0], 20).fill(CHART_COLORS.primary);
  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(headers[0], tableX + 5, tableY + 5);
  doc
    .rect(tableX + colWidths[0], tableY, colWidths[1], 20)
    .fill(CHART_COLORS.primary);
  doc.text(headers[1], tableX + colWidths[0] + 5, tableY + 5);
  doc
    .rect(tableX + colWidths[0] + colWidths[1], tableY, colWidths[2], 20)
    .fill(CHART_COLORS.primary);
  doc.text(headers[2], tableX + colWidths[0] + colWidths[1] + 5, tableY + 5);
  doc
    .rect(
      tableX + colWidths[0] + colWidths[1] + colWidths[2],
      tableY,
      colWidths[3],
      20,
    )
    .fill(CHART_COLORS.primary);
  doc.text(
    headers[3],
    tableX + colWidths[0] + colWidths[1] + colWidths[2] + 5,
    tableY + 5,
  );
  doc.restore();

  tableY += 20;
  // @ts-ignore
  data.stock_by_category.slice(0, 10).forEach((cat, idx) => {
    if (tableY + 20 > doc.page.height - 40) {
      doc.addPage();
      tableY = 40;
    }
    // Row background
    if (idx % 2 === 0) {
      doc
        .rect(
          tableX,
          tableY,
          colWidths.reduce((a, b) => a + b, 0),
          20,
        )
        .fill("#F8F9F9");
    }
    // Borders
    doc.lineWidth(0.2).strokeColor("#DDDDDD");
    colWidths.reduce((acc, w) => {
      doc.rect(acc, tableY, w, 20).stroke();
      return acc + w;
    }, tableX);
    // Data
    doc
      .fillColor("#333333")
      .fontSize(9)
      .text(cat.name.substring(0, 20), tableX + 5, tableY + 5, {
        width: colWidths[0] - 10,
      });
    doc.text(
      String(cat.stock_quantity),
      tableX + colWidths[0] + 5,
      tableY + 5,
      { width: colWidths[1] - 10, align: "right" },
    );
    doc.text(
      formatCurrency(cat.stock_value),
      tableX + colWidths[0] + colWidths[1] + 5,
      tableY + 5,
      { width: colWidths[2] - 10, align: "right" },
    );
    doc.text(
      `${cat.percentage || 0}%`,
      tableX + colWidths[0] + colWidths[1] + colWidths[2] + 5,
      tableY + 5,
      { width: colWidths[3] - 10, align: "right" },
    );
    tableY += 20;
  });

  doc.addPage();

  // Low Stock Alerts
  doc
    .fontSize(18)
    .fillColor(CHART_COLORS.dark)
    .font("Helvetica-Bold")
    .text("LOW STOCK ALERTS", 40, doc.y, { underline: true });
  doc.moveDown(1);
  const alertHeaders = ["Product", "Stock", "Reorder", "Category", "Status"];
  const alertWidths = [150, 50, 50, 100, 60];
  tableY = doc.y;
  tableX = 40;
  // Header
  doc.save();
  alertWidths.reduce((acc, w, i) => {
    doc.rect(acc, tableY, w, 20).fill(CHART_COLORS.danger);
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(alertHeaders[i], acc + 5, tableY + 5, { width: w - 10 });
    return acc + w;
  }, tableX);
  doc.restore();

  tableY += 20;
  // @ts-ignore
  data.low_stock_products.slice(0, 15).forEach((item, idx) => {
    if (tableY + 20 > doc.page.height - 40) {
      doc.addPage();
      tableY = 40;
    }
    if (idx % 2 === 0) {
      doc
        .rect(
          tableX,
          tableY,
          alertWidths.reduce((a, b) => a + b, 0),
          20,
        )
        .fill("#F8F9F9");
    }
    let x = tableX;
    // @ts-ignore
    // @ts-ignore
    alertWidths.forEach((w, i) => {
      doc.rect(x, tableY, w, 20).strokeColor("#DDDDDD").stroke();
      x += w;
    });
    x = tableX;
    doc
      .fillColor("#333333")
      .fontSize(8)
      .text(item.product_name.substring(0, 25), x + 5, tableY + 5, {
        width: alertWidths[0] - 10,
      });
    x += alertWidths[0];
    doc.text(String(item.current_stock), x + 5, tableY + 5, {
      width: alertWidths[1] - 10,
      align: "center",
    });
    x += alertWidths[1];
    doc.text(String(item.reorder_level), x + 5, tableY + 5, {
      width: alertWidths[2] - 10,
      align: "center",
    });
    x += alertWidths[2];
    doc.text(item.category.substring(0, 15), x + 5, tableY + 5, {
      width: alertWidths[3] - 10,
    });
    x += alertWidths[3];
    const statusColor =
      item.stock_status === "Out of Stock"
        ? CHART_COLORS.danger
        : item.stock_status === "Critical"
          ? CHART_COLORS.warning
          : item.stock_status === "Very Low"
            ? "#FFBB33"
            : item.stock_status === "Low Stock"
              ? "#8BC34A"
              : "#666666";
    doc
      .fillColor(statusColor)
      .font("Helvetica-Bold")
      .text(item.stock_status, x + 5, tableY + 5, {
        width: alertWidths[4] - 10,
        align: "center",
      });
    tableY += 20;
  });

  doc.addPage();

  // Stock Movements
  doc
    .fontSize(18)
    .fillColor(CHART_COLORS.dark)
    .font("Helvetica-Bold")
    .text("STOCK MOVEMENTS", 40, doc.y, { underline: true });
  doc.moveDown(1);
  const movHeaders = ["Period", "Stock In", "Stock Out", "Net Change", "Trend"];
  const movWidths = [120, 90, 90, 100, 70];
  tableY = doc.y;
  tableX = 40;
  // Header
  doc.save();
  movWidths.reduce((acc, w, i) => {
    doc.rect(acc, tableY, w, 20).fill(CHART_COLORS.info);
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(movHeaders[i], acc + 5, tableY + 5, {
        width: w - 10,
        align: "center",
      });
    return acc + w;
  }, tableX);
  doc.restore();

  tableY += 20;
  // @ts-ignore
  data.stock_movements.slice(0, 12).forEach((mov, idx) => {
    if (tableY + 20 > doc.page.height - 40) {
      doc.addPage();
      tableY = 40;
    }
    if (idx % 2 === 0) {
      doc
        .rect(
          tableX,
          tableY,
          movWidths.reduce((a, b) => a + b, 0),
          20,
        )
        .fill("#F8F9F9");
    }
    let x = tableX;
    movWidths.forEach((w) => {
      doc.rect(x, tableY, w, 20).strokeColor("#DDDDDD").stroke();
      x += w;
    });
    x = tableX;
    doc
      .fillColor("#333333")
      .fontSize(9)
      .text(mov.month, x + 5, tableY + 5, { width: movWidths[0] - 10 });
    x += movWidths[0];
    doc.text(String(mov.stockIn), x + 5, tableY + 5, {
      width: movWidths[1] - 10,
      align: "right",
    });
    x += movWidths[1];
    doc.text(String(mov.stockOut), x + 5, tableY + 5, {
      width: movWidths[2] - 10,
      align: "right",
    });
    x += movWidths[2];
    const netColor =
      mov.netChange > 0
        ? CHART_COLORS.secondary
        : mov.netChange < 0
          ? CHART_COLORS.danger
          : "#607D8B";
    doc
      .fillColor(netColor)
      .font("Helvetica-Bold")
      .text(String(mov.netChange), x + 5, tableY + 5, {
        width: movWidths[3] - 10,
        align: "right",
      });
    x += movWidths[3];
    const trendText =
      mov.netChange > 0 ? "Up" : mov.netChange < 0 ? "Down" : "Flat";
    doc.fillColor(netColor).text(trendText, x + 5, tableY + 5, {
      width: movWidths[4] - 10,
      align: "center",
    });
    tableY += 20;
  });

  doc.addPage();

  // Recommendations
  doc
    .fontSize(18)
    .fillColor(CHART_COLORS.dark)
    .font("Helvetica-Bold")
    .text("ACTION PLAN & RECOMMENDATIONS", 40, doc.y, { underline: true });
  doc.moveDown(1);
  const recs = generateRecommendations(data);
  recs.forEach((rec, idx) => {
    const recY = doc.y;
    if (recY + 40 > doc.page.height - 40) doc.addPage();
    const priorityColor =
      rec.priority === "HIGH"
        ? CHART_COLORS.danger
        : rec.priority === "MEDIUM"
          ? CHART_COLORS.warning
          : CHART_COLORS.secondary;
    doc.rect(40, recY, 10, 10).fill(priorityColor);
    doc
      .fontSize(11)
      .fillColor(CHART_COLORS.dark)
      .font("Helvetica-Bold")
      .text(`${idx + 1}. ${rec.area}: ${rec.recommendation}`, 60, recY - 2);
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .fillColor("#666666")
      .text(`Impact: ${rec.impact}`, { indent: 20 });
    doc.moveDown(1);
  });

  // ✅ FIXED: Footer gamit ang buffered page range (1‑based page numbers)
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    const pageNum = range.start + i; // aktwal na page number (1‑based)
    doc.switchToPage(pageNum);
    doc
      .fontSize(7)
      .fillColor("#999999")
      .text(
        `Inventory Analysis Report | Generated: ${new Date().toLocaleDateString()} | Stashify v2.0 | Report Type: ${data.metadata.report_type} | Confidential`,
        40,
        doc.page.height - 20,
        { align: "center", width: doc.page.width - 80 },
      );
    doc
      .moveTo(40, doc.page.height - 40)
      .lineTo(doc.page.width - 40, doc.page.height - 40)
      .strokeColor("#DDDDDD")
      .lineWidth(0.5)
      .stroke();
    doc
      .fontSize(8)
      .fillColor("#666666")
      .text(
        `Page ${pageNum} of ${range.start + range.count - 1}`,
        40,
        doc.page.height - 30,
        { align: "center", width: doc.page.width - 80 },
      );
  }

  doc.end();
  await new Promise((resolve, reject) => {
    // @ts-ignore
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  const stats = fs.statSync(filepath);
  return { filename, fileSize: formatFileSize(stats.size) };
}

// ----------------------------------------------------------------------
// Formatting helpers
// @ts-ignore
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// @ts-ignore
function formatCurrency(amount) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency}${amount.toFixed(2)}`;
  }
}

// @ts-ignore
function getMimeType(format) {
  const mimeTypes = {
    csv: "text/csv",
    excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pdf: "application/pdf",
  };
  // @ts-ignore
  return mimeTypes[format] || "application/octet-stream";
}

// ----------------------------------------------------------------------
// Main export function
// @ts-ignore
async function exportInventoryReport(params) {
  const format = params.format || "pdf";
  if (!SUPPORTED_FORMATS.includes(format)) {
    throw new Error(
      `Unsupported format. Supported: ${SUPPORTED_FORMATS.join(", ")}`,
    );
  }

  const rawData = await getInventoryReportData(params);
  const transformedData = transformInventoryReportData(rawData, params);

  let result;
  switch (format) {
    case "csv":
      result = await exportCSV(transformedData, params);
      break;
    case "excel":
      result = await exportExcel(transformedData, params);
      break;
    case "pdf":
      result = await exportPDF(transformedData, params);
      break;
  }

  // @ts-ignore
  const filepath = path.join(EXPORT_DIR, result.filename);
  const fileBuffer = fs.readFileSync(filepath);
  const base64Content = fileBuffer.toString("base64");

  // Save export history
  await saveExportHistory({
    // @ts-ignore
    filename: result.filename,
    format,
    generated_at: new Date().toISOString(),
    // @ts-ignore
    file_size: result.fileSize,
    filters: JSON.stringify(params),
  });

  return {
    content: base64Content,
    // @ts-ignore
    filename: result.filename,
    // @ts-ignore
    fileSize: result.fileSize,
    mimeType: getMimeType(format),
    fullPath: filepath,
  };
}

// ----------------------------------------------------------------------
// Preview
// @ts-ignore
async function getExportPreview(params) {
  const rawData = await getInventoryReportData(params);
  const transformedData = transformInventoryReportData(rawData, params);
  return transformedData;
}

// ----------------------------------------------------------------------
// Export history
// @ts-ignore
async function saveExportHistory(exportData) {
  try {
    const db = require(
      path.join(__dirname, "..", "..", "models", "BaseQuerySet"),
    ).getDb();
    // Ensure table exists
    await db.run(`
      CREATE TABLE IF NOT EXISTS export_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        format TEXT NOT NULL,
        record_count INTEGER DEFAULT 0,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        generated_by TEXT DEFAULT 'system',
        file_size TEXT,
        filters_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.run(
      `INSERT INTO export_history (filename, format, generated_at, file_size, filters_json) VALUES (?, ?, ?, ?, ?)`,
      [
        exportData.filename,
        exportData.format,
        exportData.generated_at,
        exportData.file_size,
        exportData.filters,
      ],
    );
  } catch (error) {
    // @ts-ignore
    console.warn("Failed to save export history:", error.message);
  }
}

async function getExportHistory() {
  try {
    const db = require(
      path.join(__dirname, "..", "..", "models", "BaseQuerySet"),
    ).getDb();
    const history = await db.all(
      "SELECT * FROM export_history WHERE filename LIKE '%inventory_report%' ORDER BY generated_at DESC LIMIT 50",
    );
    // @ts-ignore
    const parsed = history.map((item) => ({
      ...item,
      filters: item.filters_json ? JSON.parse(item.filters_json) : {},
    }));
    return {
      status: true,
      message: "Export history fetched successfully",
      data: parsed,
    };
  } catch (error) {
    console.error("getExportHistory error:", error);
    // @ts-ignore
    return { status: false, message: error.message, data: [] };
  }
}

// ----------------------------------------------------------------------
// Supported formats
function getSupportedFormats() {
  return [
    {
      value: "csv",
      label: "CSV",
      description: "Simple format compatible with all spreadsheet software",
      icon: "📄",
    },
    {
      value: "excel",
      label: "Excel",
      description: "Advanced formatting with multiple sheets and styling",
      icon: "📊",
    },
    {
      value: "pdf",
      label: "PDF Report",
      description: "Professional report with charts and executive summary",
      icon: "📋",
    },
  ];
}

module.exports = {
  exportInventoryReport,
  getExportPreview,
  getExportHistory,
  getSupportedFormats,
  SUPPORTED_FORMATS,
};
