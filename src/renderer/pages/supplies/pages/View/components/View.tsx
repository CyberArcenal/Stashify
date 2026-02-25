// components/SupplierDetailView.tsx
import React, { useState } from "react";
import {
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Activity,
  Package,
  User,
  FileText,
  TrendingUp,
  ShoppingCart,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Trash2,
  Power,
} from "lucide-react";
import { SupplierData } from "@/renderer/api/supplier";

interface SupplierDetailViewProps {
  supplier: SupplierData;
  onEdit?: () => void;
  onCreatePurchaseOrder?: () => void;
  onStatusUpdate?: (status: "approved" | "rejected" | "pending") => void;
  onToggleActive?: () => void;
  onDelete?: () => void;
  actionLoading?: boolean;
}

const SupplierDetailView: React.FC<SupplierDetailViewProps> = ({
  supplier,
  onEdit,
  onCreatePurchaseOrder,
  onStatusUpdate,
  onToggleActive,
  onDelete,
  actionLoading = false,
}) => {
  const [loadingStats, setLoadingStats] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Format date using the API utility function
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
    };

    if (status === "active" || status === "inactive") {
      return statusColors[status];
    }
    return (
      statusColors[
        supplier.status as
          | "pending"
          | "approved"
          | "rejected"
          | "active"
          | "inactive"
      ] || statusColors.pending
    );
  };

  // Get status display text
  const getStatusText = (status: string): string => {
    const statusTexts = {
      pending: "Pending Approval",
      approved: "Approved",
      rejected: "Rejected",
      active: "Active",
      inactive: "Inactive",
    };

    if (status === "active" || status === "inactive") {
      return statusTexts[status];
    }
    return (
      statusTexts[
        supplier.status as
          | "pending"
          | "approved"
          | "rejected"
          | "active"
          | "inactive"
      ] || "Pending Approval"
    );
  };

  // Validate contact information
  const getContactInfoValidity = () => {
    const missingFields = [];
    if (!supplier.contact_person || !supplier.contact_person.trim())
      missingFields.push("Contact Person");
    if (!supplier.email || !supplier.email.trim()) missingFields.push("Email");
    if (!supplier.phone || !supplier.phone.trim()) missingFields.push("Phone");

    return {
      isValid: missingFields.length === 0,
      missingFields,
      completeness: ((3 - missingFields.length) / 3) * 100,
    };
  };

  const contactValidity = getContactInfoValidity();

  const handleRefreshStats = async () => {
    setLoadingStats(true);
    // In a real app, you might refetch supplier data or specific stats
    setTimeout(() => setLoadingStats(false), 1000);
  };

  const handleQuickAction = async (action: string) => {
    setShowActionMenu(false);

    switch (action) {
      case "approve":
        onStatusUpdate?.("approved");
        break;
      case "reject":
        onStatusUpdate?.("rejected");
        break;
      case "pending":
        onStatusUpdate?.("pending");
        break;
      case "toggle-active":
        onToggleActive?.();
        break;
      case "delete":
        onDelete?.();
        break;
    }
  };

  const getStatusIcon = () => {
    switch (supplier.status) {
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div
      className="rounded-xl shadow-sm border overflow-hidden"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Header */}
      <div
        className="border-b px-6 py-4"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <Building
              className="w-8 h-8 mr-3"
              style={{ color: "var(--sidebar-text)" }}
            />
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                {supplier.name}
              </h2>
              <div className="flex items-center mt-1 space-x-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(supplier.status)}`}
                >
                  {getStatusIcon()}
                  <span className="ml-1">{getStatusText(supplier.status)}</span>
                </span>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(supplier.is_active ? "active" : "inactive")}`}
                >
                  <Power className="w-3 h-3 mr-1" />
                  {supplier.is_active ? "Active" : "Inactive"}
                </span>
                {supplier.tax_id && (
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: "var(--accent-emerald-light)",
                      color: "var(--accent-emerald)",
                    }}
                  >
                    Tax ID: {supplier.tax_id}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-0 flex space-x-2">
            {/* Action Menu */}
            <div className="relative">
              <button
                onClick={() => setShowActionMenu(!showActionMenu)}
                disabled={actionLoading}
                className="compact-button p-2 border rounded-lg transition-colors"
                style={{
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                  backgroundColor: "var(--card-bg)",
                }}
                title="More actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showActionMenu && (
                <div
                  className="absolute right-0 mt-1 w-48 rounded-md shadow-lg border z-10"
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <div className="py-1">
                    {/* Status Actions */}
                    {supplier.status !== "approved" && (
                      <button
                        onClick={() => handleQuickAction("approve")}
                        disabled={actionLoading}
                        className="flex items-center w-full px-4 py-2 text-sm hover:bg-[var(--accent-green-light)]"
                        style={{ color: "var(--accent-green)" }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Supplier
                      </button>
                    )}
                    {supplier.status !== "rejected" && (
                      <button
                        onClick={() => handleQuickAction("reject")}
                        disabled={actionLoading}
                        className="flex items-center w-full px-4 py-2 text-sm hover:bg-[var(--accent-red-light)]"
                        style={{ color: "var(--accent-red)" }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Supplier
                      </button>
                    )}
                    {supplier.status !== "pending" && (
                      <button
                        onClick={() => handleQuickAction("pending")}
                        disabled={actionLoading}
                        className="flex items-center w-full px-4 py-2 text-sm hover:bg-[var(--accent-orange-light)]"
                        style={{ color: "var(--accent-orange)" }}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Set Pending
                      </button>
                    )}

                    {/* Active/Inactive Toggle */}
                    <button
                      onClick={() => handleQuickAction("toggle-active")}
                      disabled={actionLoading}
                      className="flex items-center w-full px-4 py-2 text-sm hover:bg-[var(--card-hover-bg)]"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      <Power className="w-4 h-4 mr-2" />
                      {supplier.is_active ? "Deactivate" : "Activate"}
                    </button>

                    {/* Delete Action */}
                    <button
                      onClick={() => handleQuickAction("delete")}
                      disabled={actionLoading}
                      className="flex items-center w-full px-4 py-2 text-sm hover:bg-[var(--accent-red-light)]"
                      style={{ color: "var(--accent-red)" }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Supplier
                    </button>
                  </div>
                </div>
              )}
            </div>

            {onCreatePurchaseOrder && (
              <button
                onClick={onCreatePurchaseOrder}
                disabled={!supplier.is_active || actionLoading}
                className="compact-button px-4 py-2 text-[var(--sidebar-text)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center text-sm"
                style={{
                  backgroundColor:
                    !supplier.is_active || actionLoading
                      ? "var(--default-color)"
                      : "var(--success-color)",
                }}
                title={
                  !supplier.is_active
                    ? "Cannot create orders for inactive suppliers"
                    : "Create purchase order"
                }
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                New Order
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                disabled={actionLoading}
                className="compact-button px-4 py-2 text-[var(--sidebar-text)] rounded-lg transition-colors flex items-center text-sm"
                style={{ backgroundColor: "var(--accent-blue)" }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Supplier
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contact Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--card-secondary-bg)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3
                  className="text-sm font-medium flex items-center"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Building className="w-4 h-4 mr-2" />
                  Contact Information
                </h3>
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      contactValidity.isValid ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {contactValidity.completeness}% complete
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Contact Person */}
                <div className="flex items-start">
                  <User
                    className="w-5 h-5 mr-3 mt-0.5"
                    style={{ color: "var(--default-color)" }}
                  />
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Contact Person
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {supplier.contact_person || "Not specified"}
                    </p>
                    {!supplier.contact_person && (
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--warning-color)" }}
                      >
                        Contact person not specified
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start">
                  <Mail
                    className="w-5 h-5 mr-3 mt-0.5"
                    style={{ color: "var(--default-color)" }}
                  />
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Email Address
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {supplier.email || "Not specified"}
                    </p>
                    {!supplier.email && (
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--warning-color)" }}
                      >
                        Email address not specified
                      </p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start">
                  <Phone
                    className="w-5 h-5 mr-3 mt-0.5"
                    style={{ color: "var(--default-color)" }}
                  />
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Phone Number
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {supplier.phone || "Not specified"}
                    </p>
                    {!supplier.phone && (
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--warning-color)" }}
                      >
                        Phone number not specified
                      </p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start">
                  <MapPin
                    className="w-5 h-5 mr-3 mt-0.5"
                    style={{ color: "var(--default-color)" }}
                  />
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Business Address
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {supplier.address || "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {supplier.notes && (
                  <div className="flex items-start">
                    <FileText
                      className="w-5 h-5 mr-3 mt-0.5"
                      style={{ color: "var(--default-color)" }}
                    />
                    <div className="flex-1">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Notes
                      </p>
                      <p
                        className="text-sm whitespace-pre-wrap"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {supplier.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--card-secondary-bg)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3
                  className="text-sm font-medium flex items-center"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Purchase History
                </h3>
                <button
                  onClick={handleRefreshStats}
                  disabled={loadingStats}
                  className="p-1 transition-colors"
                  style={{ color: "var(--sidebar-text)" }}
                  title="Refresh stats"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loadingStats ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              {supplier.purchase_count && supplier.purchase_count > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "var(--accent-blue-light)" }}
                    >
                      <p
                        className="text-lg font-bold"
                        style={{ color: "var(--accent-blue)" }}
                      >
                        {supplier.purchase_count}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--accent-blue)" }}
                      >
                        Total Orders
                      </p>
                    </div>
                    <div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "var(--accent-green-light)" }}
                    >
                      <p
                        className="text-lg font-bold"
                        style={{ color: "var(--accent-green)" }}
                      >
                        ₱{(supplier.total_purchase_value || 0).toLocaleString()}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--accent-green)" }}
                      >
                        Total Value
                      </p>
                    </div>
                  </div>
                  <div className="text-center pt-4">
                    <p
                      className="text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      View detailed purchase order history in the Orders
                      section.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Package
                    className="w-12 h-12 mx-auto mb-3"
                    style={{ color: "var(--default-color)" }}
                  />
                  <p
                    className="text-sm mb-4"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    No purchase orders found for this supplier.
                  </p>
                  {onCreatePurchaseOrder && (
                    <button
                      onClick={onCreatePurchaseOrder}
                      disabled={!supplier.is_active || actionLoading}
                      className="compact-button px-4 py-2 text-[var(--sidebar-text)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      style={{
                        backgroundColor:
                          !supplier.is_active || actionLoading
                            ? "var(--default-color)"
                            : "var(--accent-blue)",
                      }}
                    >
                      Create First Purchase Order
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Supplier Details & Timestamps */}
          <div className="space-y-6">
            {/* Supplier Details */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--card-secondary-bg)" }}
            >
              <h3
                className="text-sm font-medium mb-3 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Activity className="w-4 h-4 mr-2" />
                Supplier Details
              </h3>

              <div className="space-y-4">
                {/* Supplier ID */}
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Supplier ID
                  </p>
                  <p
                    className="text-sm font-mono"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {supplier.id}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Approval Status
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(supplier.status)}`}
                  >
                    {getStatusIcon()}
                    <span className="ml-1">
                      {getStatusText(supplier.status)}
                    </span>
                  </span>
                </div>

                {/* Active Status */}
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Active Status
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(supplier.is_active ? "active" : "inactive")}`}
                  >
                    <Power className="w-3 h-3 mr-1" />
                    {supplier.is_active ? "Active" : "Inactive"}
                  </span>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {supplier.is_active
                      ? "This supplier can receive purchase orders."
                      : "This supplier cannot receive purchase orders."}
                  </p>
                </div>

                {/* Created By */}
                {supplier.created_by_name && (
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Created By
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {supplier.created_by_name}
                      {supplier.created_by_username && (
                        <span
                          className="ml-2"
                          style={{ color: "var(--sidebar-text)", opacity: 0.7 }}
                        >
                          (@{supplier.created_by_username})
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--card-secondary-bg)" }}
            >
              <h3
                className="text-sm font-medium mb-3 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Timestamps
              </h3>

              <div className="space-y-4">
                {/* Date Created */}
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Date Created
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {formatDate(supplier.created_at)}
                  </p>
                </div>

                {/* Last Updated */}
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Last Updated
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {formatDate(supplier.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--card-secondary-bg)" }}
            >
              <h3
                className="text-sm font-medium mb-3 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Performance
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Order Frequency
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {supplier.purchase_count ? "Regular" : "No orders"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Total Orders
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {supplier.purchase_count || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Total Value
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--accent-green)" }}
                  >
                    ₱{(supplier.total_purchase_value || 0).toLocaleString()}
                  </span>
                </div>
                {supplier.purchase_count && supplier.purchase_count > 0 && (
                  <div className="flex justify-between items-center">
                    <span
                      className="text-xs"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Avg. Order Value
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--accent-blue)" }}
                    >
                      ₱
                      {Math.round(
                        (supplier.total_purchase_value || 0) /
                          supplier.purchase_count,
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetailView;
