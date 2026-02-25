// src/main/ipc/notification/get/unread_count.ipc.js

const notificationService = require("../../../../../services/Notification");

/**
 * Get the count of unread notifications
 * @param {Object} params - (No parameters expected, but kept for consistency)
 * @returns {Promise<{status: boolean, message: string, data: number}>}
 */
module.exports = async (params) => {
  try {
    const count = await notificationService.getUnreadCount();

    return {
      status: true,
      message: "Unread count retrieved successfully",
      data: count,
    };
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve unread count",
      data: 0,
    };
  }
};