// src/renderer/api/productAPI.ts
// @ts-check

import type { Category } from "./category";
import type { ProductImage } from "./productImage";
import type { ProductVariant } from "./productVariant";
import type { StockItem } from "./stockItem";

/**
 * Product API – naglalaman ng lahat ng tawag sa IPC para sa product operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllProducts
 * - getProductById
 * - getLowStockProducts
 * - getProductStatistics
 * - exportProducts
 * - createProduct
 * - updateProduct
 * - deleteProduct
 * - updateProductStock
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa Product entity at mga kaugnay)
// ----------------------------------------------------------------------

export interface Product {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  net_price: number | null;
  cost_per_item: number | null;
  track_quantity: boolean;
  allow_backorder: boolean;
  compare_price: number | null;
  sku: string | null;
  barcode: string | null;
  weight: number | null;
  dimensions: string | null;
  is_published: boolean;
  published_at: string | null;    // ISO date string
  created_at: string;              // ISO date string
  updated_at: string;              // ISO date string
  is_deleted: boolean;
  is_active: boolean;
  // Relations
  category?: Category | null;
  variants?: ProductVariant[];
  images?: ProductImage[];
  stockItems?: StockItem[];
}

// Para sa pag-create ng product
export interface ProductCreateData {
  name: string;
  sku: string;
  slug?: string | null;
  description?: string | null;
  net_price?: number | null;
  cost_per_item?: number | null;
  track_quantity?: boolean;        // default true
  allow_backorder?: boolean;       // default false
  compare_price?: number | null;
  barcode?: string | null;
  weight?: number | null;
  dimensions?: string | null;
  is_published?: boolean;           // default false
  is_active?: boolean;              // default true
  categoryId?: number | null;
}

// Para sa pag-update ng product
export interface ProductUpdateData {
  name?: string;
  sku?: string;
  slug?: string | null;
  description?: string | null;
  net_price?: number | null;
  cost_per_item?: number | null;
  track_quantity?: boolean;
  allow_backorder?: boolean;
  compare_price?: number | null;
  barcode?: string | null;
  weight?: number | null;
  dimensions?: string | null;
  is_published?: boolean;
  is_active?: boolean;
  is_deleted?: boolean;
  categoryId?: number | null;
}

export interface ExportResult {
  format: 'json' | 'csv';
  data: any;                 // array for json, CSV string for csv
  filename: string;
}

// Statistics
export interface ProductStatistics {
  totalActive: number;
  totalInactive: number;
  totalStockValue: number;
  averagePrice: number;
  zeroStock: number;
}

// Low stock item (from StockItem with product)
export interface LowStockItem {
  id: number;
  quantity: number;
  product: Product;
  warehouse: any;            // Warehouse
  // other stock item fields
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface ProductsResponse {
  status: boolean;
  message: string;
  data: Product[];
}

export interface ProductResponse {
  status: boolean;
  message: string;
  data: Product;
}

export interface DeleteProductResponse {
  status: boolean;
  message: string;
  data: Product;   // ang na-soft delete na product
}

export interface LowStockResponse {
  status: boolean;
  message: string;
  data: LowStockItem[];
}

export interface ProductStatisticsResponse {
  status: boolean;
  message: string;
  data: ProductStatistics;
}

// ----------------------------------------------------------------------
// 🧠 ProductAPI Class
// ----------------------------------------------------------------------

class ProductAPI {
  /**
   * Pangunahing tawag sa IPC para sa product channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.product) {
      throw new Error("Electron API (product) not available");
    }
    return window.backendAPI.product({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng products na may opsyon sa pag-filter.
   * @param params.is_active - Filter ayon sa active status
   * @param params.categoryId - Filter ayon sa category ID
   * @param params.search - Hanapin sa name, SKU, o barcode
   * @param params.minPrice - Minimum net price
   * @param params.maxPrice - Maximum net price
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'created_at')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    is_active?: boolean;
    categoryId?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<ProductsResponse> {
    try {
      const response = await this.call<ProductsResponse>('getAllProducts', params || {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch products');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch products');
    }
  }

  /**
   * Kunin ang isang product ayon sa ID.
   * @param id - Product ID
   */
  async getById(id: number): Promise<ProductResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<ProductResponse>('getProductById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch product');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch product');
    }
  }

  /**
   * Kunin ang mga products na low stock.
   * @param threshold - Opsyonal na custom threshold
   */
  async getLowStock(threshold?: number): Promise<LowStockResponse> {
    try {
      const params = threshold !== undefined ? { threshold } : {};
      const response = await this.call<LowStockResponse>('getLowStockProducts', params);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch low stock products');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch low stock products');
    }
  }

  /**
   * Kunin ang product statistics.
   */
  async getStatistics(): Promise<ProductStatisticsResponse> {
    try {
      const response = await this.call<ProductStatisticsResponse>('getProductStatistics', {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch product statistics');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch product statistics');
    }
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong product.
   * @param data - Product data (name at sku ay required)
   */
  async create(data: ProductCreateData): Promise<ProductResponse> {
    try {
      if (!data.name || data.name.trim() === '') {
        throw new Error('Product name is required');
      }
      if (!data.sku || data.sku.trim() === '') {
        throw new Error('SKU is required');
      }
      const response = await this.call<ProductResponse>('createProduct', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to create product');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create product');
    }
  }

  /**
   * I-update ang isang existing product.
   * @param id - Product ID
   * @param data - Mga field na gustong baguhin
   */
  async update(id: number, data: ProductUpdateData): Promise<ProductResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<ProductResponse>('updateProduct', { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to update product');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update product');
    }
  }

  /**
   * Mag-soft delete ng product (itakda ang is_deleted = true).
   * @param id - Product ID
   */
  async delete(id: number): Promise<DeleteProductResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<DeleteProductResponse>('deleteProduct', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to delete product');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete product');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.product);
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const productAPI = new ProductAPI();
export default productAPI;