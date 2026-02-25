import React from "react";
import { Edit, Eye, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { VariantWithDetails } from "../hooks/useVariants";
import { formatCurrency } from "../../../utils/formatters";

interface VariantTableProps {
  variants: VariantWithDetails[];
  selectedVariants: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
  onView: (variant: VariantWithDetails) => void;
  onEdit: (variant: VariantWithDetails) => void;
  onDelete: (variant: VariantWithDetails) => void;
}

const VariantTable: React.FC<VariantTableProps> = ({
  variants,
  selectedVariants,
  onToggleSelect,
  onToggleSelectAll,
  onSort,
  sortConfig,
  onView,
  onEdit,
  onDelete,
}) => {
  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="icon-sm" />
    ) : (
      <ChevronDown className="icon-sm" />
    );
  };

  const getStatusBadge = (status: "in-stock" | "low-stock" | "out-of-stock") => {
    switch (status) {
      case "in-stock":
        return "bg-[var(--accent-green-dark)] text-[var(--accent-green)]";
      case "low-stock":
        return "bg-[var(--accent-orange-dark)] text-[var(--accent-orange)]";
      case "out-of-stock":
        return "bg-[var(--accent-red-dark)] text-[var(--accent-red)]";
      default:
        return "bg-[var(--card-secondary-bg)] text-[var(--text-tertiary)]";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in-stock":
        return "In Stock";
      case "low-stock":
        return "Low Stock";
      case "out-of-stock":
        return "Out of Stock";
      default:
        return status;
    }
  };

  const computeStockStatus = (totalQuantity: number): "in-stock" | "low-stock" | "out-of-stock" => {
    if (totalQuantity === 0) return "out-of-stock";
    if (totalQuantity <= 5) return "low-stock";
    return "in-stock";
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
                checked={variants.length > 0 && selectedVariants.length === variants.length}
                onChange={onToggleSelectAll}
                className="h-3 w-3 rounded border-gray-300"
                style={{ color: "var(--accent-blue)" }}
              />
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
              onClick={() => onSort("name")}
            >
              <div className="flex items-center gap-xs">
                <span>Variant</span>
                {getSortIcon("name")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
              onClick={() => onSort("sku")}
            >
              <div className="flex items-center gap-xs">
                <span>SKU</span>
                {getSortIcon("sku")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
              onClick={() => onSort("product_name")}
            >
              <div className="flex items-center gap-xs">
                <span>Product</span>
                {getSortIcon("product_name")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
              onClick={() => onSort("category_name")}
            >
              <div className="flex items-center gap-xs">
                <span>Category</span>
                {getSortIcon("category_name")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
              onClick={() => onSort("total_quantity")}
            >
              <div className="flex items-center gap-xs">
                <span>Quantity</span>
                {getSortIcon("total_quantity")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
              onClick={() => onSort("net_price")}
            >
              <div className="flex items-center gap-xs">
                <span>Price</span>
                {getSortIcon("net_price")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Status
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
          {variants.map((variant) => {
            const stockStatus = computeStockStatus(variant.total_quantity);
            return (
              <tr
                key={variant.id}
                className={`hover:bg-[var(--card-secondary-bg)] transition-colors ${
                  selectedVariants.includes(variant.id) ? "bg-[var(--accent-blue-dark)]" : ""
                }`}
                style={{ borderBottom: "1px solid var(--border-color)" }}
              >
                <td className="px-2 py-2 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedVariants.includes(variant.id)}
                    onChange={() => onToggleSelect(variant.id)}
                    className="h-3 w-3 rounded border-gray-300"
                    style={{ color: "var(--accent-blue)" }}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-2">
                      <div
                        className="text-sm font-medium line-clamp-1"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {variant.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--primary-color)" }}>
                        ID: {variant.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td
                  className="px-4 py-2 whitespace-nowrap text-sm font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {variant.sku || "-"}
                </td>
                <td
                  className="px-4 py-2 whitespace-nowrap text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {variant.product_name || "-"}
                </td>
                <td
                  className="px-4 py-2 whitespace-nowrap text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {variant.category_name || "-"}
                </td>
                <td
                  className="px-4 py-2 whitespace-nowrap text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {variant.total_quantity}
                </td>
                <td
                  className="px-4 py-2 whitespace-nowrap text-sm font-medium"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {formatCurrency(variant.net_price || 0)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-xs py-xs rounded-full text-xs font-medium ${getStatusBadge(
                      stockStatus
                    )}`}
                  >
                    {getStatusText(stockStatus)}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-xs">
                    <button
                      onClick={() => onView(variant)}
                      className="transition-colors p-1 rounded"
                      style={{ color: "var(--accent-blue)" }}
                      title="View"
                    >
                      <Eye className="icon-sm" />
                    </button>
                    <button
                      onClick={() => onEdit(variant)}
                      className="transition-colors p-1 rounded"
                      style={{ color: "var(--accent-blue)" }}
                      title="Edit"
                    >
                      <Edit className="icon-sm" />
                    </button>
                    <button
                      onClick={() => onDelete(variant)}
                      className="transition-colors p-1 rounded"
                      style={{ color: "var(--accent-red)" }}
                      title="Delete"
                    >
                      <Trash2 className="icon-sm" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VariantTable;