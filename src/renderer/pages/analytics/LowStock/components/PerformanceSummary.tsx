import React from "react";

interface PerformanceSummaryProps {
  performance: {
    mostCriticalCategory: string;
    criticalProductsCount: number;
    needsImmediateAttention: number;
    mostCriticalWarehouse: string;
    criticalItemsInWarehouse: number;
    totalAffectedWarehouses: number;
  };
}

const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({ performance }) => {
  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-sm">
      <div
        className="compact-card rounded-md text-white transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: "linear-gradient(to right, var(--accent-orange), var(--accent-orange-dark))",
        }}
      >
        <h4 className="font-semibold mb-1 text-sm">Most Critical Category</h4>
        <p className="text-xl font-bold">{performance.mostCriticalCategory}</p>
        <p className="text-xs opacity-90">{performance.criticalProductsCount} items need attention</p>
      </div>
      <div
        className="compact-card rounded-md text-white transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: "linear-gradient(to right, var(--danger-color), var(--danger-hover))",
        }}
      >
        <h4 className="font-semibold mb-1 text-sm">Immediate Action Needed</h4>
        <p className="text-xl font-bold">{performance.needsImmediateAttention} Items</p>
        <p className="text-xs opacity-90">Below 30% of reorder level</p>
      </div>
      <div
        className="compact-card rounded-md text-white transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: "linear-gradient(to right, var(--accent-blue), var(--accent-indigo))",
        }}
      >
        <h4 className="font-semibold mb-1 text-sm">Most Critical Warehouse</h4>
        <p className="text-xl font-bold">{performance.mostCriticalWarehouse}</p>
        <p className="text-xs opacity-90">{performance.criticalItemsInWarehouse} critical items</p>
      </div>
      <div
        className="compact-card rounded-md text-white transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: "linear-gradient(to right, var(--accent-purple), var(--accent-indigo))",
        }}
      >
        <h4 className="font-semibold mb-1 text-sm">Total Affected Warehouses</h4>
        <p className="text-xl font-bold">{performance.totalAffectedWarehouses}</p>
        <p className="text-xs opacity-90">Warehouses with low stock issues</p>
      </div>
    </div>
  );
};

export default PerformanceSummary;