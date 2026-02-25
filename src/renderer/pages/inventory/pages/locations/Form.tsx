// components/LocationFormPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LocationForm from "./components/Form";
import {
  warehouseAPI,
  WarehouseData,
  WarehouseForm,
} from "@/renderer/api/warehouse";

const LocationFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode = id ? "edit" : "add";
  const [location, setLocation] = useState<WarehouseData | null>(null);

  // Fetch location data for edit mode
  useEffect(() => {
    const fetchLocation = async () => {
      if (mode === "edit" && id) {
        try {
          setLoading(true);
          const warehouseId = parseInt(id);
          const warehouseData = await warehouseAPI.findById(warehouseId);
          setLocation(warehouseData);
          setError(null);
        } catch (err: any) {
          setError(err.message || "Failed to fetch location details");
          console.error("Error fetching location:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchLocation();
  }, [id, mode]);

  const handleSubmit = async (formData: WarehouseForm) => {
    try {
      setLoading(true);
      setError(null);

      if (mode === "add") {
        // Create new warehouse
        await warehouseAPI.create(formData);
      } else if (mode === "edit" && id) {
        // Update existing warehouse
        await warehouseAPI.update(parseInt(id), formData);
      }

      navigate("/locations");
    } catch (err: any) {
      setError(
        err.message ||
          `Failed to ${mode === "add" ? "create" : "update"} location`,
      );
      console.error("Error submitting form:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/locations");
  };

  // Convert warehouse data to initial form data
  const initialFormData = location
    ? {
        name: location.name,
        type: location.type,
        location: location.location,
        is_active: location.is_active,
      }
    : undefined;

  // Loading state for edit mode
  if (mode === "edit" && loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-[#253F4E] p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex justify-center items-center h-32">
            <div className="text-lg text-gray-600 dark:text-[#9ED9EC]">
              Loading location data...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state for edit mode
  if (mode === "edit" && error && !location) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-[#253F4E] p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-[#9ED9EC] text-5xl mb-4">
              ❌
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#9ED9EC] mb-2">
              Location Not Found
            </h2>
            <p className="text-gray-500 dark:text-[#9ED9EC] mb-4">{error}</p>
            <button
              onClick={handleCancel}
              className="bg-blue-600 hover:bg-blue-700 text-[var(--sidebar-text)] px-4 py-2 rounded-lg"
            >
              Back to Locations
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-[#253F4E] p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
            <div className="flex items-center">
              <div className="text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#9ED9EC]">
            {mode === "add" ? "Add New Location" : "Edit Location"}
          </h2>
          <p className="text-gray-500 dark:text-[#9ED9EC] mt-1">
            {mode === "add"
              ? "Create a new warehouse location"
              : `Edit ${location?.name} warehouse`}
          </p>
        </div>

        <LocationForm
          mode={mode}
          initialData={initialFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default LocationFormPage;
