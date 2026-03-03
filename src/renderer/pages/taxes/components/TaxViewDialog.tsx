// src/renderer/pages/taxes/components/TaxViewDialog.tsx
import React from 'react';
import Modal from '../../../components/UI/Modal';
import { formatDate } from '../../../utils/formatters';
import { useTaxView } from '../hooks/useTaxView';

interface TaxViewDialogProps {
  hook: ReturnType<typeof useTaxView>;
}

const TaxViewDialog: React.FC<TaxViewDialogProps> = ({ hook }) => {
  const { isOpen, loading, tax, close } = hook;

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={close} title="Tax Details" size="md">
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]"></div>
        </div>
      ) : tax ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)]">Name</h4>
              <p className="text-base text-[var(--sidebar-text)]">{tax.name}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)]">Code</h4>
              <p className="text-base text-[var(--sidebar-text)] font-mono">{tax.code}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)]">Rate</h4>
              <p className="text-base text-[var(--sidebar-text)]">
                {tax.type === 'percentage' ? `${tax.rate}%` : `₱${tax.rate}`}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)]">Type</h4>
              <p className="text-base text-[var(--sidebar-text)] capitalize">{tax.type}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)]">Status</h4>
              <p className="text-base">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    tax.is_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {tax.is_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)]">Default</h4>
              <p className="text-base">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    tax.is_default ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {tax.is_default ? 'Yes' : 'No'}
                </span>
              </p>
            </div>
          </div>

          {tax.description && (
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)]">Description</h4>
              <p className="text-sm text-[var(--sidebar-text)] whitespace-pre-line">{tax.description}</p>
            </div>
          )}

          <div className="border-t border-[var(--border-color)] pt-4 grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)]">Created At</h4>
              <p className="text-sm text-[var(--sidebar-text)]">{formatDate(tax.created_at)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)]">Updated At</h4>
              <p className="text-sm text-[var(--sidebar-text)]">{formatDate(tax.updated_at)}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center py-4 text-[var(--text-secondary)]">Tax not found.</p>
      )}
    </Modal>
  );
};

export default TaxViewDialog;