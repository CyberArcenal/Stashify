// src/renderer/api/stockMovementAPI.ts
// @ts-check

import type { StockItem } from "./stockItem";
import type { Warehouse } from "./warehouse";

/**
 * StockMovement API – naglalaman ng lahat ng tawag sa IPC para sa stock movement operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllStockMovements
 * - getStockMovementById
 * - getMovementsByProduct
 * - getMovementsByWarehouse
 * - getMovementsByDateRange
 * - getMovementSummary
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa StockMovement entity at mga kaugnay)
// ----------------------------------------------------------------------


export interface StockMovement {
  id: number;
  change: number;
  movement_type: 'in' | 'out' | 'transfer_out' | 'transfer_in' | 'adjustment';
  reference_code: string;
  reason: string | null;
  metadata: string | null;      // JSON string
  current_quantity: number | null;
  created_at: string;            // ISO date string
  updated_at: string;            // ISO date string
  is_deleted: boolean;
  // Relations
  stockItem?: StockItem;
  warehouse?: Warehouse | null;
}

// Para sa pag-filter at pag-query
export interface MovementFilters {
  stockItemId?: number;
  movement_type?: StockMovement['movement_type'];
  reference_code?: string;
  startDate?: string;            // ISO date string
  endDate?: string;              // ISO date string
  sortBy?: string;               // default 'created_at'
  sortOrder?: 'ASC' | 'DESC';    // default 'DESC'
  page?: number;
  limit?: number;
}

// Para sa summary statistics
export interface MovementSummary {
  total: number;
  byType: Record<string, number>;
  totalChange: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  stockItemId: number | null;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface StockMovementsResponse {
  status: boolean;
  message: string;
  data: StockMovement[];          // array of movements (walang pagination metadata)
}

export interface StockMovementResponse {
  status: boolean;
  message: string;
  data: StockMovement;
}

export interface PaginatedStockMovementsResponse {
  status: boolean;
  message: string;
  data: {
    items: StockMovement[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface MovementSummaryResponse {
  status: boolean;
  message: string;
  data: MovementSummary;
}

// ----------------------------------------------------------------------
// 🧠 StockMovementAPI Class
// ----------------------------------------------------------------------

class StockMovementAPI {
  /**
   * Pangunahing tawag sa IPC para sa stockMovement channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.stockMovement) {
      throw new Error("Electron API (stockMovement) not available");
    }
    return window.backendAPI.stockMovement({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng stock movements na may opsyon sa pag-filter.
   * @param params.stockItemId - Filter ayon sa stock item ID
   * @param params.movement_type - Filter ayon sa movement type
   * @param params.reference_code - Filter ayon sa reference code (partial match)
   * @param params.startDate - Simula ng date range (ISO string)
   * @param params.endDate - Wakas ng date range (ISO string)
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'created_at')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: MovementFilters): Promise<StockMovementsResponse> {
    try {
      const response = await this.call<StockMovementsResponse>('getAllStockMovements', params || {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch stock movements');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch stock movements');
    }
  }

  /**
   * Kunin ang isang stock movement ayon sa ID.
   * @param id - Stock movement ID
   */
  async getById(id: number): Promise<StockMovementResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<StockMovementResponse>('getStockMovementById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch stock movement');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch stock movement');
    }
  }

  /**
   * Kunin ang mga stock movements para sa isang partikular na product.
   * @param productId - Product ID
   * @param params - Karagdagang parameters (pagination, sorting)
   */
  async getByProduct(
    productId: number,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ): Promise<PaginatedStockMovementsResponse> {
    try {
      if (!productId || productId <= 0) throw new Error('Invalid productId');
      const response = await this.call<PaginatedStockMovementsResponse>('getMovementsByProduct', {
        productId,
        ...params,
      });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch movements for product');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch movements for product');
    }
  }

  /**
   * Kunin ang mga stock movements para sa isang partikular na warehouse.
   * @param warehouseId - Warehouse ID
   * @param params - Karagdagang parameters (pagination, sorting)
   */
  async getByWarehouse(
    warehouseId: number,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ): Promise<PaginatedStockMovementsResponse> {
    try {
      if (!warehouseId || warehouseId <= 0) throw new Error('Invalid warehouseId');
      const response = await this.call<PaginatedStockMovementsResponse>('getMovementsByWarehouse', {
        warehouseId,
        ...params,
      });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch movements for warehouse');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch movements for warehouse');
    }
  }

  /**
   * Kunin ang mga stock movements sa loob ng isang date range.
   * @param startDate - Start date (ISO string)
   * @param endDate - End date (ISO string)
   * @param params - Karagdagang filters (stockItemId, movement_type, pagination)
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    params?: {
      stockItemId?: number;
      movement_type?: StockMovement['movement_type'];
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ): Promise<StockMovementsResponse> {
    try {
      if (!startDate) throw new Error('startDate is required');
      if (!endDate) throw new Error('endDate is required');
      const response = await this.call<StockMovementsResponse>('getMovementsByDateRange', {
        startDate,
        endDate,
        ...params,
      });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch movements by date range');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch movements by date range');
    }
  }

  /**
   * Kunin ang summary statistics ng stock movements.
   * @param params.startDate - Simula ng date range (opsyonal)
   * @param params.endDate - Wakas ng date range (opsyonal)
   * @param params.stockItemId - Filter ayon sa stock item ID (opsyonal)
   */
  async getSummary(params?: {
    startDate?: string;
    endDate?: string;
    stockItemId?: number;
  }): Promise<MovementSummaryResponse> {
    try {
      const response = await this.call<MovementSummaryResponse>('getMovementSummary', params || {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch movement summary');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch movement summary');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.stockMovement);
  }

  /**
   * Kunin ang mga stock movements para sa isang partikular na stock item.
   * @param stockItemId - Stock item ID
   * @param params - Karagdagang parameters (filter, pagination)
   */
  async getByStockItem(
    stockItemId: number,
    params?: {
      movement_type?: StockMovement['movement_type'];
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ): Promise<StockMovementsResponse> {
    return this.getAll({ stockItemId, ...params });
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const stockMovementAPI = new StockMovementAPI();
export default stockMovementAPI;