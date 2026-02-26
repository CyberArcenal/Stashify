import React from "react";
import { Building, MapPin, AlertTriangle } from "lucide-react";
import Pagination from "../../../../components/Shared/Pagination1";

interface StockTableProps {
  items: Array<{
    id: number;
    product: string;
    sku?: string;
    variant: string;
    category: string;
    warehouse: string;
    warehouseLocation?: string;
    currentStock: number;
    reorderLevel: number;
    daysOutOfStock: number;
    supplier: string;
    status: string;
    allowBackorder: boolean;
    lastUpdated: string;
  }>;
  pagination: {
    current_page: number;
    total_pages: number;
    count: number;
    page_size: number;
  };
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const StockTable: React.FC<StockTableProps> = ({
  items,
  pagination,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const formatDate = (date: string) => new Date(date).toLocaleDateString("en-PH");

  return (
    <div className="space-y-4">
      <div
        className="overflow-x-auto rounded-md border compact-table"
        style={{ borderColor: "var(--border-color)" }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr
              className="border-b"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Product</th>
              <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Variant</th>
              <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Category</th>
              <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Warehouse</th>
              <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Location</th>
              <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Current Stock</th>
              <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Reorder Level</th>
              <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Days Out</th>
              <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Supplier</th>
              <th className="text-center px-4 py-2 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Status</th>
              <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-[var(--card-secondary-bg)] transition-colors"
                style={{ borderBottom: "1px solid var(--border-color)" }}
              >
                <td className="px-4 py-2 font-medium text-sm" style={{ color: "var(--sidebar-text)" }}>
                  <div className="flex flex-col">
                    <span>{item.product}</span>
                    {item.sku && <span className="text-xs text-gray-500">SKU: {item.sku}</span>}
                  </div>
                </td>
                <td className="px-4 py-2 text-sm" style={{ color: "var(--sidebar-text)" }}>{item.variant}</td>
                <td className="px-4 py-2 text-sm" style={{ color: "var(--sidebar-text)" }}>{item.category}</td>
                <td className="px-4 py-2 text-sm" style={{ color: "var(--sidebar-text)" }}>
                  <div className="flex items-center gap-1"><Building className="icon-xs" />{item.warehouse}</div>
                </td>
                <td className="px-4 py-2 text-sm" style={{ color: "var(--sidebar-text)" }}>
                  <div className="flex items-center gap-1"><MapPin className="icon-xs" />{item.warehouseLocation || "N/A"}</div>
                </td>
                <td className="px-4 py-2 text-right font-medium text-sm" style={{ color: "var(--sidebar-text)" }}>{item.currentStock}</td>
                <td className="px-4 py-2 text-right text-sm" style={{ color: "var(--sidebar-text)" }}>{item.reorderLevel}</td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={`font-medium text-sm ${
                      item.daysOutOfStock > 7 ? "text-[var(--danger-color)]" :
                      item.daysOutOfStock > 3 ? "text-[var(--accent-orange)]" : "text-[var(--warning-color)]"
                    }`}
                  >
                    {item.daysOutOfStock} days
                  </span>
                </td>
                <td className="px-4 py-2 text-sm" style={{ color: "var(--sidebar-text)" }}>{item.supplier}</td>
                <td className="px-4 py-2 text-center">
                  <span
                    className="inline-flex items-center px-xs py-xs rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: item.allowBackorder ? "var(--accent-orange-light)" : "var(--accent-red-light)",
                      color: item.allowBackorder ? "var(--accent-orange)" : "var(--danger-color)",
                    }}
                  >
                    <AlertTriangle className="icon-xs mr-xs" />
                    {item.status}
                    {item.allowBackorder && " (Backorder)"}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm" style={{ color: "var(--sidebar-text)" }}>{formatDate(item.lastUpdated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.count > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={pagination.count}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={[10, 25, 50, 100]}
          showPageSize={true}
        />
      )}
    </div>
  );
};

export default StockTable;