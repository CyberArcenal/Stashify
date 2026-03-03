// src/renderer/api/taxAPI.ts
// @ts-check

/**
 * Tax API – naglalaman ng lahat ng tawag sa IPC para sa tax operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllTaxes
 * - getTaxById
 * - createTax
 * - updateTax
 * - deleteTax
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa Tax entity)
// ----------------------------------------------------------------------

export interface Tax {
  id: number;
  name: string;
  code: string;
  rate: number;
  type: "percentage" | "fixed";
  is_enabled: boolean;
  is_default: boolean;
  description: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  is_deleted: boolean;
}

// Para sa pag-create ng tax
export interface TaxCreateData {
  name: string;
  code: string;
  rate: number;
  type?: "percentage" | "fixed"; // default 'percentage'
  is_enabled?: boolean; // default true
  is_default?: boolean; // default false
  description?: string | null;
}

// Para sa pag-update ng tax
export interface TaxUpdateData {
  name?: string;
  code?: string;
  rate?: number;
  type?: "percentage" | "fixed";
  is_enabled?: boolean;
  is_default?: boolean;
  description?: string | null;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface TaxesResponse {
  status: boolean;
  message: string;
  data: Tax[];
}

export interface TaxResponse {
  status: boolean;
  message: string;
  data: Tax;
}

export interface DeleteTaxResponse {
  status: boolean;
  message: string;
  data: Tax; // ang na-soft delete na tax
}

// ----------------------------------------------------------------------
// 🧠 TaxAPI Class
// ----------------------------------------------------------------------

class TaxAPI {
  /**
   * Pangunahing tawag sa IPC para sa tax channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(
    method: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    if (!window.backendAPI?.tax) {
      throw new Error("Electron API (tax) not available");
    }
    return window.backendAPI.tax({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng taxes na may opsyon sa pag-filter.
   * @param params.is_enabled - Filter ayon sa enabled status
   * @param params.type - Filter ayon sa type ('percentage' o 'fixed')
   * @param params.search - Hanapin sa name, code, o description
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'name')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'ASC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    is_enabled?: boolean;
    type?: "percentage" | "fixed";
    search?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
    page?: number;
    limit?: number;
    is_default?: boolean;
  }): Promise<TaxesResponse> {
    try {
      const response = await this.call<TaxesResponse>(
        "getAllTaxes",
        params || {},
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch taxes");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch taxes");
    }
  }

  /**
   * Kunin ang isang tax ayon sa ID.
   * @param id - Tax ID
   */
  async getById(id: number): Promise<TaxResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<TaxResponse>("getTaxById", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch tax");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch tax");
    }
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong tax.
   * @param data - Tax data (name, code, at rate ay required)
   */
  async create(data: TaxCreateData): Promise<TaxResponse> {
    try {
      // Validation
      if (!data.name || data.name.trim() === "") {
        throw new Error("Tax name is required");
      }
      if (!data.code || data.code.trim() === "") {
        throw new Error("Tax code is required");
      }
      if (data.rate === undefined || data.rate === null || data.rate < 0) {
        throw new Error("Tax rate must be a non-negative number");
      }

      // Clean up code: lowercase, replace spaces with underscores
      const cleanData = {
        ...data,
        code: data.code.trim().toLowerCase().replace(/\s+/g, '_'),
      };

      const response = await this.call<TaxResponse>("createTax", cleanData);
      if (response.status) return response;
      throw new Error(response.message || "Failed to create tax");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create tax");
    }
  }

  /**
   * I-update ang isang existing tax.
   * @param id - Tax ID
   * @param data - Mga field na gustong baguhin
   */
  async update(id: number, data: TaxUpdateData): Promise<TaxResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");

      // Validate if provided
      if (data.name !== undefined && data.name.trim() === "") {
        throw new Error("Tax name cannot be empty");
      }
      if (data.code !== undefined && data.code.trim() === "") {
        throw new Error("Tax code cannot be empty");
      }
      if (data.rate !== undefined && (data.rate < 0)) {
        throw new Error("Tax rate must be non-negative");
      }
      if (data.type !== undefined && !["percentage", "fixed"].includes(data.type)) {
        throw new Error("Tax type must be either 'percentage' or 'fixed'");
      }

      // Clean up code if provided
      const cleanData = { ...data };
      if (cleanData.code) {
        cleanData.code = cleanData.code.trim().toLowerCase().replace(/\s+/g, '_');
      }

      const response = await this.call<TaxResponse>("updateTax", {
        id,
        ...cleanData,
      });
      if (response.status) return response;
      throw new Error(response.message || "Failed to update tax");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update tax");
    }
  }

  /**
   * Mag-soft delete ng tax (itakda ang is_deleted = true).
   * @param id - Tax ID
   */
  async delete(id: number): Promise<DeleteTaxResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<DeleteTaxResponse>("deleteTax", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to delete tax");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete tax");
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang default tax (kung mayroon).
   */
  async getDefault(): Promise<TaxResponse | null> {
    try {
      const taxes = await this.getAll({ is_default: true, is_enabled: true });
      if (taxes.data && taxes.data.length > 0) {
        return {
          status: true,
          message: "Default tax found",
          data: taxes.data[0],
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!window.backendAPI?.tax;
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const taxAPI = new TaxAPI();
export default taxAPI;