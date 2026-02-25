// src/renderer/pages/inventory/components/ProductTable.tsx
import React from "react";
import { Edit, Eye, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { ProductWithDetails } from "../hooks/useProducts";
import { formatCurrency } from "../../../utils/formatters";

interface ProductTableProps {
  products: ProductWithDetails[];
  selectedProducts: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
  onView: (product: ProductWithDetails) => void;
  onEdit: (product: ProductWithDetails) => void;
  onDelete: (product: ProductWithDetails) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  selectedProducts,
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

  const getStatusBadge = (status: ProductWithDetails["status"]) => {
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

  const getStatusText = (status: ProductWithDetails["status"]) => {
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

  const generateProductImage = (product: ProductWithDetails) => {
    // Assuming product.images?.[0]?.image_url; for now use placeholder
    return product.images?.[0]?.image_url ||
      "https://tse3.mm.bing.net/th/id/OIP.NiCYJo8ykhvqYVYz-x-FZwAAAA?w=300&h=300&rs=1&pid=ImgDetMain&o=7&rm=3";
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
                checked={products.length > 0 && selectedProducts.length === products.length}
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
                <span>Product</span>
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
          {products.map((product) => (
            <tr
              key={product.id}
              className={`hover:bg-[var(--card-secondary-bg)] transition-colors ${
                selectedProducts.includes(product.id) ? "bg-[var(--accent-blue-dark)]" : ""
              }`}
              style={{ borderBottom: "1px solid var(--border-color)" }}
            >
              <td className="px-2 py-2 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => onToggleSelect(product.id)}
                  className="h-3 w-3 rounded border-gray-300"
                  style={{ color: "var(--accent-blue)" }}
                />
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-8 w-8">
                    <img
                      className="h-8 w-8 rounded-md object-cover border"
                      src={generateProductImage(product)}
                      alt={product.name}
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop";
                      }}
                    />
                  </div>
                  <div className="ml-2">
                    <div
                      className="text-sm font-medium line-clamp-1"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {product.name}
                    </div>
                    <div className="text-xs" style={{ color: "var(--primary-color)" }}>
                      ID: {product.id}
                    </div>
                  </div>
                </div>
              </td>
              <td
                className="px-4 py-2 whitespace-nowrap text-sm font-mono"
                style={{ color: "var(--text-secondary)" }}
              >
                {product.sku}
              </td>
              <td
                className="px-4 py-2 whitespace-nowrap text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {product.category?.name || "-"}
              </td>
              <td
                className="px-4 py-2 whitespace-nowrap text-sm"
                style={{ color: "var(--sidebar-text)" }}
              >
                {product.total_quantity}
              </td>
              <td
                className="px-4 py-2 whitespace-nowrap text-sm font-medium"
                style={{ color: "var(--sidebar-text)" }}
              >
                {formatCurrency(product.net_price || 0)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-xs py-xs rounded-full text-xs font-medium ${getStatusBadge(
                    product.status
                  )}`}
                >
                  {getStatusText(product.status)}
                </span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end gap-xs">
                  <button
                    onClick={() => onView(product)}
                    className="transition-colors p-1 rounded"
                    style={{ color: "var(--accent-blue)" }}
                    title="View"
                  >
                    <Eye className="icon-sm" />
                  </button>
                  <button
                    onClick={() => onEdit(product)}
                    className="transition-colors p-1 rounded"
                    style={{ color: "var(--accent-blue)" }}
                    title="Edit"
                  >
                    <Edit className="icon-sm" />
                  </button>
                  <button
                    onClick={() => onDelete(product)}
                    className="transition-colors p-1 rounded"
                    style={{ color: "var(--accent-red)" }}
                    title="Delete"
                  >
                    <Trash2 className="icon-sm" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;