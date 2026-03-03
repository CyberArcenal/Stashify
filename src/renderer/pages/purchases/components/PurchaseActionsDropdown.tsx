// src/renderer/pages/purchases/components/PurchaseActionsDropdown.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Trash2,
  FileText,
  MoreVertical,
  Package,
  RotateCcw,
  Truck,
} from "lucide-react";
import { dialogs } from "../../../utils/dialogs";
import type { PurchaseWithDetails } from "../hooks/usePurchases";

interface PurchaseActionsDropdownProps {
  purchase: PurchaseWithDetails;
  onView: (purchase: PurchaseWithDetails) => void;
  onEdit: (purchase: PurchaseWithDetails) => void;
  onDelete: (purchase: PurchaseWithDetails) => void;
  onUpdateStatus: (id: number, status: string) => void;
}

const PurchaseActionsDropdown: React.FC<PurchaseActionsDropdownProps> = ({
  purchase,
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
      message: `Are you sure you want to mark this purchase as ${newStatus}?`,
    });
    if (!confirmed) return;
    handleAction(() => onUpdateStatus(purchase.id, newStatus));
  };

  return (
    <div className="purchase-actions-dropdown-container" ref={dropdownRef}>
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
                handleAction(() => onView(purchase));
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
            >
              <Eye className="w-4 h-4 text-sky-500" /> <span>View Details</span>
            </button>

            {/* Edit Purchase */}
            {purchase.status === "pending" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(() => onEdit(purchase));
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <Edit className="w-4 h-4 text-yellow-500" />{" "}
                <span>Edit Purchase</span>
              </button>
            )}

            {/* Status Update Actions */}
            {purchase.status === "pending" && (
              <button
                onClick={(e) =>{e.stopPropagation(); handleStatusChange("confirmed")}}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <Package className="w-4 h-4 text-blue-500" />{" "}
                <span>Mark as Confirmed</span>
              </button>
            )}
            {purchase.status ===
              ("confirmed" as
                | "initiated"
                | "pending"
                | "confirmed"
                | "received"
                | "cancelled") && (
              <button
                onClick={(e) =>{e.stopPropagation(); handleStatusChange("received")}}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <Truck className="w-4 h-4 text-green-600" />{" "}
                <span>Mark as Received</span>
              </button>
            )}
            {(purchase.status === "pending" ||
              purchase.status ===
                ("confirmed" as
                  | "initiated"
                  | "pending"
                  | "confirmed"
                  | "received"
                  | "cancelled")) && (
              <button
                onClick={(e) =>{e.stopPropagation(); handleStatusChange("cancelled")}}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <XCircle className="w-4 h-4 text-red-500" />{" "}
                <span>Cancel Purchase</span>
              </button>
            )}
            {purchase.status === "cancelled" && (
              <button
                onClick={(e) =>{e.stopPropagation(); handleStatusChange("pending")}}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <RotateCcw className="w-4 h-4 text-blue-500" />{" "}
                <span>Reopen Purchase</span>
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

            {/* Divider */}
            <div className="border-t border-gray-200 my-1"></div>

            {/* Delete */}
            {purchase.status === "pending" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(() => onDelete(purchase));
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" /> <span>Delete Purchase</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseActionsDropdown;
