// components/LocationsTablePage.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Eye, Edit, Trash2, Filter, Download } from "lucide-react";
import { warehouseAPI, WarehouseData } from "@/renderer/api/warehouse";

import {
  warehouseExportAPI,
  WarehouseExportParams,
} from "@/renderer/api/exports/warehouse";
import { dialogs, showConfirm } from "@/renderer/utils/dialogs";
import {
  stockExportAPI,
  StockExportParams,
} from "@/renderer/api/exports/stocks";
import { stockItemAPI, StockSummary } from "@/renderer/api/stockItem";
import WarehouseTypeBadge from "@/renderer/components/Badge/Warehouse";

const LocationsTablePage: React.FC = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [locations, setLocations] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Export states
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );
  const [warehouseExportLoading, setWarehouseExportLoading] = useState(false);
  const [warehouseExportFormat, setWarehouseExportFormat] = useState<
    "csv" | "excel" | "pdf"
  >("csv");

  // Fetch locations from API
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const warehouses = await warehouseAPI.findAll();
        setLocations(warehouses);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to fetch locations");
        console.error("Error fetching locations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Filter locations based on type and status
  const filteredLocations = locations.filter((location) => {
    const typeMatch = typeFilter === "all" || location.type === typeFilter;
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && location.is_active) ||
      (statusFilter === "inactive" && !location.is_active);

    return typeMatch && statusMatch;
  });

  // Handle stock items export
  const handleStockExport = async () => {
    if (filteredLocations.length === 0) {
      await dialogs.warning("No warehouses available to export stock items.");
      return;
    }

    try {
      setExportLoading(true);

      // Get selected warehouse IDs for filtering
      const warehouseIds = filteredLocations
        .map((location) => location.id)
        .join(",");

      const exportParams: StockExportParams = {
        format: exportFormat,
        warehouses: warehouseIds,
      };

      // Show confirmation dialog
      const confirmed = await dialogs.confirm({
        title: "Export Stock Items",
        message: `Are you sure you want to export stock items from ${filteredLocations.length} warehouse(s) in ${exportFormat.toUpperCase()} format?`,
        icon: "info",
      });

      if (!confirmed) return;

      // Call the export API
      await stockExportAPI.exportStockItems(exportParams);
      await dialogs.success(
        `Stock items exported successfully in ${exportFormat.toUpperCase()} format`,
      );
    } catch (err: any) {
      console.error("Export failed:", err);
      await dialogs.error(`Failed to export stock items: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle warehouse export
  const handleWarehouseExport = async () => {
    if (filteredLocations.length === 0) {
      await dialogs.warning("No warehouses available to export.");
      return;
    }

    try {
      setWarehouseExportLoading(true);

      const exportParams: WarehouseExportParams = {
        format: warehouseExportFormat,
        type: typeFilter !== "all" ? typeFilter : undefined,
        status:
          statusFilter !== "all"
            ? (statusFilter as "active" | "inactive" | undefined)
            : undefined,
      };

      const confirmed = await dialogs.confirm({
        title: "Export Warehouses",
        message: `Are you sure you want to export ${filteredLocations.length} warehouse(s) in ${warehouseExportFormat.toUpperCase()} format?`,
        icon: "info",
      });

      if (!confirmed) return;

      await warehouseExportAPI.exportWarehouses(exportParams);
      await dialogs.success(
        `Warehouses exported successfully in ${warehouseExportFormat.toUpperCase()} format`,
      );
    } catch (err: any) {
      console.error("Warehouse export failed:", err);
      await dialogs.error(`Failed to export warehouses: ${err.message}`);
    } finally {
      setWarehouseExportLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const confirmed = await showConfirm({
      title: "Delete Location",
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await warehouseAPI.delete(id);
      // Remove the deleted location from state
      setLocations((prev) => prev.filter((location) => location.id !== id));
      // You might want to show a success toast here
      // console.log("Location deleted successfully");
    } catch (err: any) {
      // You might want to show an error toast here
      dialogs.info(`Failed to delete location: ${err.message}`);
      console.error("Error deleting location:", err);
      setError("Failed to delete location");
    }
  };

  // Status utilities
  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
      : "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const resetFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
  };

  // Count locations by type
  const getLocationCountByType = (type: string) => {
    return locations.filter((location) => location.type === type).length;
  };

  async function fetchStockSummary() {
    const response = await stockItemAPI.getStockSummary();
    setStockSummary(response);
  }

  const [stockSummary, setStockSummary] = useState<StockSummary>({
    totalItems: 0,
    totalLowStock: 0,
    totalOutOfStock: 0,
  });

  useEffect(() => {
    fetchStockSummary();
  }, []);

  // Check if stock item is low stock - FIXED
  const isLowStockItem = (item: any): boolean => {
    return (
      item.available_quantity <= item.low_stock_threshold &&
      item.available_quantity > 0
    );
  };

  // Check if stock item is out of stock - FIXED
  const isOutOfStockItem = (item: any): boolean => {
    return item.available_quantity <= 0;
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] compact-card rounded-md shadow-md border border-[var(--border-color)]">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-[var(--sidebar-text)]">
            Loading locations...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-[var(--card-bg)] compact-card rounded-md shadow-md border border-[var(--border-color)]">
        <div className="text-center py-12">
          <div className="text-[var(--danger-color)] text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-[var(--sidebar-text)] mb-2">
            Failed to load locations
          </h3>
          <p className="text-[var(--sidebar-text)] mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] compact-card rounded-md shadow-md border border-[var(--border-color)]">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--sidebar-text)]">
            Locations
          </h2>
          <p className="text-[var(--sidebar-text)] mt-1 text-sm">
            Manage your business locations and inventory storage
          </p>
        </div>
        <div className="flex gap-sm">
          {/* Warehouse Export */}
          <div className="flex items-center gap-xs bg-[var(--card-secondary-bg)] rounded-md px-1 border border-[var(--border-color)]">
            <label className="text-xs font-medium text-[var(--sidebar-text)] whitespace-nowrap">
              Export as:
            </label>
            <select
              value={warehouseExportFormat}
              onChange={(e) =>
                setWarehouseExportFormat(
                  e.target.value as "csv" | "excel" | "pdf",
                )
              }
              className="compact-input border border-[var(--border-color)] bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] text-sm font-medium focus:ring-0 cursor-pointer px-xs py-xs rounded-md"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={handleWarehouseExport}
              disabled={
                warehouseExportLoading || filteredLocations.length === 0
              }
              className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] disabled:bg-gray-400 text-[var(--sidebar-text)] rounded-md flex items-center transition-colors disabled:cursor-not-allowed ml-xs"
              title="Export warehouse data"
            >
              <Download className="icon-sm mr-xs" />
              {warehouseExportLoading ? "Exporting..." : "Export"}
            </button>
          </div>

          {/* Stock Export */}
          <div className="flex items-center gap-xs bg-[var(--card-secondary-bg)] rounded-md px-1 border border-[var(--border-color)]">
            <label className="text-xs font-medium text-[var(--sidebar-text)] whitespace-nowrap">
              Export Stock as:
            </label>
            <select
              value={exportFormat}
              onChange={(e) =>
                setExportFormat(e.target.value as "csv" | "excel" | "pdf")
              }
              className="compact-input border border-[var(--border-color)] bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] text-sm font-medium focus:ring-0 cursor-pointer px-xs py-xs rounded-md"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={handleStockExport}
              disabled={exportLoading || filteredLocations.length === 0}
              className="compact-button bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] disabled:bg-gray-400 text-[var(--sidebar-text)] rounded-md flex items-center transition-colors disabled:cursor-not-allowed ml-xs"
              title="Export stock items from filtered warehouses"
            >
              <Download className="icon-sm mr-xs" />
              {exportLoading ? "Exporting..." : "Export Stock"}
            </button>
          </div>

          <button
            className="compact-button bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] rounded-md flex items-center"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="icon-sm mr-sm" />
            Filters
          </button>
          <Link
            to="/locations/form"
            className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-md flex items-center"
          >
            <Plus className="icon-sm mr-sm" />
            Add Location
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-sm mb-4 p-4 bg-[var(--card-secondary-bg)] rounded-md">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="compact-input w-full border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--sidebar-text)]"
            >
              <option value="all">All Types</option>
              <option value="warehouse">Warehouse</option>
              <option value="store">Store</option>
              <option value="online">Online Store</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="compact-input w-full border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--sidebar-text)]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="compact-button w-full bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] hover:bg-[var(--primary-hover)]"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-sm mb-4">
        <div className="bg-[var(--card-secondary-bg)] compact-stats rounded-md border border-[var(--border-color)]">
          <div className="text-sm text-[var(--sidebar-text)]">
            Total Locations
          </div>
          <div className="text-xl font-bold text-[var(--sidebar-text)] mt-1">
            {locations.length}
          </div>
        </div>
        <div className="bg-[var(--card-secondary-bg)] compact-stats rounded-md border border-[var(--border-color)]">
          <div className="text-sm text-[var(--sidebar-text)]">Warehouses</div>
          <div className="text-xl font-bold text-[var(--accent-blue)] mt-1">
            {getLocationCountByType("warehouse")}
          </div>
        </div>
        <div className="bg-[var(--card-secondary-bg)] compact-stats rounded-md border border-[var(--border-color)]">
          <div className="text-sm text-[var(--sidebar-text)]">Stores</div>
          <div className="text-xl font-bold text-[var(--accent-green)] mt-1">
            {getLocationCountByType("store")}
          </div>
        </div>
        <div className="bg-[var(--card-secondary-bg)] compact-stats rounded-md border border-[var(--border-color)]">
          <div className="text-sm text-[var(--sidebar-text)]">
            Online Stores
          </div>
          <div className="text-xl font-bold text-[var(--accent-purple)] mt-1">
            {getLocationCountByType("online")}
          </div>
        </div>
        <div className="bg-[var(--card-secondary-bg)] compact-stats rounded-md border border-[var(--border-color)]">
          <div className="text-sm text-[var(--sidebar-text)]">
            Total Stock Items
          </div>
          <div className="text-xl font-bold text-[var(--accent-orange)] mt-1">
            {stockSummary.totalItems || 0}
          </div>
        </div>
      </div>

      {/* Stock Health Summary */}
      {(stockSummary.totalLowStock > 0 || stockSummary.totalOutOfStock > 0) && (
        <div className="mb-4 p-3 bg-[var(--accent-orange-light)] border border-[var(--warning-color)] rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-[var(--warning-color)] text-sm font-medium">
                Stock Health Summary
              </span>
            </div>
            <div className="flex gap-4 text-xs">
              {stockSummary.totalLowStock > 0 && (
                <span className="text-[var(--accent-orange)]">
                  ⚠️ {stockSummary.totalLowStock || 0} low stock items
                </span>
              )}
              {stockSummary.totalOutOfStock > 0 && (
                <span className="text-[var(--danger-color)]">
                  ❌ {stockSummary.totalOutOfStock || 0} out of stock items
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Locations Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border-color)] compact-table">
          <thead className="bg-[var(--card-secondary-bg)]">
            <tr>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
              >
                ID
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
              >
                Stock Items
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
              >
                Date Created
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
              >
                Last Updated
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-right text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
            {filteredLocations.map((location) => {
              const stockItemsCount = location.stock_items_data?.length || 0;

              // FIXED: Using proper StockItemData properties
              const lowStockCount =
                location.stock_items_data?.filter((item) =>
                  isLowStockItem(item),
                ).length || 0;

              const outOfStockCount =
                location.stock_items_data?.filter((item) =>
                  isOutOfStockItem(item),
                ).length || 0;

              return (
                <tr
                  key={location.id}
                  className="hover:bg-[var(--card-secondary-bg)]"
                  style={{ borderBottom: "1px solid var(--border-color)" }}
                >
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--sidebar-text)]">
                      {location.id}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--sidebar-text)]">
                      {location.name}
                    </div>
                    <div className="text-sm text-[var(--sidebar-text)] truncate max-w-xs">
                      {location.location}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <WarehouseTypeBadge
                        type={location.type as "warehouse" | "store" | "online"}
                        size="sm"
                        showIcon={true}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(location.is_active)}`}
                    >
                      {location.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm text-[var(--sidebar-text)] font-medium">
                      {stockItemsCount}
                    </div>
                    {(lowStockCount > 0 || outOfStockCount > 0) && (
                      <div className="text-xs text-[var(--sidebar-text)] flex gap-1 mt-1">
                        {lowStockCount > 0 && (
                          <span
                            className="text-[var(--accent-orange)]"
                            title="Low stock items"
                          >
                            ⚠️ {lowStockCount}
                          </span>
                        )}
                        {outOfStockCount > 0 && (
                          <span
                            className="text-[var(--danger-color)]"
                            title="Out of stock items"
                          >
                            ❌ {outOfStockCount}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--sidebar-text)]">
                    {formatDate(location.created_at)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--sidebar-text)]">
                    {formatDate(location.updated_at)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-xs">
                      <button
                        onClick={() =>
                          navigate(`/locations/view/${location.id}`)
                        }
                        className="text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)]"
                        title="View Location"
                      >
                        <Eye className="icon-sm" />
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/locations/form/${location.id}`)
                        }
                        className="text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)]"
                        title="Edit Location"
                      >
                        <Edit className="icon-sm" />
                      </button>
                      <button
                        onClick={() => handleDelete(location.id, location.name)}
                        className="text-[var(--danger-color)] hover:text-[var(--danger-hover)]"
                        title="Delete Location"
                      >
                        <Trash2 className="icon-sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {filteredLocations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-[var(--sidebar-text)] text-5xl mb-4">🏢</div>
          <h3 className="text-base font-medium text-[var(--sidebar-text)] mb-2">
            No locations found
          </h3>
          <p className="text-[var(--sidebar-text)] mb-6 text-sm">
            {typeFilter !== "all" || statusFilter !== "all"
              ? "No locations match your current filters. Try adjusting your search criteria."
              : "Get started by adding your first location."}
          </p>
          <div className="flex justify-center gap-sm">
            {(typeFilter !== "all" || statusFilter !== "all") && (
              <button
                onClick={resetFilters}
                className="compact-button bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)]"
              >
                Clear Filters
              </button>
            )}
            <Link
              to="/locations/form"
              className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] inline-flex items-center"
            >
              <Plus className="icon-sm mr-sm" />
              Add Location
            </Link>
          </div>
        </div>
      )}

      {/* Table Footer */}
      {filteredLocations.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-[var(--sidebar-text)]">
            Showing{" "}
            <span className="font-medium">{filteredLocations.length}</span> of{" "}
            <span className="font-medium">{locations.length}</span> locations
            {(typeFilter !== "all" || statusFilter !== "all") && (
              <span className="ml-2">
                (filtered
                {typeFilter !== "all" && ` by type: ${typeFilter}`}
                {statusFilter !== "all" && ` and status: ${statusFilter}`})
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--sidebar-text)]">
            Total stock items:{" "}
            <span className="font-medium">{stockSummary.totalItems}</span>
            {stockSummary.totalLowStock > 0 && (
              <span className="ml-2 text-[var(--accent-orange)]">
                • {stockSummary.totalLowStock || 0} low stock
              </span>
            )}
            {stockSummary.totalOutOfStock > 0 && (
              <span className="ml-2 text-[var(--danger-color)]">
                • {stockSummary.totalOutOfStock || 0} out of stock
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationsTablePage;
