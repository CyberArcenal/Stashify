import React from "react";

interface ReportFooterProps {
  totalItems: number;
  allItemsCount: number;
  metadata?: {
    reportType?: string;
  };
}

const ReportFooter: React.FC<ReportFooterProps> = ({ totalItems, allItemsCount, metadata }) => {
  const formatDate = (date: string) => new Date(date).toLocaleDateString("en-PH");

  return (
    <div
      className="flex justify-between items-center mt-4 pt-3"
      style={{ borderTop: "1px solid var(--border-color)" }}
    >
      <div className="text-xs flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--accent-green)" }}></div>
        Last updated: {formatDate(new Date().toISOString())}
        {metadata?.reportType && (
          <span
            className="ml-2 px-1 py-0.5 rounded text-xs"
            style={{ backgroundColor: "var(--accent-blue-light)", color: "var(--accent-blue)" }}
          >
            {metadata.reportType}
          </span>
        )}
      </div>
      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {totalItems} of {allItemsCount} stock items
      </div>
    </div>
  );
};

export default ReportFooter;