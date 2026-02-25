// src/renderer/api/purchaseAPI.ts
// @ts-check

import type { PurchaseItem } from "./purchaseItem";
import type { Supplier } from "./supplier";
import type { Warehouse } from "./warehouse";

/**
 * Purchase API – naglalaman ng lahat ng tawag sa IPC para sa purchase operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllPurchases
 * - getPurchaseById
 * - getPurchaseBySupplier
 * - createPurchase
 * - updatePurchase
 * - deletePurchase
 * - updatePurchaseStatus
 * - receivePurchase
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa Purchase at PurchaseItem entities)
// ----------------------------------------------------------------------


export interface Purchase {
  id: number;
  purchase_number: string;
  status: 'initiated' | 'pending' | 'confirmed' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  inventory_processed: boolean;
  is_received: boolean;
  received_at: string | null;   // ISO date string
  proceed_by: number | null;    // user ID
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  // Relations
  supplier?: Supplier;
  warehouse?: Warehouse;
  items?: PurchaseItem[];
}

// Para sa pag-create ng purchase item
export interface PurchaseItemCreateData {
  productId: number;
  quantity: number;
  unitCost?: number;      // kung hindi ibibigay, gagamitin ang cost_per_item ng product
  tax?: number;           // tax amount (optional)
  variantId?: number | null;
}

// Para sa pag-create ng purchase
export interface PurchaseCreateData {
  purchase_number: string;
  supplierId: number;
  warehouseId: number;
  notes?: string | null;
  items: PurchaseItemCreateData[];
}

// Para sa pag-update ng purchase (basic fields only, hindi items)
export interface PurchaseUpdateData {
  purchase_number?: string;
  supplierId?: number;
  warehouseId?: number;
  notes?: string | null;
  status?: Purchase['status'];
  subtotal?: number;
  tax_amount?: number;
  total?: number;
}

// Para sa pag-update ng status
export interface PurchaseStatusUpdateData {
  status: Purchase['status'];
}

// Para sa receive operation
export interface ReceivePurchaseData {
  proceed_by?: number;    // user ID na nag-process
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface PurchasesResponse {
  status: boolean;
  message: string;
  data: Purchase[];
}

export interface PurchaseResponse {
  status: boolean;
  message: string;
  data: Purchase;
}

export interface DeletePurchaseResponse {
  status: boolean;
  message: string;
  data: Purchase;   // ang na-soft delete na purchase
}

export interface UpdateStatusResponse {
  status: boolean;
  message: string;
  data: Purchase;
}



// ----------------------------------------------------------------------
// 🧠 PurchaseAPI Class
// ----------------------------------------------------------------------

class PurchaseAPI {
  /**
   * Pangunahing tawag sa IPC para sa purchase channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.purchase) {
      throw new Error("Electron API (purchase) not available");
    }
    return window.backendAPI.purchase({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng purchases na may opsyon sa pag-filter.
   * @param params.status - Filter ayon sa status
   * @param params.supplierId - Filter ayon sa supplier ID
   * @param params.warehouseId - Filter ayon sa warehouse ID
   * @param params.startDate - Simula ng date range (ISO string)
   * @param params.endDate - Wakas ng date range (ISO string)
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'created_at')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    status?: Purchase['status'];
    supplierId?: number;
    warehouseId?: number;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<PurchasesResponse> {
    try {
      const response = await this.call<PurchasesResponse>('getAllPurchases', params || {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch purchases');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch purchases');
    }
  }

  /**
   * Kunin ang isang purchase ayon sa ID.
   * @param id - Purchase ID
   */
  async getById(id: number): Promise<PurchaseResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<PurchaseResponse>('getPurchaseById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch purchase');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch purchase');
    }
  }

  /**
   * Kunin ang purchases para sa isang partikular na supplier.
   * @param supplierId - Supplier ID
   * @param params - Karagdagang parameters (pagination, sorting)
   */
  async getBySupplier(supplierId: number, params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<PurchasesResponse> {
    return this.getAll({ supplierId, ...params });
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong purchase.
   * @param data - Purchase data (purchase_number, supplierId, warehouseId, items ay required)
   */
  async create(data: PurchaseCreateData): Promise<PurchaseResponse> {
    try {
      if (!data.purchase_number || data.purchase_number.trim() === '') {
        throw new Error('Purchase number is required');
      }
      if (!data.supplierId || data.supplierId <= 0) throw new Error('Valid supplierId is required');
      if (!data.warehouseId || data.warehouseId <= 0) throw new Error('Valid warehouseId is required');
      if (!data.items || data.items.length === 0) throw new Error('At least one purchase item is required');

      const response = await this.call<PurchaseResponse>('createPurchase', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to create purchase');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create purchase');
    }
  }

  /**
   * I-update ang isang existing purchase.
   * @param id - Purchase ID
   * @param data - Mga field na gustong baguhin
   */
  async update(id: number, data: PurchaseUpdateData): Promise<PurchaseResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<PurchaseResponse>('updatePurchase', { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to update purchase');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update purchase');
    }
  }

  /**
   * Mag-soft delete ng purchase (itakda ang is_deleted = true).
   * @param id - Purchase ID
   */
  async delete(id: number): Promise<DeletePurchaseResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<DeletePurchaseResponse>('deletePurchase', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to delete purchase');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete purchase');
    }
  }

  /**
   * I-update ang status ng isang purchase.
   * @param id - Purchase ID
   * @param status - Bagong status
   */
  async updateStatus(id: number, status: Purchase['status']): Promise<UpdateStatusResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const validStatuses = ['initiated', 'pending', 'confirmed', 'received', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
      const response = await this.call<UpdateStatusResponse>('updatePurchaseStatus', { id, status });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to update purchase status');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update purchase status');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.purchase);
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const purchaseAPI = new PurchaseAPI();
export default purchaseAPI;