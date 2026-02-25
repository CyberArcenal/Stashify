// src/main/ipc/notification/delete_all_read.ipc.js
const Notification = require("../../../../entities/Notification");

/**
 * Delete all read notifications
 * @param {Object} params - (No parameters expected)
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: number}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Use queryRunner to perform bulk delete within transaction
    const repo = queryRunner.manager.getRepository(Notification);

    // Find all read notifications
    const readNotifications = await repo.find({ where: { isRead: true } });
    const ids = readNotifications.map(n => n.id);

    if (ids.length === 0) {
      return {
        status: true,
        message: "No read notifications to delete",
        data: 0,
      };
    }

    // Delete them
    const result = await repo.delete(ids);

    // Log each deletion (optional, but we can log a summary)
    if (result.affected && result.affected > 0) {
      // Use notificationService's logActivity or directly logbut we can use auditLogger
      const auditLogger = require("../../../../utils/auditLogger");
      await auditLogger.logDelete("Notification", null, { count: result.affected }, user);
    }

    return {
      status: true,
      message: `Deleted ${result.affected || 0} read notifications`,
      data: result.affected || 0,
    };
  } catch (error) {
    console.error("Error in deleteAllRead:", error);
    return {
      status: false,
      message: error.message || "Failed to delete read notifications",
      data: 0,
    };
  }
};