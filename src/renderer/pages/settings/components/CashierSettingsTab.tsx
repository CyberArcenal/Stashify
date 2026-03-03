// src/renderer/pages/settings/components/CashierSettingsTab.tsx
import React, { useState } from "react";
import { Wallet } from "lucide-react";
import type { CashierSettings } from "../../../api/core/system_config";

const PRINTER_TYPES = ["thermal", "dot-matrix", "laser"];
const CONNECTION_TYPES = ["printer", "usb", "serial", "network"];

interface CashierSettingsTabProps {
  settings: CashierSettings;
  onSave: (data: Partial<CashierSettings>) => Promise<void>;
}

const CashierSettingsTab: React.FC<CashierSettingsTabProps> = ({
  settings,
  onSave,
}) => {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof CashierSettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-6"
    >
      <h2 className="text-lg font-semibold text-[var(--sidebar-text)] mb-6 flex items-center">
        <Wallet className="w-5 h-5 mr-2" />
        Cashier Settings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Cash Drawer Open Code
            </label>
            <input
              type="text"
              value={form?.drawer_open_code || ""}
              onChange={(e) => handleChange("drawer_open_code", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              placeholder="e.g., ESC/POS command"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Receipt Printer Type
            </label>
            <select
              value={form?.receipt_printer_type || "thermal"}
              onChange={(e) =>
                handleChange("receipt_printer_type", e.target.value)
              }
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
            >
              {PRINTER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Cash Drawer Connection
            </label>
            <select
              value={form?.cash_drawer_connection || ""}
              onChange={(e) =>
                handleChange("cash_drawer_connection", e.target.value)
              }
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
            >
              <option value="">None</option>
              {CONNECTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Cash Drawer Device Path
            </label>
            <input
              type="text"
              value={form?.cash_drawer_device_path || ""}
              onChange={(e) =>
                handleChange("cash_drawer_device_path", e.target.value)
              }
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              placeholder="/dev/ttyUSB0"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.enable_cash_drawer || false}
              onChange={(e) =>
                handleChange("enable_cash_drawer", e.target.checked)
              }
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">
              Enable Cash Drawer
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.enable_receipt_printing || false}
              onChange={(e) =>
                handleChange("enable_receipt_printing", e.target.checked)
              }
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">
              Enable Receipt Printing
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.enable_barcode_scanning || false}
              onChange={(e) =>
                handleChange("enable_barcode_scanning", e.target.checked)
              }
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">
              Enable Barcode Scanning
            </span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Cashier Settings"}
        </button>
      </div>
    </form>
  );
};

export default CashierSettingsTab;
