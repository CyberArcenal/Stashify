// src/renderer/pages/purchases/components/PurchaseFormDialog.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import Modal from '../../../components/UI/Modal';
import Button from '../../../components/UI/Button';
import SupplierSelect from '../../../components/Selects/Supplier';
import WarehouseSelect from '../../../components/Selects/Warehouse';
import ProductSelect from '../../../components/Selects/Product';
import ProductVariantSelect from '../../../components/Selects/ProductVariant';
import { dialogs } from '../../../utils/dialogs';
import type { Purchase, PurchaseCreateData, PurchaseUpdateData } from '../../../api/core/purchase';
import purchaseAPI from '../../../api/core/purchase';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';

interface PurchaseFormDialogProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  purchaseId: number | null;
  initialData: Partial<Purchase> | null;
  onClose: () => void;
  onSuccess: () => void;
}

type PurchaseItemForm = {
  productId: number | null;
  productName?: string;
  variantId: number | null;
  variantName?: string;
  quantity: number;
  unit_cost: number;
  total: number;
};

type FormData = {
  purchase_number: string;
  supplierId: number | null;
  supplierName?: string;
  warehouseId: number | null;
  warehouseName?: string;
  notes: string;
  items: PurchaseItemForm[];
  subtotal: number;
  total: number;
};

const PurchaseFormDialog: React.FC<PurchaseFormDialogProps> = ({
  isOpen,
  mode,
  purchaseId,
  initialData,
  onClose,
  onSuccess,
}) => {
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      purchase_number: '',
      supplierId: null,
      warehouseId: null,
      notes: '',
      items: [],
      subtotal: 0,
      total: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const items = watch('items');
  const supplierId = watch('supplierId');
  const warehouseId = watch('warehouseId');

  // Recalculate totals based on current items
  const recalcTotals = useCallback(() => {
    const currentItems = getValues('items');
    const subtotal = currentItems.reduce((sum, item) => sum + (item.total || 0), 0);
    setValue('subtotal', subtotal);
    setValue('total', subtotal);
  }, [getValues, setValue]);

  // Update an item and immediately recalc totals
  const updateItem = (index: number, updates: Partial<PurchaseItemForm>) => {
    const current = items[index];
    const updated = { ...current, ...updates };

    // Ensure numeric values
    const quantity = Number(updated.quantity) || 0;
    const unit_cost = Number(updated.unit_cost) || 0;
    updated.quantity = quantity;
    updated.unit_cost = unit_cost;
    updated.total = quantity * unit_cost;

    setValue(`items.${index}`, updated);
    recalcTotals(); // <- immediate recalculation
  };

  // Add new item
  const addItem = () => {
    append({
      productId: null,
      variantId: null,
      quantity: 1,
      unit_cost: 0,
      total: 0,
    });

    // Use setTimeout to ensure append completes before expanding and recalc
    setTimeout(() => {
      recalcTotals();
      const newLength = getValues('items').length;
      setExpandedItems((prev) => [...prev, newLength - 1]);
    }, 0);
  };

  // Remove item
  const removeItem = (index: number) => {
    remove(index);
    setTimeout(() => {
      recalcTotals();
      setExpandedItems((prev) =>
        prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))
      );
    }, 0);
  };

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const expandAll = () => {
    setExpandedItems(fields.map((_, i) => i));
  };

  const collapseAll = () => {
    setExpandedItems([]);
  };

  // Populate form when editing
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      const formItems: PurchaseItemForm[] = (initialData.items || []).map((item) => ({
        productId: item.product?.id || null,
        productName: item.product?.name,
        variantId: item.variant?.id || null,
        variantName: item.variant?.name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total: item.total,
      }));

      reset({
        purchase_number: initialData.purchase_number || '',
        supplierId: initialData.supplier?.id || null,
        supplierName: initialData.supplier?.name,
        warehouseId: initialData.warehouse?.id || null,
        warehouseName: initialData.warehouse?.name,
        notes: initialData.notes || '',
        items: formItems,
        subtotal: initialData.subtotal || 0,
        total: initialData.total || 0,
      });

      // Recalculate totals after reset to ensure consistency
      setTimeout(() => {
        recalcTotals();
      }, 0);
    } else if (mode === 'add') {
      reset({
        purchase_number: `PO-${Date.now()}`,
        supplierId: null,
        warehouseId: null,
        notes: '',
        items: [],
        subtotal: 0,
        total: 0,
      });
      setExpandedItems([]);
    }
  }, [mode, initialData, reset, recalcTotals]);

  const onSubmit = async (data: FormData) => {
    try {
      if (data.items.length === 0) throw new Error('At least one item is required');
      if (!data.supplierId) throw new Error('Supplier is required');
      if (!data.warehouseId) throw new Error('Warehouse is required');

      const payload = {
        purchase_number: data.purchase_number,
        supplierId: data.supplierId,
        warehouseId: data.warehouseId,
        notes: data.notes || undefined,
        items: data.items.map((item) => ({
          productId: item.productId!,
          variantId: item.variantId || undefined,
          quantity: item.quantity,
          unitCost: item.unit_cost,
        })),
      };

      if (mode === 'add') {
        await purchaseAPI.create(payload as PurchaseCreateData);
        dialogs.success('Purchase order created successfully');
      } else {
        if (!purchaseId) throw new Error('Purchase ID missing');
        await purchaseAPI.update(purchaseId, payload);
        dialogs.success('Purchase order updated successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      dialogs.error(err.message || 'Failed to save purchase order');
    }
  };

  return (
    <Modal isOpen={isOpen} safetyClose={true} onClose={onClose} title={mode === 'add' ? 'Create Purchase Order' : 'Edit Purchase Order'} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
        {/* Scrollable main content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Supplier, Warehouse, Notes */}
            <div className="space-y-4">
              <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md space-y-3">
                <h3 className="text-sm font-medium" style={{ color: 'var(--sidebar-text)' }}>Purchase Information</h3>

                {/* Purchase Number */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sidebar-text)' }}>
                    PO Number *
                  </label>
                  <input
                    {...register('purchase_number', { required: 'PO number is required' })}
                    className="compact-input w-full border rounded-md"
                    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--sidebar-text)' }}
                  />
                  {errors.purchase_number && <p className="text-xs text-red-500 mt-1">{errors.purchase_number.message}</p>}
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sidebar-text)' }}>
                    Supplier *
                  </label>
                  <SupplierSelect
                    value={supplierId}
                    onChange={(id) => setValue('supplierId', id)}
                    placeholder="Select supplier"
                  />
                  {!supplierId && mode === 'add' && <p className="text-xs text-red-500 mt-1">Supplier is required</p>}
                </div>

                {/* Warehouse */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sidebar-text)' }}>
                    Warehouse *
                  </label>
                  <WarehouseSelect
                    value={warehouseId}
                    onChange={(id) => setValue('warehouseId', id)}
                    placeholder="Select warehouse"
                  />
                  {!warehouseId && mode === 'add' && <p className="text-xs text-red-500 mt-1">Warehouse is required</p>}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sidebar-text)' }}>Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="compact-input w-full border rounded-md"
                    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--sidebar-text)' }}
                    placeholder="Enter notes or special instructions"
                  />
                </div>
              </div>

              {/* Order Summary Card */}
              {items.length > 0 && (
                <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                  <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--sidebar-text)' }}>Order Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(watch('subtotal'))}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border-color)' }}>
                      <span className="font-medium">Total:</span>
                      <span className="font-bold text-[var(--accent-green)]">{formatCurrency(watch('total'))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Items */}
            <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="text-sm font-medium" style={{ color: 'var(--sidebar-text)' }}>Items ({items.length})</h3>
                <div className="flex gap-1">
                  {items.length > 1 && (
                    <>
                      <Button type="button" variant="secondary" size="sm" onClick={expandAll} icon={ChevronDown}>
                        <span className="hidden sm:inline">Expand</span>
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={collapseAll} icon={ChevronUp}>
                        <span className="hidden sm:inline">Collapse</span>
                      </Button>
                    </>
                  )}
                  <Button type="button" variant="success" size="sm" onClick={addItem} icon={Plus}>
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Fixed height container for items */}
              <div className="min-h-[200px] max-h-[400px] overflow-y-auto pr-1 space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[var(--text-secondary)]">No items added. Click "Add Item" to start.</div>
                ) : (
                  fields.map((field, index) => {
                    const item = items[index];
                    const isExpanded = expandedItems.includes(index);
                    return (
                      <div key={field.id} className="border rounded-md" style={{ borderColor: 'var(--border-color)' }}>
                        {/* Item Header (always visible) */}
                        <div
                          className="flex items-center justify-between p-2 cursor-pointer hover:bg-[var(--card-hover-bg)]"
                          onClick={() => toggleExpand(index)}
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium" style={{ color: 'var(--sidebar-text)' }}>Item {index + 1}</span>
                            {item.productName && (
                              <span className="truncate max-w-[150px]" style={{ color: 'var(--text-secondary)' }}>
                                {item.productName} {item.variantName && `- ${item.variantName}`}
                              </span>
                            )}
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              x{item.quantity} = {formatCurrency(item.total)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeItem(index); }}
                              className="p-1 rounded-full hover:bg-red-100 text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <button type="button" className="p-1">
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="p-3 border-t space-y-3" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="grid grid-cols-1 gap-2">
                              <div>
                                <label className="block text-xs font-medium mb-1">Product *</label>
                                <ProductSelect
                                  value={item.productId}
                                  onChange={(id, product) => {
                                    updateItem(index, {
                                      productId: id,
                                      productName: product?.name,
                                      variantId: null,
                                      variantName: undefined,
                                      unit_cost: product?.cost_per_item || 0,
                                    });
                                  }}
                                  placeholder="Select product"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Variant (optional)</label>
                                <ProductVariantSelect
                                  value={item.variantId}
                                  onChange={(id, variant) => {
                                    updateItem(index, {
                                      variantId: id,
                                      variantName: variant?.name,
                                      unit_cost: variant?.cost_per_item || item.unit_cost,
                                    });
                                  }}
                                  productId={item.productId || undefined}
                                  placeholder="Select variant"
                                  disabled={!item.productId}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-medium mb-1">Quantity</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                                    className="compact-input w-full border rounded-md"
                                    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--sidebar-text)' }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">Unit Cost</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.unit_cost}
                                    onChange={(e) => updateItem(index, { unit_cost: parseFloat(e.target.value) || 0 })}
                                    className="compact-input w-full border rounded-md"
                                    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--sidebar-text)' }}
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <span className="text-sm font-medium" style={{ color: 'var(--accent-green)' }}>
                                  Line Total: {formatCurrency(item.total)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-color)] shrink-0">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="success" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : mode === 'add' ? 'Create Purchase' : 'Update Purchase'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PurchaseFormDialog;