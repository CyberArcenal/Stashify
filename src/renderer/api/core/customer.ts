// src/renderer/api/customerAPI.ts
// @ts-check

import type { LoyaltyTransaction } from "./loyalty";
import type { Order } from "./order";

/**
 * Customer API – naglalaman ng lahat ng tawag sa IPC para sa customer operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllCustomers
 * - getCustomerById
 * - getCustomerLoyaltyHistory
 * - createCustomer
 * - updateCustomer
 * - deleteCustomer
 * - addLoyaltyPoints
 * - redeemLoyaltyPoints
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa Customer at LoyaltyTransaction entities)
// ----------------------------------------------------------------------

export interface Customer {
  id: number;
  name: string;
  contactInfo: string | null;
  email: string | null;
  phone: string | null;
  loyaltyPointsBalance: number;
  lifetimePointsEarned: number;
  status: 'regular' | 'vip' | 'elite';
  createdAt: string;        // ISO date string
  updatedAt: string | null; // ISO date string
  // Optional relational fields (maaaring hindi laging kasama)
  orders?: Order[];          // kung kelangan, pero hindi natin idedefine ang Order dito
  loyaltyTransactions?: LoyaltyTransaction[];
}

// Para sa create/update operations
export interface CustomerCreateData {
  name: string;
  contactInfo?: string | null;
  email?: string | null;
  phone?: string | null;
  loyaltyPointsBalance?: number;   // default 0
  lifetimePointsEarned?: number;   // default 0
  status?: 'regular' | 'vip' | 'elite'; // default 'regular'
}

export interface CustomerUpdateData {
  name?: string;
  contactInfo?: string | null;
  email?: string | null;
  phone?: string | null;
  loyaltyPointsBalance?: number;
  lifetimePointsEarned?: number;
  status?: 'regular' | 'vip' | 'elite';
}

// Para sa loyalty operations
export interface AddLoyaltyPointsData {
  customerId: number;
  points: number;
  notes?: string;
  orderId?: number;
}

export interface RedeemLoyaltyPointsData {
  customerId: number;
  points: number;
  notes?: string;
  orderId?: number;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface CustomersResponse {
  status: boolean;
  message: string;
  data: Customer[];           // array ng customers (walang pagination metadata)
}

export interface CustomerResponse {
  status: boolean;
  message: string;
  data: Customer;
}

export interface LoyaltyHistoryResponse {
  status: boolean;
  message: string;
  data: {
    items: LoyaltyTransaction[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface LoyaltyOperationResponse {
  status: boolean;
  message: string;
  data: {
    customer: Customer;
    transaction: LoyaltyTransaction;
  };
}

export interface DeleteCustomerResponse {
  status: boolean;
  message: string;
  data: {
    success: true;
  };
}

// Para sa mga utility method na nangangailangan ng boolean response
export interface ValidationResponse {
  status: boolean;
  message: string;
  data: boolean;
}

// ----------------------------------------------------------------------
// 🧠 CustomerAPI Class
// ----------------------------------------------------------------------

class CustomerAPI {
  /**
   * Pangunahing tawag sa IPC para sa customer channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.customer) {
      throw new Error("Electron API (customer) not available");
    }
    return window.backendAPI.customer({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng customers na may opsyon sa pag-filter.
   * @param params.search - Hanapin sa name, email, o phone
   * @param params.status - Filter ayon sa status ('regular', 'vip', 'elite')
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'createdAt')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    search?: string;
    status?: 'regular' | 'vip' | 'elite';
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<CustomersResponse> {
    try {
      const response = await this.call<CustomersResponse>('getAllCustomers', params || {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch customers');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch customers');
    }
  }

  /**
   * Kunin ang isang customer ayon sa ID.
   * @param id - Customer ID
   */
  async getById(id: number): Promise<CustomerResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<CustomerResponse>('getCustomerById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch customer');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch customer');
    }
  }

  /**
   * Kunin ang loyalty transaction history ng isang customer.
   * @param params.customerId - Customer ID (required)
   * @param params.page - Page number
   * @param params.limit - Items per page
   * @param params.sortBy - Sort field (default: 'timestamp')
   * @param params.sortOrder - Sort order
   */
  async getLoyaltyHistory(params: {
    customerId: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<LoyaltyHistoryResponse> {
    try {
      if (!params.customerId || params.customerId <= 0) throw new Error('Invalid customerId');
      const response = await this.call<LoyaltyHistoryResponse>('getCustomerLoyaltyHistory', params);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch loyalty history');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch loyalty history');
    }
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong customer.
   * @param data - Customer data (name ay required)
   */
  async create(data: CustomerCreateData): Promise<CustomerResponse> {
    try {
      if (!data.name || data.name.trim() === '') {
        throw new Error('Customer name is required');
      }
      const response = await this.call<CustomerResponse>('createCustomer', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to create customer');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create customer');
    }
  }

  /**
   * I-update ang isang existing customer.
   * @param id - Customer ID
   * @param data - Mga field na gustong baguhin
   */
  async update(id: number, data: CustomerUpdateData): Promise<CustomerResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<CustomerResponse>('updateCustomer', { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to update customer');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update customer');
    }
  }

  /**
   * Burahin ang isang customer (hard delete).
   * @param id - Customer ID
   */
  async delete(id: number): Promise<DeleteCustomerResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<DeleteCustomerResponse>('deleteCustomer', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to delete customer');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete customer');
    }
  }

  // --------------------------------------------------------------------
  // 💰 LOYALTY OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Magdagdag ng loyalty points sa isang customer.
   * @param data - Object na naglalaman ng customerId, points, notes (optional), orderId (optional)
   */
  async addPoints(data: AddLoyaltyPointsData): Promise<LoyaltyOperationResponse> {
    try {
      if (!data.customerId || data.customerId <= 0) throw new Error('Invalid customerId');
      if (!data.points || data.points <= 0) throw new Error('Points must be a positive integer');
      const response = await this.call<LoyaltyOperationResponse>('addLoyaltyPoints', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to add loyalty points');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to add loyalty points');
    }
  }

  /**
   * Mag-redeem ng loyalty points mula sa isang customer.
   * @param data - Object na naglalaman ng customerId, points, notes (optional), orderId (optional)
   */
  async redeemPoints(data: RedeemLoyaltyPointsData): Promise<LoyaltyOperationResponse> {
    try {
      if (!data.customerId || data.customerId <= 0) throw new Error('Invalid customerId');
      if (!data.points || data.points <= 0) throw new Error('Points must be a positive integer');
      const response = await this.call<LoyaltyOperationResponse>('redeemLoyaltyPoints', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to redeem loyalty points');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to redeem loyalty points');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.customer);
  }

  /**
   * Kunin ang loyalty summary ng isang customer (total earned, current balance).
   * @param customerId - Customer ID
   */
  async getLoyaltySummary(customerId: number): Promise<{
    currentBalance: number;
    lifetimeEarned: number;
  } | null> {
    try {
      const customer = await this.getById(customerId);
      if (!customer.status) return null;
      return {
        currentBalance: customer.data.loyaltyPointsBalance,
        lifetimeEarned: customer.data.lifetimePointsEarned,
      };
    } catch {
      return null;
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const customerAPI = new CustomerAPI();
export default customerAPI;