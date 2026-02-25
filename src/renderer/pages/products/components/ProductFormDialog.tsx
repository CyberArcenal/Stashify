// src/renderer/pages/inventory/components/ProductFormDialog.tsx
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import CategorySelect from "../../../components/Selects/Category";
import { dialogs } from "../../../utils/dialogs";
import type { Product, ProductCreateData, ProductUpdateData } from "../../../api/core/product";
import productAPI from "../../../api/core/product";

interface ProductFormDialogProps {
  isOpen: boolean;
  mode: "add" | "edit";
  productId: number | null;
  initialData: Partial<Product> | null;
  onClose: () => void;
  onSuccess: () => void;
}

type FormData = {
  name: string;
  sku: string;
  net_price: number;
  cost_per_item: number;
  track_quantity: boolean;
  allow_backorder: boolean;
  is_published: boolean;
  categoryId: number | null;
  description?: string;
  barcode?: string;
  weight?: number;
  dimensions?: string;
};

const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
  isOpen,
  mode,
  productId,
  initialData,
  onClose,
  onSuccess,
}) => {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      name: "",
      sku: "",
      net_price: 0,
      cost_per_item: 0,
      track_quantity: true,
      allow_backorder: false,
      is_published: false,
      categoryId: null,
      description: "",
      barcode: "",
      weight: undefined,
      dimensions: "",
    },
  });

  const categoryId = watch("categoryId");

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || "",
        sku: initialData.sku || "",
        net_price: initialData.net_price || 0,
        cost_per_item: initialData.cost_per_item || 0,
        track_quantity: initialData.track_quantity ?? true,
        allow_backorder: initialData.allow_backorder ?? false,
        is_published: initialData.is_published ?? false,
        categoryId: initialData.category?.id || null,
        description: initialData.description || "",
        barcode: initialData.barcode || "",
        weight: initialData.weight || undefined,
        dimensions: initialData.dimensions || "",
      });
    } else {
      reset();
    }
  }, [initialData, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      if (mode === "add") {
        await productAPI.create(data as ProductCreateData);
        dialogs.alert({ title: "Success", message: "Product created successfully." });
      } else {
        if (!productId) throw new Error("Product ID missing");
        await productAPI.update(productId, data as ProductUpdateData);
        dialogs.alert({ title: "Success", message: "Product updated successfully." });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className="w-full max-w-2xl rounded-lg shadow-xl"
        style={{ backgroundColor: "var(--card-bg)" }}
      >
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <h3 className="text-lg font-semibold" style={{ color: "var(--sidebar-text)" }}>
            {mode === "add" ? "Add New Product" : "Edit Product"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
                Product Name *
              </label>
              <input
                {...register("name", { required: "Name is required" })}
                className="compact-input w-full border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
                SKU *
              </label>
              <input
                {...register("sku", { required: "SKU is required" })}
                className="compact-input w-full border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
              {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku.message}</p>}
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
                Barcode
              </label>
              <input
                {...register("barcode")}
                className="compact-input w-full border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>

            {/* Net Price */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
                Net Price
              </label>
              <input
                type="number"
                step="0.01"
                {...register("net_price", { valueAsNumber: true })}
                className="compact-input w-full border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>

            {/* Cost per Item */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
                Cost per Item
              </label>
              <input
                type="number"
                step="0.01"
                {...register("cost_per_item", { valueAsNumber: true })}
                className="compact-input w-full border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>

            {/* Category */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
                Category
              </label>
              <CategorySelect
                value={categoryId}
                onChange={(id) => setValue("categoryId", id)}
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
                Description
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="compact-input w-full border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>

            {/* Checkboxes */}
            <div className="col-span-2 flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  {...register("track_quantity")}
                  className="h-4 w-4"
                />
                Track Quantity
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  {...register("allow_backorder")}
                  className="h-4 w-4"
                />
                Allow Backorder
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  {...register("is_published")}
                  className="h-4 w-4"
                />
                Published
              </label>
            </div>

            {/* Weight and Dimensions */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
                Weight
              </label>
              <input
                type="number"
                step="0.01"
                {...register("weight", { valueAsNumber: true })}
                className="compact-input w-full border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
                Dimensions
              </label>
              <input
                {...register("dimensions")}
                placeholder="LxWxH"
                className="compact-input w-full border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="compact-button px-4 py-2 rounded-md"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                color: "var(--sidebar-text)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="compact-button px-4 py-2 rounded-md disabled:opacity-50"
              style={{
                backgroundColor: "var(--accent-green)",
                color: "white",
              }}
            >
              {isSubmitting ? "Saving..." : mode === "add" ? "Create" : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormDialog;