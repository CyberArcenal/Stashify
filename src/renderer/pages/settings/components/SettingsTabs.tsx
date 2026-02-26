// src/renderer/pages/settings/components/SettingsTabs.tsx
import React from "react";
import {
  Building,
  Package,
  BarChart,
  Wallet,
  Bell,
  FileText,
  Link,
  Shield,
} from "lucide-react";

interface SettingsTabsProps {
  activeTab:
    | "general"
    | "inventory"
    | "sales"
    | "cashier"
    | "notifications"
    | "data_reports"
    | "integrations"
    | "audit_security";
  onTabChange: (
    tab:
      | "general"
      | "inventory"
      | "sales"
      | "cashier"
      | "notifications"
      | "data_reports"
      | "integrations"
      | "audit_security"
  ) => void;
}

const SettingsTabs: React.FC<SettingsTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "general", label: "General", icon: Building },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "sales", label: "Sales & Tax", icon: BarChart },
    { id: "cashier", label: "Cashier", icon: Wallet },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "data_reports", label: "Data & Reports", icon: FileText },
    { id: "integrations", label: "Integrations", icon: Link },
    { id: "audit_security", label: "Audit & Security", icon: Shield },
  ] as const;

  return (
    <div className="lg:w-64 flex-shrink-0">
      <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-4">
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${
                    isActive
                      ? "bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)]"
                      : "text-[var(--sidebar-text)] hover:bg-[var(--card-secondary-bg)]"
                  }
                `}
              >
                <Icon className="w-4 h-4 mr-3" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default SettingsTabs;