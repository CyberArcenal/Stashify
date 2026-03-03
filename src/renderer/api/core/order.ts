// src/renderer/api/orderAPI.ts
// @ts-check

import type { Customer } from "./customer";
import type { OrderItem } from "./orderItem";

/**
 * Order API – naglalaman ng lahat ng tawag sa IPC para sa order operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllOrders
 * - getOrderById
 * - getOrderByCustomer
 * - getOrderTotals
 * - createOrder
 * - updateOrder
 * - deleteOrder
 * - updateOrderStatus
 * - cancelOrder
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa Order at OrderItem entities)
// ----------------------------------------------------------------------

export interface Order {
  id: number;
  order_number: string;
  status:
    | "initiated"
    | "pending"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "refunded";
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  inventory_processed: boolean;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  is_deleted: boolean;

  usedLoyalty: boolean;
  loyaltyRedeemed: number;
  usedDiscount: boolean;
  totalDiscount: number;
  usedVoucher: boolean;
  voucherCode: string | undefined;
  pointsEarn: number;

  // Optional relational fields
  customer?: Customer | undefined; // simplified; you can import Customer type if available
  items?: OrderItem[];
}

// Para sa pag-create ng order
export interface OrderItemCreateData {
  productId: number;
  quantity: number;
  unitPrice?: number; // kung hindi ibibigay, gagamitin ang net_price ng product
  discount?: number; // line discount amount
  taxRate?: number; // percentage (optional, default system tax rate)
  variantId?: number | null;
  warehouseId?: number | null;
}

export interface OrderCreateData {
  order_number: string;
  customerId?: number | null;
  notes?: string | null;
  items: OrderItemCreateData[];

  usedLoyalty?: boolean | undefined;
  loyaltyRedeemed?: number | undefined;
  usedDiscount?: boolean | undefined;
  totalDiscount?: number | undefined;
  usedVoucher?: boolean | undefined;
  voucherCode?: string | undefined;
}

// Para sa pag-update ng order (basic fields only, hindi items)
export interface OrderUpdateData {
  notes?: string | null;
  items?: OrderItemCreateData[];
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface OrdersResponse {
  status: boolean;
  message: string;
  data: Order[];
}

export interface OrderResponse {
  status: boolean;
  message: string;
  data: Order;
}

export interface OrderTotalsResponse {
  status: boolean;
  message: string;
  data: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    minOrderValue: number;
    maxOrderValue: number;
    countsByStatus: Record<string, number>;
  };
}

export interface DeleteOrderResponse {
  status: boolean;
  message: string;
  data: Order; // ang na-soft delete na order
}

// ----------------------------------------------------------------------
// 🧠 OrderAPI Class
// ----------------------------------------------------------------------

class OrderAPI {
  /**
   * Pangunahing tawag sa IPC para sa order channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(
    method: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    if (!window.backendAPI?.order) {
      throw new Error("Electron API (order) not available");
    }
    return window.backendAPI.order({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng orders na may opsyon sa pag-filter.
   * @param params.status - Filter ayon sa status
   * @param params.customerId - Filter ayon sa customer ID
   * @param params.startDate - Simula ng date range (ISO string)
   * @param params.endDate - Wakas ng date range (ISO string)
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'created_at')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    status?: Order["status"];
    customerId?: number;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
    page?: number;
    limit?: number;
  }): Promise<OrdersResponse> {
    try {
      const response = await this.call<OrdersResponse>(
        "getAllOrders",
        params || {},
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch orders");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch orders");
    }
  }

  /**
   * Kunin ang isang order ayon sa ID.
   * @param id - Order ID
   */
  async getById(id: number): Promise<OrderResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<OrderResponse>("getOrderById", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch order");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch order");
    }
  }

  /**
   * Kunin ang orders para sa isang partikular na customer.
   * @param params.customerId - Customer ID (required)
   * @param params.page - Page number
   * @param params.limit - Items per page
   * @param params.sortBy - Sort field
   * @param params.sortOrder - Sort order
   */
  async getByCustomer(params: {
    customerId: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }): Promise<OrdersResponse> {
    try {
      if (!params.customerId || params.customerId <= 0)
        throw new Error("Invalid customerId");
      const response = await this.call<OrdersResponse>(
        "getOrderByCustomer",
        params,
      );
      if (response.status) return response;
      throw new Error(
        response.message || "Failed to fetch orders for customer",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch orders for customer");
    }
  }

  /**
   * Kunin ang order totals at statistics.
   * @param params.startDate - Simula ng date range
   * @param params.endDate - Wakas ng date range
   * @param params.status - Filter ayon sa status
   */
  async getTotals(params?: {
    startDate?: string;
    endDate?: string;
    status?: Order["status"];
  }): Promise<OrderTotalsResponse> {
    try {
      const response = await this.call<OrderTotalsResponse>(
        "getOrderTotals",
        params || {},
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch order totals");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch order totals");
    }
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong order.
   * @param data - Order data (order_number at items ay required)
   */
  async create(data: OrderCreateData): Promise<OrderResponse> {
    try {
      if (!data.order_number || data.order_number.trim() === "") {
        throw new Error("Order number is required");
      }
      if (!data.items || data.items.length === 0) {
        throw new Error("At least one order item is required");
      }
      const response = await this.call<OrderResponse>("createOrder", data);
      if (response.status) return response;
      throw new Error(response.message || "Failed to create order");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create order");
    }
  }

  /**
   * I-update ang isang existing order.
   * @param id - Order ID
   * @param data - Mga field na gustong baguhin
   */
  async update(id: number, data: OrderUpdateData): Promise<OrderResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<OrderResponse>("updateOrder", {
        id,
        ...data,
      });
      if (response.status) return response;
      throw new Error(response.message || "Failed to update order");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update order");
    }
  }

  /**
   * Mag-soft delete ng order (itakda ang is_deleted = true).
   * @param id - Order ID
   */
  async delete(id: number): Promise<DeleteOrderResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<DeleteOrderResponse>("deleteOrder", {
        id,
      });
      if (response.status) return response;
      throw new Error(response.message || "Failed to delete order");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete order");
    }
  }

  /**
   * I-update ang status ng isang order.
   * @param id - Order ID
   * @param status - Bagong status
   */
  async updateStatus(
    id: number,
    status: Order["status"],
  ): Promise<OrderResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const validStatuses = [
        "initiated",
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "refunded",
      ];
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        );
      }
      const response = await this.call<OrderResponse>("updateOrderStatus", {
        id,
        status,
      });
      if (response.status) return response;
      throw new Error(response.message || "Failed to update order status");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update order status");
    }
  }

  /**
   * Ikansela ang isang order (status = 'cancelled').
   * @param id - Order ID
   */
  async cancel(id: number): Promise<OrderResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<OrderResponse>("cancelOrder", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to cancel order");
    } catch (error: any) {
      throw new Error(error.message || "Failed to cancel order");
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!window.backendAPI?.order;
  }

  /**
   * Kunin ang buong detalye ng order kasama ang items.
   * @param id - Order ID
   */
  async getOrderWithItems(id: number): Promise<OrderResponse> {
    // Same as getById because the backend includes items in the relation
    return this.getById(id);
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const orderAPI = new OrderAPI();
export default orderAPI;
