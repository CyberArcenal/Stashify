// src/main/ipc/notification/mark_all_read.ipc.js


const notificationService = require("../../../../services/Notification");

/**
 * Mark all notifications as read
 * @param {Object} params - (No parameters expected, but kept for consistency)
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: number}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    const count = await notificationService.markAllAsRead(user);

    return {
      status: true,
      message: `Marked ${count} notifications as read`,
      data: count,
    };
  } catch (error) {
    console.error("Error in markAllAsRead:", error);
    return {
      status: false,
      message: error.message || "Failed to mark all notifications as read",
      data: 0,
    };
  }
};