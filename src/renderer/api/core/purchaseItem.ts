// src/renderer/api/purchaseItemAPI.ts
// @ts-check

import type { Product } from "./product";
import type { ProductVariant } from "./productVariant";
import type { Purchase } from "./purchase";

/**
 * PurchaseItem API – naglalaman ng lahat ng tawag sa IPC para sa purchase item operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllPurchaseItems
 * - getPurchaseItemById
 * - createPurchaseItem
 * - updatePurchaseItem
 * - deletePurchaseItem
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa PurchaseItem entity at mga kaugnay)
// ----------------------------------------------------------------------



export interface PurchaseItem {
  id: number;
  quantity: number;
  unit_cost: number;
  total: number;
  created_at: string;        // ISO date string
  updated_at: string;        // ISO date string
  is_deleted: boolean;
  // Relations
  purchase?: Purchase;
  product?: Product;
  variant?: ProductVariant | null;
}

// Para sa pag-create ng purchase item
export interface PurchaseItemCreateData {
  purchaseId: number;
  productId: number;
  quantity: number;
  unit_cost?: number;         // kung hindi ibibigay, gagamitin ang cost_per_item ng product
  total?: number;              // optional, kung hindi ibibigay ay i-compute (unit_cost * quantity)
  variantId?: number | null;
}

// Para sa pag-update ng purchase item
export interface PurchaseItemUpdateData {
  purchaseId?: number;
  productId?: number;
  quantity?: number;
  unit_cost?: number;
  total?: number;
  variantId?: number | null;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface PurchaseItemsResponse {
  status: boolean;
  message: string;
  data: PurchaseItem[];
}

export interface PurchaseItemResponse {
  status: boolean;
  message: string;
  data: PurchaseItem;
}

export interface DeletePurchaseItemResponse {
  status: boolean;
  message: string;
  data: PurchaseItem;   // ang na-soft delete na purchase item
}

// ----------------------------------------------------------------------
// 🧠 PurchaseItemAPI Class
// ----------------------------------------------------------------------

class PurchaseItemAPI {
  /**
   * Pangunahing tawag sa IPC para sa purchaseItem channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.purchaseItem) {
      throw new Error("Electron API (purchaseItem) not available");
    }
    return window.backendAPI.purchaseItem({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng purchase items na may opsyon sa pag-filter.
   * @param params.purchaseId - Filter ayon sa purchase ID
   * @param params.productId - Filter ayon sa product ID
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'created_at')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    purchaseId?: number;
    productId?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<PurchaseItemsResponse> {
    try {
      const response = await this.call<PurchaseItemsResponse>('getAllPurchaseItems', params || {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch purchase items');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch purchase items');
    }
  }

  /**
   * Kunin ang isang purchase item ayon sa ID.
   * @param id - Purchase item ID
   */
  async getById(id: number): Promise<PurchaseItemResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<PurchaseItemResponse>('getPurchaseItemById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch purchase item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch purchase item');
    }
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong purchase item.
   * @param data - Purchase item data (purchaseId, productId, quantity ay required)
   */
  async create(data: PurchaseItemCreateData): Promise<PurchaseItemResponse> {
    try {
      if (!data.purchaseId || data.purchaseId <= 0) throw new Error('Valid purchaseId is required');
      if (!data.productId || data.productId <= 0) throw new Error('Valid productId is required');
      if (!data.quantity || data.quantity <= 0) throw new Error('Quantity must be a positive integer');
      
      const response = await this.call<PurchaseItemResponse>('createPurchaseItem', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to create purchase item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create purchase item');
    }
  }

  /**
   * I-update ang isang existing purchase item.
   * @param id - Purchase item ID
   * @param data - Mga field na gustong baguhin
   */
  async update(id: number, data: PurchaseItemUpdateData): Promise<PurchaseItemResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<PurchaseItemResponse>('updatePurchaseItem', { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to update purchase item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update purchase item');
    }
  }

  /**
   * Mag-soft delete ng purchase item (itakda ang is_deleted = true).
   * @param id - Purchase item ID
   */
  async delete(id: number): Promise<DeletePurchaseItemResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<DeletePurchaseItemResponse>('deletePurchaseItem', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to delete purchase item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete purchase item');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.purchaseItem);
  }

  /**
   * Kunin ang lahat ng purchase items para sa isang partikular na purchase.
   * @param purchaseId - Purchase ID
   * @param params - Karagdagang parameters (pagination, sorting)
   */
  async getByPurchase(purchaseId: number, params?: {
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<PurchaseItemsResponse> {
    return this.getAll({ purchaseId, ...params });
  }

  /**
   * Kunin ang lahat ng purchase items para sa isang partikular na product.
   * @param productId - Product ID
   * @param params - Karagdagang parameters
   */
  async getByProduct(productId: number, params?: {
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<PurchaseItemsResponse> {
    return this.getAll({ productId, ...params });
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const purchaseItemAPI = new PurchaseItemAPI();
export default purchaseItemAPI;