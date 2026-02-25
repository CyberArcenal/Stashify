// src/renderer/api/orderItemAPI.ts
// @ts-check

import type { Order } from "./order";
import type { Product } from "./product";
import type { ProductVariant } from "./productVariant";
import type { Warehouse } from "./warehouse";

/**
 * OrderItem API – naglalaman ng lahat ng tawag sa IPC para sa order item operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllOrderItems
 * - getOrderItemById
 * - createOrderItem
 * - updateOrderItem
 * - deleteOrderItem
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa OrderItem entity at mga kaugnay)
// ----------------------------------------------------------------------


export interface OrderItem {
  id: number;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;          // stored as percentage
  line_net_total: number;
  line_tax_total: number;
  line_gross_total: number;
  created_at: string;        // ISO date string
  updated_at: string;        // ISO date string
  is_deleted: boolean;
  // Relations
  order?: Order;
  product?: Product;
  variant?: ProductVariant | null;
  warehouse?: Warehouse | null;
}

// Para sa pag-create ng order item
export interface OrderItemCreateData {
  orderId: number;
  productId: number;
  quantity: number;
  unit_price?: number;          // kung hindi ibibigay, gagamitin ang net_price ng product
  discount_amount?: number;      // default 0
  tax_rate?: number;             // percentage, default 0
  line_net_total?: number;       // maaaring i-compute sa backend kung hindi ibinigay
  line_tax_total?: number;
  line_gross_total?: number;
  variantId?: number | null;
  warehouseId?: number | null;
}

// Para sa pag-update ng order item
export interface OrderItemUpdateData {
  orderId?: number;
  productId?: number;
  quantity?: number;
  unit_price?: number;
  discount_amount?: number;
  tax_rate?: number;
  line_net_total?: number;
  line_tax_total?: number;
  line_gross_total?: number;
  variantId?: number | null;
  warehouseId?: number | null;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface OrderItemsResponse {
  status: boolean;
  message: string;
  data: OrderItem[];
}

export interface OrderItemResponse {
  status: boolean;
  message: string;
  data: OrderItem;
}

export interface DeleteOrderItemResponse {
  status: boolean;
  message: string;
  data: OrderItem;   // ang na-soft delete na order item
}

// ----------------------------------------------------------------------
// 🧠 OrderItemAPI Class
// ----------------------------------------------------------------------

class OrderItemAPI {
  /**
   * Pangunahing tawag sa IPC para sa orderItem channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.orderItem) {
      throw new Error("Electron API (orderItem) not available");
    }
    return window.backendAPI.orderItem({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng order items na may opsyon sa pag-filter.
   * @param params.orderId - Filter ayon sa order ID
   * @param params.productId - Filter ayon sa product ID
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'created_at')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    orderId?: number;
    productId?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<OrderItemsResponse> {
    try {
      const response = await this.call<OrderItemsResponse>('getAllOrderItems', params || {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch order items');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch order items');
    }
  }

  /**
   * Kunin ang isang order item ayon sa ID.
   * @param id - Order item ID
   */
  async getById(id: number): Promise<OrderItemResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<OrderItemResponse>('getOrderItemById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch order item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch order item');
    }
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong order item.
   * @param data - Order item data (orderId, productId, quantity ay required)
   */
  async create(data: OrderItemCreateData): Promise<OrderItemResponse> {
    try {
      if (!data.orderId || data.orderId <= 0) throw new Error('Valid orderId is required');
      if (!data.productId || data.productId <= 0) throw new Error('Valid productId is required');
      if (!data.quantity || data.quantity <= 0) throw new Error('Quantity must be a positive integer');
      
      const response = await this.call<OrderItemResponse>('createOrderItem', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to create order item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create order item');
    }
  }

  /**
   * I-update ang isang existing order item.
   * @param id - Order item ID
   * @param data - Mga field na gustong baguhin
   */
  async update(id: number, data: OrderItemUpdateData): Promise<OrderItemResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<OrderItemResponse>('updateOrderItem', { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to update order item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update order item');
    }
  }

  /**
   * Mag-soft delete ng order item (itakda ang is_deleted = true).
   * @param id - Order item ID
   */
  async delete(id: number): Promise<DeleteOrderItemResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<DeleteOrderItemResponse>('deleteOrderItem', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to delete order item');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete order item');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.orderItem);
  }

  /**
   * Kunin ang lahat ng order items para sa isang partikular na order.
   * @param orderId - Order ID
   * @param params - Karagdagang parameters (pagination, sorting)
   */
  async getByOrder(orderId: number, params?: {
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<OrderItemsResponse> {
    return this.getAll({ orderId, ...params });
  }

  /**
   * Kunin ang lahat ng order items para sa isang partikular na product.
   * @param productId - Product ID
   * @param params - Karagdagang parameters
   */
  async getByProduct(productId: number, params?: {
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<OrderItemsResponse> {
    return this.getAll({ productId, ...params });
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const orderItemAPI = new OrderItemAPI();
export default orderItemAPI;