// pages/PurchaseOrderDetailPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PurchaseOrderDetailView from "./components/Index";
import { purchaseAPI, PurchaseData } from "@/renderer/api/purchase";
import {
  purchaseItemAPI,
  PurchaseItemData,
  PurchaseListItemData,
} from "@/renderer/api/purchaseItem";
import { showApiError, showError } from "@/renderer/utils/notification";

const PurchaseOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseData | null>(null);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseListItemData[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch purchase order and items data
  useEffect(() => {
    const fetchPurchaseData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch purchase order
        const purchaseData = await purchaseAPI.findById(Number(id));
        if (!purchaseData) {
          setError(`Purchase order with ID "${id}" not found`);
          setLoading(false);
          return;
        }

        setPurchaseOrder(purchaseData);

        // Fetch purchase items
        const itemsData = await purchaseItemAPI.getByPurchase(Number(id));
        setPurchaseItems(itemsData);
      } catch (err: any) {
        const errorMessage =
          err.message || "Failed to load purchase order details";
        setError(errorMessage);
        showApiError(errorMessage);
        console.error("Error fetching purchase data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseData();
  }, [id]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#9ED9EC]">
            Loading purchase order details...
          </h2>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !purchaseOrder) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#9ED9EC] mb-4">
            Purchase Order Not Found
          </h1>
          <p className="text-gray-600 dark:text-[#9ED9EC] mb-6">
            {error ||
              `The purchase order with ID "${id}" does not exist or cannot be found.`}
          </p>
          <button
            onClick={() => navigate("/purchases")}
            className="px-6 py-2 bg-blue-600 text-[var(--sidebar-text)] rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Purchase Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#9ED9EC] mb-2">
            Purchase Order Details
          </h1>
          <p className="text-gray-600 dark:text-[#9ED9EC]">
            Purchase Order: {purchaseOrder.purchase_number} •{" "}
            {new Date(purchaseOrder.created_at).toLocaleDateString()}
          </p>
          {purchaseOrder.notes && (
            <p className="text-gray-600 dark:text-[#9ED9EC] mt-2">
              Notes: {purchaseOrder.notes}
            </p>
          )}
        </div>

        {/* Purchase Order Detail View Component */}
        <PurchaseOrderDetailView
          purchaseOrder={purchaseOrder}
          purchaseItems={purchaseItems}
        />
      </div>
    </div>
  );
};

export default PurchaseOrderDetailPage;
