// src/renderer/pages/inventory/components/ProductViewDialog.tsx
import React from "react";
import { X, Package, TrendingUp, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/formatters";
import type { StockMovement } from "../../../api/core/stockMovement";
import type { Product } from "../../../api/core/product";

interface ProductViewDialogProps {
  product: Product | null;
  movements: StockMovement[];
  salesStats: { totalSold: number; revenue: number; avgPrice: number } | null;
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const ProductViewDialog: React.FC<ProductViewDialogProps> = ({
  product,
  movements,
  salesStats,
  loading,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className="w-full max-w-3xl rounded-lg shadow-xl"
        style={{ backgroundColor: "var(--card-bg)" }}
      >
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <h3 className="text-lg font-semibold" style={{ color: "var(--sidebar-text)" }}>
            Product Details
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: "var(--accent-blue)" }}
              ></div>
            </div>
          ) : !product ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" style={{ color: "var(--accent-red)" }} />
              <p style={{ color: "var(--text-secondary)" }}>Product not found</p>
            </div>
          ) : (
            <>
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Name</p>
                  <p className="font-medium" style={{ color: "var(--sidebar-text)" }}>{product.name}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>SKU</p>
                  <p className="font-mono" style={{ color: "var(--sidebar-text)" }}>{product.sku}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Category</p>
                  <p style={{ color: "var(--sidebar-text)" }}>{product.category?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Price</p>
                  <p style={{ color: "var(--primary-color)" }}>{formatCurrency(product.net_price || 0)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Status</p>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      product.is_published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {product.is_published ? "Published" : "Unpublished"}
                  </span>
                </div>
              </div>

              {/* Stats */}
              {salesStats && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="compact-stats p-3 rounded-md border" style={{ borderColor: "var(--border-color)" }}>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" style={{ color: "var(--accent-blue)" }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Total Sold</span>
                    </div>
                    <p className="text-xl font-semibold" style={{ color: "var(--sidebar-text)" }}>
                      {salesStats.totalSold}
                    </p>
                  </div>
                  <div className="compact-stats p-3 rounded-md border" style={{ borderColor: "var(--border-color)" }}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" style={{ color: "var(--accent-green)" }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Revenue</span>
                    </div>
                    <p className="text-xl font-semibold" style={{ color: "var(--sidebar-text)" }}>
                      {formatCurrency(salesStats.revenue)}
                    </p>
                  </div>
                  <div className="compact-stats p-3 rounded-md border" style={{ borderColor: "var(--border-color)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Avg Price</span>
                    </div>
                    <p className="text-xl font-semibold" style={{ color: "var(--sidebar-text)" }}>
                      {formatCurrency(salesStats.avgPrice)}
                    </p>
                  </div>
                </div>
              )}

              {/* Stock Movements */}
              <div>
                <h4 className="text-sm font-medium mb-2" style={{ color: "var(--sidebar-text)" }}>
                  Recent Stock Movements
                </h4>
                {movements.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No movements found.</p>
                ) : (
                  <div className="border rounded-md" style={{ borderColor: "var(--border-color)" }}>
                    <table className="min-w-full text-sm">
                      <thead style={{ backgroundColor: "var(--card-secondary-bg)" }}>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs">Date</th>
                          <th className="px-3 py-2 text-left text-xs">Type</th>
                          <th className="px-3 py-2 text-left text-xs">Change</th>
                          <th className="px-3 py-2 text-left text-xs">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movements.map((m) => (
                          <tr key={m.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td className="px-3 py-2">{formatDate(m.created_at)}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  m.movement_type === "in"
                                    ? "bg-green-100 text-green-800"
                                    : m.movement_type === "out"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {m.movement_type}
                              </span>
                            </td>
                            <td className="px-3 py-2">{m.change > 0 ? `+${m.change}` : m.change}</td>
                            <td className="px-3 py-2">{m.reason || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductViewDialog;