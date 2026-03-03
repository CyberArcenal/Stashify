// src/renderer/api/productVariantAPI.ts
// @ts-check

import type { Order } from "./order";
import type { Product } from "./product";
import type { PurchaseItem } from "./purchaseItem";
import type { StockItem } from "./stockItem";
import type { Tax } from "./tax";

/**
 * ProductVariant API – naglalaman ng lahat ng tawag sa IPC para sa product variant operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllProductVariants
 * - getProductVariantById
 * - getVariantsByProduct
 * - createProductVariant
 * - updateProductVariant
 * - deleteProductVariant
 * - syncVariantStock
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa ProductVariant entity)
// ----------------------------------------------------------------------

// Minimal na representasyon ng Product (para sa relation)

export interface ProductVariant {
  id: number;
  name: string;
  sku: string | null;
  gross_price: number | null;
  net_price: number | null;
  cost_per_item: number | null;
  barcode: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  is_deleted: boolean;
  is_active: boolean;

  productId?: number;
  stockId?: number;
  // Optional relations
  product?: Product;
  stockItems?: StockItem[];
  orderItems?: Order[]; // maaaring i-define kung kinakailangan
  purchaseItems?: PurchaseItem[];
  taxes?: Tax[];
  purchaseTaxes?: Tax[];
}

// Para sa pag-create ng product variant
export interface ProductVariantCreateData {
  productId: number;
  name: string;
  sku?: string | null;
  net_price?: number | null;
  cost_per_item?: number | null;
  barcode?: string | null;
  is_active?: boolean; // default true
}

// Para sa pag-update ng product variant
export interface ProductVariantUpdateData {
  productId?: number;
  name?: string;
  sku?: string | null;
  net_price?: number | null;
  cost_per_item?: number | null;
  barcode?: string | null;
  is_active?: boolean;
}

// Para sa stock synchronization
export interface SyncVariantStockData {
  variantId: number;
  warehouseId?: number; // optional
}

export interface SyncVariantStockResult {
  variantId: number;
  totalQuantity: number;
  warehouseCount: number;
  stockItems: StockItem[];
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface ProductVariantsResponse {
  status: boolean;
  message: string;
  data: ProductVariant[];
}

export interface ProductVariantResponse {
  status: boolean;
  message: string;
  data: ProductVariant;
}

export interface DeleteProductVariantResponse {
  status: boolean;
  message: string;
  data: ProductVariant; // ang na-soft delete na variant
}

export interface SyncVariantStockResponse {
  status: boolean;
  message: string;
  data: SyncVariantStockResult;
}

// ----------------------------------------------------------------------
// 🧠 ProductVariantAPI Class
// ----------------------------------------------------------------------

class ProductVariantAPI {
  /**
   * Pangunahing tawag sa IPC para sa productVariant channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(
    method: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    if (!window.backendAPI?.productVariant) {
      throw new Error("Electron API (productVariant) not available");
    }
    return window.backendAPI.productVariant({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng product variants na may opsyon sa pag-filter.
   * @param params.productId - Filter ayon sa product ID
   * @param params.is_active - Filter ayon sa active status
   * @param params.search - Hanapin sa name, SKU, o barcode
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'created_at')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    productId?: number;
    is_active?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
    page?: number;
    limit?: number;
  }): Promise<ProductVariantsResponse> {
    try {
      const response = await this.call<ProductVariantsResponse>(
        "getAllProductVariants",
        params || {},
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch product variants");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch product variants");
    }
  }

  /**
   * Kunin ang isang product variant ayon sa ID.
   * @param id - Variant ID
   */
  async getById(id: number): Promise<ProductVariantResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<ProductVariantResponse>(
        "getProductVariantById",
        { id },
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch product variant");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch product variant");
    }
  }

  /**
   * Kunin ang mga variants para sa isang partikular na product.
   * @param productId - Product ID
   * @param params - Karagdagang parameters (filter, pagination)
   */
  async getByProduct(
    productId: number,
    params?: {
      is_active?: boolean;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
      page?: number;
      limit?: number;
    },
  ): Promise<ProductVariantsResponse> {
    return this.getAll({ productId, ...params });
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong product variant.
   * @param data - Variant data (productId at name ay required)
   */
  async create(
    data: ProductVariantCreateData,
  ): Promise<ProductVariantResponse> {
    try {
      if (!data.productId || data.productId <= 0)
        throw new Error("Valid productId is required");
      if (!data.name || data.name.trim() === "")
        throw new Error("Variant name is required");
      const response = await this.call<ProductVariantResponse>(
        "createProductVariant",
        data,
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to create product variant");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create product variant");
    }
  }

  /**
   * I-update ang isang existing product variant.
   * @param id - Variant ID
   * @param data - Mga field na gustong baguhin
   */
  async update(
    id: number,
    data: ProductVariantUpdateData & { taxIds?: number[] },
  ): Promise<ProductVariantResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<ProductVariantResponse>(
        "updateProductVariant",
        { id, ...data },
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to update product variant");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update product variant");
    }
  }
  // src/renderer/api/productVariantAPI.ts
  async bulkAssignTaxes(data: {
    variantIds: number[];
    taxIds: number[];
    operation: "replace" | "add" | "remove";
  }): Promise<{ status: boolean; message: string; data: any }> {
    return this.call("bulkAssignTaxes", data);
  }
  /**
   * Mag-soft delete ng product variant (itakda ang is_deleted = true).
   * @param id - Variant ID
   */
  async delete(id: number): Promise<DeleteProductVariantResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<DeleteProductVariantResponse>(
        "deleteProductVariant",
        { id },
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to delete product variant");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete product variant");
    }
  }

  // --------------------------------------------------------------------
  // 🔄 STOCK SYNC METHOD
  // --------------------------------------------------------------------

  /**
   * I-synchronize ang stock ng isang variant (kalkulahin ang kabuuang quantity).
   * @param variantId - Variant ID
   * @param warehouseId - Opsyonal na warehouse ID
   */
  async syncStock(
    variantId: number,
    warehouseId?: number,
  ): Promise<SyncVariantStockResponse> {
    try {
      if (!variantId || variantId <= 0) throw new Error("Invalid variantId");
      const params: any = { variantId };
      if (warehouseId !== undefined) params.warehouseId = warehouseId;
      const response = await this.call<SyncVariantStockResponse>(
        "syncVariantStock",
        params,
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to sync stock");
    } catch (error: any) {
      throw new Error(error.message || "Failed to sync stock");
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!window.backendAPI?.productVariant;
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const productVariantAPI = new ProductVariantAPI();
export default productVariantAPI;
