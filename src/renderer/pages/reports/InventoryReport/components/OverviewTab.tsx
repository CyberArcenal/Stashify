// src/renderer/pages/inventory-report/components/OverviewTab.tsx
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Target, Layers } from "lucide-react";
import { formatCurrency } from "../../../../utils/formatters";

interface OverviewTabProps {
  stockByCategory: Array<{
    name: string;
    value: number;
    stockValue: number;
    color: string;
  }>;
  lowStockProducts: Array<{
    name: string;
    stock: number;
    reorderLevel: number;
    category: string;
    currentValue: number;
    productId: number;
    variantId?: number | null;
  }>;
  stockMovements: Array<{
    month: string;
    stockIn: number;
    stockOut: number;
    netChange: number;
  }>;
  performanceMetrics: {
    highestStockCategory: string;
    highestStockCount: number;
    highestStockValue?: number;
    averageStockValue: number;
    stockTurnoverRate: number;
  };
  summary: {
    totalProducts: number;
    totalCategories: number;
    totalStock: number;
    totalStockValue: number;
    lowStockCount: number;
    growthRate: number;
    stockTurnoverRate: number;
  };
}

// Safe tooltip – verifies payload is an array
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && Array.isArray(payload) && payload.length > 0) {
    return (
      <div
        className="compact-card rounded-md shadow-lg border"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <p
          className="font-semibold text-sm"
          style={{ color: "var(--sidebar-text)" }}
        >
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}:{" "}
            {entry.dataKey === "stockValue" || entry.dataKey === "currentValue"
              ? formatCurrency(entry.value)
              : entry.value}
            {entry.dataKey === "stock" && " units"}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieChartTooltip = ({ active, payload }: any) => {
  if (active && Array.isArray(payload) && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div
        className="compact-card rounded-md shadow-lg border"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <p
          className="font-semibold text-sm"
          style={{ color: "var(--sidebar-text)" }}
        >
          {data.name}
        </p>
        <p className="text-sm" style={{ color: data.color }}>
          Stock: {data.value} items
        </p>
        <p className="text-sm" style={{ color: data.color }}>
          Value: {formatCurrency(data.stockValue)}
        </p>
      </div>
    );
  }
  return null;
};

const OverviewTab: React.FC<OverviewTabProps> = ({
  stockByCategory,
  lowStockProducts,
  stockMovements,
  performanceMetrics,
  summary,
}) => {
  // Validate stockMovements: must be array and each item must have required keys
  const isValidStockMovements =
    Array.isArray(stockMovements) &&
    stockMovements.every(
      (item) =>
        item &&
        typeof item === "object" &&
        "month" in item &&
        "stockIn" in item &&
        "stockOut" in item,
    );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Stock by Category - unchanged */}
        <div
          className="compact-card rounded-lg p-4 hover:shadow-md"
          style={{
            background: "var(--card-secondary-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          <h3
            className="font-semibold mb-4 text-sm flex items-center gap-1.5"
            style={{ color: "var(--sidebar-text)" }}
          >
            Stock by Category
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stockByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} (${((percent as number) * 100).toFixed(0)}%)`
                }
                outerRadius={80}
                dataKey="value"
              >
                {stockByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieChartTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Low Stock Chart - unchanged */}
        <div
          className="compact-card rounded-lg p-4 hover:shadow-md"
          style={{
            background: "var(--card-secondary-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          <h3
            className="font-semibold mb-4 text-sm flex items-center gap-1.5"
            style={{ color: "var(--sidebar-text)" }}
          >
            Low Stock Products
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={lowStockProducts.slice(0, 10)}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-color)"
              />
              <XAxis
                dataKey="name"
                stroke="var(--sidebar-text)"
                fontSize={11}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="var(--sidebar-text)" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="stock"
                name="Current Stock"
                fill="var(--accent-orange)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="reorderLevel"
                name="Reorder Level"
                fill="var(--sidebar-text)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stock Movements – with validation */}
        <div
          className="compact-card rounded-lg p-4 hover:shadow-md lg:col-span-2"
          style={{
            background: "var(--card-secondary-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          <h3
            className="font-semibold mb-4 text-sm flex items-center gap-1.5"
            style={{ color: "var(--sidebar-text)" }}
          >
            Stock Movements (In vs Out)
          </h3>
          {isValidStockMovements && stockMovements.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stockMovements}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                />
                <XAxis
                  dataKey="month"
                  stroke="var(--sidebar-text)"
                  fontSize={11}
                />
                <YAxis stroke="var(--sidebar-text)" fontSize={11} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="stockIn"
                  name="Stock In"
                  stroke="var(--accent-blue)"
                  strokeWidth={2}
                  dot={{ fill: "var(--accent-blue)", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="stockOut"
                  name="Stock Out"
                  stroke="var(--sidebar-text)"
                  strokeWidth={2}
                  dot={{ fill: "var(--sidebar-text)", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="netChange"
                  name="Net Change"
                  stroke="var(--accent-orange)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "var(--accent-orange)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="text-center py-8"
              style={{ color: "var(--text-secondary)" }}
            >
              No valid stock movement data available.
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary (unchanged) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* ... rest of the component remains exactly as before ... */}
      </div>
    </>
  );
};

export default OverviewTab;
