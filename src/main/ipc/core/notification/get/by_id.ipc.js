// src/main/ipc/notification/get/by_id.ipc.js
const notificationService = require("../../../../../services/Notification");

/**
 * Get a single notification by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Notification ID
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
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

    // Fetch notification from service
    const notification = await notificationService.findById(id);

    return {
      status: true,
      message: "Notification retrieved successfully",
      data: notification,
    };
  } catch (error) {
    console.error("Error in getNotificationById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve notification",
      data: null,
    };
  }
};