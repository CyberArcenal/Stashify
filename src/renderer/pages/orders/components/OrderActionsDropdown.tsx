// src/renderer/pages/sales/components/SalesActionsDropdown.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Trash2,
  FileText,
  MoreVertical,
  Send,
  Package,
  RotateCcw,
} from "lucide-react";
import { dialogs } from "../../../utils/dialogs";
import type { OrderWithDetails } from "../hooks/useOrder";

interface SalesActionsDropdownProps {
  order: OrderWithDetails;
  onView: (order: OrderWithDetails) => void;
  onEdit: (order: OrderWithDetails) => void;
  onDelete: (order: OrderWithDetails) => void;
  onUpdateStatus: (id: number, status: string) => void;
}

const SalesActionsDropdown: React.FC<SalesActionsDropdownProps> = ({
  order,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => setIsOpen(!isOpen);
  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDropdownPosition = () => {
    if (!buttonRef.current) return {};
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 280;
    const windowHeight = window.innerHeight;

    if (rect.bottom + dropdownHeight > windowHeight) {
      return {
        bottom: `${windowHeight - rect.top + 5}px`,
        right: `${window.innerWidth - rect.right}px`,
      };
    }
    return {
      top: `${rect.bottom + 5}px`,
      right: `${window.innerWidth - rect.right}px`,
    };
  };

  const handleStatusChange = async (newStatus: string) => {
    const confirmed = await dialogs.confirm({
      title: "Update Status",
      message: `Are you sure you want to mark this order as ${newStatus}?`,
    });
    if (!confirmed) return;
    handleAction(() => onUpdateStatus(order.id, newStatus));
  };

  return (
    <div className="sales-actions-dropdown-container" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className="p-1.5 rounded hover:bg-gray-100 transition-colors relative cursor-pointer"
        title="More Actions"
      >
        <MoreVertical
          className="w-4 h-4"
          style={{ color: "var(--text-secondary)" }}
        />
      </button>

      {isOpen && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 w-64 z-50 max-h-96 overflow-y-auto"
          style={getDropdownPosition()}
        >
          <div className="py-1">
            {/* View Details */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction(() => onView(order));
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
            >
              <Eye className="w-4 h-4 text-sky-500" /> <span>View Details</span>
            </button>

            {/* Edit Order */}
            {order.status === "pending" ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(() => onEdit(order));
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <Edit className="w-4 h-4 text-yellow-500" />{" "}
                <span>Edit Order</span>
              </button>
            ) : (
              ""
            )}

            {/* Status Update Actions */}
            {order.status === "pending" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange("confirmed");
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <CheckCircle className="w-4 h-4 text-green-500" />{" "}
                <span>Mark as Confirmed</span>
              </button>
            )}
            {order.status === "confirmed" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange("completed");
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <Package className="w-4 h-4 text-green-600" />{" "}
                <span>Mark as Completed</span>
              </button>
            )}
            {(order.status === "pending" || order.status === "confirmed") && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange("cancelled");
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <XCircle className="w-4 h-4 text-red-500" />{" "}
                <span>Cancel Order</span>
              </button>
            )}
            {order.status === "cancelled" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange("pending");
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <RotateCcw className="w-4 h-4 text-blue-500" />{" "}
                <span>Reopen Order</span>
              </button>
            )}
            {order.status === "completed" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange("refunded");
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <RotateCcw className="w-4 h-4 text-purple-500" />{" "}
                <span>Refund Order</span>
              </button>
            )}

            {/* Divider */}
            <div className="border-t border-gray-200 my-1"></div>

            {/* Add Note (placeholder) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                dialogs.info("Add note feature coming soon.", "Info");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
            >
              <FileText className="w-4 h-4 text-blue-500" />{" "}
              <span>Add Note</span>
            </button>

            {/* Send Invoice (placeholder) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                dialogs.info("Send invoice feature coming soon.", "Info");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
            >
              <Send className="w-4 h-4 text-indigo-500" />{" "}
              <span>Send Invoice</span>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-200 my-1"></div>

            {/* Delete */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction(() => onDelete(order));
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" /> <span>Delete Order</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesActionsDropdown;
