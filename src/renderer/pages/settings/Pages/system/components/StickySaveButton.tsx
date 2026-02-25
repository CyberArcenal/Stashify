// components/ui/StickySaveButton.tsx
import React from 'react';
import { Save, RefreshCw } from 'lucide-react';

interface StickySaveButtonProps {
  version: string;
  saving: boolean;
  loading: boolean;
  disabled: boolean;
  onSave: () => void;
}

const StickySaveButton: React.FC<StickySaveButtonProps> = ({
  version,
  saving,
  loading,
  disabled,
  onSave
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--card-bg)] border-t border-[var(--border-color)] p-2 shadow-lg">
      <div className="app-container px-6">

        <div className="flex justify-between items-center">
          <div className="text-sm text-[var(--sidebar-text)] font-medium">
            Application Version: {version}
          </div>

          <button
            onClick={onSave}
            disabled={saving || loading || disabled}
            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] px-6 py-3 rounded-lg flex items-center font-medium disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StickySaveButton;