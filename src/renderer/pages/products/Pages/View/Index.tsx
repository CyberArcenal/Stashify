// pages/ProductDetailPage.tsx
import { productImageAPI } from "@/renderer/api/productImage"; // Adjust path as needed
import { dialogs } from "@/renderer/utils/dialogs";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductDetailView, { Product } from "./components/View";
import { showError } from "@/renderer/utils/notification";
import productAPI, {
  ProductData,
  ReorderLevelResponse,
  SupplierResponse,
} from "@/renderer/api/product"; // Adjust import path

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Convert to number
  const productId = id ? parseInt(id, 10) : null;

  // Fetch product data from API
  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const productData = await productAPI.findById(productId);

        if (productData) {
          // Transform API data to match the Product interface
          const transformedProduct: Product = {
            id: productData.id,
            sku: productData.sku,
            name: productData.name,
            image: productData.primary_image_url || undefined,
            quantity: productData.quantity,
            price: parseFloat(productData.price),
            status: determineStatus(productData),
            category: productData.category_display || "Uncategorized",
            locations: transformStockLocations(productData.stock_locations),
            variants: transformVariants(productData.variants_data),
            supplier: await getSupplierFromData(productData),
            cost: productData.cost_per_item
              ? parseFloat(productData.cost_per_item)
              : undefined,
            reorderLevel: await getReorderLevel(productData),
            description: productData.description,
            dateCreated: productData.created_at,
            lastUpdated: productData.updated_at,
            prices_data: productData.prices_data,
            // ADD THESE LINES TO PASS IMAGES DATA
            images_data: productData.images_data || [],
            imageUrl: productData.primary_image_url || undefined,
          };
          setProduct(transformedProduct);
        } else {
          showError("Product not found");
          navigate("/products");
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        showError("Failed to load product details");
        navigate("/products");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, navigate]);

  // Helper function to determine product status
  const determineStatus = (productData: ProductData): string => {
    if (productData.quantity === 0) return "out-of-stock";
    if (productData.quantity <= 10) return "low-stock";
    return "in-stock";
  };

  // Helper function to transform stock locations
  const transformStockLocations = (
    stockLocations: any[],
  ): { locationId: number; stock: number }[] => {
    if (!stockLocations || stockLocations.length === 0) {
      return [{ locationId: 1, stock: 0 }];
    }

    return stockLocations.map((location) => ({
      locationId: location.warehouse?.id || location.id,
      stock: location.quantity,
    }));
  };

  // Helper function to transform variants
  const transformVariants = (variantsData: any[]): any[] | undefined => {
    if (!variantsData || variantsData.length === 0) {
      return undefined;
    }

    return variantsData.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      quantity: variant.quantity || 0, // Make sure quantity is set
      price: parseFloat(variant.price),
      status: determineVariantStatus(variant),
      locations: transformVariantLocations(variant),
    }));
  };

  // Helper function to determine variant status
  const determineVariantStatus = (variant: any): string => {
    const quantity = variant.quantity || 0;
    if (quantity === 0) return "out-of-stock";
    if (quantity <= 5) return "low-stock";
    return "in-stock";
  };

  // Helper function to transform variant locations
  const transformVariantLocations = (
    variant: any,
  ): { locationId: number; stock: number }[] => {
    return [{ locationId: 1, stock: variant.quantity || 0 }];
  };

  // Helper function to get supplier
  const getSupplierFromData = async (
    productData: ProductData,
  ): Promise<string> => {
    const response: SupplierResponse = await productAPI.getSupplier(
      productData.id,
    );
    return response?.data?.name || "Unknown Supplier";
  };

  // Helper function to get reorder level
  const getReorderLevel = async (productData: ProductData): Promise<number> => {
    const response: ReorderLevelResponse = await productAPI.getReorderLevel(
      productData.id,
    );

    return response.data.reorder_level || 0;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-[#9ED9EC]">
            Loading product details...
          </p>
        </div>
      </div>
    );
  }

  // If product not found
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#9ED9EC] mb-4">
            Product Not Found
          </h1>
          <p className="text-gray-600 dark:text-[#9ED9EC]">
            The product with ID "{id}" does not exist.
          </p>
        </div>
      </div>
    );
  }

  // Render the ProductDetailView with the fetched product
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProductDetailView product={product} setProduct={setProduct} />
      </div>
    </div>
  );
};

export default ProductDetailPage;
