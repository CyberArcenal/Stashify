// src/renderer/pages/productVariant/components/VariantTaxAssignmentDialog.tsx
import React, { useState, useEffect } from 'react';
import type { useBulkVariantTaxAssignment } from '../../hooks/bulk/useVariantTaxAssignment';
import type { Tax } from '../../../../api/core/tax';
import taxAPI from '../../../../api/core/tax';
import Modal from '../../../../components/UI/Modal';
import Button from '../../../../components/UI/Button';

interface VariantTaxAssignmentDialogProps {
  hook: ReturnType<typeof useBulkVariantTaxAssignment>;
}

const VariantTaxAssignmentDialog: React.FC<VariantTaxAssignmentDialogProps> = ({ hook }) => {
  const { isOpen, loading, selectedVariantIds, close, submit } = hook;
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [selectedTaxIds, setSelectedTaxIds] = useState<number[]>([]);
  const [operation, setOperation] = useState<'replace' | 'add' | 'remove'>('replace');
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTaxes();
    } else {
      setSelectedTaxIds([]);
      setOperation('replace');
    }
  }, [isOpen]);

  const loadTaxes = async () => {
    setFetching(true);
    try {
      const res = await taxAPI.getAll({ is_enabled: true, sortBy: 'name' });
      if (res.status) setTaxes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleToggleTax = (taxId: number) => {
    setSelectedTaxIds(prev =>
      prev.includes(taxId) ? prev.filter(id => id !== taxId) : [...prev, taxId]
    );
  };

  const handleSubmit = async () => {
    if (selectedTaxIds.length === 0) return;
    await submit(selectedTaxIds, operation);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={close} title="Assign Taxes to Variants" size="md">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Assigning taxes to {selectedVariantIds.length} selected variant(s).
        </p>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sidebar-text)' }}>
            Operation
          </label>
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value as any)}
            className="compact-input w-full border rounded px-3 py-2"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--sidebar-text)',
            }}
          >
            <option value="replace">Replace (set exactly these taxes)</option>
            <option value="add">Add (append selected taxes)</option>
            <option value="remove">Remove (remove selected taxes)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sidebar-text)' }}>
            Select Taxes
          </label>
          {fetching ? (
            <div className="flex justify-center py-4">Loading taxes...</div>
          ) : (
            <div
              className="max-h-60 overflow-y-auto border rounded p-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {taxes.map(tax => (
                <label key={tax.id} className="flex items-center gap-2 py-1 hover:bg-[var(--card-secondary-bg)]">
                  <input
                    type="checkbox"
                    checked={selectedTaxIds.includes(tax.id)}
                    onChange={() => handleToggleTax(tax.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm" style={{ color: 'var(--sidebar-text)' }}>
                    {tax.name} ({tax.type === 'percentage' ? `${tax.rate}%` : `₱${tax.rate}`})
                  </span>
                </label>
              ))}
              {taxes.length === 0 && (
                <p className="text-center py-2 text-sm text-[var(--text-secondary)]">No taxes available.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSubmit}
            disabled={selectedTaxIds.length === 0 || loading || fetching}
          >
            {loading ? 'Applying...' : 'Apply'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VariantTaxAssignmentDialog;