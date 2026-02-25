// components/ui/AlertBanner.tsx
import React from 'react';

interface AlertBannerProps {
  error: string | null;
  success: string | null;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ error, success }) => {
  if (!error && !success) return null;

  return (
    <div className="app-container px-6 py-4">
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}
    </div>
  );
};

export default AlertBanner;