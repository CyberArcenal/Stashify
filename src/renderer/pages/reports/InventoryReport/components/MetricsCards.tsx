// src/renderer/pages/inventory-report/components/MetricsCards.tsx
import React from "react";
import { Package, Warehouse, AlertTriangle, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../../../../utils/formatters";

interface MetricsCardsProps {
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

const MetricsCards: React.FC<MetricsCardsProps> = ({ summary }) => {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Total Products",
      value: summary.totalProducts,
      subValue: `${summary.totalCategories} categories`,
      icon: Package,
      bgColor: "var(--accent-blue-dark)",
      iconColor: "var(--accent-blue)",
      onClick: undefined,
    },
    {
      title: "Total Stock",
      value: summary.totalStock,
      growth: summary.growthRate,
      icon: Warehouse,
      bgColor: "var(--accent-green-dark)",
      iconColor: "var(--accent-green)",
      onClick: undefined,
    },
    {
      title: "Low Stock Items",
      value: summary.lowStockCount,
      subText: "Needs attention",
      icon: AlertTriangle,
      bgColor: "var(--accent-red-dark)",
      iconColor: "var(--accent-red)",
      onClick: () => navigate("/products/low-stock"),
    },
    {
      title: "Stock Value",
      value: formatCurrency(summary.totalStockValue),
      subValue: `Turnover: ${summary.stockTurnoverRate}x`,
      icon: DollarSign,
      bgColor: "var(--accent-purple-dark)",
      iconColor: "var(--accent-purple)",
      onClick: undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`compact-card rounded-lg p-4 transition-all hover:shadow-md ${card.onClick ? "cursor-pointer" : ""}`}
            style={{ background: "var(--card-secondary-bg)", border: "1px solid var(--border-color)" }}
            onClick={card.onClick}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="p-2 rounded-lg transition-all group-hover:scale-105"
                style={{ background: card.bgColor }}
              >
                <Icon className="icon-lg" style={{ color: card.iconColor }} />
              </div>
              {card.growth !== undefined && (
                <div
                  className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    card.growth >= 0
                      ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                      : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"
                  }`}
                >
                  {card.growth >= 0 ? <TrendingUp className="icon-xs mr-0.5" /> : <TrendingDown className="icon-xs mr-0.5" />}
                  {card.growth >= 0 ? "+" : ""}
                  {card.growth}%
                </div>
              )}
              {card.subText && (
                <div
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "var(--accent-red-light)", color: "var(--accent-red)" }}
                >
                  {card.subText}
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold mb-0.5" style={{ color: "var(--sidebar-text)" }}>
              {card.value}
            </h3>
            <p className="text-xs" style={{ color: "var(--sidebar-text)" }}>
              {card.title}
            </p>
            {(card.subValue || card.growth !== undefined) && (
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {card.subValue}
                  {card.growth !== undefined && `Growth: ${card.growth}%`}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MetricsCards;