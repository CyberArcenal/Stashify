// components/CategoryFormPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CategoryForm from "./components/Form";
import {
  categoryAPI,
  CategoryData,
  CategoryForm as CategoryFormType,
} from "@/renderer/api/category";
import { dialogs } from "@/renderer/utils/dialogs";
import {
  showSuccess,
  showError,
  showLoading,
  hideLoading,
} from "@/renderer/utils/notification";

const CategoryFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [oldForm, setOldForm] = useState<CategoryFormType>();
  const [isOldFormLoaded, setIsOldFormLoaded] = useState<boolean>();

  const mode = id ? "edit" : "add";

  // Fetch category data when in edit mode
  useEffect(() => {
    const fetchCategory = async () => {
      if (mode === "edit" && id) {
        try {
          setLoading(true);
          const categoryData = await categoryAPI.findById(parseInt(id));
          setCategory(categoryData);

          if (!categoryData) {
            await dialogs.error(
              "Category not found",
              "The category you are trying to edit does not exist or has been deleted.",
            );
            navigate("/products/categories");
            return;
          }
        } catch (err) {
          console.error("Error fetching category:", err);
          await dialogs.error(
            "Failed to Load Category",
            "There was an error loading the category data. Please try again.",
          );
          navigate("/products/categories");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [id, mode, navigate]);

  const handleSubmit = async (formData: CategoryFormType) => {
    setSubmitting(true);
    showLoading("Saving category...");

    try {
      let response;
      if (mode === "edit" && id) {
        response = await categoryAPI.update(parseInt(id), formData);
        showSuccess(`Category "${response.name}" updated successfully`);
      } else {
        response = await categoryAPI.create(formData);
        showSuccess(`Category "${response.name}" created successfully`);
      }

      // Navigate back after a short delay to show the success message
      setTimeout(() => {
        navigate("/products/categories");
      }, 1500);
    } catch (error: any) {
      console.error("Error saving category:", error);

      // Extract meaningful error message
      let errorMessage = "Failed to save category. Please try again.";
      if (error.message) {
        errorMessage = error.message;
      }

      await dialogs.error(
        mode === "add"
          ? "Failed to Create Category"
          : "Failed to Update Category",
        errorMessage,
      );
    } finally {
      setSubmitting(false);
      hideLoading();
    }
  };

  const handleCancel = async (form: CategoryFormType | undefined) => {
    if (formHasChanges(form, oldForm)) {
      const confirmed = await dialogs.confirm({
        title: "Unsaved Changes",
        message: "You have unsaved changes. Are you sure you want to leave?",
        confirmText: "Leave",
        cancelText: "Stay",
        icon: "warning",
      });

      if (confirmed) {
        navigate("/products/categories");
      }
    } else {
      navigate("/products/categories");
    }
  };

  // Check if form has unsaved changes
  const formHasChanges = (
    form: CategoryFormType | undefined,
    initialFormData: CategoryFormType | undefined,
  ): boolean => {
    if (!form || !initialFormData) return false;

    // Simple shallow comparison
    return Object.keys(initialFormData).some((key) => {
      const k = key as keyof CategoryFormType;
      return form[k] !== initialFormData[k];
    });
  };

  // Convert API category data to initial form data
  const initialFormData = category
    ? {
        name: category.name,
        description: category.description,
        parent: category.parent_data?.id || null,
        color: category.color || "#3B82F6",
        is_active: category.is_active,
        image: null, // We don't set image from initial data as it's a File object
      }
    : undefined;

  useEffect(() => {
    if (initialFormData && !isOldFormLoaded) {
      setOldForm(initialFormData);
      setIsOldFormLoaded(true);
    }
  }, [initialFormData]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#253F4E] p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-[#9ED9EC] mb-2">
            {mode === "edit" ? "Loading Category..." : "Preparing Form..."}
          </h3>
          <p className="text-gray-500 dark:text-[#9ED9EC] text-sm">
            Please wait while we{" "}
            {mode === "edit"
              ? "load the category data"
              : "get everything ready"}
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#253F4E] p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#9ED9EC]">
              {mode === "add" ? "Add New Category" : `Edit ${category?.name}`}
            </h2>
            <p className="text-gray-500 dark:text-[#9ED9EC] mt-1">
              {mode === "add"
                ? "Create a new product category"
                : `Update category details and settings`}
            </p>
          </div>
          {mode === "edit" && category && (
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  category.is_active
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {category.is_active ? "Active" : "Inactive"}
              </span>
              <span className="text-xs text-gray-500 dark:text-[#9ED9EC]">
                ID: {category.id}
              </span>
            </div>
          )}
        </div>
      </div>

      <CategoryForm
        mode={mode}
        initialData={initialFormData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitting={submitting}
      />
    </div>
  );
};

export default CategoryFormPage;
