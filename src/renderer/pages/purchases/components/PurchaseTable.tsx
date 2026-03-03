// src/renderer/pages/purchases/components/PurchaseTable.tsx
import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { PurchaseWithDetails } from "../hooks/usePurchases";
import { formatCurrency, formatDate } from "../../../utils/formatters";
import PurchaseActionsDropdown from "./PurchaseActionsDropdown";

interface PurchaseTableProps {
  purchases: PurchaseWithDetails[];
  selectedPurchases: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
  onView: (purchase: PurchaseWithDetails) => void;
  onEdit: (purchase: PurchaseWithDetails) => void;
  onDelete: (purchase: PurchaseWithDetails) => void;
  onUpdateStatus: (id: number, status: string) => void;
}

const PurchaseTable: React.FC<PurchaseTableProps> = ({
  purchases,
  selectedPurchases,
  onToggleSelect,
  onToggleSelectAll,
  onSort,
  sortConfig,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
}) => {
  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="icon-sm" />
    ) : (
      <ChevronDown className="icon-sm" />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; color: string }> = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-700", color: "yellow" },
      confirmed: { bg: "bg-blue-100", text: "text-blue-700", color: "blue" },
      received: { bg: "bg-green-100", text: "text-green-700", color: "green" },
      cancelled: { bg: "bg-red-100", text: "text-red-700", color: "red" },
      partially_received: { bg: "bg-orange-100", text: "text-orange-700", color: "orange" },
    };
    const config = statusMap[status] || statusMap.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  return (
    <div
      className="overflow-x-auto rounded-md border compact-table"
      style={{ borderColor: "var(--border-color)" }}
    >
      <table className="min-w-full" style={{ borderColor: "var(--border-color)" }}>
        <thead style={{ backgroundColor: "var(--card-secondary-bg)" }}>
          <tr>
            <th
              scope="col"
              className="w-10 px-2 py-2 text-left text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              <input
                type="checkbox"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                checked={purchases.length > 0 && selectedPurchases.length === purchases.length}
                onChange={onToggleSelectAll}
                className="h-3 w-3 rounded border-gray-300"
                style={{ color: "var(--accent-blue)" }}
              />
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
              onClick={() => onSort("purchase_number")}
            >
              <div className="flex items-center gap-xs">
                <span>PO #</span>
                {getSortIcon("purchase_number")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
              onClick={() => onSort("supplier_name")}
            >
              <div className="flex items-center gap-xs">
                <span>Supplier</span>
                {getSortIcon("supplier_name")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
              onClick={() => onSort("warehouse_name")}
            >
              <div className="flex items-center gap-xs">
                <span>Warehouse</span>
                {getSortIcon("warehouse_name")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
              onClick={() => onSort("created_at")}
            >
              <div className="flex items-center gap-xs">
                <span>Date</span>
                {getSortIcon("created_at")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
              onClick={() => onSort("total")}
            >
              <div className="flex items-center gap-xs">
                <span>Total</span>
                {getSortIcon("total")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
              onClick={() => onSort("status")}
            >
              <div className="flex items-center gap-xs">
                <span>Status</span>
                {getSortIcon("status")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody style={{ backgroundColor: "var(--card-bg)" }}>
          {purchases.map((purchase) => (
            <tr
              key={purchase.id}
              onClick={(e) =>{e.stopPropagation(); onView(purchase)}}
              className={`hover:bg-[var(--card-secondary-bg)] transition-colors ${
                selectedPurchases.includes(purchase.id) ? "bg-[var(--accent-blue-dark)]" : ""
              }`}
              style={{ borderBottom: "1px solid var(--border-color)" }}
            >
              <td className="px-2 py-2 whitespace-nowrap">
                <input
                  type="checkbox"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  checked={selectedPurchases.includes(purchase.id)}
                  onChange={() => onToggleSelect(purchase.id)}
                  className="h-3 w-3 rounded border-gray-300"
                  style={{ color: "var(--accent-blue)" }}
                />
              </td>
              <td
                className="px-4 py-2 whitespace-nowrap text-sm font-medium"
                style={{ color: "var(--sidebar-text)" }}
              >
                #{purchase.purchase_number}
              </td>
              <td
                className="px-4 py-2 whitespace-nowrap text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {purchase.supplier_name}
              </td>
              <td
                className="px-4 py-2 whitespace-nowrap text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {purchase.warehouse_name}
              </td>
              <td
                className="px-4 py-2 whitespace-nowrap text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {formatDate(purchase.created_at, "MMM dd, yyyy")}
              </td>
              <td
                className="px-4 py-2 whitespace-nowrap text-sm font-medium"
                style={{ color: "var(--sidebar-text)" }}
              >
                {formatCurrency(purchase.total)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                {getStatusBadge(purchase.status)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                <PurchaseActionsDropdown
                  purchase={purchase}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onUpdateStatus={onUpdateStatus}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PurchaseTable;