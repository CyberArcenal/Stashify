import React from "react";

interface PerformanceSummaryProps {
  performance: {
    mostAffectedCategory: string;
    mostAffectedCategoryCount: number;
    mostAffectedCategoryLostSales?: number;
    restockingPriority: string;
    mostAffectedWarehouse: string;
    mostAffectedWarehouseCount: number;
    affectedWarehousesCount?: number;
  };
  summary: {
    outOfStockCount: number;
    affectedWarehouses: number;
  };
}

const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({ performance, summary }) => {
  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-sm">
      <div
        className="compact-card rounded-md text-white transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: "linear-gradient(to right, var(--danger-color), var(--danger-hover))",
        }}
      >
        <h4 className="font-semibold mb-1 text-sm">Most Affected Category</h4>
        <p className="text-xl font-bold">{performance.mostAffectedCategory}</p>
        <p className="text-xs opacity-90">{performance.mostAffectedCategoryCount} items out of stock in this category</p>
        {performance.mostAffectedCategoryLostSales && (
          <p className="text-xs opacity-90 mt-1">
            ₱{performance.mostAffectedCategoryLostSales.toLocaleString()} estimated lost sales
          </p>
        )}
      </div>
      <div
        className="compact-card rounded-md text-white transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: "linear-gradient(to right, var(--accent-orange), var(--accent-orange-hover))",
        }}
      >
        <h4 className="font-semibold mb-1 text-sm">Restocking Priority</h4>
        <p className="text-xl font-bold">{performance.restockingPriority}</p>
        <p className="text-xs opacity-90">{summary.outOfStockCount} items need immediate restocking</p>
      </div>
      <div
        className="compact-card rounded-md text-white transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: "linear-gradient(to right, var(--accent-blue), var(--accent-indigo))",
        }}
      >
        <h4 className="font-semibold mb-1 text-sm">Most Affected Warehouse</h4>
        <p className="text-xl font-bold">{performance.mostAffectedWarehouse}</p>
        <p className="text-xs opacity-90">{performance.mostAffectedWarehouseCount} items out of stock</p>
      </div>
      <div
        className="compact-card rounded-md text-white transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: "linear-gradient(to right, var(--accent-purple), var(--accent-indigo))",
        }}
      >
        <h4 className="font-semibold mb-1 text-sm">Total Affected Warehouses</h4>
        <p className="text-xl font-bold">{performance.affectedWarehousesCount || summary.affectedWarehouses}</p>
        <p className="text-xs opacity-90">Warehouses with out of stock items</p>
      </div>
    </div>
  );
};

export default PerformanceSummary;