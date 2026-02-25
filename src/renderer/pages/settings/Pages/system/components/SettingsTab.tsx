// components/SettingsTabs.tsx
import React from 'react';
import { Building, Mail, BarChart, UserCheck, Truck, Settings as SettingsIcon } from 'lucide-react';

interface SettingsTabsProps {
  activeTab: string;
  onTabChange: (tab: 'general' | 'email' | 'tax' | 'supplier_tax' | 'shipping' | 'custom') => void;
}

const SettingsTabs: React.FC<SettingsTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'general' as const, label: 'General', icon: Building },
    { id: 'email' as const, label: 'Email', icon: Mail },
    { id: 'tax' as const, label: 'Tax', icon: BarChart },
    { id: 'supplier_tax' as const, label: 'Supplier Tax', icon: UserCheck },
    // { id: 'shipping' as const, label: 'Shipping', icon: Truck },
    { id: 'custom' as const, label: 'Custom', icon: SettingsIcon }
  ];

  return (
    <div className="lg:w-64 flex-shrink-0">
      <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-4">
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id
                  ? 'bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)]'
                  : 'text-[var(--sidebar-text)] hover:bg-[var(--card-secondary-bg)]'
                  }`}
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