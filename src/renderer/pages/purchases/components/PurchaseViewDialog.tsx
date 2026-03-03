// src/renderer/pages/purchases/components/PurchaseViewDialog.tsx
import React, { useState } from 'react';
import Modal from '../../../components/UI/Modal';
import Button from '../../../components/UI/Button';
import {
  Package, Truck, User, Calendar, DollarSign, FileText, Edit, Warehouse,
  ChevronRight, X
} from 'lucide-react';
import type { Purchase } from '../../../api/core/purchase';
import type { PurchaseItem } from '../../../api/core/purchaseItem'; // ensure this type includes new fields
import { formatCurrency, formatDate } from '../../../utils/formatters';

interface PurchaseViewDialogProps {
  isOpen: boolean;
  purchase: Purchase | null;
  loading: boolean;
  onClose: () => void;
  onEdit?: (id: number) => void;
}

// Extend the PurchaseItem type locally if needed – but ideally the API already returns new fields
// Assume the backend returns line_tax_total and line_gross_total

const PurchaseViewDialog: React.FC<PurchaseViewDialogProps> = ({
  isOpen,
  purchase,
  loading,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'items'>('overview');

  if (!purchase && !loading) return null;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      initiated: { bg: 'bg-gray-100', text: 'text-gray-700' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-700' },
      received: { bg: 'bg-green-100', text: 'text-green-700' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
      refunded: { bg: 'bg-purple-100', text: 'text-purple-700' }, // added refunded
    };
    const config = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Get first 3 items for preview
  const previewItems = purchase?.items?.slice(0, 3) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Purchase Details" size="xl">
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]"></div>
        </div>
      ) : purchase ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[var(--card-secondary-bg)] rounded-md flex items-center justify-center">
                <Package className="w-6 h-6 text-[var(--text-tertiary)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--sidebar-text)]">
                  Purchase #{purchase.purchase_number}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {purchase.supplier?.name || 'Unknown Supplier'} • {formatDate(purchase.created_at, 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {getStatusBadge(purchase.status)}
              {onEdit && (
                <Button variant="secondary" size="sm" onClick={() => onEdit(purchase.id)}>
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-[var(--border-color)]">
            <nav className="flex gap-4">
              {(['overview', 'items'] as const).map(tab => (
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
                  {tab === 'items' && purchase.items && (
                    <span className="ml-2 text-xs bg-[var(--accent-blue)] text-white rounded-full px-1.5 py-0.5">
                      {purchase.items.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="mt-4">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column: Purchase info */}
                <div className="space-y-4">
                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <Package className="w-4 h-4 mr-1" /> Purchase Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-[var(--text-secondary)]">PO #:</span> {purchase.purchase_number}</div>
                      <div><span className="text-[var(--text-secondary)]">Status:</span> {purchase.status}</div>
                      <div><span className="text-[var(--text-secondary)]">Created:</span> {formatDate(purchase.created_at)}</div>
                      <div><span className="text-[var(--text-secondary)]">Updated:</span> {formatDate(purchase.updated_at)}</div>
                      <div><span className="text-[var(--text-secondary)]">Received:</span> {purchase.is_received ? 'Yes' : 'No'}</div>
                      {purchase.received_at && (
                        <div><span className="text-[var(--text-secondary)]">Received at:</span> {formatDate(purchase.received_at)}</div>
                      )}
                      {purchase.proceed_by && (
                        <div><span className="text-[var(--text-secondary)]">Processed by:</span> User #{purchase.proceed_by}</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <User className="w-4 h-4 mr-1" /> Supplier Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-[var(--text-secondary)]">Name:</span> {purchase.supplier?.name || 'N/A'}</div>
                      <div><span className="text-[var(--text-secondary)]">Contact Person:</span> {purchase.supplier?.contact_person || 'N/A'}</div>
                      <div><span className="text-[var(--text-secondary)]">Email:</span> {purchase.supplier?.email || 'N/A'}</div>
                      <div><span className="text-[var(--text-secondary)]">Phone:</span> {purchase.supplier?.phone || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <Warehouse className="w-4 h-4 mr-1" /> Warehouse
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-[var(--text-secondary)]">Name:</span> {purchase.warehouse?.name || 'N/A'}</div>
                      <div><span className="text-[var(--text-secondary)]">Location:</span> {purchase.warehouse?.location || 'N/A'}</div>
                    </div>
                  </div>

                  {purchase.notes && (
                    <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                      <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                        <FileText className="w-4 h-4 mr-1" /> Notes
                      </h4>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">{purchase.notes}</p>
                    </div>
                  )}
                </div>

                {/* Right column: Financial summary and items preview */}
                <div className="space-y-4">
                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <DollarSign className="w-4 h-4 mr-1" /> Financial Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Subtotal (net):</span>
                        <span className="font-medium text-[var(--sidebar-text)]">{formatCurrency(purchase.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Tax Amount:</span>
                        <span className="font-medium text-[var(--sidebar-text)]">{formatCurrency(purchase.tax_amount)}</span>
                      </div>
                      <div className="border-t border-[var(--border-color)] my-1 pt-1 flex justify-between font-semibold">
                        <span className="text-[var(--sidebar-text)]">Total (gross):</span>
                        <span className="text-[var(--accent-green)]">{formatCurrency(purchase.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Items Preview */}
                  {purchase.items && purchase.items.length > 0 && (
                    <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium flex items-center text-[var(--sidebar-text)]">
                          <Package className="w-4 h-4 mr-1" /> Items ({purchase.items.length})
                        </h4>
                        {purchase.items.length > 3 && (
                          <button
                            onClick={() => setActiveTab('items')}
                            className="text-xs text-[var(--accent-blue)] hover:underline flex items-center"
                          >
                            View All <ChevronRight className="w-3 h-3 ml-1" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {previewItems.map(item => (
                          <div key={item.id} className="flex justify-between items-center text-sm border-b border-[var(--border-color)] pb-1 last:border-0">
                            <div className="flex-1">
                              <div className="font-medium text-[var(--sidebar-text)]">{item.product?.name || 'Product'}</div>
                              <div className="text-xs text-[var(--text-secondary)]">
                                SKU: {item.product?.sku || 'N/A'} • Qty: {item.quantity}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-[var(--sidebar-text)]">{formatCurrency(item.total)}</div>
                              <div className="text-xs text-[var(--text-secondary)]">{formatCurrency(item.unit_cost)} each</div>
                            </div>
                          </div>
                        ))}
                        {purchase.items.length > 3 && (
                          <div className="text-center pt-1">
                            <span className="text-xs text-[var(--text-secondary)]">
                              +{purchase.items.length - 3} more items
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'items' && (
              <div>
                <h4 className="font-medium mb-2 text-[var(--sidebar-text)]">Purchase Items</h4>
                {!purchase.items || purchase.items.length === 0 ? (
                  <p className="text-center py-4 text-[var(--text-secondary)]">No items found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border-color)]">
                      <thead className="bg-[var(--card-secondary-bg)]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">SKU</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Unit Cost</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Net Total</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Tax</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Gross Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                        {purchase.items.map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{item.product?.name || 'N/A'}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{item.product?.sku || '-'}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{formatCurrency(item.unit_cost)}</td>
                            <td className="px-4 py-2 text-sm font-medium text-[var(--sidebar-text)]">{formatCurrency(item.total)}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{formatCurrency(item.line_tax_total || 0)}</td>
                            <td className="px-4 py-2 text-sm font-medium text-[var(--accent-green)]">{formatCurrency(item.line_gross_total || item.total)}</td>
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
        <p className="text-center py-4 text-[var(--text-secondary)]">Purchase not found.</p>
      )}
    </Modal>
  );
};

export default PurchaseViewDialog;