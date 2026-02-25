import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  Phone,
  Mail,
  MapPin,
  Building,
  RefreshCw,
  CheckCircle,
  Clock,
  Ban,
} from "lucide-react";
import {
  supplierAPI,
  SupplierData,
  SupplierSearchParams,
} from "@/renderer/api/supplier";
import Pagination from "@/renderer/components/UI/Pagination";
import { PaginationType } from "@/renderer/api/category";
import { dialogs } from "@/renderer/utils/dialogs";
import {
  showSuccess,
  showError,
  showLoading,
  hideLoading,
  inventoryNotifications,
  showApiError,
} from "@/renderer/utils/notification";
import {
  supplierExportAPI,
  SupplierExportParams,
} from "@/renderer/api/exports/supplier";

interface Filters {
  search: string;
  status: string; // 'pending', 'approved', 'rejected', or ''
  has_tax_id: string;
  has_contact_person: string;
}

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    withTaxId: 0,
    withContactPerson: 0,
  });

  // Pagination state
  const [pagination, setPagination] = useState<PaginationType>({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 20,
    next: null,
    previous: null,
  });

  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "",
    has_tax_id: "",
    has_contact_person: "",
  });

  // Load suppliers and statistics
  const loadSuppliers = async (page: number = pagination.current_page) => {
    try {
      setLoading(true);

      // Build search params
      const searchParams: SupplierSearchParams = {};

      if (filters.search) searchParams.search = filters.search;
      if (filters.status) searchParams.status = filters.status;
      if (filters.has_tax_id)
        searchParams.has_tax_id = filters.has_tax_id === "true";
      if (filters.has_contact_person)
        searchParams.has_contact_person = filters.has_contact_person === "true";

      // Use paginated API call
      const response = await supplierAPI.findPage(
        pagination.page_size,
        page,
        searchParams,
      );
      setSuppliers(response.data);
      setPagination((prev) => ({
        ...prev,
        current_page: response.pagination.current_page,
        total_pages: response.pagination.total_pages,
        count: response.pagination.count,
      }));

      // Load statistics (only on first load or when filters change significantly)
      if (page === 1) {
        try {
          const statistics = await supplierAPI.getSupplierStatistics();
          setStats({
            total: statistics.total_suppliers,
            pending: statistics.pending_suppliers,
            approved: statistics.approved_suppliers,
            rejected: statistics.rejected_suppliers,
            withTaxId: statistics.suppliers_with_tax_id,
            withContactPerson: statistics.suppliers_with_contact_person,
          });
        } catch (statsError) {
          console.warn("Could not load statistics:", statsError);
          // Calculate stats from loaded data as fallback
          const analysis = supplierAPI.analyzeSuppliers(response.data);
          setStats({
            total: response.pagination.count,
            pending: analysis.pendingCount,
            approved: analysis.approvedCount,
            rejected: analysis.rejectedCount,
            withTaxId: analysis.withTaxIdCount,
            withContactPerson: analysis.withContactPersonCount,
          });
        }
      }
    } catch (err: any) {
      showApiError(err.message || "Failed to load suppliers");
      console.error("Error loading suppliers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and when filters change
  useEffect(() => {
    loadSuppliers(1); // Reset to page 1 when filters change
  }, [filters]);

  // Add the export handler function
  const handleExport = async () => {
    if (pagination.count === 0) {
      showError("No data to export");
      return;
    }

    setExportLoading(true);
    showLoading(`Preparing ${exportFormat.toUpperCase()} export...`);

    try {
      // Build export parameters
      const exportParams: SupplierExportParams = {
        format: exportFormat,
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.has_tax_id && {
          has_tax_id: filters.has_tax_id === "true",
        }),
        ...(filters.has_contact_person && {
          has_contact_person: filters.has_contact_person === "true",
        }),
      };

      // Validate export parameters
      const validationErrors =
        supplierExportAPI.validateExportParams(exportParams);
      if (validationErrors.length > 0) {
        showError(`Export validation failed: ${validationErrors.join(", ")}`);
        return;
      }

      // Use the supplier export API
      await supplierExportAPI.exportSuppliers(exportParams);
      showSuccess(
        `Suppliers exported successfully as ${exportFormat.toUpperCase()}`,
      );
      inventoryNotifications.dataExported(exportFormat.toUpperCase());
    } catch (err: any) {
      showApiError(
        err.message ||
          `Failed to export suppliers as ${exportFormat.toUpperCase()}`,
      );
      console.error("Export error:", err);
    } finally {
      setExportLoading(false);
      hideLoading();
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setSelectedSuppliers([]); // Clear selection when filters change
  };

  const handlePageChange = (page: number) => {
    loadSuppliers(page);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "",
      has_tax_id: "",
      has_contact_person: "",
    });
  };

  const toggleSupplierSelection = (supplierId: number) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedSuppliers.length === suppliers.length && suppliers.length > 0) {
      setSelectedSuppliers([]);
    } else {
      setSelectedSuppliers(suppliers.map((supplier) => supplier.id));
    }
  };

  // Bulk operations with dialogs
  const handleBulkOperation = async (
    operation: "approve" | "reject" | "pending" | "delete",
  ) => {
    if (selectedSuppliers.length === 0) return;

    const operationTitles = {
      approve: "Approve Suppliers",
      reject: "Reject Suppliers",
      pending: "Set Suppliers to Pending",
      delete: "Delete Suppliers",
    };

    const operationMessages = {
      approve: `Are you sure you want to approve ${selectedSuppliers.length} supplier(s)? This will allow them to be used in purchases.`,
      reject: `Are you sure you want to reject ${selectedSuppliers.length} supplier(s)? They will not be available for purchases.`,
      pending: `Are you sure you want to set ${selectedSuppliers.length} supplier(s) to pending status?`,
      delete: `Are you sure you want to delete ${selectedSuppliers.length} supplier(s)? This action cannot be undone.`,
    };

    const operationIcons = {
      approve: "success" as const,
      reject: "warning" as const,
      pending: "info" as const,
      delete: "danger" as const,
    };

    const confirmed = await dialogs.confirm({
      title: operationTitles[operation],
      message: operationMessages[operation],
      icon: operationIcons[operation],
      confirmText: operation === "delete" ? "Delete" : "Confirm",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    // showLoading(`Processing ${operation}...`);

    try {
      switch (operation) {
        case "approve":
          await supplierAPI.bulkApproveSuppliers(
            selectedSuppliers,
            `Bulk approval for ${selectedSuppliers.length} suppliers`,
          );
          showSuccess(
            `${selectedSuppliers.length} supplier(s) approved successfully`,
          );
          break;
        case "reject":
          await supplierAPI.bulkRejectSuppliers(
            selectedSuppliers,
            `Bulk rejection for ${selectedSuppliers.length} suppliers`,
          );
          showSuccess(
            `${selectedSuppliers.length} supplier(s) rejected successfully`,
          );
          break;
        case "pending":
          await supplierAPI.bulkSetPendingSuppliers(
            selectedSuppliers,
            `Bulk status reset for ${selectedSuppliers.length} suppliers`,
          );
          showSuccess(
            `${selectedSuppliers.length} supplier(s) set to pending successfully`,
          );
          break;
        case "delete":
          await supplierAPI.bulkDelete(selectedSuppliers);
          inventoryNotifications.productDeleted(
            `${selectedSuppliers.length} suppliers`,
          );
          break;
      }

      // Reload data
      await loadSuppliers(pagination.current_page);
      setSelectedSuppliers([]);
    } catch (err: any) {
      showApiError(err.message || `Failed to perform bulk ${operation}`);
    } finally {
      hideLoading();
    }
  };

  const handleDeleteSupplier = async (supplier: SupplierData) => {
    const confirmed = await dialogs.delete(supplier.name);

    if (!confirmed) return;

    try {
      await supplierAPI.delete(supplier.id);
      inventoryNotifications.productDeleted(supplier.name);
      await loadSuppliers(pagination.current_page);
    } catch (err: any) {
      showApiError(err.message || "Failed to delete supplier");
    }
  };

  const handleStatusUpdate = async (
    supplier: SupplierData,
    newStatus: "approved" | "rejected" | "pending",
  ) => {
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
      await loadSuppliers(pagination.current_page);
    } catch (err: any) {
      showApiError(
        err.message || `Failed to update supplier status to ${newStatus}`,
      );
    }
  };

  const handleQuickApprove = async (supplier: SupplierData) => {
    if (!supplierAPI.canApproveSupplier(supplier)) {
      showError(
        `Cannot approve supplier with current status: ${supplier.status}`,
      );
      return;
    }

    // showLoading('Approving supplier...');

    try {
      await supplierAPI.approveSupplier(supplier.id, `Quick approval`);
      showSuccess(`Supplier "${supplier.name}" approved successfully`);
      await loadSuppliers(pagination.current_page);
    } catch (err: any) {
      showApiError(err.message || "Failed to approve supplier");
    } finally {
      hideLoading();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        class: "bg-yellow-100 text-yellow-800",
        icon: Clock,
        label: "Pending",
      },
      approved: {
        class: "bg-green-100 text-green-800",
        icon: CheckCircle,
        label: "Approved",
      },
      rejected: {
        class: "bg-red-100 text-red-800",
        icon: Ban,
        label: "Rejected",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}
      >
        <IconComponent className="icon-xs mr-xs" />
        {config.label}
      </span>
    );
  };

  const getStatusActions = (supplier: SupplierData) => {
    const availableTransitions =
      supplierAPI.getAvailableStatusTransitions(supplier);

    return availableTransitions.map((status) => (
      <button
        key={status}
        onClick={() => handleStatusUpdate(supplier, status as any)}
        className="block w-full text-left px-base py-sm text-sm text-[var(--sidebar-text)] hover:bg-[var(--card-secondary-bg)]"
      >
        Set as {supplierAPI.getStatusDisplay(status)}
      </button>
    ));
  };

  const formatDate = (dateString: string) => {
    return supplierAPI.formatDateTime(dateString);
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\d{4})-(\d{3})-(\d{4})/, "$1 $2 $3");
  };

  // Quick Stats Data - use the stats from API
  const quickStats = {
    total: stats.total,
    pending: stats.pending,
    approved: stats.approved,
    rejected: stats.rejected,
    withTaxId: stats.withTaxId,
    withContactPerson: stats.withContactPerson,
  };

  return (
    <div
      className="compact-card rounded-lg shadow-sm border"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--sidebar-text)" }}
          >
            Suppliers
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--sidebar-text)" }}>
            Manage supplier information and approval status
          </p>
        </div>
        <div className="flex gap-sm">
          <button
            className="compact-button px-base py-sm rounded-md flex items-center transition-colors"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="icon-sm mr-sm" />
            Filters
          </button>

          {/* Export Format Selector and Button */}
          <div
            className="flex items-center gap-2 rounded-md px-1 border"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <label
              className="text-xs font-medium whitespace-nowrap"
              style={{ color: "var(--sidebar-text)" }}
            >
              Export as:
            </label>
            <select
              value={exportFormat}
              onChange={(e) =>
                setExportFormat(e.target.value as "csv" | "excel" | "pdf")
              }
              className="border text-sm font-medium focus:ring-0 cursor-pointer px-2 py-1 rounded-md"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={handleExport}
              disabled={exportLoading || pagination.count === 0}
              className="compact-button text-[var(--sidebar-text)] rounded-md flex items-center transition-colors disabled:cursor-not-allowed ml-1 px-3 py-2"
              style={{
                backgroundColor:
                  exportLoading || pagination.count === 0
                    ? "var(--default-color)"
                    : "var(--success-color)",
              }}
              title="Export suppliers data"
            >
              <Download className="w-4 h-4 mr-1" />
              {exportLoading ? "Exporting..." : "Export"}
            </button>
          </div>

          <button
            className="compact-button px-base py-sm rounded-md flex items-center transition-colors"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
            onClick={() => loadSuppliers(pagination.current_page)}
            disabled={loading}
          >
            <RefreshCw
              className={`icon-sm mr-sm ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <Link
            to="/suppliers/form"
            className="compact-button px-base py-sm rounded-md flex items-center transition-colors text-[var(--sidebar-text)]"
            style={{ backgroundColor: "var(--primary-color)" }}
          >
            <Plus className="icon-sm mr-sm" />
            New Supplier
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-sm mb-6">
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Total Suppliers
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {quickStats.total}
          </div>
        </div>
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Pending
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--warning-color)" }}
          >
            {quickStats.pending}
          </div>
        </div>
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Approved
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--success-color)" }}
          >
            {quickStats.approved}
          </div>
        </div>
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Rejected
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--danger-color)" }}
          >
            {quickStats.rejected}
          </div>
        </div>
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            With Tax ID
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--accent-blue)" }}
          >
            {quickStats.withTaxId}
          </div>
        </div>
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            With Contact
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--accent-purple)" }}
          >
            {quickStats.withContactPerson}
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-sm mb-6 compact-card rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Search
            </label>
            <input
              type="text"
              placeholder="Search suppliers..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Tax ID
            </label>
            <select
              value={filters.has_tax_id}
              onChange={(e) => handleFilterChange("has_tax_id", e.target.value)}
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All</option>
              <option value="true">With Tax ID</option>
              <option value="false">Without Tax ID</option>
            </select>
          </div>

          <div className="flex items-end gap-sm">
            <button
              onClick={resetFilters}
              className="flex-1 compact-button rounded transition-colors text-[var(--sidebar-text)]"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk selection info */}
      {selectedSuppliers.length > 0 && (
        <div
          className="mb-4 p-sm rounded-md flex items-center justify-between"
          style={{ backgroundColor: "var(--accent-blue-light)" }}
        >
          <span className="text-sm" style={{ color: "var(--accent-emerald)" }}>
            {selectedSuppliers.length} supplier(s) selected
          </span>
          <div className="flex gap-sm">
            <button
              onClick={() => handleBulkOperation("approve")}
              className="p-sm rounded transition-colors flex items-center compact-button text-[var(--sidebar-text)]"
              style={{ backgroundColor: "var(--success-color)" }}
              title="Approve Selected"
            >
              <CheckCircle className="icon-sm mr-xs" />
              Approve
            </button>
            <button
              onClick={() => handleBulkOperation("reject")}
              className="p-sm rounded transition-colors flex items-center compact-button text-[var(--sidebar-text)]"
              style={{ backgroundColor: "var(--danger-color)" }}
              title="Reject Selected"
            >
              <Ban className="icon-sm mr-xs" />
              Reject
            </button>
            <button
              onClick={() => handleBulkOperation("pending")}
              className="p-sm rounded transition-colors flex items-center compact-button text-[var(--sidebar-text)]"
              style={{ backgroundColor: "var(--warning-color)" }}
              title="Set Pending Selected"
            >
              <Clock className="icon-sm mr-xs" />
              Set Pending
            </button>
            <button
              onClick={() => handleBulkOperation("delete")}
              className="p-sm rounded transition-colors flex items-center compact-button text-[var(--sidebar-text)]"
              style={{ backgroundColor: "var(--danger-color)" }}
              title="Delete Selected"
            >
              <Trash2 className="icon-sm mr-xs" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
          <span
            className="ml-3 text-sm"
            style={{ color: "var(--sidebar-text)" }}
          >
            Loading suppliers...
          </span>
        </div>
      )}

      {/* Suppliers Table */}
      {!loading && (
        <>
          <div
            className="rounded-md border"
            style={{ borderColor: "var(--border-color)" }}
          >
            <table
              className="min-w-full divide-y compact-table"
              style={{ borderColor: "var(--border-color)" }}
            >
              <thead style={{ backgroundColor: "var(--card-secondary-bg)" }}>
                <tr>
                  <th
                    scope="col"
                    className="w-12 px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedSuppliers.length === suppliers.length &&
                        suppliers.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-3 w-3 rounded"
                      style={{ color: "var(--accent-blue)" }}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Supplier
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Contact
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Email & Phone
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Address
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-right text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                }}
                className="divide-y"
              >
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-[var(--card-secondary-bg)]"
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <td className="px-md py-sm whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSuppliers.includes(supplier.id)}
                        onChange={() => toggleSupplierSelection(supplier.id)}
                        className="h-3 w-3 rounded"
                        style={{ color: "var(--accent-blue)" }}
                      />
                    </td>
                    <td className="px-md py-sm whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="rounded flex items-center justify-center mr-2"
                          style={{
                            backgroundColor: "var(--accent-emerald-light)",
                          }}
                        >
                          <Building
                            className="icon-lg"
                            style={{ color: "var(--accent-blue)" }}
                          />
                        </div>
                        <div>
                          <div
                            className="text-sm font-medium"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {supplier.name}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            ID: {supplier.id}
                          </div>
                          {supplier.purchase_count !== undefined && (
                            <div
                              className="text-xs"
                              style={{ color: "var(--sidebar-text)" }}
                            >
                              {supplier.purchase_count} purchases
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-md py-sm whitespace-nowrap">
                      <div
                        className="text-sm font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {supplier.contact_person || "N/A"}
                      </div>
                      {supplier.tax_id && (
                        <div
                          className="text-xs"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          Tax ID: {supplier.tax_id}
                        </div>
                      )}
                    </td>
                    <td className="px-md py-sm">
                      <div className="flex flex-col gap-xs">
                        <div
                          className="flex items-center text-sm"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          <Mail
                            className="icon-xs mr-sm"
                            style={{ color: "var(--default-color)" }}
                          />
                          {supplier.email || "N/A"}
                        </div>
                        <div
                          className="flex items-center text-sm"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          <Phone
                            className="icon-xs mr-sm"
                            style={{ color: "var(--default-color)" }}
                          />
                          {supplier.phone
                            ? formatPhoneNumber(supplier.phone)
                            : "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="px-md py-sm">
                      <div
                        className="flex items-start text-sm max-w-xs"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        <MapPin
                          className="icon-xs mr-sm mt-xs flex-shrink-0"
                          style={{ color: "var(--default-color)" }}
                        />
                        <span className="truncate">
                          {supplier.address || "No address provided"}
                        </span>
                      </div>
                    </td>
                    <td className="px-md py-sm whitespace-nowrap">
                      <div className="flex items-center gap-xs">
                        <div className="relative group">
                          <button className="flex items-center gap-xs hover:opacity-80 transition-opacity">
                            {getStatusBadge(supplier.status)}
                          </button>
                          <div
                            className="absolute left-0 mt-xs w-48 rounded-md shadow-sm border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10"
                            style={{
                              backgroundColor: "var(--card-secondary-bg)",
                              borderColor: "var(--border-color)",
                            }}
                          >
                            <div className="py-xs">
                              {getStatusActions(supplier)}
                            </div>
                          </div>
                        </div>
                        {supplier.status === "pending" &&
                          supplierAPI.canApproveSupplier(supplier) && (
                            <button
                              onClick={() => handleQuickApprove(supplier)}
                              className="p-xs rounded transition-colors text-[var(--sidebar-text)]"
                              style={{
                                backgroundColor: "var(--success-color)",
                              }}
                              title="Quick Approve"
                            >
                              <CheckCircle className="icon-xs" />
                            </button>
                          )}
                      </div>
                    </td>
                    <td
                      className="px-md py-sm whitespace-nowrap text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {formatDate(supplier.created_at)}
                    </td>
                    <td className="px-md py-sm whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-xs">
                        <button
                          onClick={() =>
                            navigate(`/suppliers/view/${supplier.id}`)
                          }
                          className="transition-colors p-xs rounded hover:bg-[var(--accent-blue-light)]"
                          style={{ color: "var(--accent-blue)" }}
                          title="View Supplier"
                        >
                          <Eye className="icon-sm" />
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/suppliers/form/${supplier.id}`)
                          }
                          className="transition-colors p-xs rounded hover:bg-[var(--accent-blue-light)]"
                          style={{ color: "var(--accent-blue)" }}
                          title="Edit Supplier"
                        >
                          <Edit className="icon-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier)}
                          className="transition-colors p-xs rounded hover:bg-[var(--accent-red-light)]"
                          style={{ color: "var(--accent-red)" }}
                          title="Delete Supplier"
                        >
                          <Trash2 className="icon-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {suppliers.length === 0 && (
            <div className="text-center py-8">
              <div
                className="text-4xl mb-4"
                style={{ color: "var(--sidebar-text)" }}
              >
                🏢
              </div>
              <p
                className="text-base mb-2"
                style={{ color: "var(--sidebar-text)" }}
              >
                No suppliers found
              </p>
              <p
                className="mb-6 text-sm"
                style={{ color: "var(--sidebar-text)", opacity: 0.7 }}
              >
                {filters.search ||
                filters.status ||
                filters.has_tax_id ||
                filters.has_contact_person
                  ? "Try adjusting your filters to see more results."
                  : "Get started by adding your first supplier."}
              </p>
              <div className="gap-sm">
                <button
                  className="compact-button px-base py-sm rounded-md transition-colors text-[var(--sidebar-text)]"
                  style={{ backgroundColor: "var(--accent-blue)" }}
                  onClick={resetFilters}
                >
                  Clear Filters
                </button>
                <Link
                  to="/suppliers/form"
                  className="compact-button px-base py-sm rounded-md transition-colors inline-flex items-center"
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    color: "var(--sidebar-text)",
                  }}
                >
                  <Plus className="icon-sm mr-sm" />
                  Add First Supplier
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              className="mt-6"
            />
          )}
        </>
      )}
    </div>
  );
};

export default SuppliersPage;
