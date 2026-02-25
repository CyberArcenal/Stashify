import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Truck,
  DollarSign,
  BarChart3,
  ShoppingCart,
  ClipboardList,
  Edit,
  Plus,
  AlertTriangle,
  Layers,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Swiper imports
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

import { showInfo, showError } from "@/renderer/utils/notification";
import { formatCurrency, formatDate } from "@/renderer/utils/formatters";
import { purchaseItemAPI, PurchaseItemData } from "@/renderer/api/purchaseItem";
import { orderItemAPI, OrderItemData } from "@/renderer/api/orderItem";
import { productImageAPI } from "@/renderer/api/productImage";
import { dialogs } from "@/renderer/utils/dialogs";

// Types (updated with real data interfaces)
interface LocationStock {
  locationId: number;
  stock: number;
}

export interface ProductVariant {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  price: number;
  status: string;
  locations: LocationStock[];
}

export interface PricesData {
  net_price: string;
  gross_price: string;
  vat_amount: string;
  display_price: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  image?: string;
  quantity: number;
  price: number;
  status: string;
  category: string;
  locations: LocationStock[];
  variants?: ProductVariant[];
  supplier?: string;
  cost?: number;
  reorderLevel?: number;
  description?: string;
  imageUrl?: string;
  dateCreated?: string;
  lastUpdated?: string;
  prices_data?: PricesData;
  images_data?: Array<{
    id: number;
    image: string;
    image_url: string;
    is_primary: boolean;
    alt_text: string;
    created_at: string;
  }>;
  primary_image_url?: string; // Add this line
}

// Real data interfaces
interface RealSale {
  id: number;
  order_number: string;
  customer_display: string;
  customer_data?: {
    full_name?: string;
    username: string;
  };
  quantity: number;
  total: string;
  created_at: string;
  status: string;
}

interface RealPurchase {
  id: number;
  po_number: string;
  supplier: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  order_date: string;
  status: "pending" | "received" | "cancelled";
  received_date?: string;
}

interface RealAuditLog {
  id: number;
  action_type: string;
  action_type_display: string;
  user_display: string;
  changes: any;
  timestamp: string;
  model_name: string;
  object_id: string;
}

// Props
interface ProductDetailViewProps {
  product: Product;
  setProduct: React.Dispatch<React.SetStateAction<Product | null>>;
}

const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  setProduct,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "variants" | "sales" | "purchases"
  >("overview");
  const [realSales, setRealSales] = useState<OrderItemData[]>([]);
  const [realPurchases, setRealPurchases] = useState<PurchaseItemData[]>([]);
  const [realAuditLogs, setRealAuditLogs] = useState<RealAuditLog[]>([]);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState<number | null>(null);
  const [loading, setLoading] = useState({
    sales: false,
    purchases: false,
    audit: false,
  });
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const navigate = useNavigate();

  // Navigation refs for Swiper
  const navigationPrevRef = useRef<HTMLButtonElement>(null);
  const navigationNextRef = useRef<HTMLButtonElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);

  // Fetch real data when tabs are activated
  useEffect(() => {
    if (activeTab === "sales" && realSales.length === 0) {
      fetchSalesData();
    }
  }, [activeTab, realSales.length]);

  useEffect(() => {
    if (activeTab === "purchases" && realPurchases.length === 0) {
      fetchPurchasesData();
    }
  }, [activeTab, realPurchases.length]);

  // Fetch sales data from orders API
  const fetchSalesData = async () => {
    setLoading((prev) => ({ ...prev, sales: true }));
    try {
      const ordersResponse = await orderItemAPI.getByProduct(product.id);
      setRealSales(ordersResponse);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      showError("Failed to load sales data");
    } finally {
      setLoading((prev) => ({ ...prev, sales: false }));
    }
  };
  const handleDeleteImage = async (imageId: number) => {
    const confirmed = await dialogs.delete(`this product image?`);
    if (!confirmed) return;

    setIsDeleting(imageId);
    try {
      await productImageAPI.delete(imageId);

      // Update the local images data
      if (product.images_data) {
        const updatedImages = product.images_data.filter(
          (img) => img.id !== imageId,
        );
        setProduct((prev) => ({
          ...prev!,
          images_data: updatedImages,
        }));
      }

      dialogs.success("Image deleted successfully");
    } catch (error: any) {
      console.error("Error deleting image:", error);
      dialogs.error("Failed to delete image");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSetPrimaryImage = async (imageId: number) => {
    const confirm = await dialogs.confirm({
      title: "Make it as primary?",
      message:
        "Are you sure you want to set this image as the primary image for the product?",
      confirmText: "Yes, set as primary",
      cancelText: "Cancel",
      icon: "info",
    });
    if (!confirm) return;
    setIsSettingPrimary(imageId);

    try {
      const updatedImage = await productImageAPI.setAsPrimary(imageId);

      // Update the local images data
      if (product.images_data) {
        const updatedImages = product.images_data.map((img) => ({
          ...img,
          is_primary: img.id === imageId,
        }));

        setProduct((prev) => ({
          ...prev!,
          images_data: updatedImages,
          primary_image_url: updatedImage.image_url || updatedImage.image_url,
        }));
      }

      dialogs.success("Primary image updated successfully");
    } catch (error: any) {
      console.error("Error setting primary image:", error);
      dialogs.error("Failed to set primary image");
    } finally {
      setIsSettingPrimary(null);
    }
  };
  // Fetch purchases data
  const fetchPurchasesData = async () => {
    setLoading((prev) => ({ ...prev, purchases: true }));
    try {
      const sales = await purchaseItemAPI.getByProduct(product.id);
      setRealPurchases(sales);
    } catch (error) {
      console.error("Error fetching purchases data:", error);
      showError("Failed to load purchase history");
    } finally {
      setLoading((prev) => ({ ...prev, purchases: false }));
    }
  };

  // Calculate stock status
  const getStockStatus = () => {
    const stock = product.quantity;
    const reorderLevel = product.reorderLevel || 10;

    if (stock === 0) {
      return {
        label: "Out of Stock",
        color: "bg-[var(--accent-red-light)] text-[var(--accent-red)]",
        icon: AlertTriangle,
        textColor: "text-[var(--accent-red)]",
      };
    } else if (stock <= reorderLevel) {
      return {
        label: "Low Stock",
        color: "bg-[var(--accent-orange-light)] text-[var(--accent-orange)]",
        icon: AlertTriangle,
        textColor: "text-[var(--accent-orange)]",
      };
    } else {
      return {
        label: "In Stock",
        color: "bg-[var(--accent-green-light)] text-[var(--accent-green)]",
        icon: Package,
        textColor: "text-[var(--accent-green)]",
      };
    }
  };

  const stockStatus = getStockStatus();
  const StatusIcon = stockStatus.icon;

  // Calculate profit and margin
  const cost = product.cost || product.price * 0.6;
  const profit = product.price - cost;
  const margin = product.price > 0 ? (profit / product.price) * 100 : 0;

  const getVariantStockStatus = (quantity: number) => {
    const reorderLevel = product.reorderLevel || 10;

    if (quantity === 0) {
      return {
        color: "bg-[var(--accent-red-light)] text-[var(--accent-red)]",
        label: "Out of Stock",
      };
    } else if (quantity <= reorderLevel) {
      return {
        color: "bg-[var(--accent-orange-light)] text-[var(--accent-orange)]",
        label: "Low Stock",
      };
    } else {
      return {
        color: "bg-[var(--accent-green-light)] text-[var(--accent-green)]",
        label: "In Stock",
      };
    }
  };

  const handleAddVariant = () => {
    navigate(`/products/${product.id}/variants/form`);
  };

  const handleEditProduct = () => {
    navigate(`/products/form/${product.id}`);
  };

  const handleCreatePO = () => {
    navigate(`/purchases/product/${product.id}/form`);
    showInfo("Purchase order creation feature coming soon");
  };

  // I-add ito sa simula ng View.tsx component, after useState declarations
  const normalizeImageUrl = (url: string): string => {
    if (!url) return "";

    // console.log('Normalizing URL:', url);

    // If it's already a blob URL or http URL, return as is
    if (
      url.startsWith("blob:") ||
      url.startsWith("http://") ||
      url.startsWith("https://")
    ) {
      return url;
    }

    // If it's a file path, convert to file:// URL
    if (url.includes(":\\") || url.includes("/")) {
      // Replace backslashes with forward slashes for consistent URLs
      const normalizedPath = url.replace(/\\/g, "/");
      // Check if already has file:// prefix
      if (!normalizedPath.startsWith("file://")) {
        return `file:///${normalizedPath}`;
      }
      return normalizedPath;
    }

    return url;
  };

  // Then update the getProductImages function:
  const getProductImages = () => {
    const images: Array<{
      url: string;
      alt: string;
      isPrimary: boolean;
      id: number;
    }> = [];

    // console.log('Product data:', product);
    // console.log('Images data:', product.images_data);

    // First, get images from images_data array
    if (product.images_data && product.images_data.length > 0) {
      product.images_data.forEach((img) => {
        // Use image_url first, then fall back to image
        const rawUrl = img.image_url || img.image;
        // console.log('Raw image URL:', rawUrl);

        if (rawUrl && rawUrl.trim() !== "") {
          const normalizedUrl = normalizeImageUrl(rawUrl);
          // console.log('Normalized URL:', normalizedUrl);

          if (normalizedUrl) {
            images.push({
              url: normalizedUrl,
              alt: img.alt_text || product.name,
              isPrimary: img.is_primary,
              id: img.id,
            });
          }
        }
      });
    }

    // If no images found in images_data, try fallback options
    if (images.length === 0) {
      const fallbackUrls = [
        product.image,
        product.imageUrl,
        product.primary_image_url,
      ].filter(Boolean);

      for (const rawUrl of fallbackUrls) {
        if (rawUrl) {
          const normalizedUrl = normalizeImageUrl(rawUrl);
          if (normalizedUrl) {
            images.push({
              url: normalizedUrl,
              alt: product.name,
              isPrimary: true,
              id: 0,
            });
            break;
          }
        }
      }
    }

    // console.log('Final images array:', images);
    return images;
  };
  const productImages = getProductImages();

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Package },
    ...(product.variants && product.variants.length > 0
      ? [{ id: "variants" as const, label: "Variants", icon: Layers }]
      : []),
    { id: "sales" as const, label: "Recent Sales", icon: ShoppingCart },
    { id: "purchases" as const, label: "Recent Purchases", icon: Truck },
  ];

  return (
    <div className="bg-[var(--card-bg)] rounded-md shadow-md border border-[var(--border-color)] compact-card">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2">
            {/* Product Image */}
            <div className="w-12 h-12 bg-[var(--card-secondary-bg)] rounded-md flex items-center justify-center flex-shrink-0">
              {productImages.length > 0 ? (
                <img
                  src={productImages[0].url}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-md"
                />
              ) : (
                <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <h1 className="text-lg font-semibold text-[var(--sidebar-text)] truncate">
                  {product.name}
                </h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {stockStatus.label}
                </span>
              </div>
              <p className="text-[var(--text-secondary)] text-xs">
                SKU: {product.sku} • Category: {product.category}
                {product.dateCreated &&
                  ` • Created: ${formatDate(product.dateCreated)}`}
              </p>
              {product.description && (
                <p className="text-[var(--sidebar-text)] mt-1 text-xs">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-2 lg:mt-0">
            {product.variants && (
              <button
                onClick={handleAddVariant}
                className="compact-button bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-hover)] text-[var(--sidebar-text)] rounded-md flex items-center"
              >
                <Layers className="w-4 h-4 mr-1" />
                Add Variant
              </button>
            )}
            <button
              onClick={() => navigate(`/products/${product.id}/images/form`)}
              className="compact-button bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-[var(--sidebar-text)] rounded-md flex items-center"
            >
              <ImageIcon className="w-4 h-4 mr-1" />
              Add Image
            </button>
            <button
              onClick={handleCreatePO}
              className="compact-button bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-[var(--sidebar-text)] rounded-md flex items-center"
            >
              <ClipboardList className="w-4 h-4 mr-1" />
              Create PO
            </button>
            <button
              onClick={handleEditProduct}
              className="compact-button border border-[var(--border-color)] text-[var(--sidebar-text)] rounded-md flex items-center hover:bg-[var(--card-secondary-bg)]"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-color)]">
        <nav className="flex gap-4 px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? "border-[var(--accent-blue)] text-[var(--accent-blue)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--sidebar-text)]"
                }`}
              >
                <Icon className="w-4 h-4 mr-1" />
                {tab.label}
                {activeTab === tab.id &&
                  loading[tab.id as keyof typeof loading] && (
                    <div className="ml-1 animate-spin rounded-full h-3 w-3 border-b-2 border-[var(--accent-blue)]"></div>
                  )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Product Images with Swiper */}
            <div>
              <div className="bg-[var(--card-secondary-bg)] rounded-md compact-card">
                {productImages.length > 0 ? (
                  <div className="relative">
                    <Swiper
                      modules={[Navigation, Pagination, Autoplay, EffectFade]}
                      spaceBetween={0}
                      slidesPerView={1}
                      navigation={{
                        prevEl: navigationPrevRef.current,
                        nextEl: navigationNextRef.current,
                      }}
                      pagination={{
                        el: paginationRef.current,
                        clickable: true,
                        renderBullet: (index, className) => {
                          return `<span class="${className} custom-pagination-bullet"></span>`;
                        },
                      }}
                      autoplay={{
                        delay: 5000,
                        disableOnInteraction: false,
                      }}
                      effect="fade"
                      fadeEffect={{ crossFade: true }}
                      loop={productImages.length > 1}
                      className="product-image-swiper"
                      onSlideChange={(swiper) =>
                        setActiveImageIndex(swiper.realIndex)
                      }
                    >
                      {productImages.map((image, index) => (
                        <SwiperSlide key={index}>
                          <div className="aspect-square max-w-md mx-auto bg-[var(--input-bg)] rounded-md flex items-center justify-center relative group">
                            <img
                              src={image.url}
                              alt={image.alt}
                              className="w-full h-full object-contain rounded-md"
                            />

                            {/* Image Actions for Main Image */}
                            <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {!image.isPrimary && (
                                <button
                                  onClick={() =>
                                    handleSetPrimaryImage(image.id)
                                  }
                                  disabled={isSettingPrimary === image.id}
                                  className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-white text-xs px-2 py-1 rounded flex items-center gap-1"
                                  title="Set as primary image"
                                >
                                  {isSettingPrimary === image.id ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  ) : (
                                    "Set Primary"
                                  )}
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteImage(image.id)}
                                disabled={isDeleting === image.id}
                                className="bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white text-xs px-2 py-1 rounded flex items-center gap-1"
                                title="Delete image"
                              >
                                {isDeleting === image.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                ) : (
                                  "Delete"
                                )}
                              </button>
                            </div>
                          </div>
                        </SwiperSlide>
                      ))}
                    </Swiper>

                    {/* Custom Navigation Buttons */}
                    {productImages.length > 1 && (
                      <>
                        <button
                          ref={navigationPrevRef}
                          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          ref={navigationNextRef}
                          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    {/* Custom Pagination */}
                    {productImages.length > 1 && (
                      <div
                        ref={paginationRef}
                        className="flex justify-center mt-3 space-x-2"
                      ></div>
                    )}

                    {/* Image Counter */}
                    {productImages.length > 1 && (
                      <div className="absolute top-2 right-2 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {activeImageIndex + 1} / {productImages.length}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square max-w-md mx-auto bg-[var(--input-bg)] rounded-md flex items-center justify-center">
                    <div className="text-center text-[var(--text-tertiary)]">
                      <Package className="w-8 h-8 mx-auto mb-1" />
                      <p className="text-sm">No Image Available</p>
                    </div>
                  </div>
                )}

                {/* Thumbnail Gallery (if multiple images) */}
                {productImages.length > 1 && (
                  <div className="mt-4">
                    <div className="grid grid-cols-4 gap-2">
                      {productImages.map((image, index) => (
                        <div key={image.id} className="relative group">
                          <button
                            onClick={() => {
                              const swiperElement = document.querySelector(
                                ".product-image-swiper",
                              ) as any;
                              if (swiperElement?.swiper)
                                swiperElement.swiper.slideTo(index);
                            }}
                            className={`relative aspect-square rounded-md overflow-hidden border-2 ${
                              activeImageIndex === index
                                ? "border-[var(--accent-blue)]"
                                : "border-transparent"
                            } w-full`}
                          >
                            <img
                              src={image.url}
                              alt={`${image.alt} - thumbnail ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {image.isPrimary && (
                              <div className="absolute top-1 left-1 bg-[var(--accent-blue)] text-white text-[10px] px-1 rounded">
                                Primary
                              </div>
                            )}

                            {/* Image Actions Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1 font-medium">
                              {!image.isPrimary && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetPrimaryImage(image.id);
                                  }}
                                  disabled={isSettingPrimary === image.id}
                                  className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-white text-xs px-2 py-1 rounded flex items-center gap-1"
                                >
                                  {isSettingPrimary === image.id ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white font-sm text-sm"></div>
                                  ) : (
                                    "Set Primary"
                                  )}
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteImage(image.id);
                                }}
                                disabled={isDeleting === image.id}
                                className="bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white text-xs px-2 py-1 rounded flex items-center gap-1"
                              >
                                {isDeleting === image.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                ) : (
                                  "Delete"
                                )}
                              </button>
                            </div>
                          </button>

                          {/* Loading overlay */}
                          {(isDeleting === image.id ||
                            isSettingPrimary === image.id) && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-md">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Product Information (same as before) */}
            <div className="space-y-3">
              {/* Basic Information */}
              <div className="bg-[var(--card-secondary-bg)] rounded-md compact-card">
                <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-1 flex items-center">
                  <Package className="w-4 h-4 mr-1" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--text-secondary)]">
                      Category:
                    </span>
                    <div className="font-medium text-[var(--sidebar-text)]">
                      {product.category}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">
                      Supplier:
                    </span>
                    <div className="font-medium text-[var(--sidebar-text)]">
                      {product.supplier || "N/A"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">
                      Status:
                    </span>
                    <div className="font-medium capitalize text-[var(--sidebar-text)]">
                      {product.status}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">
                      Last Updated:
                    </span>
                    <div className="font-medium text-[var(--sidebar-text)]">
                      {formatDate(product.lastUpdated || "")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="bg-[var(--card-secondary-bg)] rounded-md compact-card">
                <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-1 flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Pricing Information
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--text-secondary)]">Cost:</span>
                    <div className="font-medium text-[var(--sidebar-text)]">
                      {formatCurrency(cost)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">
                      Base Price:
                    </span>
                    <div className="font-medium text-[var(--sidebar-text)]">
                      {formatCurrency(product.price)}
                    </div>
                  </div>
                  {product.prices_data && (
                    <>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Net Price:
                        </span>
                        <div className="font-medium text-[var(--sidebar-text)]">
                          {formatCurrency(
                            parseFloat(product.prices_data.net_price),
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Gross Price (with tax):
                        </span>
                        <div className="font-medium text-[var(--accent-green)]">
                          {formatCurrency(
                            parseFloat(product.prices_data.gross_price),
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          VAT Amount:
                        </span>
                        <div className="font-medium text-[var(--accent-orange)]">
                          {formatCurrency(
                            parseFloat(product.prices_data.vat_amount),
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Display Price:
                        </span>
                        <div className="font-medium text-[var(--accent-blue)]">
                          {formatCurrency(product.prices_data.display_price)}
                        </div>
                      </div>
                    </>
                  )}
                  {!product.prices_data && (
                    <>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Profit:
                        </span>
                        <div className="font-medium text-[var(--accent-green)]">
                          {formatCurrency(profit)}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Margin:
                        </span>
                        <div className="font-medium text-[var(--accent-blue)]">
                          {margin.toFixed(1)}%
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Inventory Information */}
              <div className="bg-[var(--card-secondary-bg)] rounded-md compact-card">
                <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-1 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Inventory Information
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--text-secondary)]">
                      Current Stock:
                    </span>
                    <div className={`font-medium ${stockStatus.textColor}`}>
                      {product.quantity} units
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">
                      Reorder Level:
                    </span>
                    <div className="font-medium text-[var(--sidebar-text)]">
                      {product.reorderLevel || 10} units
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="w-full bg-[var(--card-bg)] rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${
                          product.quantity === 0
                            ? "bg-[var(--accent-red)]"
                            : product.quantity <= (product.reorderLevel || 10)
                              ? "bg-[var(--accent-orange)]"
                              : "bg-[var(--accent-green)]"
                        }`}
                        style={{
                          width: `${Math.min((product.quantity / ((product.reorderLevel || 10) * 3)) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                      <span>0</span>
                      <span>Reorder: {product.reorderLevel || 10}</span>
                      <span>{(product.reorderLevel || 10) * 3}+</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variants Summary */}
              {product.variants && product.variants.length > 0 && (
                <div className="bg-[var(--card-secondary-bg)] rounded-md compact-card">
                  <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-1 flex items-center">
                    <Layers className="w-4 h-4 mr-1" />
                    Variants Summary
                  </h3>
                  <div className="text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[var(--text-secondary)]">
                        Total Variants:
                      </span>
                      <span className="font-medium text-[var(--sidebar-text)]">
                        {product.variants.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">
                        Total Variant Stock:
                      </span>
                      <span className="font-medium text-[var(--sidebar-text)]">
                        {product.variants.reduce(
                          (sum, variant) => sum + variant.quantity,
                          0,
                        )}{" "}
                        units
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Variants Tab */}
        {activeTab === "variants" && product.variants && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-medium text-[var(--sidebar-text)]">
                Product Variants
              </h3>
              <button
                onClick={handleAddVariant}
                className="compact-button bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-hover)] text-[var(--sidebar-text)] rounded-md flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Variant
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--border-color)] compact-table">
                <thead className="bg-[var(--card-secondary-bg)]">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Variant Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                  {product.variants.map((variant) => {
                    const variantStatus = getVariantStockStatus(
                      variant.quantity,
                    );
                    return (
                      <tr
                        key={variant.id}
                        className="hover:bg-[var(--card-secondary-bg)]"
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                        }}
                      >
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-[var(--sidebar-text)]">
                          {variant.sku}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {variant.name}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {formatCurrency(variant.price)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {variant.quantity}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStatus.color}`}
                          >
                            {variantStatus.label}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          <button className="text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] mr-1">
                            Edit
                          </button>
                          <button className="text-[var(--accent-red)] hover:text-[var(--danger-hover)]">
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Sales Tab */}
        {activeTab === "sales" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-medium text-[var(--sidebar-text)]">
                Recent Sales History
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">
                Last 30 days
              </span>
            </div>

            {loading.sales ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)] mx-auto"></div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Loading sales data...
                </p>
              </div>
            ) : realSales.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-[var(--text-tertiary)]" />
                <h3 className="mt-2 text-sm font-medium text-[var(--sidebar-text)]">
                  No sales found
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  No recent sales for this product.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-color)] compact-table">
                  <thead className="bg-[var(--card-secondary-bg)]">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                    {realSales.map((sale) => (
                      <tr
                        key={sale.id}
                        className="hover:bg-[var(--card-secondary-bg)]"
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                        }}
                      >
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-[var(--sidebar-text)]">
                          {sale.order_number}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {sale.customer_display}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {sale.quantity}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {formatCurrency(parseFloat(sale.total))}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {formatDate(sale.created_at)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              sale.status === "completed"
                                ? "bg-[var(--accent-green-light)] text-[var(--accent-green)]"
                                : sale.status === "confirmed"
                                  ? "bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)]"
                                  : "bg-[var(--accent-orange-light)] text-[var(--accent-orange)]"
                            }`}
                          >
                            {sale.status.charAt(0).toUpperCase() +
                              sale.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Recent Purchases Tab */}
        {activeTab === "purchases" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-medium text-[var(--sidebar-text)]">
                Recent Purchase History
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">
                Last 90 days
              </span>
            </div>

            {loading.purchases ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)] mx-auto"></div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Loading purchase data...
                </p>
              </div>
            ) : realPurchases.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="mx-auto h-12 w-12 text-[var(--text-tertiary)]" />
                <h3 className="mt-2 text-sm font-medium text-[var(--sidebar-text)]">
                  No purchases found
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  No recent purchase orders for this product.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-color)] compact-table">
                  <thead className="bg-[var(--card-secondary-bg)]">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        PO Number
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Unit Cost
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Total Cost
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Order Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                    {realPurchases.map((purchase) => (
                      <tr
                        key={purchase.id}
                        className="hover:bg-[var(--card-secondary-bg)]"
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                        }}
                      >
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-[var(--sidebar-text)]">
                          {purchase.purchase_number}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {purchase.supplier_name}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {purchase.quantity}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {formatCurrency(purchase.unit_cost)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {formatCurrency(purchase.total)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {formatDate(purchase.created_at)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              purchase.status === "received"
                                ? "bg-[var(--accent-green-light)] text-[var(--accent-green)]"
                                : purchase.status === "pending"
                                  ? "bg-[var(--accent-orange-light)] text-[var(--accent-orange)]"
                                  : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"
                            }`}
                          >
                            {purchase.status
                              ? purchase.status.charAt(0).toUpperCase() +
                                purchase.status.slice(1)
                              : ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailView;
