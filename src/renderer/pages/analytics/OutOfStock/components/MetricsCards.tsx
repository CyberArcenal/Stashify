import React from "react";
import { Package, AlertTriangle, TrendingDown, BarChart3 } from "lucide-react";

interface MetricsCardsProps {
  summary: {
    totalStockItems: number;
    outOfStockCount: number;
    outOfStockPercentage: number;
    affectedWarehouses: number;
  };
  performance: {
    longestOutOfStock: number;
    averageDaysOutOfStock: number;
  };
}

const MetricsCards: React.FC<MetricsCardsProps> = ({ summary, performance }) => {
  const cards = [
    {
      label: "Total Stock Items",
      value: summary.totalStockItems,
      icon: Package,
      bg: "var(--accent-blue-light)",
      color: "var(--accent-blue)",
    },
    {
      label: "Out of Stock",
      value: summary.outOfStockCount,
      sub: `${summary.outOfStockPercentage.toFixed(1)}% of total`,
      icon: AlertTriangle,
      bg: "var(--accent-red-light)",
      color: "var(--danger-color)",
    },
    {
      label: "Longest Out of Stock",
      value: `${performance.longestOutOfStock}d`,
      sub: "Maximum days",
      icon: TrendingDown,
      bg: "var(--accent-orange-light)",
      color: "var(--accent-orange)",
    },
    {
      label: "Avg. Days Out",
      value: `${performance.averageDaysOutOfStock.toFixed(1)}d`,
      sub: "Average duration",
      icon: BarChart3,
      bg: "var(--accent-purple-light)",
      color: "var(--accent-purple)",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-sm mb-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="compact-stats rounded-md border relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>{card.label}</div>
                <div className="text-xl font-bold mt-xs" style={{ color: card.color }}>{card.value}</div>
                {card.sub && <div className="text-xs mt-xs" style={{ color: card.color }}>{card.sub}</div>}
              </div>
              <div className="p-1 rounded-md" style={{ backgroundColor: card.bg }}>
                <Icon className="icon-md" style={{ color: card.color }} />
              </div>
            </div>
            <div
              className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
              style={{ backgroundColor: card.color, opacity: 0.1 }}
            ></div>
          </div>
        );
      })}
    </div>
  );
};

export default MetricsCards;