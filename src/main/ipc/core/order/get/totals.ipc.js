// src/main/ipc/order/get/totals.ipc.js


const Order = require("../../../../../entities/Order");
const { AppDataSource } = require("../../../../db/datasource");

/**
 * Get order totals and statistics (count, sum of totals, average)
 * @param {Object} params - Request parameters
 * @param {string} [params.startDate] - Filter by start date
 * @param {string} [params.endDate] - Filter by end date
 * @param {string} [params.status] - Filter by status
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate date strings if provided
    if (params.startDate && isNaN(Date.parse(params.startDate))) {
      return {
        status: false,
        message: "Invalid startDate. Must be a valid ISO date string.",
        data: null,
      };
    }
    if (params.endDate && isNaN(Date.parse(params.endDate))) {
      return {
        status: false,
        message: "Invalid endDate. Must be a valid ISO date string.",
        data: null,
      };
    }

    // Validate status if provided
    const validStatuses = ['initiated', 'pending', 'confirmed', 'completed', 'cancelled', 'refunded'];
    if (params.status && !validStatuses.includes(params.status)) {
      return {
        status: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
        data: null,
      };
    }

    // Ensure AppDataSource initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const orderRepo = AppDataSource.getRepository(Order);

    // Build query for aggregates
    const queryBuilder = orderRepo
      .createQueryBuilder("order")
      .select("COUNT(order.id)", "count")
      .addSelect("SUM(order.total)", "totalSum")
      .addSelect("AVG(order.total)", "totalAvg")
      .addSelect("MIN(order.total)", "totalMin")
      .addSelect("MAX(order.total)", "totalMax")
      .where("order.is_deleted = :isDeleted", { isDeleted: false });

    if (params.startDate) {
      queryBuilder.andWhere("order.created_at >= :startDate", { startDate: new Date(params.startDate) });
    }
    if (params.endDate) {
      queryBuilder.andWhere("order.created_at <= :endDate", { endDate: new Date(params.endDate) });
    }
    if (params.status) {
      queryBuilder.andWhere("order.status = :status", { status: params.status });
    }

    const result = await queryBuilder.getRawOne();

    // Also get counts by status
    const statusQuery = orderRepo
      .createQueryBuilder("order")
      .select("order.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("order.is_deleted = :isDeleted", { isDeleted: false });

    if (params.startDate) {
      statusQuery.andWhere("order.created_at >= :startDate", { startDate: new Date(params.startDate) });
    }
    if (params.endDate) {
      statusQuery.andWhere("order.created_at <= :endDate", { endDate: new Date(params.endDate) });
    }

    statusQuery.groupBy("order.status");
    const statusCounts = await statusQuery.getRawMany();

    const countsByStatus = statusCounts.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {});

    const data = {
      totalOrders: parseInt(result.count, 10) || 0,
      totalRevenue: parseFloat(result.totalSum) || 0,
      averageOrderValue: parseFloat(result.totalAvg) || 0,
      minOrderValue: parseFloat(result.totalMin) || 0,
      maxOrderValue: parseFloat(result.totalMax) || 0,
      countsByStatus,
    };

    return {
      status: true,
      message: "Order totals retrieved successfully",
      data,
    };
  } catch (error) {
    console.error("Error in getOrderTotals:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve order totals",
      data: null,
    };
  }
};