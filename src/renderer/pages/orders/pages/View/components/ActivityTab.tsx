// components/order/ActivityTab.tsx
import { orderLogAPI, OrderLogData } from "@/renderer/api/orderLog";
import { formatDateTime } from "@/renderer/utils/formatters";
import { HistoryIcon } from "lucide-react";
import React, { useState, useEffect } from "react";

interface ActivityTabProps {
  orderId: number;
}

const ActivityTab: React.FC<ActivityTabProps> = ({ orderId }) => {
  const [logs, setLogs] = useState<OrderLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderLogs = async () => {
      try {
        setLoading(true);
        const orderLogs = await orderLogAPI.getByOrder(orderId);
        setLogs(orderLogs);
      } catch (err: any) {
        setError(err.message || "Failed to fetch order logs");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderLogs();
  }, [orderId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[var(--sidebar-text)]">
          Order Activity
        </h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)] mx-auto"></div>
          <p className="mt-2 text-[var(--text-secondary)]">
            Loading activity logs...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[var(--sidebar-text)]">
          Order Activity
        </h3>
        <div className="text-center py-8">
          <p className="text-[var(--danger-color)]">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-[var(--sidebar-text)]">
        Order Activity
      </h3>

      {logs.length > 0 ? (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="border border-[var(--border-color)] rounded-lg p-4 hover:bg-[var(--card-secondary-bg)]"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-medium text-[var(--sidebar-text)]">
                    {log.action_display ||
                      orderLogAPI.getActionDisplay(log.action)}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)] ml-2">
                    by {log.performed_by_data?.full_name || "System"}
                  </span>
                </div>
                <span className="text-sm text-[var(--text-secondary)]">
                  {formatDateTime(log.created_at)}
                </span>
              </div>
              {log.notes && (
                <p className="text-sm text-[var(--sidebar-text)]">
                  {log.notes}
                </p>
              )}
              <div className="text-xs text-[var(--text-tertiary)] mt-1">
                IP: {log.ip_address}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <HistoryIcon className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] text-lg">
            No activity found
          </p>
          <p className="text-[var(--text-tertiary)] mt-2">
            No activity logs available for this order
          </p>
        </div>
      )}
    </div>
  );
};

export default ActivityTab;
