// components/order/OrderTabs.tsx
import React from 'react';
import { Eye, ShoppingCart, User, History } from 'lucide-react';

interface OrderTabsProps {
  activeTab: 'overview' | 'items' | 'customer' | 'audit';
  onTabChange: (tab: 'overview' | 'items' | 'customer' | 'audit') => void;
}

const OrderTabs: React.FC<OrderTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Eye },
    { id: 'items' as const, label: 'Order Items', icon: ShoppingCart },
    { id: 'customer' as const, label: 'Customer', icon: User },
    { id: 'audit' as const, label: 'Activity', icon: History }
  ];

  return (
    <div className="border-b border-[var(--border-color)]">
      <nav className="flex space-x-8 px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tab.id
                ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--sidebar-text)]'
                }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default OrderTabs;