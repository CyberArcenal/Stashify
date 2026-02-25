// src/renderer/api/auditLogAPI.ts
// @ts-check

/**
 * Audit Log API – nakapaloob ang lahat ng tawag sa IPC para sa audit logs.
 * Naka-align sa backend na may dalawang pangunahing method:
 * - getAllAuditLogs (na may filtering, sorting, pagination)
 * - getAuditLogById
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (kahalintulad ng audit.ts ngunit naka-align sa backend)
// ----------------------------------------------------------------------

export interface AuditLogEntry {
  id: number;
  action: string;
  entity: string;
  entityId?: number;
  timestamp: string;
  user?: string | null;
  description?: string | null;
  newData?: string | null;
  previousData?: string | null;
}

// Dahil ang backend ay hindi nagbabalik ng pagination metadata,
// ang getAll ay magbabalik lamang ng array.
export interface AuditLogsResponse {
  status: boolean;
  message: string;
  data: AuditLogEntry[]; // array lang, walang total o pages
}

export interface AuditLogResponse {
  status: boolean;
  message: string;
  data: AuditLogEntry;
}

// Para sa mga method na nangangailangan ng limit (tulad ng getRecentActivity)
export interface RecentActivityResponse {
  status: boolean;
  message: string;
  data: {
    items: AuditLogEntry[];
    limit: number;
  };
}

// Para sa hasLogs at iba pang utility, puwedeng gumamit ng boolean response
export interface ValidationResponse {
  status: boolean;
  message: string;
  data: boolean;
}

// ----------------------------------------------------------------------
// 🧠 AuditLogAPI Class
// ----------------------------------------------------------------------

class AuditLogAPI {
  /**
   * Pangunahing tawag sa IPC para sa auditLog channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(
    method: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    if (!window.backendAPI?.auditLog) {
      throw new Error("Electron API (auditLog) not available");
    }
    return window.backendAPI.auditLog({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng audit logs na may opsyon sa pag-filter at pag-order.
   * @param params.entity - Filter ayon sa entity name
   * @param params.action - Filter ayon sa action (e.g., 'CREATE')
   * @param params.actor - Filter ayon sa user (actor)
   * @param params.startDate - Simula ng date range (ISO string)
   * @param params.endDate - Wakas ng date range (ISO string)
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'timestamp')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    entity?: string;
    action?: string;
    actor?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
    page?: number;
    limit?: number;
  }): Promise<AuditLogsResponse> {
    try {
      const response = await this.call<AuditLogsResponse>(
        "getAllAuditLogs",
        params || {},
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch audit logs");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch audit logs");
    }
  }

  /**
   * Kunin ang isang audit log ayon sa ID.
   * @param id - Audit log ID
   */
  async getById(id: number): Promise<AuditLogResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<AuditLogResponse>("getAuditLogById", {
        id,
      });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch audit log");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch audit log");
    }
  }

  /**
   * Kunin ang mga audit logs para sa isang partikular na entity.
   * @param params.entity - Pangalan ng entity (required)
   * @param params.entityId - Opsyonal na entity ID
   * @param params.page - Page number
   * @param params.limit - Items per page
   */
  async getByEntity(params: {
    entity: string;
    entityId?: number;
    page?: number;
    limit?: number;
  }): Promise<AuditLogsResponse> {
    // Gamitin ang getAll na may entity filter
    return this.getAll({
      entity: params.entity,
      page: params.page,
      limit: params.limit,
    });
    // Tandaan: hindi pa sinusuportahan ng backend ang pag-filter ayon sa entityId,
    // kaya lahat ng logs para sa entity na iyon ang ibabalik (anuman ang entityId).
  }

  /**
   * Kunin ang mga audit logs para sa isang partikular na user (actor).
   * @param params.user - Username (required)
   * @param params.page - Page number
   * @param params.limit - Items per page
   */
  async getByUser(params: {
    user: string;
    page?: number;
    limit?: number;
  }): Promise<AuditLogsResponse> {
    return this.getAll({
      actor: params.user,
      page: params.page,
      limit: params.limit,
    });
  }

  /**
   * Kunin ang mga audit logs para sa isang partikular na action.
   * @param params.action - Action name (required)
   * @param params.page - Page number
   * @param params.limit - Items per page
   */
  async getByAction(params: {
    action: string;
    page?: number;
    limit?: number;
  }): Promise<AuditLogsResponse> {
    return this.getAll({
      action: params.action,
      page: params.page,
      limit: params.limit,
    });
  }

  /**
   * Kunin ang mga audit logs sa loob ng isang date range.
   * @param params.startDate - ISO date string (required)
   * @param params.endDate - ISO date string (required)
   * @param params.page - Page number
   * @param params.limit - Items per page
   */
  async getByDateRange(params: {
    startDate: string;
    endDate: string;
    page?: number;
    limit?: number;
  }): Promise<AuditLogsResponse> {
    return this.getAll({
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page,
      limit: params.limit,
    });
  }

  /**
   * Maghanap ng audit logs gamit ang kombinasyon ng filters.
   * @param params.entity - Filter ayon sa entity
   * @param params.user - Filter ayon sa user
   * @param params.action - Filter ayon sa action
   * @param params.startDate - Simula ng date range
   * @param params.endDate - Wakas ng date range
   * @param params.page - Page number
   * @param params.limit - Items per page
   * @note Hindi sinusuportahan ng backend ang full‑text search (searchTerm),
   *       kaya ang parameter na ito ay hindi ginagamit.
   */
  async search(params: {
    searchTerm?: string; // hindi gagamitin, nandito lang para sa compatibility
    entity?: string;
    user?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<AuditLogsResponse> {
    // I-extract lamang ang mga supported filters
    const { entity, user, action, startDate, endDate, page, limit } = params;
    return this.getAll({
      entity,
      actor: user,
      action,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  /**
   * Kunin ang mga pinakabagong activity (latest logs).
   * @param limit - Bilang ng logs na kukunin (default 10, max 50)
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivityResponse> {
    try {
      // Gamitin ang getAll na may limit at default sort (timestamp DESC)
      const response = await this.getAll({
        limit,
        sortBy: "timestamp",
        sortOrder: "DESC",
      });
      return {
        status: response.status,
        message: response.message,
        data: {
          items: response.data,
          limit,
        },
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch recent activity");
    }
  }

  // --------------------------------------------------------------------
  // 📁 EXPORT & REPORT – HINDI PA SUPPORTADO NG BACKEND
  // --------------------------------------------------------------------
  // Ang mga sumusunod na method ay isinasama para sa future compatibility,
  // ngunit magbabalik ng error o dummy response.

  async exportCSV(params?: any): Promise<any> {
    throw new Error("Export to CSV is not implemented in the backend.");
  }

  async generateReport(params?: any): Promise<any> {
    throw new Error("Generate report is not implemented in the backend.");
  }

  async getSummary(params?: any): Promise<any> {
    throw new Error("Audit summary is not implemented in the backend.");
  }

  async getStats(params?: any): Promise<any> {
    throw new Error("Audit stats is not implemented in the backend.");
  }

  async getCounts(params?: any): Promise<any> {
    throw new Error("Audit counts is not implemented in the backend.");
  }

  async getTopActivities(params?: any): Promise<any> {
    throw new Error("Top activities is not implemented in the backend.");
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Suriin kung mayroong audit logs para sa isang entity.
   * @param entity - Entity name
   * @param entityId - Opsyonal na entity ID
   */
  async hasLogs(entity: string, entityId?: number): Promise<boolean> {
    try {
      // Kung may entityId, gusto nating i-filter. Pero hindi ito supported ng backend,
      // kaya kukunin muna natin ang logs para sa entity at manual na i-filter.
      const response = await this.getByEntity({ entity, limit: 100 }); // kumuha ng sapat
      if (!response.status) return false;
      if (!entityId) return response.data.length > 0;
      // Manual filter ayon sa entityId
      return response.data.some((log) => log.entityId === entityId);
    } catch {
      return false;
    }
  }

  /**
   * Kunin ang pinakahuling audit log entry para sa isang entity.
   * @param entity - Entity name
   * @param entityId - Entity ID
   */
  async getLatestEntry(
    entity: string,
    entityId: number,
  ): Promise<AuditLogEntry | null> {
    try {
      const response = await this.getByEntity({ entity, entityId, limit: 10 });
      if (!response.status || response.data.length === 0) return null;
      // Hanapin ang may tamang entityId (manual filter)
      const exactMatches = response.data.filter(
        (log) => log.entityId === entityId,
      );
      if (exactMatches.length === 0) return null;
      // I-assume na ang unang item ang pinakahuli dahil sa default sort
      return exactMatches[0];
    } catch {
      return null;
    }
  }

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!window.backendAPI?.auditLog;
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const auditLogAPI = new AuditLogAPI();
export default auditLogAPI;
