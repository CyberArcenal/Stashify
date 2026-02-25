// src/main/ipc/notification/mark_read.ipc.js
const notificationService = require("../../../../services/Notification");

/**
 * Mark a notification as read (or unread)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Notification ID (required)
 * @param {boolean} [params.isRead=true] - Desired read status
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required id
    if (!params.id) {
      return {
        status: false,
        message: "Missing required parameter: id",
        data: null,
      };
    }

    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return {
        status: false,
        message: "Invalid id. Must be a positive integer.",
        data: null,
      };
    }

    // Determine read status (default true)
    const isRead = params.isRead !== false; // true if undefined or true

    // Call service to mark as read
    const updated = await notificationService.markAsRead(id, isRead, user);

    return {
      status: true,
      message: `Notification marked as ${isRead ? "read" : "unread"} successfully`,
      data: updated,
    };
  } catch (error) {
    console.error("Error in markAsRead:", error);
    return {
      status: false,
      message: error.message || "Failed to mark notification",
      data: null,
    };
  }
};