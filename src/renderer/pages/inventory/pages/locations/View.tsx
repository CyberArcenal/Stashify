// components/LocationViewPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Warehouse,
  Store,
  Globe,
  MapPin,
  Calendar,
  Tag,
  Package,
  AlertCircle,
} from "lucide-react";
import {
  warehouseAPI,
  WarehouseData,
  StockItemNestedData,
} from "@/renderer/api/warehouse";
import { showError } from "@/renderer/utils/notification";
import { showConfirm } from "@/renderer/utils/dialogs";

const LocationViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [location, setLocation] = useState<WarehouseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockItems, setStockItems] = useState<StockItemNestedData[]>([]);
  const [stockSummary, setStockSummary] = useState<{
    total_items: number;
    total_quantity: number;
    low_stock_items: number;
    out_of_stock_items: number;
    average_quantity_per_item: number;
  } | null>(null);

  // Fetch location data from API
  useEffect(() => {
    const fetchLocation = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const warehouseId = parseInt(id);
        const warehouseData = await warehouseAPI.findById(warehouseId);

        if (warehouseData) {
          setLocation(warehouseData);
          setStockItems(warehouseData.stock_items_data || []);

          // Fetch stock summary
          try {
            const summary =
              await warehouseAPI.getWarehouseStockSummary(warehouseId);
            setStockSummary(summary);
          } catch (summaryError) {
            console.error("Error fetching stock summary:", summaryError);
            // Don't set error state for summary, as it's secondary data
          }
        } else {
          setError("Location not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch location details");
        console.error("Error fetching location:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [id]);

  const handleDelete = async () => {
    if (!location) return;

    const confirmed = await showConfirm({
      title: "Delete Location",
      message: `Are you sure you want to delete "${location.name}"? This action cannot be undone.`,
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await warehouseAPI.delete(location.id);
      // Navigate after successful deletion
      navigate("/locations");
      // Optional: show a success toast here
      // console.log("Location deleted successfully");
    } catch (err: any) {
      // Optional: show an error toast here
      showError(`Failed to delete location: ${err.message}`);
      console.error("Error deleting location:", err);
      setError("Failed to delete location");
    }
  };

  const handleToggleStatus = async () => {
    if (!location) return;

    try {
      const updatedLocation = location.is_active
        ? await warehouseAPI.deactivateWarehouse(location.id)
        : await warehouseAPI.activateWarehouse(location.id);

      setLocation(updatedLocation);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
      console.error("Error updating status:", err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeIcon = (location: WarehouseData) => {
    const locationLower = location.location.toLowerCase();
    if (
      locationLower.includes("warehouse") ||
      locationLower.includes("storage")
    ) {
      return <Warehouse className="icon-md" />;
    } else if (
      locationLower.includes("store") ||
      locationLower.includes("branch") ||
      locationLower.includes("kiosk")
    ) {
      return <Store className="icon-md" />;
    } else if (locationLower.includes("online")) {
      return <Globe className="icon-md" />;
    }
    return <Warehouse className="icon-md" />;
  };

  const getLocationType = (location: WarehouseData): string => {
    const locationLower = location.location.toLowerCase();
    if (
      locationLower.includes("warehouse") ||
      locationLower.includes("storage")
    ) {
      return "warehouse";
    } else if (
      locationLower.includes("store") ||
      locationLower.includes("branch") ||
      locationLower.includes("kiosk")
    ) {
      return "store";
    } else if (locationLower.includes("online")) {
      return "online";
    }
    return "warehouse";
  };

  const getTypeBadge = (location: WarehouseData) => {
    const type = getLocationType(location);
    switch (type) {
      case "warehouse":
        return "bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)]";
      case "store":
        return "bg-[var(--accent-green-light)] text-[var(--accent-green)]";
      case "online":
        return "bg-[var(--accent-purple-light)] text-[var(--accent-purple)]";
      default:
        return "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]";
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    switch (isActive) {
      case true:
        return "bg-[var(--status-success-bg)] text-[var(--status-success-text)]";
      case false:
        return "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]";
      default:
        return "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]";
    }
  };

  const calculateUtilization = (location: WarehouseData): number => {
    return warehouseAPI.calculateWarehouseUtilization(location);
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="compact-card rounded-md border border-[var(--border-color)]">
          <div className="flex justify-center items-center h-64">
            <div className="text-base text-[var(--sidebar-text)]">
              Loading location details...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !location) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="compact-card rounded-md border border-[var(--border-color)]">
          <div className="text-center py-8">
            <div className="text-[var(--sidebar-text)] text-4xl mb-4">❌</div>
            <h2 className="text-lg font-semibold text-[var(--sidebar-text)] mb-2">
              {error || "Location Not Found"}
            </h2>
            <p className="text-[var(--sidebar-text)] mb-4 text-sm">
              The location you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/locations"
              className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] inline-flex items-center"
            >
              <ArrowLeft className="icon-sm mr-sm" />
              Back to Locations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Action Buttons */}
      <div className="compact-card rounded-md border border-[var(--border-color)] mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <Link
              to="/locations"
              className="mr-4 p-2 bg-[var(--card-secondary-bg)] rounded-md hover:bg-[var(--card-hover-bg)]"
            >
              <ArrowLeft className="icon-md text-[var(--sidebar-text)]" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[var(--sidebar-text)]">
                {location.name}
              </h1>
              <p className="text-[var(--sidebar-text)] mt-1 text-sm">
                {warehouseAPI.formatWarehouseDisplay(location)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleStatus}
              className={`compact-button ${
                location.is_active
                  ? "bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)]"
                  : "bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)]"
              } text-[var(--sidebar-text)] flex items-center`}
            >
              {location.is_active ? "Deactivate" : "Activate"}
            </button>
            <Link
              to={`/locations/form/${location.id}`}
              className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] flex items-center"
            >
              <Edit className="icon-sm mr-sm" />
              Edit Location
            </Link>
            <button
              onClick={handleDelete}
              className="compact-button bg-[var(--danger-color)] hover:bg-[var(--danger-hover)] text-[var(--sidebar-text)] flex items-center"
            >
              <Trash2 className="icon-sm mr-sm" />
              Delete Location
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details Card */}
        <div className="lg:col-span-2">
          <div className="compact-card rounded-md border border-[var(--border-color)]">
            <div className="max-w-2xl mx-auto">
              {/* Location Header */}
              <div className="flex items-center mb-6 pb-6 border-b border-[var(--border-color)]">
                <div className="w-16 h-16 rounded-lg bg-[var(--card-secondary-bg)] flex items-center justify-center mr-4">
                  {getTypeIcon(location)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--sidebar-text)]">
                    {location.name}
                  </h2>
                  <p className="text-[var(--sidebar-text)] text-sm">
                    ID: {location.id}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium text-[var(--sidebar-text)] flex items-center">
                    <Tag className="icon-sm mr-2" />
                    Basic Information
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Location ID
                    </label>
                    <p className="text-[var(--sidebar-text)] font-mono font-medium text-sm">
                      {location.id}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Location Name
                    </label>
                    <p className="text-[var(--sidebar-text)] font-medium text-sm">
                      {location.name}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Type
                    </label>
                    <div className="flex items-center">
                      <span className="mr-2">{getTypeIcon(location)}</span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeBadge(location)}`}
                      >
                        {getLocationType(location).charAt(0).toUpperCase() +
                          getLocationType(location).slice(1)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Status
                    </label>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(location.is_active)}`}
                    >
                      {location.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium text-[var(--sidebar-text)] flex items-center">
                    <Calendar className="icon-sm mr-2" />
                    Additional Information
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Date Created
                    </label>
                    <p className="text-[var(--sidebar-text)] text-sm">
                      {formatDate(location.created_at)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Last Updated
                    </label>
                    <p className="text-[var(--sidebar-text)] text-sm">
                      {formatDate(location.updated_at)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1 flex items-center">
                      <MapPin className="icon-sm mr-1" />
                      Location
                    </label>
                    <p className="text-[var(--sidebar-text)] text-sm">
                      {location.location}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Utilization Rate
                    </label>
                    <div className="flex items-center">
                      <div className="w-full bg-[var(--card-secondary-bg)] rounded-full h-2 mr-2">
                        <div
                          className="bg-[var(--accent-blue)] h-2 rounded-full"
                          style={{
                            width: `${calculateUtilization(location)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-[var(--sidebar-text)]">
                        {calculateUtilization(location).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                <h3 className="text-base font-medium text-[var(--sidebar-text)] mb-4">
                  Quick Actions
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/locations"
                    className="compact-button bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--sidebar-text)] flex items-center"
                  >
                    <ArrowLeft className="icon-sm mr-sm" />
                    Back to Locations
                  </Link>
                  <Link
                    to={`/locations/form/${location.id}`}
                    className="compact-button bg-[var(--accent-emerald-light)] hover:bg-[var(--accent-blue-hover-light)] text-[var(--accent-emerald)] flex items-center"
                  >
                    <Edit className="icon-sm mr-sm" />
                    Edit Location
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="compact-button bg-[var(--accent-red-light)] hover:bg-[var(--danger-hover-light)] text-[var(--danger-color)] flex items-center"
                  >
                    <Trash2 className="icon-sm mr-sm" />
                    Delete Location
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar with Stock Information */}
        <div className="space-y-6">
          {/* Stock Summary Card */}
          <div className="compact-card rounded-md border border-[var(--border-color)]">
            <h3 className="text-base font-medium text-[var(--sidebar-text)] flex items-center mb-4">
              <Package className="icon-sm mr-2" />
              Stock Summary
            </h3>

            {stockSummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-[var(--card-secondary-bg)] rounded-md">
                    <div className="text-xl font-bold text-[var(--sidebar-text)]">
                      {stockSummary.total_items}
                    </div>
                    <div className="text-sm text-[var(--sidebar-text)]">
                      Total Items
                    </div>
                  </div>
                  <div className="text-center p-3 bg-[var(--card-secondary-bg)] rounded-md">
                    <div className="text-xl font-bold text-[var(--sidebar-text)]">
                      {stockSummary.total_quantity}
                    </div>
                    <div className="text-sm text-[var(--sidebar-text)]">
                      Total Quantity
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--sidebar-text)]">
                      Low Stock Items:
                    </span>
                    <span className="font-medium text-[var(--accent-orange)]">
                      {stockSummary.low_stock_items}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--sidebar-text)]">
                      Out of Stock:
                    </span>
                    <span className="font-medium text-[var(--danger-color)]">
                      {stockSummary.out_of_stock_items}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--sidebar-text)]">
                      Avg per Item:
                    </span>
                    <span className="font-medium text-[var(--sidebar-text)]">
                      {stockSummary.average_quantity_per_item.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-[var(--sidebar-text)] text-sm">
                Loading stock data...
              </div>
            )}
          </div>

          {/* Stock Items Card */}
          <div className="compact-card rounded-md border border-[var(--border-color)]">
            <h3 className="text-base font-medium text-[var(--sidebar-text)] flex items-center mb-4">
              <Package className="icon-sm mr-2" />
              Stock Items ({stockItems.length})
            </h3>

            {stockItems.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {stockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-[var(--card-secondary-bg)] rounded-md hover:bg-[var(--card-hover-bg)]"
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--sidebar-text)] truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-[var(--sidebar-text)]">
                        ID: {item.id}
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.quantity === 0
                          ? "bg-[var(--accent-red-light)] text-[var(--danger-color)]"
                          : item.quantity <= 10
                            ? "bg-[var(--accent-orange-light)] text-[var(--accent-orange)]"
                            : "bg-[var(--accent-green-light)] text-[var(--accent-green)]"
                      }`}
                    >
                      {item.quantity} in stock
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="icon-xl text-[var(--sidebar-text)] mx-auto mb-3" />
                <p className="text-[var(--sidebar-text)] text-sm">
                  No stock items found in this location
                </p>
              </div>
            )}
          </div>

          {/* Status Card */}
          <div className="compact-card rounded-md border border-[var(--border-color)]">
            <h3 className="text-base font-medium text-[var(--sidebar-text)] flex items-center mb-4">
              <AlertCircle className="icon-sm mr-2" />
              Location Status
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--sidebar-text)]">
                  Current Status:
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(location.is_active)}`}
                >
                  {location.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <button
                onClick={handleToggleStatus}
                className={`w-full text-center py-2 px-4 rounded-md text-sm font-medium ${
                  location.is_active
                    ? "bg-[var(--accent-orange-light)] text-[var(--accent-orange)] hover:bg-[var(--accent-orange)] hover:text-[var(--sidebar-text)]"
                    : "bg-[var(--accent-green-light)] text-[var(--accent-green)] hover:bg-[var(--accent-green)] hover:text-[var(--sidebar-text)]"
                }`}
              >
                {location.is_active
                  ? "Deactivate Location"
                  : "Activate Location"}
              </button>

              <div className="text-xs text-[var(--sidebar-text)] mt-2">
                {location.is_active
                  ? "Active locations can receive and ship inventory."
                  : "Inactive locations cannot process inventory movements."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationViewPage;
