// src/renderer/pages/settings/index.tsx
import React, { useState, useEffect } from "react";
import LoadingSpinner from "./components/LoadingSpinner";
import AlertBanner from "./components/AlertBanner";
import SettingsTabs from "./components/SettingsTabs";
import InventorySettingsTab from "./components/InventorySettingsTab";
import SalesSettingsTab from "./components/SalesSettingsTab";
import CashierSettingsTab from "./components/CashierSettingsTab";
import NotificationsSettingsTab from "./components/NotificationsSettingsTab";
import DataReportsSettingsTab from "./components/DataReportsSettingsTab";
import IntegrationsSettingsTab from "./components/IntegrationsSettingsTab";
import AuditSecuritySettingsTab from "./components/AuditSecuritySettingsTab";
import GeneralSettingsTab from "./components/GeneralSettingsTab";
import { useSettings } from "./hooks/useSettings";
import { showSuccess } from "../../utils/notification";

const SettingsPage: React.FC = () => {
  const {
    groupedConfig,
    loading,
    error,
    successMessage,
    setError,
    setSuccessMessage,
    setCategoryData,
    saveCategory,
    refetch,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<
    "general" | "inventory" | "sales" | "cashier" | "notifications" | "data_reports" | "integrations" | "audit_security"
  >("general");

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  if(successMessage){
    showSuccess(successMessage);
  }

  const handleSaveCategory = async (category: string, data: any) => {
    try {
      // Optimistically update local state
      setCategoryData(category as keyof typeof groupedConfig, data);
      // Save only this category to backend
      await saveCategory(category as keyof typeof groupedConfig);
    } catch (err: any) {
      setError(err.message || `Failed to save ${category} settings`);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading system configuration..." />;
  }

  if (error && !groupedConfig) {
    // Only show full error if we have no data at all
    return (
      <div className="min-h-screen bg-[var(--background-color)] p-6">
        <AlertBanner error={error} success={null} />
        <button
          onClick={refetch}
          className="mt-4 px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-color)] pb-8">
      <div className="compact-card bg-[var(--card-bg)] border-b border-[var(--border-color)]">
        <div className="app-container px-6 py-4">
          <h1 className="text-xl font-semibold text-[var(--sidebar-text)]">
            System Settings
          </h1>
          <p className="text-[var(--sidebar-text)] mt-1">
            Configure your application preferences
          </p>
        </div>
      </div>

      {/* <AlertBanner error={error} success={successMessage} /> */}

      <div className="app-container px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex-1">
            {activeTab === "general" && (
              <GeneralSettingsTab
                settings={groupedConfig.general}
                onSave={(data) => handleSaveCategory("general", data)}
              />
            )}
            {activeTab === "inventory" && (
              <InventorySettingsTab
                settings={groupedConfig.inventory}
                onSave={(data) => handleSaveCategory("inventory", data)}
              />
            )}
            {activeTab === "sales" && (
              <SalesSettingsTab
                settings={groupedConfig.sales}
                onSave={(data) => handleSaveCategory("sales", data)}
              />
            )}
            {activeTab === "cashier" && (
              <CashierSettingsTab
                settings={groupedConfig.cashier}
                onSave={(data) => handleSaveCategory("cashier", data)}
              />
            )}
            {activeTab === "notifications" && (
              <NotificationsSettingsTab
                settings={groupedConfig.notifications}
                onSave={(data) => handleSaveCategory("notifications", data)}
              />
            )}
            {activeTab === "data_reports" && (
              <DataReportsSettingsTab
                settings={groupedConfig.data_reports}
                onSave={(data) => handleSaveCategory("data_reports", data)}
              />
            )}
            {activeTab === "integrations" && (
              <IntegrationsSettingsTab
                settings={groupedConfig.integrations}
                onSave={(data) => handleSaveCategory("integrations", data)}
              />
            )}
            {activeTab === "audit_security" && (
              <AuditSecuritySettingsTab
                settings={groupedConfig.audit_security}
                onSave={(data) => handleSaveCategory("audit_security", data)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;