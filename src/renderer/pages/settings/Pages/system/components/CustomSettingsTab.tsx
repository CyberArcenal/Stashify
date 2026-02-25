// components/tabs/CustomSettingsTab.tsx
import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Package,
  Shield,
  Palette,
  RefreshCw,
} from "lucide-react";
import { SystemHealth } from "@/renderer/api/systemSettings";
import { useTheme } from "@/renderer/app/theme-provider";

interface CustomSettings {
  inventory: {
    reorderLevel: number;
    requireReason: boolean;
    allowNegative: boolean;
    lowStockThreshold: number;
  };
  system: {
    theme: string;
    language: string;
  };
}

interface CustomSettingsTabProps {
  settings: CustomSettings;
  systemHealth: SystemHealth | null;
  onChange: <T extends keyof CustomSettings>(
    category: T,
    field: keyof CustomSettings[T],
    value: any,
  ) => void;
  onClearCache: () => void;
  onClearWebCache: () => void;
  onResetDefaults: () => void;
  loading: boolean;
}

const CustomSettingsTab: React.FC<CustomSettingsTabProps> = ({
  settings,
  systemHealth,
  onChange,
  onClearCache,
  onClearWebCache,
  onResetDefaults,
  loading,
}) => {
  const {
    theme,
    setTheme,
    availableThemes,
    loading: themesLoading,
    error: themeError,
  } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const languages = [
    { value: "en", label: "English" },
    { value: "tl", label: "Filipino" },
    { value: "es", label: "Spanish" },
  ];

  // Handle theme change
  const handleThemeChange = async (themeName: string) => {
    await setTheme(themeName);
    onChange("system", "theme", themeName);
  };

  const refreshThemes = async () => {
    setRefreshing(true);
    // You might want to add a refresh method to your themeAPI or reload the page
    window.location.reload();
  };

  return (
    <div
      className="compact-card rounded-xl border"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      <h2
        className="text-lg font-semibold mb-4 flex items-center"
        style={{ color: "var(--sidebar-text)" }}
      >
        <SettingsIcon className="w-5 h-5 mr-2" />
        Custom Settings
      </h2>

      {themeError && (
        <div
          className="mb-4 p-3 rounded-md text-sm hidden"
          style={{
            backgroundColor: "var(--accent-red-light)",
            color: "var(--accent-red)",
          }}
        >
          Error loading themes: {themeError}
        </div>
      )}

      <div className="space-y-6">
        {/* Theme Settings Section */}
        <div
          className="border-b pb-4 hidden"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-md font-medium flex items-center"
              style={{ color: "var(--sidebar-text)" }}
            >
              <Palette className="w-4 h-4 mr-2" />
              Theme Settings
            </h3>
            <button
              onClick={refreshThemes}
              disabled={themesLoading || refreshing}
              className="compact-button flex items-center rounded-md transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--accent-blue)", color: "white" }}
            >
              <RefreshCw
                className={`w-3 h-3 mr-1 ${themesLoading || refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {themesLoading ? (
            <div
              className="text-center py-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Loading themes from server...
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Select Theme
                </label>
                <select
                  value={theme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  disabled={themesLoading}
                  className="compact-input w-full border rounded-md"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    borderColor: "var(--border-color)",
                    color: "var(--sidebar-text)",
                  }}
                >
                  {availableThemes.map((themeData) => (
                    <option key={themeData.id} value={themeData.name}>
                      {themeData.name} {themeData.is_active ? "(Active)" : ""}
                    </option>
                  ))}
                </select>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Themes loaded from server
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableThemes.map((themeData) => (
                  <div
                    key={themeData.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      theme === themeData.name
                        ? "ring-2 ring-blue-500"
                        : "hover:border-blue-300"
                    }`}
                    style={{
                      backgroundColor: "var(--card-secondary-bg)",
                      borderColor:
                        theme === themeData.name
                          ? "#3b82f6"
                          : "var(--border-color)",
                    }}
                    onClick={() => handleThemeChange(themeData.name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="font-medium text-sm"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {themeData.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {themeData.is_active && (
                          <span
                            className="text-xs px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: "var(--accent-green-dark)",
                              color: "var(--accent-green)",
                            }}
                          >
                            Active
                          </span>
                        )}
                        {theme === themeData.name && (
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                    </div>
                    <p
                      className="text-xs mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {themeData.description}
                    </p>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      ID: {themeData.id}
                    </div>
                  </div>
                ))}
              </div>

              {availableThemes.length === 0 && (
                <div
                  className="text-center py-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No themes available from server
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inventory Settings */}
        <div
          className="border-b pb-4"
          style={{ borderColor: "var(--border-color)" }}
        >
          <h3
            className="text-md font-medium mb-3 flex items-center"
            style={{ color: "var(--sidebar-text)" }}
          >
            <Package className="w-4 h-4 mr-2" />
            Inventory Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="hidden">
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Default Reorder Level
              </label>
              <input
                type="number"
                value={settings.inventory.reorderLevel}
                onChange={(e) =>
                  onChange(
                    "inventory",
                    "reorderLevel",
                    parseInt(e.target.value),
                  )
                }
                className="compact-input w-full border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
                min="0"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Low Stock Threshold
              </label>
              <input
                type="number"
                value={settings.inventory.lowStockThreshold}
                onChange={(e) =>
                  onChange(
                    "inventory",
                    "lowStockThreshold",
                    parseInt(e.target.value),
                  )
                }
                className="compact-input w-full border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
                min="0"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.inventory.requireReason}
                  onChange={(e) =>
                    onChange("inventory", "requireReason", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span
                  className="ml-2 text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Require reason for stock adjustments
                </span>
              </label>

              <label className="flex items-center hidden">
                <input
                  type="checkbox"
                  checked={settings.inventory.allowNegative}
                  onChange={(e) =>
                    onChange("inventory", "allowNegative", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span
                  className="ml-2 text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Allow negative stock levels
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div>
          <h3
            className="text-md font-medium mb-3 flex items-center"
            style={{ color: "var(--sidebar-text)" }}
          >
            <Shield className="w-4 h-4 mr-2" />
            System Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="hidden">
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Language
              </label>
              <select
                value={settings.system.language}
                onChange={(e) => onChange("system", "language", e.target.value)}
                className="compact-input w-full border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div
                className="compact-card rounded-md border"
                style={{
                  backgroundColor: "var(--card-secondary-bg)",
                  borderColor: "var(--border-color)",
                }}
              >
                <h4
                  className="font-medium text-sm mb-2"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  System Health
                </h4>
                <div className="text-sm space-y-1">
                  <div
                    className={`flex justify-between ${systemHealth?.overall ? "text-green-400" : "text-red-400"}`}
                  >
                    <span>Overall Status:</span>
                    <span>{systemHealth?.overall ? "Healthy" : "Issues"}</span>
                  </div>
                  <div
                    className="flex justify-between"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    <span>Database:</span>
                    <span>{systemHealth?.database ? "✅" : "❌"}</span>
                  </div>
                  <div
                    className="flex justify-between"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    <span>Cache:</span>
                    <span>{systemHealth?.cache ? "✅" : "❌"}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClearWebCache}
                disabled={loading}
                className="compact-button w-full rounded-md transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#f5610bff", color: "white" }}
              >
                Clear Web Cache
              </button>
              <div className="space-y-2 hidden">
                <button
                  onClick={onClearCache}
                  disabled={loading}
                  className="compact-button w-full rounded-md transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "#f59e0b", color: "white" }}
                >
                  Clear Server Cache
                </button>

                <button
                  onClick={onResetDefaults}
                  disabled={loading}
                  className="compact-button w-full rounded-md transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "#ef4444", color: "white" }}
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomSettingsTab;
