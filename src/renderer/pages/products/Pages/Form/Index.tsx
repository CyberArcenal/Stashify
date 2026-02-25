// pages/ProductFormPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductForm from "./components/Form";
import {
  showInfo,
  showError,
  showApiError,
} from "@/renderer/utils/notification";
import productAPI, {
  ProductForm as ProductFormData,
  ProductData,
} from "@/renderer/api/product";
import { categoryAPI } from "@/renderer/api/category";
import { systemSettingsAPI, TaxSettings } from "@/renderer/api/systemSettings";
import { dialogs } from "@/renderer/utils/dialogs";

interface ProductFormPageProps {}

const ProductFormPage: React.FC<ProductFormPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const mode = id ? "edit" : "add";

  // Fetch product data for edit mode
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch categories for dropdown
        const categoriesData = await categoryAPI.findAll();
        setCategories(categoriesData);

        // Fetch tax settings
        try {
          const taxData = await systemSettingsAPI.getTaxSettings();
          setTaxSettings(taxData);
        } catch (error) {
          console.warn("Failed to fetch tax settings, using defaults");
          setTaxSettings({
            vat_rate: 0.12, // Default 12% VAT
            tax_rate: 12,
            tax_calculation: "inclusive",
            display_prices: "incl_tax",
            enabled: true,
            tax_flat_amount: 0,
            import_duty_rate: 0,
            excise_tax_rate: 0,
            digital_services_tax_rate: 0,
            round_tax_at_subtotal: false,
            prices_include_tax: true,
          });
        }

        // Fetch product data if in edit mode
        if (mode === "edit" && id) {
          const productId = parseInt(id);
          const productData = await productAPI.findById(productId);
          if (productData) {
            setProduct(productData);
          } else {
            showError("Product not found");
            navigate("/products");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        showError("Failed to load form data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, mode, navigate]);

  const handleSubmit = async (formData: ProductFormData) => {
    try {
      // Prepare product data for the API using the correct field names
      const productData: ProductFormData = {
        name: formData.name,
        description: formData.description || "",
        category: formData.category || null,
        net_price: formData.net_price || "0.00",
        compare_price: formData.compare_price || null,
        cost_per_item: formData.cost_per_item || null,
        image: formData.image || null,
        sku: formData.sku || "",
        barcode: formData.barcode || "",
        weight: formData.weight || null,
        dimensions: formData.dimensions || null,
        is_published:
          formData.is_published !== undefined ? formData.is_published : true,
        warehouses: formData.warehouses || [],
      };

      if (mode === "add") {
        // Create new product
        const newProduct = await productAPI.create(productData);

        // showInfo('Product created successfully!');

        const view = await dialogs.confirm({
          title: "success",
          message: "Product update successfully",
          cancelText: "Return",
          confirmText: "View Products",
          icon: "success",
        });
        if (!view) {
          window.history.back();
        }
        navigate(`/products/view/${newProduct.id}`);
      } else if (mode === "edit" && product) {
        // Update existing product
        const updatedProduct = await productAPI.update(product.id, productData);

        // showInfo('Product updated successfully!');
        const view = await dialogs.confirm({
          title: "success",
          message: "Product update successfully",
          cancelText: "Return",
          confirmText: "View Products",
          icon: "success",
        });
        if (!view) {
          window.history.back();
        }
        navigate(`/products/view/${updatedProduct.id}`);
      }
    } catch (error: any) {
      console.error("Error submitting form:", error);
      showApiError(error.message || "Failed to save product");
    }
  };

  const handleCancel = () => {
    navigate("/products");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-var(--card-bg) flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-[var(--sidebar-text)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Prepare initial form data - map API data to form structure
  const initialFormData = product
    ? {
        name: product.name || "",
        description: product.description || "",
        category: product.category_data?.id,
        net_price: product.net_price || "",
        compare_price: product.compare_price || null,
        cost_per_item: product.cost_per_item || null,
        sku: product.sku || "",
        barcode: product.barcode || "",
        weight: product.weight || null,
        dimensions: product.dimensions || null,
        is_published:
          product.is_published !== undefined ? product.is_published : true,
        // For image preview - you might need to handle this differently based on your API
        image: product.primary_image_url
          ? (product.primary_image_url as any)
          : null,
      }
    : {
        name: "",
        description: "",
        category: null,
        net_price: "",
        compare_price: null,
        cost_per_item: null,
        sku: "",
        barcode: "",
        weight: null,
        dimensions: null,
        is_published: true,
        image: null,
      };

  return (
    <div className="min-h-screen bg-var(--card-bg) py-4">
      <div className="compact-card max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-[var(--sidebar-text)] mb-1">
            {mode === "add" ? "Add New Product" : "Edit Product"}
          </h1>
          <p className="text-sm text-[var(--sidebar-text)]">
            {mode === "add"
              ? "Add a new product to your inventory"
              : `Editing: ${product?.name || "Product"}`}
          </p>
        </div>

        {/* Product Form */}
        <ProductForm
          mode={mode}
          initialData={initialFormData}
          categories={categories}
          taxSettings={taxSettings}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default ProductFormPage;
