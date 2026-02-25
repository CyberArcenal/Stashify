// components/tabs/TaxSettingsTab.tsx
import React from "react";
import { BarChart } from "lucide-react";
import { TaxSettings } from "@/renderer/api/systemSettings";

interface TaxSettingsTabProps {
  settings: TaxSettings;
  onChange: (field: keyof TaxSettings, value: any) => void;
}

const TaxSettingsTab: React.FC<TaxSettingsTabProps> = ({
  settings,
  onChange,
}) => {
  return (
    <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
      <h2 className="text-lg font-semibold text-[var(--sidebar-text)] mb-6 flex items-center">
        <BarChart className="w-5 h-5 mr-2" />
        Tax Settings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Standard Tax Rate (%)
            </label>
            <input
              type="number"
              value={settings.tax_rate}
              onChange={(e) => onChange("tax_rate", parseFloat(e.target.value))}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              VAT Rate (%)
            </label>
            <input
              type="number"
              value={settings.vat_rate}
              onChange={(e) => onChange("vat_rate", parseFloat(e.target.value))}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div className="hidden">
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Import Duty Rate (%)
            </label>
            <input
              type="number"
              value={settings.import_duty_rate}
              onChange={(e) =>
                onChange("import_duty_rate", parseFloat(e.target.value))
              }
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
                onChange={(e) => onChange("enabled", e.target.checked)}
                className="rounded border-[var(--checkbox-border)] text-[var(--checkbox-checked)] focus:ring-[var(--focus-ring-color)]"
              />
              <span className="ml-2 text-sm text-[var(--sidebar-text)]">
                Enable Tax System
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.prices_include_tax}
                onChange={(e) =>
                  onChange("prices_include_tax", e.target.checked)
                }
                className="rounded border-[var(--checkbox-border)] text-[var(--checkbox-checked)] focus:ring-[var(--focus-ring-color)]"
              />
              <span className="ml-2 text-sm text-[var(--sidebar-text)]">
                Prices Include Tax
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.round_tax_at_subtotal}
                onChange={(e) =>
                  onChange("round_tax_at_subtotal", e.target.checked)
                }
                className="rounded border-[var(--checkbox-border)] text-[var(--checkbox-checked)] focus:ring-[var(--focus-ring-color)]"
              />
              <span className="ml-2 text-sm text-[var(--sidebar-text)]">
                Round Tax at Subtotal
              </span>
            </label>
          </div>

          <div className="hidden">
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Tax Calculation Method
            </label>
            <select
              value={settings.tax_calculation}
              onChange={(e) =>
                onChange(
                  "tax_calculation",
                  e.target.value as "exclusive" | "inclusive",
                )
              }
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
            >
              <option value="exclusive">Exclusive</option>
              <option value="inclusive">Inclusive</option>
            </select>
          </div>

          <div className="hidden">
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Display Prices
            </label>
            <select
              value={settings.display_prices}
              onChange={(e) =>
                onChange(
                  "display_prices",
                  e.target.value as "excl_tax" | "incl_tax",
                )
              }
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
            >
              <option value="excl_tax">Excluding Tax</option>
              <option value="incl_tax">Including Tax</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxSettingsTab;
