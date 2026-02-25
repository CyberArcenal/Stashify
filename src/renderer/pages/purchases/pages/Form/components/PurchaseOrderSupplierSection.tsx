// components/PurchaseOrderForm/PurchaseOrderSupplierSection.tsx
import React from "react";
import { Truck, Warehouse, Info, AlertCircle } from "lucide-react";
import { PurchaseOrderFormData } from "./Form";


interface PurchaseOrderSupplierSectionProps {
    formData: PurchaseOrderFormData;
    errors: any;
    suppliers: any[];
    warehouses: any[];
    supplierTax: any;
    onFormDataChange: (data: PurchaseOrderFormData) => void;
}

const PurchaseOrderSupplierSection: React.FC<PurchaseOrderSupplierSectionProps> = ({
    formData,
    errors,
    suppliers,
    warehouses,
    supplierTax,
    onFormDataChange,
}) => {
    const handleInputChange = (field: keyof PurchaseOrderFormData, value: any) => {
        onFormDataChange({
            ...formData,
            [field]: value,
        });
    };

    const hasError = (field: keyof PurchaseOrderFormData): boolean => {
        return !!errors[field];
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-[var(--sidebar-text)] border-b border-[var(--border-color)] pb-1">
                Order Information
            </h3>

            {/* Supplier Selection */}
            <div>
                <label htmlFor="supplier" className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                    Supplier *
                </label>
                <div className="relative">
                    <Truck className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] w-3 h-3" />
                    <select
                        id="supplier"
                        value={formData.supplier}
                        onChange={(e) => handleInputChange('supplier', parseInt(e.target.value))}
                        className={`w-full pl-7 pr-2 py-2 text-sm border rounded-md bg-[var(--input-bg)] text-[var(--input-text)] ${hasError('supplier')
                            ? 'border-[var(--danger-color)] focus:border-[var(--danger-color)] focus:ring-[var(--danger-color)]'
                            : 'border-[var(--input-border)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]'
                            }`}
                    >
                        <option value={0}>Select a supplier</option>
                        {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                                {supplier.name}
                            </option>
                        ))}
                    </select>
                </div>
                {hasError('supplier') && (
                    <p className="mt-1 text-xs text-[var(--danger-color)] flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {errors.supplier}
                    </p>
                )}
            </div>

            {/* Warehouse Selection */}
            <div>
                <label htmlFor="warehouseId" className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                    Warehouse *
                </label>
                <div className="relative">
                    <Warehouse className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] w-3 h-3" />
                    <select
                        id="warehouseId"
                        value={formData.warehouseId}
                        onChange={(e) => handleInputChange('warehouseId', parseInt(e.target.value))}
                        className={`w-full pl-7 pr-2 py-2 text-sm border rounded-md bg-[var(--input-bg)] text-[var(--input-text)] ${hasError('warehouseId')
                            ? 'border-[var(--danger-color)] focus:border-[var(--danger-color)] focus:ring-[var(--danger-color)]'
                            : 'border-[var(--input-border)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]'
                            }`}
                    >
                        <option value={0}>Select a warehouse</option>
                        {warehouses.map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                            </option>
                        ))}
                    </select>
                </div>
                {hasError('warehouseId') && (
                    <p className="mt-1 text-xs text-[var(--danger-color)] flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {errors.warehouseId}
                    </p>
                )}
            </div>

            {/* Tax Information */}
            <div className={`p-3 rounded-md text-xs ${supplierTax?.enabled
                ? 'bg-[var(--accent-blue-light)]'
                : 'bg-[var(--card-secondary-bg)]'
                }`}>
                <div className="flex items-center mb-1">
                    <Info className={`w-3 h-3 mr-1 ${supplierTax?.enabled
                        ? 'text-[var(--accent-blue)]'
                        : 'text-[var(--text-tertiary)]'
                        }`} />
                    <span className={`font-medium ${supplierTax?.enabled
                        ? 'text-[var(--accent-emerald)]'
                        : 'text-[var(--sidebar-text)]'
                        }`}>
                        Tax Information
                    </span>
                </div>
                <p className={`${supplierTax?.enabled
                    ? 'text-[var(--accent-blue)]'
                    : 'text-[var(--sidebar-text)]'
                    }`}>
                    {supplierTax?.enabled
                        ? `Supplier tax is ENABLED (${supplierTax.rate}% rate applied automatically)`
                        : 'Supplier tax is DISABLED (No tax will be applied to this purchase)'
                    }
                </p>
            </div>

            {/* Notes */}
            <div>
                <label htmlFor="notes" className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                    Notes
                </label>
                <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={2}
                    className="w-full p-2 text-sm border border-[var(--input-border)] rounded-md bg-[var(--input-bg)] text-[var(--input-text)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                    placeholder="Additional notes or instructions..."
                />
            </div>
        </div>
    );
};

export default PurchaseOrderSupplierSection;