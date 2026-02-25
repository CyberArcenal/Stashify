// src/renderer/api/notificationAPI.ts
// @ts-check

/**
 * Notification API – naglalaman ng lahat ng tawag sa IPC para sa notification operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllNotifications
 * - getNotificationById
 * - getUnreadCount
 * - deleteNotification
 * - markAsRead
 * - markAllAsRead
 * - deleteAllRead
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa Notification entity)
// ----------------------------------------------------------------------

export interface Notification {
  id: number;
  userId: number | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'purchase' | 'sale';
  isRead: boolean;
  metadata: any | null;       // simple-json
  createdAt: string;          // ISO date string
  updatedAt: string | null;   // ISO date string
}

// Para sa create – hindi direktang expose sa IPC, pero maaaring gamitin sa internal
export interface NotificationCreateData {
  userId?: number | null;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'purchase' | 'sale';
  metadata?: any;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface NotificationsResponse {
  status: boolean;
  message: string;
  data: Notification[];
}

export interface NotificationResponse {
  status: boolean;
  message: string;
  data: Notification;
}

export interface UnreadCountResponse {
  status: boolean;
  message: string;
  data: number;
}

export interface DeleteNotificationResponse {
  status: boolean;
  message: string;
  data: { success: true };
}

export interface MarkReadResponse {
  status: boolean;
  message: string;
  data: Notification;        // updated notification
}

export interface MarkAllReadResponse {
  status: boolean;
  message: string;
  data: number;              // number of notifications marked as read
}

export interface DeleteAllReadResponse {
  status: boolean;
  message: string;
  data: number;              // number of deleted notifications
}

// ----------------------------------------------------------------------
// 🧠 NotificationAPI Class
// ----------------------------------------------------------------------

class NotificationAPI {
  /**
   * Pangunahing tawag sa IPC para sa notification channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.notification) {
      throw new Error("Electron API (notification) not available");
    }
    return window.backendAPI.notification({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng notifications na may opsyon sa pag-filter.
   * @param params.isRead - Filter ayon sa read status
   * @param params.limit - Maximum na bilang ng items
   * @param params.offset - Bilang ng items na lalaktawan
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'createdAt')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   */
  async getAll(params?: {
    isRead?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<NotificationsResponse> {
    try {
      const response = await this.call<NotificationsResponse>('getAllNotifications', params || {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch notifications');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch notifications');
    }
  }

  /**
   * Kunin ang isang notification ayon sa ID.
   * @param id - Notification ID
   */
  async getById(id: number): Promise<NotificationResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<NotificationResponse>('getNotificationById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch notification');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch notification');
    }
  }

  /**
   * Kunin ang bilang ng mga hindi pa nababasang notifications.
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      const response = await this.call<UnreadCountResponse>('getUnreadCount', {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch unread count');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch unread count');
    }
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS (including status updates)
  // --------------------------------------------------------------------

  /**
   * Burahin ang isang notification (hard delete).
   * @param id - Notification ID
   */
  async delete(id: number): Promise<DeleteNotificationResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<DeleteNotificationResponse>('deleteNotification', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to delete notification');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete notification');
    }
  }

  /**
   * Markahan ang isang notification bilang nabasa (o hindi nabasa).
   * @param id - Notification ID
   * @param isRead - True para markahan bilang nabasa, false para hindi nabasa (default true)
   */
  async markAsRead(id: number, isRead: boolean = true): Promise<MarkReadResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<MarkReadResponse>('markAsRead', { id, isRead });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to mark notification');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to mark notification');
    }
  }

  /**
   * Markahan ang lahat ng notifications bilang nabasa.
   */
  async markAllAsRead(): Promise<MarkAllReadResponse> {
    try {
      const response = await this.call<MarkAllReadResponse>('markAllAsRead', {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to mark all as read');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to mark all as read');
    }
  }

  /**
   * Burahin ang lahat ng nabasa nang notifications.
   */
  async deleteAllRead(): Promise<DeleteAllReadResponse> {
    try {
      const response = await this.call<DeleteAllReadResponse>('deleteAllRead', {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to delete read notifications');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete read notifications');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.notification);
  }

  /**
   * Kunin ang notification statistics (total, unread, read, by type).
   * @note Hindi ito direktang sinusuportahan ng IPC, kaya manual na kinukuwenta.
   */
  async getStats(): Promise<{
    total: number;
    unread: number;
    read: number;
    byType: Record<string, number>;
  }> {
    try {
      const [all, unreadCount] = await Promise.all([
        this.getAll({ limit: 1000 }), // kunin ang lahat (limit 1000)
        this.getUnreadCount(),
      ]);

      const total = all.data.length;
      const unread = unreadCount.data;
      const read = total - unread;

      // Bilang ayon sa type
      const byType: Record<string, number> = {};
      all.data.forEach(n => {
        byType[n.type] = (byType[n.type] || 0) + 1;
      });

      return { total, unread, read, byType };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to compute notification stats');
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const notificationAPI = new NotificationAPI();
export default notificationAPI;