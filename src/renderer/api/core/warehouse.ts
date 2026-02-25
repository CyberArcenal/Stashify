// src/renderer/api/warehouseAPI.ts
// @ts-check

import type { OrderItem } from "./orderItem";
import type { Purchase } from "./purchase";
import type { StockItem } from "./stockItem";
import type { StockMovement } from "./stockMovement";

/**
 * Warehouse API – naglalaman ng lahat ng tawag sa IPC para sa warehouse operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllWarehouses
 * - getWarehouseById
 * - createWarehouse
 * - updateWarehouse
 * - deleteWarehouse
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa Warehouse entity)
// ----------------------------------------------------------------------

export interface Warehouse {
  id: number;
  type: 'warehouse' | 'store' | 'online';
  name: string;
  location: string | null;
  limit_capacity: number;
  is_active: boolean;
  created_at: string;        // ISO date string
  updated_at: string;        // ISO date string
  is_deleted: boolean;
  // Optional relations (kung kelangan, maaaring idagdag)
  stockItems?: StockItem[];
  stockMovements?: StockMovement[];
  purchases?: Purchase[];
  orderItems?: OrderItem[];
}

// Para sa pag-create ng warehouse
export interface WarehouseCreateData {
  name: string;
  type?: 'warehouse' | 'store' | 'online';   // default 'warehouse'
  location?: string | null;                   // default '' para sa unique constraint
  limit_capacity?: number;                    // default 0
  is_active?: boolean;                         // default true
}

// Para sa pag-update ng warehouse
export interface WarehouseUpdateData {
  name?: string;
  type?: 'warehouse' | 'store' | 'online';
  location?: string | null;
  limit_capacity?: number;
  is_active?: boolean;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface WarehousesResponse {
  status: boolean;
  message: string;
  data: Warehouse[];
}

export interface WarehouseResponse {
  status: boolean;
  message: string;
  data: Warehouse;
}

export interface DeleteWarehouseResponse {
  status: boolean;
  message: string;
  data: Warehouse;   // ang na-soft delete na warehouse
}

// ----------------------------------------------------------------------
// 🧠 WarehouseAPI Class
// ----------------------------------------------------------------------

class WarehouseAPI {
  /**
   * Pangunahing tawag sa IPC para sa warehouse channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.warehouse) {
      throw new Error("Electron API (warehouse) not available");
    }
    return window.backendAPI.warehouse({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng warehouses na may opsyon sa pag-filter.
   * @param params.type - Filter ayon sa uri ('warehouse', 'store', 'online')
   * @param params.is_active - Filter ayon sa active status
   * @param params.search - Hanapin sa name o location
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'created_at')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    type?: Warehouse['type'];
    is_active?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<WarehousesResponse> {
    try {
      const response = await this.call<WarehousesResponse>('getAllWarehouses', params || {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch warehouses');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch warehouses');
    }
  }

  /**
   * Kunin ang isang warehouse ayon sa ID.
   * @param id - Warehouse ID
   */
  async getById(id: number): Promise<WarehouseResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<WarehouseResponse>('getWarehouseById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch warehouse');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch warehouse');
    }
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong warehouse.
   * @param data - Warehouse data (name ay required)
   */
  async create(data: WarehouseCreateData): Promise<WarehouseResponse> {
    try {
      if (!data.name || data.name.trim() === '') {
        throw new Error('Warehouse name is required');
      }
      const response = await this.call<WarehouseResponse>('createWarehouse', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to create warehouse');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create warehouse');
    }
  }

  /**
   * I-update ang isang existing warehouse.
   * @param id - Warehouse ID
   * @param data - Mga field na gustong baguhin
   */
  async update(id: number, data: WarehouseUpdateData): Promise<WarehouseResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<WarehouseResponse>('updateWarehouse', { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to update warehouse');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update warehouse');
    }
  }

  /**
   * Mag-soft delete ng warehouse (itakda ang is_deleted = true).
   * @param id - Warehouse ID
   */
  async delete(id: number): Promise<DeleteWarehouseResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<DeleteWarehouseResponse>('deleteWarehouse', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to delete warehouse');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete warehouse');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.warehouse);
  }

  /**
   * Kunin ang mga warehouses ayon sa uri.
   * @param type - Uri ng warehouse
   * @param params - Karagdagang parameters (pagination, sorting)
   */
  async getByType(type: Warehouse['type'], params?: {
    is_active?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<WarehousesResponse> {
    return this.getAll({ type, ...params });
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const warehouseAPI = new WarehouseAPI();
export default warehouseAPI;