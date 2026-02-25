// components/LoadingIndicator.tsx
import React from "react";
import clsx from "clsx";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"; // Predefined sizes instead of arbitrary numbers
  color?: "primary" | "secondary" | "success" | "danger" | "warning" | "info"; // Color variants
  className?: string; // Additional classes
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  color = "primary",
  className,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
    xl: "h-16 w-16 border-4",
  };

  const colorClasses = {
    primary: "border-blue-500 border-t-transparent",
    secondary: "border-gray-500 border-t-transparent",
    success: "border-green-500 border-t-transparent",
    danger: "border-red-500 border-t-transparent",
    warning: "border-yellow-500 border-t-transparent",
    info: "border-blue-400 border-t-transparent",
  };

  return (
    <div className={clsx("flex justify-center items-center", className)}>
      <div
        className={clsx(
          "animate-spin rounded-full",
          sizeClasses[size],
          colorClasses[color]
        )}
      />
    </div>
  );
};

interface SkeletonProps {
  type?: "card" | "list" | "text" | "circle";
  count?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  type = "text",
  count = 1,
  className,
}) => {
  const skeletonItems = Array.from({ length: count }, (_, i) => i);

  const renderSkeleton = () => {
    switch (type) {
      case "card":
        return (
          <div
            className={clsx(
              "rounded-lg bg-gray-200 dark:bg-[#2d485c] animate-pulse",
              className || "h-40 w-full"
            )}
          />
        );
      case "list":
        return (
          <div className="space-y-3 w-full">
            {skeletonItems.map((item) => (
              <div
                key={item}
                className={clsx(
                  "h-4 bg-gray-200 dark:bg-[#2d485c] rounded animate-pulse",
                  className
                )}
              />
            ))}
          </div>
        );
      case "circle":
        return (
          <div
            className={clsx(
              "rounded-full bg-gray-200 dark:bg-[#2d485c] animate-pulse",
              className || "h-10 w-10"
            )}
          />
        );
      case "text":
      default:
        return (
          <div className="space-y-2 w-full">
            {skeletonItems.map((item) => (
              <div key={item} className="flex space-x-2 items-center">
                <div
                  className={clsx(
                    "h-4 bg-gray-200 dark:bg-[#2d485c] rounded animate-pulse flex-1",
                    item % 2 === 0 ? "w-full" : "w-5/6",
                    className
                  )}
                />
              </div>
            ))}
          </div>
        );
    }
  };

  return <>{renderSkeleton()}</>;
};

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  withHeader?: boolean;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 5,
  withHeader = true,
  className = 'h-8 w-64',
}) => {
  return (
    <div className="w-full overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {withHeader && (
          <thead className="bg-gray-50 dark:bg-[#253F4E]">
            <tr>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <th key={colIndex} scope="col" className="px-6 py-3">
                  <div className="h-4 bg-gray-200 dark:bg-[#2d485c] rounded animate-pulse w-3/4 mx-auto" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="bg-white dark:bg-[#253F4E] divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <div
                    className={clsx(
                      "h-4 bg-gray-200 dark:bg-[#2d485c] rounded animate-pulse",
                      colIndex % 2 === 0 ? "w-full" : "w-2/3"
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Loading overlay component
interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  children?: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  text = "Loading...",
  children,
}) => {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-white dark:bg-[#253F4E] bg-opacity-75 dark:bg-opacity-75 flex flex-col items-center justify-center z-10 rounded-lg">
        <Spinner size="lg" color="primary" />
        <p className="mt-2 text-sm text-gray-500 dark:text-[#9ED9EC]">{text}</p>
      </div>
      <div className="opacity-50">{children}</div>
    </div>
  );
};

// Example usage component
export const LoadingExamples: React.FC = () => {
  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Spinner Variants</h3>
        <div className="flex space-x-4 items-center">
          <Spinner size="sm" color="primary" />
          <Spinner size="md" color="success" />
          <Spinner size="lg" color="danger" />
          <Spinner size="xl" color="warning" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Skeleton Variants</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Text</h4>
            <Skeleton type="text" count={3} />
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Card</h4>
            <Skeleton type="card" />
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">List</h4>
            <Skeleton type="list" count={4} />
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Circle</h4>
            <Skeleton type="circle" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Table Skeleton</h3>
        <SkeletonTable rows={3} columns={4} withHeader={true} />
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Loading Overlay</h3>
        <div className="border rounded-lg p-4 h-40 relative">
          <LoadingOverlay isLoading={true} text="Loading content...">
            <div className="p-4">
              <h4 className="font-medium">Content Title</h4>
              <p>This content would be visible when not loading.</p>
            </div>
          </LoadingOverlay>
        </div>
      </div>
    </div>
  );
};