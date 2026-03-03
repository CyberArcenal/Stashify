// src/renderer/pages/products/components/VariantViewDialog.tsx
import React, { useState, useEffect } from 'react';
import Modal from '../../../components/UI/Modal';
import Button from '../../../components/UI/Button';
import {
  Package, Layers, DollarSign, BarChart3, Warehouse, Truck, ShoppingCart,
  Edit, AlertTriangle, X, Percent
} from 'lucide-react';
import type { ProductVariant } from '../../../api/core/productVariant';
import type { StockItem } from '../../../api/core/stockItem';
import type { StockMovement } from '../../../api/core/stockMovement';
import { formatCurrency, formatDate } from '../../../utils/formatters';

interface VariantViewDialogProps {
  isOpen: boolean;
  variant: ProductVariant | null;
  stockItems: StockItem[];
  movements: StockMovement[];
  loading: boolean;
  loadingMovements?: boolean;
  onClose: () => void;
  onEdit?: (id: number) => void;
  onFetchMovements?: () => void; // To trigger lazy loading
}

const VariantViewDialog: React.FC<VariantViewDialogProps> = ({
  isOpen,
  variant,
  stockItems,
  movements,
  loading,
  loadingMovements = false,
  onClose,
  onEdit,
  onFetchMovements,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'movements'>('overview');

  // Trigger fetch movements when tab becomes active
  useEffect(() => {
    if (activeTab === 'movements' && onFetchMovements) {
      onFetchMovements();
    }
  }, [activeTab, onFetchMovements]);

  if (!variant) return null;

  // Compute total stock
  const totalStock = stockItems?.reduce((sum, item) => sum + item.quantity, 0);
  const reorderLevel = stockItems?.[0]?.reorder_level || 0;

  const getStockStatus = () => {
    if (totalStock === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    } else if (totalStock <= reorderLevel) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
    } else {
      return { label: 'In Stock', color: 'bg-green-100 text-green-800', icon: Package };
    }
  };
  const stockStatus = getStockStatus();
  const StatusIcon = stockStatus.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Variant Details" size="xl">
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]"></div>
        </div>
      ) : variant ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[var(--card-secondary-bg)] rounded-md flex items-center justify-center">
                <Layers className="w-6 h-6 text-[var(--text-tertiary)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--sidebar-text)]">{variant.name}</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  SKU: {variant.sku} | Barcode: {variant.barcode || 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="secondary" size="sm" onClick={() => onEdit(variant.id)}>
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-[var(--border-color)]">
            <nav className="flex gap-4">
              {(['overview', 'stock', 'movements'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--sidebar-text)]'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="mt-4">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column: Basic info and pricing */}
                <div className="space-y-4">
                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <Package className="w-4 h-4 mr-1" /> Basic Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-[var(--text-secondary)]">Name:</span> {variant.name}</div>
                      <div><span className="text-[var(--text-secondary)]">SKU:</span> {variant.sku}</div>
                      <div><span className="text-[var(--text-secondary)]">Barcode:</span> {variant.barcode || 'N/A'}</div>
                      <div>
                        <span className="text-[var(--text-secondary)]">Status:</span>{' '}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${stockStatus.color}`}>
                          <StatusIcon className="w-3 h-3 inline mr-1" />
                          {stockStatus.label}
                        </span>
                      </div>
                      <div><span className="text-[var(--text-secondary)]">Active:</span> {variant.is_active ? 'Yes' : 'No'}</div>
                      <div><span className="text-[var(--text-secondary)]">Created:</span> {formatDate(variant.created_at)}</div>
                      <div><span className="text-[var(--text-secondary)]">Updated:</span> {formatDate(variant.updated_at)}</div>
                    </div>
                  </div>

                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <DollarSign className="w-4 h-4 mr-1" /> Pricing
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-[var(--text-secondary)]">Gross Price:</span> {formatCurrency(variant.gross_price || 0)}</div>
                      <div><span className="text-[var(--text-secondary)]">Net Price:</span> {formatCurrency(variant.net_price || 0)}</div>
                      <div><span className="text-[var(--text-secondary)]">Cost per item:</span> {formatCurrency(variant.cost_per_item || 0)}</div>
                    </div>
                  </div>

                  {/* Tax Information */}
                  {variant.taxes && variant.taxes.length > 0 && (
                    <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                      <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                        <Percent className="w-4 h-4 mr-1" /> Taxes (Selling)
                      </h4>
                      <div className="space-y-1 text-sm">
                        {variant.taxes.map(tax => (
                          <div key={tax.id} className="flex justify-between">
                            <span className="text-[var(--text-secondary)]">{tax.name} ({tax.code})</span>
                            <span className="text-[var(--sidebar-text)]">
                              {tax.rate}% {tax.type === 'percentage' ? '' : `(${tax.type})`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column: Stock summary and parent product */}
                <div className="space-y-4">
                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <BarChart3 className="w-4 h-4 mr-1" /> Stock Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Total Stock:</span>
                        <span className="font-medium text-[var(--sidebar-text)]">{totalStock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Reorder Level:</span>
                        <span className="font-medium text-[var(--sidebar-text)]">{reorderLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Warehouses:</span>
                        <span className="font-medium text-[var(--sidebar-text)]">{stockItems?.length}</span>
                      </div>
                    </div>
                  </div>

                  {variant.product && (
                    <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                      <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                        <Package className="w-4 h-4 mr-1" /> Parent Product
                      </h4>
                      <div className="text-sm">
                        <div><span className="text-[var(--text-secondary)]">Name:</span> {variant.product.name}</div>
                        <div><span className="text-[var(--text-secondary)]">SKU:</span> {variant.product.sku}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'stock' && (
              <div>
                <h4 className="font-medium mb-2 text-[var(--sidebar-text)]">Stock by Warehouse</h4>
                {stockItems?.length === 0 ? (
                  <p className="text-center py-4 text-[var(--text-secondary)]">No stock items found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border-color)]">
                      <thead className="bg-[var(--card-secondary-bg)]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Warehouse</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Reorder Level</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Low Stock Threshold</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                        {stockItems?.map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{item.warehouse?.name || 'N/A'}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{item.reorder_level}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{item.low_stock_threshold || '-'}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{formatDate(item.updated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'movements' && (
              <div>
                <h4 className="font-medium mb-2 text-[var(--sidebar-text)]">Stock Movements</h4>
                {loadingMovements ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-blue)]"></div>
                  </div>
                ) : movements?.length === 0 ? (
                  <p className="text-center py-4 text-[var(--text-secondary)]">No stock movements found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border-color)]">
                      <thead className="bg-[var(--card-secondary-bg)]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Change</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Reference</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Reason</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                        {movements?.map(m => (
                          <tr key={m.id}>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)] capitalize">{m.movement_type}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">
                              <span className={m.change > 0 ? 'text-green-600' : 'text-red-600'}>
                                {m.change > 0 ? '+' : ''}{m.change}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{m.reference_code || '-'}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{m.reason || '-'}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{formatDate(m.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center py-4 text-[var(--text-secondary)]">Variant not found.</p>
      )}
    </Modal>
  );
};

export default VariantViewDialog;