// src/renderer/pages/inventory-report/components/ReportFooter.tsx
import React from "react";

interface ReportFooterProps {
  summary: { lowStockCount: number };
  dateRange: { startDate: string; endDate: string };
  metadata?: any;
}

const ReportFooter: React.FC<ReportFooterProps> = ({ summary, dateRange, metadata }) => {
  return (
    <div
      className="compact-card rounded-lg"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
    >
      <div className="p-4">
        <div className="flex justify-between items-center">
          <div className="text-xs flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--accent-green)" }}></div>
            Report generated: {new Date().toLocaleDateString("en-PH")}
          </div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Data period: {dateRange.startDate} to {dateRange.endDate}
          </div>
        </div>
        {summary.lowStockCount > 0 && (
          <div
            className="mt-2 text-xs p-2 rounded-md"
            style={{ backgroundColor: "var(--accent-orange-light)", color: "var(--accent-orange)" }}
          >
            ⚠️ {summary.lowStockCount} products need reordering. Check the low stock section.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportFooter;