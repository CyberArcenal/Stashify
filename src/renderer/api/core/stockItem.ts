// src/renderer/api/stockItemAPI.ts
// @ts-check

import type { Product } from "./product";
import type { ProductVariant } from "./productVariant";
import type { StockMovement } from "./stockMovement";
import type { Warehouse } from "./warehouse";

/**
 * StockItem API – naglalaman ng lahat ng tawag sa IPC para sa stock item operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllStockItems
 * - getStockItemById
 * - createStockItem
 * - updateStockItem
 * - deleteStockItem
 * - transferStock
 * - adjustStock
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa StockItem entity at mga kaugnay)
// ----------------------------------------------------------------------




export interface StockItem {
  id: number;
  quantity: number;
  reorder_level: number;
  low_stock_threshold: number | null;
  created_at: string;        // ISO date string
  updated_at: string;        // ISO date string
  is_deleted: boolean;
  // Relations
  product?: Product;
  variant?: ProductVariant | null;
  warehouse?: Warehouse;
  movements?: StockMovement[];
}

// Para sa pag-create ng stock item
export interface StockItemCreateData {
  productId: number;
  warehouseId: number;
  variantId?: number | null;
  quantity?: number;           // default 0
  reorder_level?: number;      // default 0
  low_stock_threshold?: number | null;
}

// Para sa pag-update ng stock item
export interface StockItemUpdateData {
  productId?: number;
  warehouseId?: number;
  variantId?: number | null;
  quantity?: number;
  reorder_level?: number;
  low_stock_threshold?: number | null;
}

// Para sa stock transfer
export interface TransferStockData {
  sourceStockItemId: number;
  destinationStockItemId: number;
  quantity: number;
  reason?: string;
}

// Para sa stock adjustment
export interface AdjustStockData {
  stockItemId: number;
  adjustment: number;    // positive to increase, negative to decrease
  reason: string;
}

// Result interfaces para sa transfer at adjust
export interface TransferResult {
  source: StockItem;
  destination: StockItem;
  quantity: number;
}

export interface AdjustResult {
  stockItem: StockItem;
  adjustment: number;
  movement: StockMovement;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface StockItemsResponse {
  status: boolean;
  message: string;
  data: StockItem[];
}

export interface StockItemResponse {
  status: boolean;
  message: string;
  data: StockItem;
}

export interface DeleteStockItemResponse {
  status: boolean;
  message: string;
  data: StockItem;   // ang na-soft delete na stock item
}

export interface TransferStockResponse {
  status: boolean;
  message: string;
  data: TransferResult;
}

export interface AdjustStockResponse {
  status: boolean;
  message: string;
  data: AdjustResult;
}

// ----------------------------------------------------------------------
// 🧠 StockItemAPI Class
// ----------------------------------------------------------------------

class StockItemAPI {
  /**
   * Pangunahing tawag sa IPC para sa stockItem channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.stockItem) {
      throw new Error("Electron API (stockItem) not available");
    }
    return window.backendAPI.stockItem({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng stock items na may opsyon sa pag-filter.
   * @param params.productId - Filter ayon sa product ID
   * @param params.variantId - Filter ayon sa variant ID
   * @param params.warehouseId - Filter ayon sa warehouse ID
   * @param params.minQuantity - Minimum quantity
   * @param params.maxQuantity - Maximum quantity
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'created_at')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    productId?: number;
    variantId?: number;
    warehouseId?: number;
    minQuantity?: number;
    maxQuantity?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<StockItemsResponse> {
    try {
      const response = await this.call<StockItemsResponse>('getAllStockItems', params || {});
      console.log(response)
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch stock items');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch stock items');
    }
  }

  /**
   * Kunin ang isang stock item ayon sa ID.
   * @param id - Stock item ID
   */
  async getById(id: number): Promise<StockItemResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<StockItemResponse>('getStockItemById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch stock item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch stock item');
    }
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS (basic CRUD)
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong stock item.
   * @param data - Stock item data (productId at warehouseId ay required)
   */
  async create(data: StockItemCreateData): Promise<StockItemResponse> {
    try {
      if (!data.productId || data.productId <= 0) throw new Error('Valid productId is required');
      if (!data.warehouseId || data.warehouseId <= 0) throw new Error('Valid warehouseId is required');
      const response = await this.call<StockItemResponse>('createStockItem', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to create stock item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create stock item');
    }
  }

  /**
   * I-update ang isang existing stock item.
   * @param id - Stock item ID
   * @param data - Mga field na gustong baguhin
   */
  async update(id: number, data: StockItemUpdateData): Promise<StockItemResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<StockItemResponse>('updateStockItem', { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to update stock item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update stock item');
    }
  }

  /**
   * Mag-soft delete ng stock item (itakda ang is_deleted = true).
   * @param id - Stock item ID
   */
  async delete(id: number): Promise<DeleteStockItemResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<DeleteStockItemResponse>('deleteStockItem', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to delete stock item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete stock item');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 STOCK MOVEMENT METHODS
  // --------------------------------------------------------------------

  /**
   * Mag-transfer ng stock quantity mula sa isang stock item papunta sa isa pa.
   * @param data - Transfer data (sourceStockItemId, destinationStockItemId, quantity, at reason)
   */
  async transfer(data: TransferStockData): Promise<TransferStockResponse> {
    try {
      if (!data.sourceStockItemId || data.sourceStockItemId <= 0) throw new Error('Valid sourceStockItemId is required');
      if (!data.destinationStockItemId || data.destinationStockItemId <= 0) throw new Error('Valid destinationStockItemId is required');
      if (!data.quantity || data.quantity <= 0) throw new Error('Quantity must be a positive integer');
      const response = await this.call<TransferStockResponse>('transferStock', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to transfer stock');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to transfer stock');
    }
  }

  /**
   * Mag-adjust ng stock quantity (increase o decrease) na may dahilan.
   * @param data - Adjustment data (stockItemId, adjustment, reason)
   */
  async adjust(data: AdjustStockData): Promise<AdjustStockResponse> {
    try {
      if (!data.stockItemId || data.stockItemId <= 0) throw new Error('Valid stockItemId is required');
      if (data.adjustment === undefined || data.adjustment === null || data.adjustment === 0) {
        throw new Error('Adjustment must be a non-zero number');
      }
      if (!data.reason || data.reason.trim() === '') throw new Error('Reason is required');
      const response = await this.call<AdjustStockResponse>('adjustStock', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to adjust stock');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to adjust stock');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.stockItem);
  }

  /**
   * Kunin ang stock items para sa isang partikular na product.
   * @param productId - Product ID
   * @param params - Karagdagang parameters (warehouse filter, pagination)
   */
  async getByProduct(productId: number, params?: {
    warehouseId?: number;
    page?: number;
    limit?: number;
  }): Promise<StockItemsResponse> {
    return this.getAll({ productId, ...params });
  }

  /**
   * Kunin ang stock items para sa isang partikular na warehouse.
   * @param warehouseId - Warehouse ID
   * @param params - Karagdagang parameters (product filter, pagination)
   */
  async getByWarehouse(warehouseId: number, params?: {
    productId?: number;
    variantId?: number;
    page?: number;
    limit?: number;
  }): Promise<StockItemsResponse> {
    return this.getAll({ warehouseId, ...params });
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const stockItemAPI = new StockItemAPI();
export default stockItemAPI;