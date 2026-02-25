// src/components/Inventory/WarehouseSettings/WarehouseSettingsPage.tsx
import { useState, useEffect, useCallback } from "react";
import {
  showError,
  showSuccess,
  showInfo,
  showApiError,
} from "@/renderer/utils/notification";
import { showConfirm } from "@/renderer/utils/dialogs";
import { formatNumber } from "@/renderer/utils/number";

// Lucide React Icons
import {
  Save,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  Warehouse,
  Settings,
  CheckCircle,
  XCircle,
  Package,
  ArrowUp,
  ArrowDown,
  Circle,
  Building,
  BarChart3,
  Layers,
  Shield,
  TestTube,
} from "lucide-react";
import {
  inventorySettingsAPI,
  TestDeductionRequest,
  TestDeductionResult,
  WarehouseChoiceData,
  WarehouseSettings,
} from "@/renderer/api/warehouseSettings";
import { Spinner } from "@/renderer/components/UI/LoadingIndicator";

const DEDUCTION_STRATEGIES = [
  {
    value: "highest_first",
    label: "Highest Stock First",
    icon: <ArrowUp className="w-4 h-4" />,
  },
  {
    value: "lowest_first",
    label: "Lowest Stock First",
    icon: <ArrowDown className="w-4 h-4" />,
  },
  {
    value: "single_warehouse",
    label: "Single Warehouse Only",
    icon: <Circle className="w-4 h-4" />,
  },
  {
    value: "round_robin",
    label: "Round Robin",
    icon: <RefreshCw className="w-4 h-4" />,
  },
];

const LIMIT_BEHAVIORS = [
  { value: "stop_at_limit", label: "Stop at Limit - Throw Error" },
  { value: "continue_other_warehouses", label: "Continue to Other Warehouses" },
  { value: "partial_delivery", label: "Allow Partial Delivery" },
];

export default function WarehouseSettingsPage() {
  const [settings, setSettings] = useState<WarehouseSettings | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseChoiceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states with proper typing
  const [formData, setFormData] = useState<Partial<WarehouseSettings>>({});
  const [newLimit, setNewLimit] = useState<{
    warehouse: number;
    stock_limit: number;
    priority: number;
  }>({
    warehouse: 0,
    stock_limit: 0,
    priority: 1,
  });
  const [testData, setTestData] = useState<TestDeductionRequest>({
    product_id: 0,
    quantity: 10,
  });
  const [testResult, setTestResult] = useState<TestDeductionResult | null>(
    null,
  );

  // Fetch settings and warehouses
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch settings using the API class
      const [settingsData, warehousesData] = await Promise.all([
        inventorySettingsAPI.getSystemWarehouseSettings(),
        inventorySettingsAPI.getWarehouseChoices(),
      ]);

      setSettings(settingsData);
      setFormData(settingsData);
      setWarehouses(warehousesData);
    } catch (err: any) {
      // console.log(err)
      const errorMsg = err.message || "Failed to fetch data";
      setError(errorMsg);
      showApiError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle form changes with type safety
  const handleFormChange = (field: keyof WarehouseSettings, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle new limit changes with type safety
  const handleLimitChange = (field: keyof typeof newLimit, value: any) => {
    setNewLimit((prev) => ({
      ...prev,
      [field]:
        field === "warehouse" || field === "stock_limit" || field === "priority"
          ? Number(value)
          : value,
    }));
  };

  // Save settings - FIXED: Refresh data after saving
  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);

      // Validate single warehouse strategy
      if (
        formData.deduction_strategy === "single_warehouse" &&
        !formData.default_warehouse
      ) {
        showError(
          "Default warehouse is required for single warehouse strategy",
        );
        setSaving(false);
        return;
      }

      // Use the API class to update settings
      await inventorySettingsAPI.updateSystemWarehouseSettings(formData);

      showSuccess("Settings saved successfully");

      // Refresh the data to get updated warehouse limits and statistics
      await fetchData();
    } catch (err: any) {
      const errorMsg = err.message || "Failed to save settings";
      showApiError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Add warehouse limit - FIXED: Use fetchData instead of manual refresh
  const handleAddLimit = async () => {
    if (!newLimit.warehouse || newLimit.warehouse === 0) {
      showError("Please select a warehouse");
      return;
    }

    if (!settings) return;

    try {
      await inventorySettingsAPI.addWarehouseLimit(settings.id, newLimit);

      showSuccess("Warehouse limit added successfully");
      setNewLimit({ warehouse: 0, stock_limit: 0, priority: 1 });

      // Refresh all data to get updated limits and statistics
      await fetchData();
    } catch (err: any) {
      const errorMsg = err.message || "Failed to add warehouse limit";
      showApiError(errorMsg);
    }
  };

  // Remove warehouse limit - FIXED: Use fetchData instead of manual refresh
  const handleRemoveLimit = async (warehouseId: number) => {
    if (!settings) return;

    const confirmed = await showConfirm({
      title: "Remove Warehouse Limit",
      message: "Are you sure you want to remove this warehouse limit?",
      icon: "warning",
      confirmText: "Remove",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await inventorySettingsAPI.removeWarehouseLimit(settings.id, warehouseId);

      showSuccess("Warehouse limit removed successfully");
      // Refresh all data to get updated limits and statistics
      await fetchData();
    } catch (err: any) {
      const errorMsg = err.message || "Failed to remove warehouse limit";
      showApiError(errorMsg);
    }
  };

  // Test deduction strategy
  const handleTestDeduction = async () => {
    if (!settings || !testData.product_id || testData.quantity <= 0) {
      showError("Please provide valid product ID and quantity");
      return;
    }

    try {
      setTesting(true);
      const result = await inventorySettingsAPI.testDeductionStrategy(
        settings.id,
        testData,
      );

      setTestResult(result);
      showInfo("Deduction test completed");
    } catch (err: any) {
      const errorMsg = err.message || "Failed to test deduction strategy";
      showApiError(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  // Handle test data changes
  const handleTestDataChange = (
    field: keyof TestDeductionRequest,
    value: number,
  ) => {
    setTestData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Clear default warehouse - FIXED: Use fetchData instead of manual refresh
  const handleClearDefaultWarehouse = async () => {
    if (!settings) return;

    const confirmed = await showConfirm({
      title: "Clear Default Warehouse",
      message:
        "Are you sure you want to clear the default warehouse? This will affect the single warehouse strategy.",
      icon: "warning",
      confirmText: "Clear",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await inventorySettingsAPI.clearDefaultWarehouse();
      showSuccess("Default warehouse cleared successfully");
      // Refresh all data
      await fetchData();
    } catch (err: any) {
      const errorMsg = err.message || "Failed to clear default warehouse";
      showApiError(errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-[var(--card-bg)] rounded-lg shadow-md p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
            <p className="mt-4 text-[var(--sidebar-text)]">
              Loading warehouse settings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-[var(--accent-red-light)] p-6 rounded-lg border border-[var(--accent-red)]">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-[var(--danger-color)]" />
            <h3 className="text-lg font-semibold text-[var(--danger-color)]">
              Failed to Load Data
            </h3>
          </div>
          <p className="text-[var(--danger-color)] mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-5 py-2.5 bg-[var(--danger-color)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--danger-hover)] transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  // console.log(settings)

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-[var(--card-bg)] rounded-lg shadow-md overflow-hidden border border-[var(--border-color)]">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--primary-color)] rounded-lg">
              <Warehouse className="w-8 h-8 text-[var(--sidebar-text)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--sidebar-text)]">
                Warehouse Settings
              </h1>
              <p className="mt-1 text-[var(--sidebar-text)]">
                Configure how stock is managed, deducted, and allocated across
                your warehouse network
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-[var(--sidebar-text)] hover:text-[var(--sidebar-text)] rounded-md hover:bg-[var(--card-secondary-bg)] transition-all duration-200"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--card-bg)] rounded-lg shadow-md p-4 border-l-4 border-[var(--primary-color)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--sidebar-text)]">
                  Total Warehouses
                </p>
                <p className="text-xl font-bold text-[var(--sidebar-text)] mt-1">
                  {settings.total_warehouses}
                </p>
              </div>
              <Building className="w-6 h-6 text-[var(--primary-color)]" />
            </div>
          </div>

          <div className="bg-[var(--card-bg)] rounded-lg shadow-md p-4 border-l-4 border-[var(--success-color)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--sidebar-text)]">
                  Active Warehouses
                </p>
                <p className="text-xl font-bold text-[var(--sidebar-text)] mt-1">
                  {settings.active_warehouses}
                </p>
              </div>
              <CheckCircle className="w-6 h-6 text-[var(--success-color)]" />
            </div>
          </div>

          <div className="bg-[var(--card-bg)] rounded-lg shadow-md p-4 border-l-4 border-[var(--accent-purple)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--sidebar-text)]">
                  Warehouse Limits
                </p>
                <p className="text-xl font-bold text-[var(--sidebar-text)] mt-1">
                  {settings.warehouse_limits?.length || 0}
                </p>
              </div>
              <Shield className="w-6 h-6 text-[var(--accent-purple)]" />
            </div>
          </div>

          <div className="bg-[var(--card-bg)] rounded-lg shadow-md p-4 border-l-4 border-[var(--warning-color)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--sidebar-text)]">
                  Default Warehouse
                </p>
                <p className="text-lg font-bold text-[var(--sidebar-text)] mt-1">
                  {settings.default_warehouse ? "Configured" : "Not Set"}
                </p>
              </div>
              <Settings className="w-6 h-6 text-[var(--warning-color)]" />
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="bg-[var(--card-bg)] rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--card-secondary-bg)]">
          <h3 className="text-lg font-semibold text-[var(--sidebar-text)] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--primary-color)]" />
            General Settings
          </h3>
          <p className="mt-1 text-sm text-[var(--sidebar-text)]">
            Configure the core behavior of your warehouse management system
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deduction Strategy */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--sidebar-text)]">
                Deduction Strategy
              </label>
              <div className="space-y-2">
                {DEDUCTION_STRATEGIES.map((strategy) => (
                  <label
                    key={strategy.value}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                      formData.deduction_strategy === strategy.value
                        ? "border-[var(--primary-color)] bg-[var(--accent-blue-dark)]"
                        : "border-[var(--border-color)] hover:border-[var(--border-light)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deduction_strategy"
                      value={strategy.value}
                      checked={formData.deduction_strategy === strategy.value}
                      onChange={(e) =>
                        handleFormChange("deduction_strategy", e.target.value)
                      }
                      className="text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                    />
                    <div className="ml-3 flex items-center gap-2">
                      <span className="text-[var(--primary-color)]">
                        {strategy.icon}
                      </span>
                      <span className="text-sm text-[var(--sidebar-text)]">
                        {strategy.label}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                Determines how stock is deducted from multiple warehouses
              </p>
            </div>

            {/* Settings Column */}
            <div className="space-y-4">
              {/* Default Warehouse */}
              <div>
                <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-2">
                  Default Warehouse
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.default_warehouse || ""}
                    onChange={(e) =>
                      handleFormChange(
                        "default_warehouse",
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                    className="flex-1 rounded-md border-[var(--border-color)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] bg-[var(--input-bg)] text-[var(--sidebar-text)] p-2"
                  >
                    <option value="">Select Default Warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} - {warehouse.location}
                      </option>
                    ))}
                  </select>
                  {formData.default_warehouse && (
                    <button
                      onClick={handleClearDefaultWarehouse}
                      className="px-3 py-2 bg-[var(--default-color)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--text-tertiary)] transition-colors flex items-center gap-1"
                      title="Clear default warehouse"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {formData.default_warehouse_name && (
                  <p className="mt-1 text-xs text-[var(--success-color)]">
                    Currently: {formData.default_warehouse_name} -{" "}
                    {formData.default_warehouse_location}
                  </p>
                )}
              </div>

              {/* Checkbox Settings */}
              <div className="space-y-3">
                <label className="flex items-center p-2 bg-[var(--card-secondary-bg)] rounded-md">
                  <input
                    type="checkbox"
                    id="enable_limits"
                    checked={formData.enable_warehouse_limits || false}
                    onChange={(e) =>
                      handleFormChange(
                        "enable_warehouse_limits",
                        e.target.checked,
                      )
                    }
                    className="rounded border-[var(--checkbox-border)] text-[var(--checkbox-checked)] focus:ring-[var(--focus-ring-color)]"
                  />
                  <span className="ml-2 text-sm text-[var(--sidebar-text)]">
                    Enable Warehouse Limits
                  </span>
                </label>

                <label className="flex items-center p-2 bg-[var(--card-secondary-bg)] rounded-md">
                  <input
                    type="checkbox"
                    id="allow_negative"
                    checked={formData.allow_negative_stock || false}
                    onChange={(e) =>
                      handleFormChange("allow_negative_stock", e.target.checked)
                    }
                    className="rounded border-[var(--checkbox-border)] text-[var(--checkbox-checked)] focus:ring-[var(--focus-ring-color)]"
                  />
                  <span className="ml-2 text-sm text-[var(--sidebar-text)]">
                    Allow Negative Stock
                  </span>
                </label>

                <label className="flex items-center p-2 bg-[var(--card-secondary-bg)] rounded-md">
                  <input
                    type="checkbox"
                    id="auto_reorder"
                    checked={formData.auto_reorder_enabled || false}
                    onChange={(e) =>
                      handleFormChange("auto_reorder_enabled", e.target.checked)
                    }
                    className="rounded border-[var(--checkbox-border)] text-[var(--checkbox-checked)] focus:ring-[var(--focus-ring-color)]"
                  />
                  <span className="ml-2 text-sm text-[var(--sidebar-text)]">
                    Auto Reorder Enabled
                  </span>
                </label>
              </div>

              {/* Numeric Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                    Default Warehouse Limit
                  </label>
                  <input
                    type="number"
                    value={formData.default_warehouse_limit || 0}
                    onChange={(e) =>
                      handleFormChange(
                        "default_warehouse_limit",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full rounded-md border-[var(--border-color)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] bg-[var(--input-bg)] text-[var(--sidebar-text)] p-2"
                    min="0"
                  />
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    0 means no limit
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                    Reorder Threshold
                  </label>
                  <input
                    type="number"
                    value={formData.reorder_threshold || 0}
                    onChange={(e) =>
                      handleFormChange(
                        "reorder_threshold",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full rounded-md border-[var(--border-color)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] bg-[var(--input-bg)] text-[var(--sidebar-text)] p-2"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Validation Warning */}
          {formData.deduction_strategy === "single_warehouse" &&
            !formData.default_warehouse && (
              <div className="bg-[var(--accent-orange-light)] border border-[var(--warning-color)] rounded-md p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[var(--warning-color)]" />
                  <div>
                    <span className="text-[var(--warning-color)] font-medium text-sm">
                      Configuration Required
                    </span>
                    <p className="text-[var(--warning-color)] text-xs">
                      Single Warehouse strategy requires a default warehouse to
                      be selected.
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
            <button
              onClick={handleSaveSettings}
              disabled={
                saving ||
                (formData.deduction_strategy === "single_warehouse" &&
                  !formData.default_warehouse)
              }
              className="px-6 py-2 bg-[var(--primary-color)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
            >
              {saving ? (
                <Spinner size="sm" color="primary" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving Changes..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* Warehouse Limits Management */}
      {settings && (
        <div className="bg-[var(--card-bg)] rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--card-secondary-bg)]">
            <h3 className="text-lg font-semibold text-[var(--sidebar-text)] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[var(--primary-color)]" />
              Warehouse Limits
            </h3>
            <p className="mt-1 text-sm text-[var(--sidebar-text)]">
              Set maximum stock deduction limits and priorities per warehouse
            </p>
          </div>

          <div className="p-6">
            {/* Add New Limit Form */}
            <div className="bg-[var(--card-secondary-bg)] p-4 rounded-md border border-[var(--border-color)] mb-6">
              <h4 className="text-md font-medium text-[var(--sidebar-text)] mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--primary-color)]" />
                Add New Warehouse Limit
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                    Warehouse
                  </label>
                  <select
                    value={newLimit.warehouse || 0}
                    onChange={(e) =>
                      handleLimitChange("warehouse", parseInt(e.target.value))
                    }
                    className="w-full rounded-md border-[var(--border-color)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] bg-[var(--input-bg)] text-[var(--sidebar-text)] p-2"
                  >
                    <option value={0}>Select Warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} - {warehouse.location}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                    Stock Limit
                  </label>
                  <input
                    type="number"
                    value={newLimit.stock_limit || 0}
                    onChange={(e) =>
                      handleLimitChange(
                        "stock_limit",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full rounded-md border-[var(--border-color)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] bg-[var(--input-bg)] text-[var(--sidebar-text)] p-2"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={newLimit.priority || 1}
                    onChange={(e) =>
                      handleLimitChange(
                        "priority",
                        parseInt(e.target.value) || 1,
                      )
                    }
                    className="w-full rounded-md border-[var(--border-color)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] bg-[var(--input-bg)] text-[var(--sidebar-text)] p-2"
                    min="1"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleAddLimit}
                    disabled={!newLimit.warehouse || newLimit.warehouse === 0}
                    className="w-full px-3 py-2 bg-[var(--primary-color)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Limit
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Limits Table */}
            {settings.warehouse_limits &&
            settings.warehouse_limits.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-[var(--border-color)]">
                <table className="min-w-full divide-y divide-[var(--border-color)]">
                  <thead className="bg-[var(--card-secondary-bg)]">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider">
                        Warehouse
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider">
                        Stock Limit
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                    {settings.warehouse_limits.map((limit) => (
                      <tr
                        key={limit.id}
                        className="hover:bg-[var(--card-secondary-bg)] transition-colors"
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                        }}
                      >
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-[var(--accent-emerald-light)] rounded-md flex items-center justify-center">
                              <Warehouse className="w-4 h-4 text-[var(--primary-color)]" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-[var(--sidebar-text)] flex items-center gap-1">
                                {limit.warehouse_name}
                                {settings.default_warehouse ===
                                  limit.warehouse && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-emerald-light)] text-[var(--success-color)]">
                                    Default
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--sidebar-text)]">
                                {limit.warehouse_location}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-[var(--sidebar-text)]">
                            {formatNumber(limit.stock_limit)}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-[var(--sidebar-text)]">
                            {limit.priority}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleRemoveLimit(limit.warehouse)}
                            className="text-[var(--danger-color)] hover:text-[var(--danger-hover)] transition-colors p-1 rounded hover:bg-[var(--danger-hover-light)]"
                            title="Remove limit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-[var(--card-secondary-bg)] rounded-full flex items-center justify-center mb-3">
                  <Layers className="w-8 h-8 text-[var(--text-tertiary)]" />
                </div>
                <h3 className="text-base font-medium text-[var(--sidebar-text)] mb-1">
                  No warehouse limits
                </h3>
                <p className="text-[var(--sidebar-text)] text-sm">
                  Add warehouse limits to control how much stock can be deducted
                  from each warehouse.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Deduction Strategy */}
      {settings && (
        <div className="bg-[var(--card-bg)] rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--card-secondary-bg)]">
            <h3 className="text-lg font-semibold text-[var(--sidebar-text)] flex items-center gap-2">
              <TestTube className="w-5 h-5 text-[var(--primary-color)]" />
              Test Deduction Strategy
            </h3>
            <p className="mt-1 text-sm text-[var(--sidebar-text)]">
              Simulate how stock would be deducted with your current settings
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                  Product ID
                </label>
                <input
                  type="number"
                  value={testData.product_id || ""}
                  onChange={(e) =>
                    handleTestDataChange(
                      "product_id",
                      parseInt(e.target.value) || 0,
                    )
                  }
                  className="w-full rounded-md border-[var(--border-color)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] bg-[var(--input-bg)] text-[var(--sidebar-text)] p-2"
                  placeholder="Enter product ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                  Quantity to Deduct
                </label>
                <input
                  type="number"
                  value={testData.quantity}
                  onChange={(e) =>
                    handleTestDataChange(
                      "quantity",
                      parseInt(e.target.value) || 0,
                    )
                  }
                  className="w-full rounded-md border-[var(--border-color)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] bg-[var(--input-bg)] text-[var(--sidebar-text)] p-2"
                  min="1"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleTestDeduction}
                  disabled={
                    testing || !testData.product_id || testData.product_id === 0
                  }
                  className="w-full px-3 py-2 bg-[var(--warning-color)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--accent-orange-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1"
                >
                  {testing ? (
                    <Spinner size="sm" color="primary" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  {testing ? "Testing..." : "Test Strategy"}
                </button>
              </div>
            </div>

            {/* Test Results */}
            {testResult && (
              <div className="bg-[var(--card-secondary-bg)] p-4 rounded-md border border-[var(--border-color)]">
                <h4 className="text-md font-medium text-[var(--sidebar-text)] mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[var(--primary-color)]" />
                  Test Results
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="bg-[var(--card-bg)] p-3 rounded-md border border-[var(--border-color)]">
                    <span className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Product
                    </span>
                    <span className="font-medium text-[var(--sidebar-text)]">
                      {testResult.product}
                    </span>
                  </div>
                  <div className="bg-[var(--card-bg)] p-3 rounded-md border border-[var(--border-color)]">
                    <span className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Strategy
                    </span>
                    <span className="font-medium text-[var(--sidebar-text)]">
                      {testResult.strategy}
                    </span>
                  </div>
                  <div className="bg-[var(--card-bg)] p-3 rounded-md border border-[var(--border-color)]">
                    <span className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Default Warehouse
                    </span>
                    <span className="font-medium text-[var(--sidebar-text)]">
                      {testResult.default_warehouse || "Not Set"}
                    </span>
                  </div>
                  <div className="bg-[var(--card-bg)] p-3 rounded-md border border-[var(--border-color)]">
                    <span className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Requested Quantity
                    </span>
                    <span className="font-medium text-[var(--sidebar-text)]">
                      {formatNumber(testResult.requested_quantity)}
                    </span>
                  </div>
                  <div className="bg-[var(--card-bg)] p-3 rounded-md border border-[var(--border-color)]">
                    <span className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Total Available
                    </span>
                    <span className="font-medium text-[var(--sidebar-text)]">
                      {formatNumber(testResult.total_available)}
                    </span>
                  </div>
                </div>

                {/* Result Status */}
                <div
                  className={`p-3 rounded-md mb-4 ${
                    testResult.can_fulfill
                      ? "bg-[var(--status-success-bg)] border border-[var(--success-color)]"
                      : "bg-[var(--accent-red-light)] border border-[var(--danger-color)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.can_fulfill ? (
                      <CheckCircle className="w-4 h-4 text-[var(--success-color)]" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[var(--danger-color)]" />
                    )}
                    <span className="font-medium text-[var(--sidebar-text)]">
                      {testResult.can_fulfill
                        ? "Order can be fulfilled"
                        : "Insufficient stock"}
                    </span>
                  </div>
                  {!testResult.can_fulfill && (
                    <p className="mt-1 text-sm text-[var(--sidebar-text)]">
                      Additional {formatNumber(testResult.remaining_required)}{" "}
                      units needed to fulfill the order
                    </p>
                  )}
                </div>

                {/* Warehouses Used */}
                {testResult.warehouses_used.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-[var(--sidebar-text)] mb-2">
                      Warehouses That Would Be Used:
                    </h5>
                    <div className="space-y-2">
                      {testResult.warehouses_used.map((usage, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-[var(--card-bg)] rounded-md border border-[var(--border-color)]"
                        >
                          <div className="flex items-center gap-2">
                            <Warehouse className="w-3 h-3 text-[var(--text-tertiary)]" />
                            <span className="text-sm font-medium text-[var(--sidebar-text)]">
                              {usage.warehouse}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="block text-xs font-medium text-[var(--sidebar-text)]">
                                Deducted
                              </span>
                              <span className="text-sm font-medium text-[var(--sidebar-text)]">
                                {formatNumber(usage.quantity_deducted)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="block text-xs font-medium text-[var(--sidebar-text)]">
                                Remaining
                              </span>
                              <span className="text-sm font-medium text-[var(--sidebar-text)]">
                                {formatNumber(usage.remaining_after)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
