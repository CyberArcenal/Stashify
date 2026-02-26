// src/renderer/pages/inventory-report/components/StockDetailsTab.tsx
import React from "react";
import { AlertTriangle, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../../../../utils/formatters";

interface StockDetailsTabProps {
  lowStockProducts: Array<{
    name: string;
    stock: number;
    reorderLevel: number;
    category: string;
    currentValue: number;
    productId: number;
    variantId?: number;
  }>;
  stockByCategory: Array<{ name: string; value: number; stockValue: number; color: string }>;
  summary: any;
}

const StockDetailsTab: React.FC<StockDetailsTabProps> = ({ lowStockProducts, stockByCategory, summary }) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Low Stock Table */}
      <div
        className="compact-card rounded-lg hover:shadow-md"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <div className="p-4">
          <h3 className="font-semibold mb-4 text-sm flex items-center gap-1.5" style={{ color: "var(--sidebar-text)" }}>
            <AlertTriangle className="icon-sm" />
            Low Stock Products
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <th className="text-left p-3 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Product</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Category</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Current Stock</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Reorder Level</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Stock Value</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Status</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: "var(--sidebar-text)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product, index) => (
                  <tr
                    key={index}
                    className="hover:bg-[var(--card-secondary-bg)] transition-colors"
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <td className="p-3 font-medium text-sm" style={{ color: "var(--sidebar-text)" }}>
                      {product.name}
                      {product.variantId && <div className="text-xs text-gray-500">Variant ID: {product.variantId}</div>}
                    </td>
                    <td className="p-3 text-right text-sm" style={{ color: "var(--sidebar-text)" }}>{product.category}</td>
                    <td className="p-3 text-right font-medium text-sm" style={{ color: "var(--accent-orange)" }}>{product.stock}</td>
                    <td className="p-3 text-right text-sm" style={{ color: "var(--sidebar-text)" }}>{product.reorderLevel}</td>
                    <td className="p-3 text-right font-medium text-sm" style={{ color: "var(--accent-purple)" }}>
                      {formatCurrency(product.currentValue)}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: product.stock <= product.reorderLevel * 0.5 ? "var(--accent-red-light)" : "var(--accent-orange-light)",
                          color: product.stock <= product.reorderLevel * 0.5 ? "var(--accent-red)" : "var(--accent-orange)",
                        }}
                      >
                        {product.stock <= product.reorderLevel * 0.5 ? "Critical" : "Low"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => navigate(`/products/${product.productId}`)}
                        className="text-xs px-2 py-1 rounded-md hover:underline"
                        style={{ color: "var(--primary-color)", backgroundColor: "var(--card-secondary-bg)" }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Category Details */}
      <div
        className="compact-card rounded-lg hover:shadow-md"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <div className="p-4">
          <h3 className="font-semibold mb-4 text-sm flex items-center gap-1.5" style={{ color: "var(--sidebar-text)" }}>
            <Package className="icon-sm" />
            Category Stock Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stockByCategory.map((category, index) => (
              <div
                key={index}
                className="p-3 rounded-md hover:bg-[var(--card-hover-bg)]"
                style={{ border: "1px solid var(--border-color)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }}></div>
                    <span className="font-medium text-sm" style={{ color: "var(--sidebar-text)" }}>{category.name}</span>
                  </div>
                  <div className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: category.color + "20", color: category.color }}>
                    {((category.value / summary.totalStock) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-lg font-bold mb-1" style={{ color: category.color }}>{category.value} items</div>
                <div className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Value: {formatCurrency(category.stockValue)}</div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-secondary)" }}>Average per item:</span>
                  <span className="font-medium" style={{ color: "var(--sidebar-text)" }}>
                    {formatCurrency(category.stockValue / category.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default StockDetailsTab;