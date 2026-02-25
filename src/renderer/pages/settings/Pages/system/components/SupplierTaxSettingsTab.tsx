// components/tabs/SupplierTaxSettingsTab.tsx
import React from 'react';
import { UserCheck } from 'lucide-react';

interface SupplierTaxSettings {
  enabled: boolean;
  rate: number;
}

interface SupplierTaxSettingsTabProps {
  settings: SupplierTaxSettings;
  onChange: (field: keyof SupplierTaxSettings, value: any) => void;
}

const SupplierTaxSettingsTab: React.FC<SupplierTaxSettingsTabProps> = ({ settings, onChange }) => {
  return (
    <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
      <h2 className="text-lg font-semibold text-[var(--sidebar-text)] mb-6 flex items-center">
        <UserCheck className="w-5 h-5 mr-2" />
        Supplier Tax Settings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Supplier Tax Rate (%)
            </label>
            <input
              type="number"
              value={settings.rate}
              onChange={(e) => onChange('rate', parseFloat(e.target.value))}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => onChange('enabled', e.target.checked)}
                className="rounded border-[var(--checkbox-border)] text-[var(--checkbox-checked)] focus:ring-[var(--focus-ring-color)]"
              />
              <span className="ml-2 text-sm text-[var(--sidebar-text)]">
                Enable Supplier Tax
              </span>
            </label>
          </div>

          <div className="bg-[var(--accent-blue-light)] p-4 rounded-lg">
            <h4 className="font-medium text-[var(--accent-emerald)] text-sm mb-2">
              Supplier Tax Information
            </h4>
            <p className="text-xs text-[var(--accent-blue)]">
              Supplier tax is applied to purchases from suppliers. This is separate from customer tax rates and can be configured independently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierTaxSettingsTab;