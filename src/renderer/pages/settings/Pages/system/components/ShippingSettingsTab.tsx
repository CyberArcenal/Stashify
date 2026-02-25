// components/tabs/ShippingSettingsTab.tsx
import React from 'react';
import { Truck } from 'lucide-react';

interface ShippingSettings {
  threshold_activate: boolean;
}

interface ShippingSettingsTabProps {
  settings: ShippingSettings;
  onChange: (field: keyof ShippingSettings, value: any) => void;
}

const ShippingSettingsTab: React.FC<ShippingSettingsTabProps> = ({ settings, onChange }) => {
  return (
    <div className="bg-white dark:bg-[#253F4E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-[#9ED9EC] mb-6 flex items-center">
        <Truck className="w-5 h-5 mr-2" />
        Shipping Settings
      </h2>
      
      <div className="space-y-6">
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.threshold_activate}
              onChange={(e) => onChange('threshold_activate', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-[#9ED9EC]">
              Activate Shipping Threshold
            </span>
          </label>
          
          <p className="text-sm text-gray-500 dark:text-[#9ED9EC]">
            When enabled, shipping costs will be calculated based on order thresholds and configured shipping rules.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-[#2d485c] p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-[#9ED9EC] text-sm mb-2">
            Shipping Configuration
          </h4>
          <p className="text-xs text-gray-600 dark:text-[#9ED9EC]">
            Additional shipping settings like rates, zones, and methods can be configured in the Shipping Management section.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShippingSettingsTab;