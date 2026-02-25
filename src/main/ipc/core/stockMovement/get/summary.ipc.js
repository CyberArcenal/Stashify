// src/main/ipc/stockMovement/get/summary.ipc.js

const StockMovement = require("../../../../../entities/StockMovement");
const { AppDataSource } = require("../../../../db/datasource");

/**
 * Get summary statistics of stock movements
 * @param {Object} params - Request parameters
 * @param {string} [params.startDate] - Start date (ISO string)
 * @param {string} [params.endDate] - End date (ISO string)
 * @param {number} [params.stockItemId] - Filter by stock item ID
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate dates if provided
    let startDate, endDate;
    if (params.startDate) {
      startDate = new Date(params.startDate);
      if (isNaN(startDate.getTime())) {
        return {
          status: false,
          message: "Invalid startDate. Must be a valid ISO date string.",
          data: null,
        };
      }
    }
    if (params.endDate) {
      endDate = new Date(params.endDate);
      if (isNaN(endDate.getTime())) {
        return {
          status: false,
          message: "Invalid endDate. Must be a valid ISO date string.",
          data: null,
        };
      }
    }
    if (startDate && endDate && startDate > endDate) {
      return {
        status: false,
        message: "startDate must be less than or equal to endDate.",
        data: null,
      };
    }

    // Validate stockItemId if provided
    if (params.stockItemId !== undefined) {
      const id = Number(params.stockItemId);
      if (!Number.isInteger(id) || id <= 0) {
        return {
          status: false,
          message: "Invalid stockItemId. Must be a positive integer.",
          data: null,
        };
      }
      params.stockItemId = id;
    }

    // Ensure AppDataSource initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const movementRepo = AppDataSource.getRepository(StockMovement);

    // Base query
    const queryBuilder = movementRepo
      .createQueryBuilder("movement")
      .where("movement.is_deleted = false");

    if (params.stockItemId) {
      queryBuilder.andWhere("movement.stockItemId = :stockItemId", { stockItemId: params.stockItemId });
    }
    if (startDate) {
      queryBuilder.andWhere("movement.created_at >= :startDate", { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere("movement.created_at <= :endDate", { endDate });
    }

    // Total count
    const total = await queryBuilder.getCount();

    // Count by movement type
    const typeCounts = await queryBuilder
      .clone()
      .select("movement.movement_type", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("movement.movement_type")
      .getRawMany();

    // Sum of changes (total stock in/out)
    const sumChanges = await queryBuilder
      .clone()
      .select("SUM(movement.change)", "totalChange")
      .getRawOne();

    // Optional: group by date (daily summary) - could be added later

    const summary = {
      total,
      byType: typeCounts.reduce((acc, row) => {
        acc[row.type] = parseInt(row.count, 10);
        return acc;
      }, {}),
      totalChange: parseFloat(sumChanges.totalChange) || 0,
      dateRange: {
        start: startDate ? startDate.toISOString() : null,
        end: endDate ? endDate.toISOString() : null,
      },
      stockItemId: params.stockItemId || null,
    };

    return {
      status: true,
      message: "Stock movement summary retrieved successfully",
      data: summary,
    };
  } catch (error) {
    console.error("Error in getMovementSummary:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve movement summary",
      data: null,
    };
  }
};