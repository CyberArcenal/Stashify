// pages/PurchaseOrderFormPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  showInfo,
  showError,
  showApiError,
} from "@/renderer/utils/notification";
// import PurchaseOrderForm from './components/Form';
import {
  purchaseAPI,
  PurchaseData,
  PurchaseForm,
} from "@/renderer/api/purchase";
import { purchaseItemAPI, PurchaseItemForm } from "@/renderer/api/purchaseItem";
import { supplierAPI, SupplierData } from "@/renderer/api/supplier";
import { warehouseAPI, WarehouseData } from "@/renderer/api/warehouse";
import productAPI, { ProductData } from "@/renderer/api/product";
import { systemSettingsAPI } from "@/renderer/api/systemSettings";
import PurchaseOrderForm from "./components/PurchaseOrderForm";
import { dialogs } from "@/renderer/utils/dialogs";

const PurchaseOrderFormPage: React.FC = () => {
  const { id, productId, variantId } = useParams<{
    id?: string;
    productId?: string;
    variantId?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState<boolean>(true);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseData | null>(null);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemForm[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [supplierTaxRate, setSupplierTaxRate] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const mode = id ? "edit" : "add";
  const isEditMode = mode === "edit";

  // Get pre-selected supplier from navigation state
  const preSelectedSupplierId = location.state?.supplierId;

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch suppliers, warehouses, products, and tax settings in parallel
        const [suppliersData, warehousesData, productsData, taxSettings] =
          await Promise.all([
            supplierAPI.findAll({ is_active: true }),
            warehouseAPI.findAll({ is_active: true }),
            productAPI.findAll(),
            systemSettingsAPI.getSupplierTaxSettings(),
          ]);

        setSuppliers(suppliersData);
        setWarehouses(warehousesData);
        setProducts(productsData);
        setSupplierTaxRate(taxSettings?.rate || 0);

        // If in edit mode, fetch purchase order and items
        if (isEditMode && id) {
          const purchaseData = await purchaseAPI.findById(Number(id));
          if (purchaseData) {
            setPurchaseOrder(purchaseData);

            // Fetch purchase items
            const items = await purchaseItemAPI.getByPurchase(Number(id));
            // console.log('Product in puchase form', items)
            const formattedItems: PurchaseItemForm[] = items.map((item) => ({
              purchase: item.purchase_data?.id || 0,
              product: item.product_data?.id || 0,
              variant: item.variant_data?.id || undefined,
              quantity: item.quantity,
              unit_cost: parseFloat(item.unit_cost),
              total: parseFloat(item.total),
            }));
            setPurchaseItems(formattedItems);
          } else {
            setError(`Purchase order with ID "${id}" not found`);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load data");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode]);

  const handleSubmit = async (formData: any) => {
    const confirm = await dialogs.confirm({
      message: isEditMode
        ? "Are you sure you want to update this purchase order?"
        : "Are you sure you want to create this purchase order?",
      title: isEditMode ? "Confirm Update" : "Confirm Creation",
    });
    if (!confirm) return;
    try {
      setError(null);

      // Prepare purchase items data
      const itemsData = formData.items.map((item: any) => ({
        product: item.productId,
        variant: item.variantId || null,
        quantity: item.qty,
        unit_cost: item.cost.toString(),
      }));

      // Prepare purchase form data (aligned with backend)
      const purchaseFormData: PurchaseForm = {
        supplier: formData.supplier,
        warehouse: formData.warehouseId,
        notes: formData.notes || "",
        items: itemsData,
        auto_generate_purchase_number: true,
      };

      if (isEditMode && purchaseOrder) {
        // Update existing purchase order
        await purchaseAPI.update(purchaseOrder.id, purchaseFormData);
        showInfo("Purchase order updated successfully!");
      } else {
        // Create new purchase order
        await purchaseAPI.create(purchaseFormData);
        showInfo("Purchase order created successfully!");
      }

      navigate("/purchases");
    } catch (err: any) {
      const errorMessage =
        err.message ||
        `Failed to ${isEditMode ? "update" : "create"} purchase order`;
      setError(errorMessage);
      showApiError(errorMessage);
      console.error("Error submitting form:", err);
    }
  };

  const handleCancel = () => {
    showInfo("Changes were cancelled");
    navigate("/purchases");
  };

  // Get initial form data - convert PurchaseItemForm to PurchaseOrderItem format
  // pages/PurchaseOrderFormPage.tsx - Palitan ang getInitialFormData function
  const getInitialFormData = () => {
    if (isEditMode && purchaseOrder) {
      // Convert PurchaseItemForm[] to PurchaseOrderItem[]
      const items = purchaseItems.map((item) => ({
        productId: item.product as number,
        variantId: item.variant ? Number(item.variant) : 0,
        qty: item.quantity,
        cost: item.unit_cost,
      }));

      return {
        supplier: purchaseOrder.supplier_data.id,
        supplierName: purchaseOrder.supplier_name,
        warehouseId: (purchaseOrder as any).warehouse || 0,
        items: items,
        notes: purchaseOrder.notes || "",
        date: purchaseOrder.created_at.split("T")[0],
      };
    } else {
      // For new purchase order
      const initialSupplier = preSelectedSupplierId
        ? suppliers.find((s) => s.id === Number(preSelectedSupplierId))
        : undefined;

      // Initialize with empty item or pre-selected product/variant
      let initialItems = [{ productId: 0, variantId: 0, qty: 1, cost: 0 }];

      // Check if we have pre-selected product or variant
      if (productId || variantId) {
        let selectedProduct: ProductData | undefined;
        let selectedVariant: any | undefined;

        if (productId) {
          // Find the product by ID
          selectedProduct = products.find((p) => p.id === Number(productId));
        }

        if (variantId) {
          // Find the variant and its parent product
          for (const product of products) {
            if (product.variants_data && product.variants_data.length > 0) {
              const variant = product.variants_data.find(
                (v: any) => v.id === Number(variantId),
              );
              if (variant) {
                selectedVariant = variant;
                selectedProduct = product;
                break;
              }
            }
          }
        }

        if (selectedProduct) {
          let cost = 0;
          let variantIdForItem = 0;

          if (selectedVariant) {
            cost = parseFloat(selectedVariant.cost_per_item) || 0;
            variantIdForItem = selectedVariant.id;
          } else if (selectedProduct) {
            cost = parseFloat(selectedProduct.cost_per_item) || 0;
          }

          initialItems = [
            {
              productId: selectedProduct.id,
              variantId: variantIdForItem,
              qty: 1,
              cost: cost,
            },
          ];
        }
      }

      return {
        supplier: initialSupplier ? initialSupplier.id : 0,
        supplierName: initialSupplier ? initialSupplier.name : "",
        warehouseId: warehouses.length > 0 ? warehouses[0].id : 0,
        items: initialItems,
        notes: "",
        date: new Date().toISOString().split("T")[0],
      };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)] mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-[var(--sidebar-text)]">
            {isEditMode ? "Loading purchase order..." : "Loading form..."}
          </h2>
        </div>
      </div>
    );
  }

  // Error state for purchase order not found
  if (isEditMode && !purchaseOrder && !loading) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--sidebar-text)] mb-4">
            Purchase Order Not Found
          </h1>
          <p className="text-[var(--sidebar-text)] mb-6">
            The purchase order with ID "{id}" does not exist or you don't have
            access to it.
          </p>
          <button
            onClick={() => navigate("/purchases")}
            className="px-6 py-2 bg-[var(--primary-color)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors"
          >
            Back to Purchase Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-color)] py-8">
      <div className="compact-card max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--sidebar-text)] mb-2">
                {isEditMode ? "Edit Purchase Order" : "Create Purchase Order"}
              </h1>
              {/* // pages/PurchaseOrderFormPage.tsx - Sa loob ng return statement (~line 233) */}
              <p className="text-[var(--sidebar-text)]">
                {isEditMode
                  ? `Editing: ${purchaseOrder?.purchase_number}`
                  : "Create a new purchase order from suppliers"}
                {preSelectedSupplierId &&
                  !isEditMode &&
                  " (Supplier pre-selected)"}
                {productId && !isEditMode && " (Product pre-selected)"}
                {variantId && !isEditMode && " (Variant pre-selected)"}
              </p>
              {purchaseOrder && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] px-2 py-1 rounded">
                    PO: {purchaseOrder.purchase_number}
                  </span>
                  <span
                    className={`px-2 py-1 rounded ${
                      purchaseOrder.status === "received"
                        ? "bg-[var(--accent-green-light)] text-[var(--success-color)]"
                        : purchaseOrder.status === "pending"
                          ? "bg-[var(--accent-orange-light)] text-[var(--warning-color)]"
                          : purchaseOrder.status === "confirmed"
                            ? "bg-[var(--accent-emerald-light)] text-[var(--success-color)]"
                            : "bg-[var(--accent-red-light)] text-[var(--danger-color)]"
                    }`}
                  >
                    {purchaseOrder.status_display}
                  </span>
                  {purchaseOrder.inventory_processed && (
                    <span className="bg-[var(--accent-emerald-light)] text-[var(--success-color)] px-2 py-1 rounded">
                      Inventory Processed
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={() => navigate("/purchases")}
                className="px-4 py-2 border border-[var(--border-color)] text-[var(--sidebar-text)] rounded-lg hover:bg-[var(--card-secondary-bg)] transition-colors"
              >
                Back to List
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-[var(--accent-red-light)] border border-[var(--danger-color)] rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-[var(--danger-color)]"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-[var(--danger-color)]">
                  Error
                </h3>
                <div className="mt-1 text-sm text-[var(--danger-color)]">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Order Form */}
        <PurchaseOrderForm
          mode={mode}
          initialData={getInitialFormData()}
          suppliers={suppliers}
          warehouses={warehouses}
          products={products}
          preSelectedSupplierId={preSelectedSupplierId}
          preSelectedProductId={productId}
          preSelectedVariantId={variantId}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default PurchaseOrderFormPage;
