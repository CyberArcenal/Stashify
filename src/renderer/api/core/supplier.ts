// src/renderer/api/supplierAPI.ts
// @ts-check

import type { Purchase } from "./purchase";

/**
 * Supplier API – naglalaman ng lahat ng tawag sa IPC para sa supplier operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllSuppliers
 * - getSupplierById
 * - createSupplier
 * - updateSupplier
 * - deleteSupplier
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa Supplier entity)
// ----------------------------------------------------------------------

export interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;        // ISO date string
  updated_at: string;        // ISO date string
  // Optional relation
  purchases?: Purchase[];          // maaaring i-import ang Purchase type kung kinakailangan
}

// Para sa pag-create ng supplier
export interface SupplierCreateData {
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
  notes?: string | null;
  status?: 'pending' | 'approved' | 'rejected';  // default 'pending'
  is_active?: boolean;                             // default true
}

// Para sa pag-update ng supplier
export interface SupplierUpdateData {
  name?: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
  notes?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
  is_active?: boolean;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface SuppliersResponse {
  status: boolean;
  message: string;
  data: Supplier[];
}

export interface SupplierResponse {
  status: boolean;
  message: string;
  data: Supplier;
}

export interface DeleteSupplierResponse {
  status: boolean;
  message: string;
  data: Supplier;   // ang na-soft delete na supplier
}

// ----------------------------------------------------------------------
// 🧠 SupplierAPI Class
// ----------------------------------------------------------------------

class SupplierAPI {
  /**
   * Pangunahing tawag sa IPC para sa supplier channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.supplier) {
      throw new Error("Electron API (supplier) not available");
    }
    return window.backendAPI.supplier({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng suppliers na may opsyon sa pag-filter.
   * @param params.is_active - Filter ayon sa active status
   * @param params.status - Filter ayon sa status ('pending', 'approved', 'rejected')
   * @param params.search - Hanapin sa name, contact_person, o email
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'created_at')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    is_active?: boolean;
    status?: Supplier['status'];
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<SuppliersResponse> {
    try {
      const response = await this.call<SuppliersResponse>('getAllSuppliers', params || {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch suppliers');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch suppliers');
    }
  }

  /**
   * Kunin ang isang supplier ayon sa ID.
   * @param id - Supplier ID
   */
  async getById(id: number): Promise<SupplierResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<SupplierResponse>('getSupplierById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch supplier');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch supplier');
    }
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong supplier.
   * @param data - Supplier data (name ay required)
   */
  async create(data: SupplierCreateData): Promise<SupplierResponse> {
    try {
      if (!data.name || data.name.trim() === '') {
        throw new Error('Supplier name is required');
      }
      const response = await this.call<SupplierResponse>('createSupplier', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to create supplier');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create supplier');
    }
  }

  /**
   * I-update ang isang existing supplier.
   * @param id - Supplier ID
   * @param data - Mga field na gustong baguhin
   */
  async update(id: number, data: SupplierUpdateData): Promise<SupplierResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<SupplierResponse>('updateSupplier', { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to update supplier');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update supplier');
    }
  }

  /**
   * Mag-soft delete ng supplier (itakda ang is_deleted = true).
   * @param id - Supplier ID
   */
  async delete(id: number): Promise<DeleteSupplierResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<DeleteSupplierResponse>('deleteSupplier', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to delete supplier');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete supplier');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.supplier);
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const supplierAPI = new SupplierAPI();
export default supplierAPI;