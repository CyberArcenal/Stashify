// pages/SupplierDetailPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  showError,
  showSuccess,
  showLoading,
  hideLoading,
  showApiError,
} from "@/renderer/utils/notification";
import { dialogs } from "@/renderer/utils/dialogs";
import SupplierDetailView from "./components/View";
import { supplierAPI, SupplierData } from "@/renderer/api/supplier";

const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<SupplierData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Fetch supplier data
  const fetchSupplier = async () => {
    if (!id) {
      showError("Supplier ID is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supplierData = await supplierAPI.findById(Number(id));

      if (supplierData) {
        setSupplier(supplierData);
      } else {
        showError(`Supplier with ID "${id}" not found`);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load supplier data";
      showApiError(errorMessage);
      console.error("Error fetching supplier:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplier();
  }, [id]);

  const handleEdit = () => {
    if (supplier) {
      navigate(`/suppliers/form/${supplier.id}`);
    }
  };

  const handleCreatePurchaseOrder = () => {
    if (supplier) {
      if (!supplier.is_active) {
        showError("Cannot create purchase orders for inactive suppliers");
        return;
      }
      navigate("/purchases/form", { state: { supplierId: supplier.id } });
    }
  };

  const handleStatusUpdate = async (
    newStatus: "approved" | "rejected" | "pending",
  ) => {
    if (!supplier) return;

    const statusConfig = {
      approved: {
        title: "Approve Supplier",
        message: `Are you sure you want to approve "${supplier.name}"? This will allow them to be used in purchases.`,
        icon: "success" as const,
        successMessage: `Supplier "${supplier.name}" approved successfully`,
      },
      rejected: {
        title: "Reject Supplier",
        message: `Are you sure you want to reject "${supplier.name}"? They will not be available for purchases.`,
        icon: "warning" as const,
        successMessage: `Supplier "${supplier.name}" rejected successfully`,
      },
      pending: {
        title: "Set Supplier to Pending",
        message: `Are you sure you want to set "${supplier.name}" to pending status?`,
        icon: "info" as const,
        successMessage: `Supplier "${supplier.name}" set to pending successfully`,
      },
    };

    const config = statusConfig[newStatus];
    // const confirmed = await dialogs.confirm({
    //   title: config.title,
    //   message: config.message,
    //   icon: config.icon,
    //   confirmText: newStatus === 'approved' ? 'Approve' : newStatus === 'rejected' ? 'Reject' : 'Set Pending',
    //   cancelText: 'Cancel'
    // });

    // if (!confirmed) return;

    setActionLoading(true);

    try {
      switch (newStatus) {
        case "approved":
          await supplierAPI.approveSupplier(
            supplier.id,
            `Status updated to approved`,
          );
          break;
        case "rejected":
          await supplierAPI.rejectSupplier(
            supplier.id,
            `Status updated to rejected`,
          );
          break;
        case "pending":
          await supplierAPI.setPendingSupplier(
            supplier.id,
            `Status reset to pending`,
          );
          break;
      }
      showSuccess(config.successMessage);
      await fetchSupplier(); // Refresh data
    } catch (err: any) {
      showApiError(
        err.message || `Failed to update supplier status to ${newStatus}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!supplier) return;

    const newStatus = !supplier.is_active;
    const confirmed = await dialogs.confirm({
      title: newStatus ? "Activate Supplier" : "Deactivate Supplier",
      message: newStatus
        ? `Are you sure you want to activate "${supplier.name}"? This will allow them to receive purchase orders.`
        : `Are you sure you want to deactivate "${supplier.name}"? They will not be able to receive new purchase orders.`,
      icon: newStatus ? "success" : "warning",
      confirmText: newStatus ? "Activate" : "Deactivate",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    setActionLoading(true);

    try {
      await supplierAPI.partialUpdate(supplier.id, { is_active: newStatus });
      showSuccess(
        `Supplier "${supplier.name}" ${newStatus ? "activated" : "deactivated"} successfully`,
      );
      await fetchSupplier(); // Refresh data
    } catch (err: any) {
      showApiError(
        err.message ||
          `Failed to ${newStatus ? "activate" : "deactivate"} supplier`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!supplier) return;

    const confirmed = await dialogs.delete(supplier.name);

    if (!confirmed) return;

    setActionLoading(true);
    // showLoading('Deleting supplier...');

    try {
      await supplierAPI.delete(supplier.id);
      // showSuccess(`Supplier "${supplier.name}" deleted successfully`);
      navigate("/suppliers");
    } catch (err: any) {
      showApiError(err.message || "Failed to delete supplier");
      setActionLoading(false);
      // hideLoading();
    }
  };

  const handleRefreshData = async () => {
    showLoading("Refreshing supplier data...");
    await fetchSupplier();
    hideLoading();
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background-color)" }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
          <h2
            className="text-xl font-semibold"
            style={{ color: "var(--sidebar-text)" }}
          >
            Loading supplier details...
          </h2>
        </div>
      </div>
    );
  }

  // Error state for supplier not found
  if (!supplier) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background-color)" }}
      >
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏢</div>
          <h1
            className="text-2xl font-bold mb-4"
            style={{ color: "var(--sidebar-text)" }}
          >
            Supplier Not Found
          </h1>
          <p className="mb-6" style={{ color: "var(--sidebar-text)" }}>
            The supplier you're looking for doesn't exist or has been removed.
          </p>
          <div className="space-x-3">
            <button
              onClick={() => navigate("/suppliers")}
              className="px-6 py-2 text-[var(--sidebar-text)] rounded-lg transition-colors"
              style={{ backgroundColor: "var(--accent-blue)" }}
            >
              Back to Suppliers
            </button>
            <button
              onClick={() => navigate("/suppliers/form")}
              className="px-6 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                color: "var(--sidebar-text)",
              }}
            >
              Add New Supplier
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8"
      style={{ backgroundColor: "var(--background-color)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate("/suppliers")}
                  className="compact-button p-2 transition-colors"
                  style={{ color: "var(--sidebar-text)" }}
                  title="Back to suppliers"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </button>
                <div>
                  <h1
                    className="text-2xl font-bold mb-2"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Supplier Details
                  </h1>
                  <p style={{ color: "var(--sidebar-text)" }}>
                    Viewing supplier information for {supplier.name}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={handleRefreshData}
                disabled={actionLoading}
                className="compact-button px-4 py-2 border rounded-lg transition-colors flex items-center"
                style={{
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                  backgroundColor: "var(--card-bg)",
                }}
                title="Refresh data"
              >
                <svg
                  className={`w-4 h-4 mr-2 ${actionLoading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
              <button
                onClick={handleEdit}
                className="compact-button px-4 py-2 text-[var(--sidebar-text)] rounded-lg transition-colors flex items-center"
                style={{ backgroundColor: "var(--accent-blue)" }}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Supplier
              </button>
            </div>
          </div>
        </div>

        {/* Supplier Detail View Component */}
        <SupplierDetailView
          supplier={supplier}
          onEdit={handleEdit}
          onCreatePurchaseOrder={handleCreatePurchaseOrder}
          onStatusUpdate={handleStatusUpdate}
          onToggleActive={handleToggleActive}
          onDelete={handleDeleteSupplier}
          actionLoading={actionLoading}
        />
      </div>
    </div>
  );
};

export default SupplierDetailPage;
