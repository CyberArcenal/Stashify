// components/ui/LoadingSpinner.tsx
import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  message: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 text-[var(--accent-blue)] animate-spin mr-3" />
      <span className="text-[var(--sidebar-text)]">{message}</span>
    </div>
  );
};

export default LoadingSpinner;