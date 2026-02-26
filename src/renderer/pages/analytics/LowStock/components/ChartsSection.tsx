import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "var(--accent-orange)",
  "var(--accent-blue)",
  "var(--accent-purple)",
  "var(--accent-green)",
  "var(--accent-emerald)",
  "var(--accent-indigo)",
];

interface ChartsSectionProps {
  charts: {
    barChart: Array<{ name: string; stock: number; reorderLevel: number }>;
    pieChart: Array<{ name: string; value: number }>;
  };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="compact-card rounded-md shadow-lg border"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <p className="font-semibold text-sm" style={{ color: "var(--sidebar-text)" }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value} {entry.dataKey === "stock" ? "units" : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ChartsSection: React.FC<ChartsSectionProps> = ({ charts }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-sm mb-4">
      {/* Bar Chart */}
      <div
        className="compact-card rounded-md border transition-all duration-200 hover:scale-[1.01]"
        style={{
          backgroundColor: "var(--card-secondary-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <h3 className="font-semibold mb-2 text-sm" style={{ color: "var(--sidebar-text)" }}>
          Top 5 Lowest Stock Items
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={charts.barChart} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis
              dataKey="name"
              stroke="var(--sidebar-text)"
              fontSize={10}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis stroke="var(--sidebar-text)" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "10px", color: "var(--sidebar-text)" }} />
            <Bar dataKey="stock" name="Current Stock" fill="var(--accent-orange)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="reorderLevel" name="Reorder Level" fill="var(--accent-blue)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div
        className="compact-card rounded-md border transition-all duration-200 hover:scale-[1.01]"
        style={{
          backgroundColor: "var(--card-secondary-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <h3 className="font-semibold mb-2 text-sm" style={{ color: "var(--sidebar-text)" }}>
          Low Stock Distribution by Category
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={charts.pieChart}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${((percent as number) * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {charts.pieChart.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} stock items`, "Count"]} />
            <Legend wrapperStyle={{ fontSize: "10px", color: "var(--sidebar-text)" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartsSection;