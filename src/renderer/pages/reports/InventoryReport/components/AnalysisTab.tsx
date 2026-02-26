// src/renderer/pages/inventory-report/components/AnalysisTab.tsx
import React from "react";
import { Activity, Target, FileText } from "lucide-react";
import { formatCurrency } from "../../../../utils/formatters";

interface AnalysisTabProps {
  summary: {
    lowStockCount: number;
    stockTurnoverRate: number;
    growthRate: number;
  };
  performanceMetrics: {
    highestStockCategory: string;
    highestStockValue?: number;
    stockTurnoverRate: number;
  };
  metadata?: {
    generatedAt: string;
    totalCategories: number;
    lowStockCount: number;
    totalMovements: number;
    filtersApplied: {
      period: string;
      group_by: string;
      low_stock_only: boolean;
    };
  };
}

const AnalysisTab: React.FC<AnalysisTabProps> = ({ summary, performanceMetrics, metadata }) => {
  return (
    <>
      {/* Analysis Cards */}
      <div
        className="compact-card rounded-lg hover:shadow-md"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <div className="p-4">
          <h3 className="font-semibold mb-4 text-sm flex items-center gap-1.5" style={{ color: "var(--sidebar-text)" }}>
            <Activity className="icon-sm" />
            Inventory Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-md hover:bg-[var(--card-hover-bg)]" style={{ border: "1px solid var(--border-color)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Stock Health</div>
              <div className={`text-base font-bold mb-1 ${summary.lowStockCount === 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-orange)]"}`}>
                {summary.lowStockCount === 0 ? "Healthy" : "Needs Attention"}
              </div>
              <div className="text-xs" style={{ color: "var(--sidebar-text)" }}>{summary.lowStockCount} items below reorder level</div>
            </div>
            <div className="p-3 rounded-md hover:bg-[var(--card-hover-bg)]" style={{ border: "1px solid var(--border-color)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Turnover Efficiency</div>
              <div className={`text-base font-bold mb-1 ${summary.stockTurnoverRate > 1 ? "text-[var(--accent-green)]" : "text-[var(--accent-orange)]"}`}>
                {summary.stockTurnoverRate}x
              </div>
              <div className="text-xs" style={{ color: "var(--sidebar-text)" }}>
                {summary.stockTurnoverRate > 1 ? "Good turnover" : "Low turnover"}
              </div>
            </div>
            <div className="p-3 rounded-md hover:bg-[var(--card-hover-bg)]" style={{ border: "1px solid var(--border-color)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Stock Growth</div>
              <div className={`text-base font-bold mb-1 ${summary.growthRate >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                {summary.growthRate >= 0 ? "+" : ""}{summary.growthRate}%
              </div>
              <div className="text-xs" style={{ color: "var(--sidebar-text)" }}>Compared to last period</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div
        className="compact-card rounded-lg hover:shadow-md"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <div className="p-4">
          <h3 className="font-semibold mb-4 text-sm flex items-center gap-1.5" style={{ color: "var(--sidebar-text)" }}>
            <Target className="icon-sm" />
            Performance Insights
          </h3>
          <div className="space-y-3">
            <div className="p-3 rounded-md hover:bg-[var(--card-hover-bg)]" style={{ border: "1px solid var(--border-color)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm" style={{ color: "var(--sidebar-text)" }}>Highest Value Category</div>
                <div className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--accent-purple-light)", color: "var(--accent-purple)" }}>
                  Top Performer
                </div>
              </div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {performanceMetrics.highestStockCategory} has the highest stock value of{" "}
                {formatCurrency(performanceMetrics.highestStockValue ?? 0)}
              </div>
            </div>
            <div className="p-3 rounded-md hover:bg-[var(--card-hover-bg)]" style={{ border: "1px solid var(--border-color)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm" style={{ color: "var(--sidebar-text)" }}>Stock Turnover Analysis</div>
                <div
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    performanceMetrics.stockTurnoverRate > 1
                      ? "bg-[var(--accent-green-light)] text-[var(--accent-green)]"
                      : "bg-[var(--accent-orange-light)] text-[var(--accent-orange)]"
                  }`}
                >
                  {performanceMetrics.stockTurnoverRate > 1 ? "Good" : "Low"}
                </div>
              </div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Turnover rate of {performanceMetrics.stockTurnoverRate}x indicates{" "}
                {performanceMetrics.stockTurnoverRate > 1 ? "efficient" : "slow"} inventory movement
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      {metadata && (
        <div
          className="compact-card rounded-lg hover:shadow-md"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div className="p-4">
            <h3 className="font-semibold mb-4 text-sm flex items-center gap-1.5" style={{ color: "var(--sidebar-text)" }}>
              <FileText className="icon-sm" />
              Report Metadata
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Generated At</div>
                <div className="text-sm font-medium" style={{ color: "var(--sidebar-text)" }}>
                  {new Date(metadata.generatedAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Total Categories</div>
                <div className="text-sm font-medium" style={{ color: "var(--sidebar-text)" }}>{metadata.totalCategories}</div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Low Stock Count</div>
                <div className="text-sm font-medium" style={{ color: "var(--sidebar-text)" }}>{metadata.lowStockCount}</div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Total Movements</div>
                <div className="text-sm font-medium" style={{ color: "var(--sidebar-text)" }}>{metadata.totalMovements}</div>
              </div>
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Filters Applied:</div>
              <div className="text-xs font-medium mt-1" style={{ color: "var(--sidebar-text)" }}>
                Period: {metadata.filtersApplied.period}, Group by: {metadata.filtersApplied.group_by}, Low stock only:{" "}
                {metadata.filtersApplied.low_stock_only ? "Yes" : "No"}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AnalysisTab;