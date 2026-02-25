// src/main/ipc/notification/get/all.ipc.js
const notificationService = require("../../../../../services/Notification");

/**
 * Get all notifications with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {boolean} [params.isRead] - Filter by read status
 * @param {number} [params.limit] - Maximum number of items
 * @param {number} [params.offset] - Number of items to skip
 * @param {string} [params.sortBy='createdAt'] - Sort field
 * @param {string} [params.sortOrder='DESC'] - Sort order ('ASC' or 'DESC')
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate pagination parameters
    if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1)) {
      return {
        status: false,
        message: "Invalid limit. Must be a positive integer.",
        data: null,
      };
    }
    if (params.offset !== undefined && (!Number.isInteger(params.offset) || params.offset < 0)) {
      return {
        status: false,
        message: "Invalid offset. Must be a non-negative integer.",
        data: null,
      };
    }

    // Prepare options for service
    const options = {
      isRead: params.isRead,
      limit: params.limit,
      offset: params.offset,
      sortBy: params.sortBy || "createdAt",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch notifications from service
    const notifications = await notificationService.findAll(options);

    return {
      status: true,
      message: "Notifications retrieved successfully",
      data: notifications,
    };
  } catch (error) {
    console.error("Error in getAllNotifications:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve notifications",
      data: null,
    };
  }
};