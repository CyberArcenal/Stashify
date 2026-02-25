// src/renderer/api/loyaltyAPI.ts
// @ts-check

/**
 * Loyalty Transaction API – naglalaman ng lahat ng tawag sa IPC para sa loyalty transaction operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllLoyaltyTransactions
 * - getLoyaltyTransactionById
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa LoyaltyTransaction entity)
// ----------------------------------------------------------------------

export interface LoyaltyTransaction {
  id: number;
  transactionType: 'earn' | 'redeem' | 'refund';
  pointsChange: number;
  timestamp: string;        // ISO date string
  notes: string | null;
  updatedAt: string | null; // ISO date string
  // Optional relational fields (kung isasama ng backend)
  customer?: {
    id: number;
    name: string;
  } | null;
  order?: {
    id: number;
    order_number: string;
  } | null;
}

// Para sa pag-filter ng transactions
export interface LoyaltyTransactionFilter {
  customerId?: number;
  transactionType?: 'earn' | 'redeem' | 'refund';
  startDate?: string;       // ISO date string
  endDate?: string;         // ISO date string
  sortBy?: string;          // default 'timestamp'
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface LoyaltyTransactionsResponse {
  status: boolean;
  message: string;
  data: LoyaltyTransaction[];   // array lang, walang pagination metadata
}

export interface LoyaltyTransactionResponse {
  status: boolean;
  message: string;
  data: LoyaltyTransaction;
}

// Para sa mga utility method
export interface ValidationResponse {
  status: boolean;
  message: string;
  data: boolean;
}

// ----------------------------------------------------------------------
// 🧠 LoyaltyAPI Class
// ----------------------------------------------------------------------

class LoyaltyAPI {
  /**
   * Pangunahing tawag sa IPC para sa loyaltyTransaction channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.loyaltyTransaction) {
      throw new Error("Electron API (loyaltyTransaction) not available");
    }
    return window.backendAPI.loyaltyTransaction({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng loyalty transactions na may opsyon sa pag-filter.
   * @param params.customerId - Filter ayon sa customer ID
   * @param params.transactionType - Filter ayon sa transaction type
   * @param params.startDate - Simula ng date range (ISO string)
   * @param params.endDate - Wakas ng date range (ISO string)
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'timestamp')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: LoyaltyTransactionFilter): Promise<LoyaltyTransactionsResponse> {
    try {
      const response = await this.call<LoyaltyTransactionsResponse>('getAllLoyaltyTransactions', params || {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch loyalty transactions');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch loyalty transactions');
    }
  }

  /**
   * Kunin ang isang loyalty transaction ayon sa ID.
   * @param id - Transaction ID
   */
  async getById(id: number): Promise<LoyaltyTransactionResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<LoyaltyTransactionResponse>('getLoyaltyTransactionById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch loyalty transaction');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch loyalty transaction');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.loyaltyTransaction);
  }

  /**
   * Kunin ang mga loyalty transactions para sa isang customer.
   * @param customerId - Customer ID
   * @param limit - Bilang ng transactions (default 50)
   */
  async getByCustomer(customerId: number, limit: number = 50): Promise<LoyaltyTransactionsResponse> {
    return this.getAll({ customerId, limit, sortBy: 'timestamp', sortOrder: 'DESC' });
  }

  /**
   * Kunin ang mga loyalty transactions para sa isang order.
   * @param orderId - Order ID
   * @param limit - Bilang ng transactions (default 50)
   */
  async getByOrder(orderId: number, limit: number = 50): Promise<LoyaltyTransactionsResponse> {
    // Tandaan: ang backend ay hindi direktang sumusuporta sa pag-filter by orderId,
    // kaya kukunin muna natin ang lahat at manual na i-filter (o hintayin ang backend support).
    try {
      const all = await this.getAll({ limit: 1000 }); // kumuha ng sapat
      if (!all.status) throw new Error(all.message);
      const filtered = all.data.filter(tx => tx.order?.id === orderId);
      return {
        status: true,
        message: 'Loyalty transactions for order retrieved',
        data: filtered.slice(0, limit),
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch loyalty transactions for order');
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const loyaltyAPI = new LoyaltyAPI();
export default loyaltyAPI;