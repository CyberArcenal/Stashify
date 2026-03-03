// src/renderer/pages/products/components/ProductViewDialog.tsx
import React, { useState, useRef, useEffect } from 'react';
import Modal from '../../../components/UI/Modal';
import Button from '../../../components/UI/Button';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import {
  ChevronLeft, ChevronRight, Package, Layers, ShoppingCart, Truck,
  Edit, Plus, AlertTriangle, DollarSign, BarChart3, Percent
} from 'lucide-react';
import type { Product } from '../../../api/core/product';
import type { ProductImage } from '../../../api/core/productImage';
import type { ProductVariant } from '../../../api/core/productVariant';
import type { StockMovement } from '../../../api/core/stockMovement';
import { showError } from '../../../utils/notification';
import { dialogs } from '../../../utils/dialogs';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import productImageAPI from '../../../api/core/productImage';

interface SalesStats {
  totalSold: number;
  revenue: number;
  avgPrice: number;
}

interface ProductViewDialogProps {
  product: Product | null;
  movements: StockMovement[];
  salesStats: SalesStats | null;
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (id: number) => void;
}

const ProductViewDialog: React.FC<ProductViewDialogProps> = ({
  product,
  movements,
  salesStats,
  loading,
  isOpen,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'movements' | 'variants'>('overview');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState<number | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);

  const navigationPrevRef = useRef<HTMLButtonElement>(null);
  const navigationNextRef = useRef<HTMLButtonElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);

  // Update images when product changes – filter out deleted ones
  useEffect(() => {
    if (product?.images) {
      setImages(product.images.filter(img => !img.is_deleted));
    } else {
      setImages([]);
    }
  }, [product]);

  const handleDeleteImage = async (imageId: number) => {
    const confirmed = await dialogs.confirm({
      title: 'Delete Image',
      message: 'Are you sure you want to delete this image?',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    setIsDeleting(imageId);
    try {
      await productImageAPI.delete(imageId);
      setImages(prev => prev.filter(img => img.id !== imageId));
      dialogs.success('Image deleted successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to delete image');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    if (!product) return;
    const confirmed = await dialogs.confirm({
      title: 'Set as Primary',
      message: 'Are you sure you want to set this image as primary?',
      confirmText: 'Set Primary',
    });
    if (!confirmed) return;

    setIsSettingPrimary(imageId);
    try {
      await productImageAPI.setPrimary(product.id, imageId);
      setImages(prev => prev.map(img => ({ ...img, is_primary: img.id === imageId })));
      dialogs.success('Primary image updated');
    } catch (err: any) {
      showError(err.message || 'Failed to set primary image');
    } finally {
      setIsSettingPrimary(null);
    }
  };

  // Compute total stock from stockItems
  const totalStock = product?.stockItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const reorderLevel = product?.stockItems?.[0]?.reorder_level || 0;

  const getStockStatus = () => {
    if (totalStock === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    } else if (totalStock <= reorderLevel) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
    } else {
      return { label: 'In Stock', color: 'bg-green-100 text-green-800', icon: Package };
    }
  };
  const stockStatus = getStockStatus();
  const StatusIcon = stockStatus.icon;

  // Use images state directly (already filtered)
  const primaryImage = images.find(img => img.is_primary) || images[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Details" size="xl" minHeight='745px'>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]"></div>
        </div>
      ) : product ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[var(--card-secondary-bg)] rounded-md flex items-center justify-center">
                {primaryImage ? (
                  <img
                    src={primaryImage.image_url || ''}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-md"
                  />
                ) : (
                  <Package className="w-6 h-6 text-[var(--text-tertiary)]" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--sidebar-text)]">{product.name}</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  SKU: {product.sku} | Category: {product.category?.name || 'Uncategorized'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="secondary" size="sm" onClick={() => onEdit(product.id)}>
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-[var(--border-color)]">
            <nav className="flex gap-4">
              {(['overview', 'movements', 'variants'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--sidebar-text)]'
                  }`}
                >
                  {tab === 'overview' && 'Overview'}
                  {tab === 'movements' && 'Stock Movements'}
                  {tab === 'variants' && 'Variants'}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="mt-4">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Image carousel */}
                <div>
                  {images.length > 0 ? (
                    <div className="relative">
                      <Swiper
                        modules={[Navigation, Pagination, Autoplay, EffectFade]}
                        spaceBetween={0}
                        slidesPerView={1}
                        navigation={{
                          prevEl: navigationPrevRef.current,
                          nextEl: navigationNextRef.current,
                        }}
                        pagination={{ el: paginationRef.current, clickable: true }}
                        autoplay={{ delay: 5000, disableOnInteraction: false }}
                        effect="fade"
                        loop={images.length > 1}
                        onSlideChange={(swiper) => setActiveImageIndex(swiper.realIndex)}
                      >
                        {images.map((img) => (
                          <SwiperSlide key={img.id}>
                            <div className="aspect-square bg-[var(--input-bg)] rounded-md flex items-center justify-center relative group">
                              <img
                                src={img.image_url || ''}
                                alt={img.alt_text || product.name}
                                className="w-full h-full object-contain rounded-md"
                              />
                              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                {!img.is_primary && (
                                  <button
                                    onClick={() => handleSetPrimary(img.id)}
                                    disabled={isSettingPrimary === img.id}
                                    className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-white text-xs px-2 py-1 rounded"
                                  >
                                    {isSettingPrimary === img.id ? '...' : 'Set Primary'}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteImage(img.id)}
                                  disabled={isDeleting === img.id}
                                  className="bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white text-xs px-2 py-1 rounded"
                                >
                                  {isDeleting === img.id ? '...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>
                      {images.length > 1 && (
                        <>
                          <button
                            ref={navigationPrevRef}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            ref={navigationNextRef}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      <div ref={paginationRef} className="flex justify-center mt-2"></div>
                    </div>
                  ) : (
                    <div className="aspect-square bg-[var(--input-bg)] rounded-md flex items-center justify-center">
                      <Package className="w-12 h-12 text-[var(--text-tertiary)]" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <Package className="w-4 h-4 mr-1" /> Basic Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-[var(--text-secondary)]">Category:</span> {product.category?.name || 'N/A'}</div>
                      <div>
                        <span className="text-[var(--text-secondary)]">Status:</span>{' '}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${stockStatus.color}`}>
                          <StatusIcon className="w-3 h-3 inline mr-1" />
                          {stockStatus.label}
                        </span>
                      </div>
                      <div><span className="text-[var(--text-secondary)]">Created:</span> {formatDate(product.created_at)}</div>
                      <div><span className="text-[var(--text-secondary)]">Updated:</span> {formatDate(product.updated_at)}</div>
                    </div>
                  </div>

                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <DollarSign className="w-4 h-4 mr-1" /> Pricing
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-[var(--text-secondary)]">Gross Price:</span> {formatCurrency(product.gross_price || 0)}</div>
                      <div><span className="text-[var(--text-secondary)]">Net Price:</span> {formatCurrency(product.net_price || 0)}</div>
                      <div><span className="text-[var(--text-secondary)]">Cost per item:</span> {formatCurrency(product.cost_per_item || 0)}</div>
                      <div><span className="text-[var(--text-secondary)]">Compare Price:</span> {formatCurrency(product.compare_price || 0)}</div>
                    </div>
                  </div>

                  {/* Tax Information */}
                  {product.taxes && product.taxes.length > 0 && (
                    <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                      <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                        <Percent className="w-4 h-4 mr-1" /> Taxes (Selling)
                      </h4>
                      <div className="space-y-1 text-sm">
                        {product.taxes.map(tax => (
                          <div key={tax.id} className="flex justify-between">
                            <span className="text-[var(--text-secondary)]">{tax.name} ({tax.code})</span>
                            <span className="text-[var(--sidebar-text)]">
                              {tax.rate}% {tax.type === 'percentage' ? '' : `(${tax.type})`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <BarChart3 className="w-4 h-4 mr-1" /> Inventory
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-[var(--text-secondary)]">Total Stock:</span> {totalStock}</div>
                      <div><span className="text-[var(--text-secondary)]">Reorder Level:</span> {reorderLevel}</div>
                      <div><span className="text-[var(--text-secondary)]">Track Quantity:</span> {product.track_quantity ? 'Yes' : 'No'}</div>
                      <div><span className="text-[var(--text-secondary)]">Allow Backorder:</span> {product.allow_backorder ? 'Yes' : 'No'}</div>
                    </div>
                  </div>

                  {salesStats && (
                    <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                      <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                        <ShoppingCart className="w-4 h-4 mr-1" /> Sales Stats
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-[var(--text-secondary)]">Total Sold:</span> {salesStats.totalSold}</div>
                        <div><span className="text-[var(--text-secondary)]">Revenue:</span> {formatCurrency(salesStats.revenue)}</div>
                      </div>
                    </div>
                  )}

                  {product.description && (
                    <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                      <h4 className="font-medium mb-2 text-[var(--sidebar-text)]">Description</h4>
                      <p className="text-sm text-[var(--text-secondary)]">{product.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'movements' && (
              <div>
                <h4 className="font-medium mb-2 text-[var(--sidebar-text)]">Stock Movements</h4>
                {movements.length === 0 ? (
                  <p className="text-center py-4 text-[var(--text-secondary)]">No stock movements found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border-color)]">
                      <thead className="bg-[var(--card-secondary-bg)]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Change</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Reference</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Reason</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                        {movements.map(m => (
                          <tr key={m.id}>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)] capitalize">{m.movement_type}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">
                              <span className={m.change > 0 ? 'text-green-600' : 'text-red-600'}>
                                {m.change > 0 ? '+' : ''}{m.change}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{m.reference_code || '-'}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{m.reason || '-'}</td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{formatDate(m.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'variants' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-[var(--sidebar-text)]">Product Variants</h4>
                  <Button variant="primary" size="sm" icon={Plus}>Add Variant</Button>
                </div>
                {!product.variants || product.variants.length === 0 ? (
                  <p className="text-center py-4 text-[var(--text-secondary)]">No variants found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border-color)]">
                      <thead className="bg-[var(--card-secondary-bg)]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">SKU</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Stock</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                        {product.variants.map(v => {
                          const variantStock = v.stockItems?.reduce((sum, si) => sum + si.quantity, 0) || 0;
                          const status = variantStock === 0
                            ? 'Out of Stock'
                            : variantStock <= (v.stockItems?.[0]?.reorder_level || 5)
                            ? 'Low Stock'
                            : 'In Stock';
                          return (
                            <tr key={v.id}>
                              <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{v.sku}</td>
                              <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{v.name}</td>
                              <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{formatCurrency(v.net_price || 0)}</td>
                              <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">{variantStock}</td>
                              <td className="px-4 py-2 text-sm">{status}</td>
                              <td className="px-4 py-2 text-sm">
                                <button className="text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] mr-2">Edit</button>
                                <button className="text-[var(--accent-red)] hover:text-[var(--accent-red-hover)]">Delete</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center py-4 text-[var(--text-secondary)]">Product not found.</p>
      )}
    </Modal>
  );
};

export default ProductViewDialog;